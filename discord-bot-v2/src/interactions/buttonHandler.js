// ============================================================
// src/interactions/buttonHandler.js
// ============================================================

const { EmbedBuilder } = require('discord.js');
const { BUTTONS, MODE_LABELS, COLORS } = require('../config/constants');
const db = require('../database/db');
const { closeTicketChannel } = require('../services/matchmaking');
const {
    buildErrorEmbed, buildWarningEmbed, buildInfoEmbed,
    buildVencedorEmbed, buildPixEmbed,
    buildFilaEmbed, buildFilaButtons,
} = require('../utils/embeds');

// ============================================================
// HELPERS
// ============================================================

/**
 * Atualiza o embed da fila no painel com os jogadores atuais.
 * Chamado sempre que alguém entra ou sai da fila.
 */
async function refreshFilaEmbed(guild, valor) {
    try {
        const record = db.getFilaMessageId(guild.id, valor);
        if (!record) return;

        const channel = await guild.channels.fetch(record.channel_id).catch(() => null);
        if (!channel) return;

        const msg = await channel.messages.fetch(record.message_id).catch(() => null);
        if (!msg) return;

        // Busca quem está na fila nesse valor
        const normalPlayers   = db.getQueueByModeAndValue('gelo_normal',   valor, guild.id);
        const infinitoPlayers = db.getQueueByModeAndValue('gelo_infinito', valor, guild.id);

        const normalId   = normalPlayers[0]   ? normalPlayers[0].user_id   : null;
        const infinitoId = infinitoPlayers[0] ? infinitoPlayers[0].user_id : null;

        await msg.edit({
            embeds: [buildFilaEmbed(valor, normalId, infinitoId)],
            components: [buildFilaButtons(valor)],
        });
    } catch (err) {
        console.error(`[PAINEL] Erro ao atualizar embed da fila R$${valor}:`, err.message);
    }
}

// ============================================================
// DISPATCH
// ============================================================

async function handleButton(interaction) {
    const { customId } = interaction;

    if (customId.startsWith('fila_normal_') || customId.startsWith('fila_infinito_')) {
        await handleFilaButton(interaction);
        return;
    }

    switch (customId) {
        case BUTTONS.LEAVE_QUEUE:         await handleLeaveQueue(interaction);        break;
        case BUTTONS.MATCH_CANCELLED:     await handleMatchCancelled(interaction);    break;
        case BUTTONS.CLOSE_TICKET:        await handleCloseTicket(interaction);       break;
        case BUTTONS.ADMIN_CONFIRM_PIX:   await handleAdminConfirmPix(interaction);   break;
        case BUTTONS.ADMIN_CLOSE_TICKET:  await handleAdminCloseTicket(interaction);  break;
        case BUTTONS.ADMIN_SET_WINNER_P1: await handleSetWinner(interaction, 1);      break;
        case BUTTONS.ADMIN_SET_WINNER_P2: await handleSetWinner(interaction, 2);      break;
        default:
            console.warn(`[BOTÃO] ID desconhecido: ${customId}`);
    }
}

// ============================================================
// ENTRAR NA FILA
// ============================================================

async function handleFilaButton(interaction) {
    const { customId, user, guild } = interaction;
    const { checkAndCreateMatch } = require('../services/matchmaking');

    // Extrai modo e valor: fila_normal_5 ou fila_infinito_5
    const parts = customId.split('_');
    const valor   = parseInt(parts[parts.length - 1]);
    const modoKey = parts[1]; // 'normal' ou 'infinito'
    const modo    = modoKey === 'infinito' ? 'gelo_infinito' : 'gelo_normal';

    // Verifica se já está em alguma fila
    const existing = db.isInQueue(user.id);
    if (existing) {
        return interaction.reply({
            embeds: [buildWarningEmbed(
                'Já está em fila!',
                `Você já está na fila de **${MODE_LABELS[existing.mode]}** — R$${existing.value}.\n\nClique em **📤 Sair** para sair antes de entrar em outra.`
            )],
            ephemeral: true,
        });
    }

    // Adiciona à fila
    const result = db.addToQueue(user.id, user.username, modo, valor, guild.id);
    if (!result.success) {
        return interaction.reply({
            embeds: [buildErrorEmbed('Erro ao entrar na fila. Tente novamente.')],
            ephemeral: true,
        });
    }

    // Atualiza o embed do painel para mostrar o jogador
    await refreshFilaEmbed(guild, valor);

    // Verifica se já tem par para criar partida
    const pair = db.getQueuePair(modo, valor, guild.id);
    const emoji = modo === 'gelo_infinito' ? '❄️' : '🧊';

    if (pair) {
        // 2º jogador — partida vai ser criada
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`${emoji} Partida encontrada!`)
                    .setDescription(
                        `**Modo:** ${MODE_LABELS[modo]}\n` +
                        `**Valor:** R$ ${valor},00\n\n` +
                        `✅ Criando o ticket da partida...`
                    )
                    .setColor(COLORS.SUCCESS)
                    .setTimestamp()
            ],
            ephemeral: true,
        });
    } else {
        // 1º jogador — aguardando oponente
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`${emoji} Você entrou na fila!`)
                    .setDescription(
                        `**Modo:** ${MODE_LABELS[modo]}\n` +
                        `**Valor:** R$ ${valor},00\n\n` +
                        `Aguarde mais **1** jogador para a partida começar!`
                    )
                    .setColor(COLORS.SUCCESS)
                    .setFooter({ text: 'Clique em 📤 Sair para cancelar' })
                    .setTimestamp()
            ],
            ephemeral: true,
        });
    }

    // Cria o match (remove os 2 da fila internamente e cria o ticket)
    await checkAndCreateMatch(guild, modo, valor);

    // Após criar o match, atualiza o embed novamente (fila vazia)
    if (pair) await refreshFilaEmbed(guild, valor);
}

// ============================================================
// SAIR DA FILA
// ============================================================

async function handleLeaveQueue(interaction) {
    const entry = db.isInQueue(interaction.user.id);
    if (!entry) {
        return interaction.reply({
            embeds: [buildInfoEmbed('Não está em fila', 'Você não está em nenhuma fila.')],
            ephemeral: true,
        });
    }

    db.removeFromQueue(interaction.user.id);

    // Atualiza o embed do painel
    await refreshFilaEmbed(interaction.guild, entry.value);

    return interaction.reply({
        embeds: [buildInfoEmbed('Saiu da fila', `Você saiu da fila de **${MODE_LABELS[entry.mode]}** — R$${entry.value}.`)],
        ephemeral: true,
    });
}

// ============================================================
// TICKET — CANCELAR PARTIDA
// ============================================================

async function handleMatchCancelled(interaction) {
    const ticket = db.getTicket(interaction.channel.id);
    if (!ticket) return interaction.reply({ embeds: [buildErrorEmbed('Ticket não encontrado.')], ephemeral: true });

    const isPlayer = interaction.user.id === ticket.player1_id || interaction.user.id === ticket.player2_id;
    if (!isPlayer) return interaction.reply({ embeds: [buildErrorEmbed('Apenas jogadores podem cancelar.')], ephemeral: true });

    db.updateTicketStatus(interaction.channel.id, 'cancelled');
    await interaction.reply({
        embeds: [new EmbedBuilder()
            .setTitle('❌ Partida Cancelada')
            .setDescription(`Cancelada por <@${interaction.user.id}>. Fechando em 5s...`)
            .setColor(COLORS.ERROR)
            .setTimestamp()],
    });
    await closeTicketChannel(interaction.channel, 5000);
}

// ============================================================
// TICKET — FECHAR TICKET (JOGADOR)
// ============================================================

async function handleCloseTicket(interaction) {
    const ticket = db.getTicket(interaction.channel.id);
    if (!ticket) return interaction.reply({ embeds: [buildErrorEmbed('Não é um ticket.')], ephemeral: true });

    const adminRoleId = process.env.ADMIN_ROLE_ID;
    const isAdmin  = interaction.member.permissions.has(8n) || (adminRoleId && interaction.member.roles.cache.has(adminRoleId));
    const isPlayer = interaction.user.id === ticket.player1_id || interaction.user.id === ticket.player2_id;

    if (!isPlayer && !isAdmin) return interaction.reply({ embeds: [buildErrorEmbed('Sem permissão.')], ephemeral: true });

    await interaction.reply({
        embeds: [new EmbedBuilder()
            .setTitle('🔒 Fechando Ticket')
            .setDescription(`Solicitado por <@${interaction.user.id}>. Fechando em 5s...`)
            .setColor(COLORS.WARNING)
            .setTimestamp()],
    });
    await closeTicketChannel(interaction.channel, 5000);
}

// ============================================================
// TICKET — CONFIRMAR PIX (ADMIN)
// ============================================================

async function handleAdminConfirmPix(interaction) {
    const adminRoleId = process.env.ADMIN_ROLE_ID;
    const isAdmin = interaction.member.permissions.has(8n) || (adminRoleId && interaction.member.roles.cache.has(adminRoleId));
    if (!isAdmin) return interaction.reply({ embeds: [buildErrorEmbed('Apenas admins.')], ephemeral: true });

    const ticket = db.getTicket(interaction.channel.id);
    if (!ticket) return interaction.reply({ embeds: [buildErrorEmbed('Ticket não encontrado.')], ephemeral: true });

    await interaction.reply({
        embeds: [new EmbedBuilder()
            .setTitle('💰 PIX Confirmado!')
            .setDescription(`Pagamento confirmado por <@${interaction.user.id}>.\n\n✅ **Podem iniciar a partida!** 🎮`)
            .setColor(COLORS.SUCCESS)
            .setTimestamp()],
    });
}

// ============================================================
// TICKET — FECHAR TICKET (ADMIN)
// ============================================================

async function handleAdminCloseTicket(interaction) {
    const adminRoleId = process.env.ADMIN_ROLE_ID;
    const isAdmin = interaction.member.permissions.has(8n) || (adminRoleId && interaction.member.roles.cache.has(adminRoleId));
    if (!isAdmin) return interaction.reply({ embeds: [buildErrorEmbed('Apenas admins.')], ephemeral: true });

    const ticket = db.getTicket(interaction.channel.id);
    if (!ticket) return interaction.reply({ embeds: [buildErrorEmbed('Ticket não encontrado.')], ephemeral: true });

    await interaction.reply({
        embeds: [new EmbedBuilder()
            .setTitle('🔒 Fechado pelo Admin')
            .setDescription(`Fechado por <@${interaction.user.id}>. Deletando em 5s...`)
            .setColor(COLORS.ERROR)
            .setTimestamp()],
    });
    await closeTicketChannel(interaction.channel, 5000);
}

// ============================================================
// TICKET — DESIGNAR VENCEDOR (ADMIN)
// ============================================================

async function handleSetWinner(interaction, playerNumber) {
    const adminRoleId = process.env.ADMIN_ROLE_ID;
    const isAdmin = interaction.member.permissions.has(8n) || (adminRoleId && interaction.member.roles.cache.has(adminRoleId));
    if (!isAdmin) return interaction.reply({ embeds: [buildErrorEmbed('Apenas admins podem designar o vencedor.')], ephemeral: true });

    const ticket = db.getTicket(interaction.channel.id);
    if (!ticket) return interaction.reply({ embeds: [buildErrorEmbed('Ticket não encontrado.')], ephemeral: true });

    const winnerId   = playerNumber === 1 ? ticket.player1_id   : ticket.player2_id;
    const winnerName = playerNumber === 1 ? ticket.player1_name : ticket.player2_name;
    const loserId    = playerNumber === 1 ? ticket.player2_id   : ticket.player1_id;
    const loserName  = playerNumber === 1 ? ticket.player2_name : ticket.player1_name;

    db.addHistorico(winnerId, winnerName, loserId, loserName, ticket.mode, ticket.value, ticket.guild_id, ticket.channel_id);
    db.updateTicketStatus(ticket.channel_id, 'finished');

    await interaction.reply({
        embeds: [buildVencedorEmbed(winnerId, loserId, ticket.mode, ticket.value)],
    });

    await closeTicketChannel(interaction.channel, 8000);
}

module.exports = { handleButton };
