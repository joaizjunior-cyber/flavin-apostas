// ============================================================
// src/interactions/buttonHandler.js
// ============================================================

const { EmbedBuilder } = require('discord.js');
const { BUTTONS, MODE_LABELS, COLORS } = require('../config/constants');
const db = require('../database/db');
const { closeTicketChannel, sendPixAutomatico } = require('../services/matchmaking');
const {
    buildErrorEmbed, buildWarningEmbed, buildInfoEmbed,
    buildFilaEmbed, buildFilaButtons,
    buildConfirmacaoEmbed, buildConfirmButtons,
    buildAdminButtons,
} = require('../utils/embeds');

// ============================================================
// ATUALIZAR PAINEL DA FILA
// ============================================================

async function refreshFilaEmbed(guild, valor) {
    try {
        const records = db.getFilaMessagesByValue(guild.id, valor);
        if (!records || records.length === 0) return;

        for (const record of records) {
            try {
                const channel = await guild.channels.fetch(record.channel_id).catch(() => null);
                if (!channel) continue;

                const msg = await channel.messages.fetch(record.message_id).catch(() => null);
                if (!msg) continue;

                // Busca os jogadores atuais da fila para cada modo separadamente
                const normalPlayers   = db.getQueueByModeAndValue('gelo_normal',   valor, guild.id, record.categoria, record.formato);
                const infinitoPlayers = db.getQueueByModeAndValue('gelo_infinito', valor, guild.id, record.categoria, record.formato);

                const normalId   = normalPlayers.length   > 0 ? normalPlayers[0].user_id   : null;
                const infinitoId = infinitoPlayers.length > 0 ? infinitoPlayers[0].user_id : null;

                await msg.edit({
                    embeds: [buildFilaEmbed(valor, normalId, infinitoId, record.categoria, record.formato)],
                    components: [buildFilaButtons(valor, record.categoria, record.formato)],
                });
            } catch (innerErr) {
                console.error(`[PAINEL] Erro ao atualizar mensagem R$${valor}:`, innerErr.message);
            }
        }
    } catch (err) {
        console.error(`[PAINEL] Erro geral ao atualizar fila R$${valor}:`, err.message);
    }
}

// ============================================================
// ROTEADOR PRINCIPAL
// ============================================================

async function handleButton(interaction) {
    const customId = interaction.customId;

    if (customId.startsWith('fila_normal_') || customId.startsWith('fila_infinito_')) {
        await handleFilaButton(interaction);
        return;
    }

    if (customId.startsWith('copiar_sala_id_')) {
        const salaId = customId.replace('copiar_sala_id_', '');
        return interaction.reply({ content: `\`${salaId}\``, ephemeral: true });
    }

    switch (customId) {
        case BUTTONS.LEAVE_QUEUE:        await handleLeaveQueue(interaction);       break;
        case BUTTONS.CONFIRM_MATCH:      await handleConfirmMatch(interaction);     break;
        case BUTTONS.MATCH_CANCELLED:    await handleMatchCancelled(interaction);   break;
        case BUTTONS.CLOSE_TICKET:       await handleCloseTicket(interaction);      break;
        case BUTTONS.ADMIN_CONFIRM_PIX:  await handleAdminConfirmPix(interaction);  break;
        case BUTTONS.ADMIN_CLOSE_TICKET: await handleAdminCloseTicket(interaction); break;
        default: console.warn('[BOTAO] ID desconhecido: ' + customId);
    }
}

// ============================================================
// BOTÕES DO PAINEL DE FILA
// ============================================================

async function handleFilaButton(interaction) {
    const { customId, user, guild } = interaction;
    const { checkAndCreateMatch } = require('../services/matchmaking');

    const parts        = customId.split('_');
    const modoKey      = parts[1];
    const valor        = parseInt(parts[2]);
    const categoriaRaw = parts[3] || 'mobile';
    const formato      = parts[4] || '1x1';

    const categoriaMap = { mobile: 'Mobile', misto: 'Misto', emulador: 'Emulador' };
    const categoria    = categoriaMap[categoriaRaw] || categoriaRaw;
    const modo         = modoKey === 'infinito' ? 'gelo_infinito' : 'gelo_normal';

    const existing = db.isInQueue(user.id);
    if (existing) {
        return interaction.reply({
            embeds: [buildWarningEmbed('Já está em fila!', 'Você já está em uma fila.\n\nClique em **Sair** para sair antes de entrar em outra.')],
            ephemeral: true,
        });
    }

    const result = db.addToQueue(user.id, user.username, modo, valor, guild.id, categoria, formato);
    if (!result.success) {
        return interaction.reply({ embeds: [buildErrorEmbed('Erro ao entrar na fila. Tente novamente.')], ephemeral: true });
    }

    // Atualiza o painel ANTES de responder para o jogador ver o nome aparecer
    await refreshFilaEmbed(guild, valor);

    const pair  = db.getQueuePair(modo, valor, guild.id, categoria, formato);
    const emoji = modo === 'gelo_infinito' ? '❄️' : '🧊';

    if (pair) {
        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setTitle(`${emoji} Partida encontrada!`)
                .setDescription(`**Categoria:** ${categoria}\n**Formato:** ${formato}\n**Modo:** ${MODE_LABELS[modo] || modo}\n**Valor:** R$ ${valor},00\n\n✅ Criando o ticket...`)
                .setColor(COLORS.SUCCESS).setTimestamp()],
            ephemeral: true,
        });
    } else {
        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setTitle(`${emoji} Você entrou na fila!`)
                .setDescription(`**Categoria:** ${categoria}\n**Formato:** ${formato}\n**Modo:** ${MODE_LABELS[modo] || modo}\n**Valor:** R$ ${valor},00\n\nAguarde mais **1** jogador para a partida começar!`)
                .setColor(COLORS.SUCCESS)
                .setFooter({ text: 'Clique em Sair para cancelar' })
                .setTimestamp()],
            ephemeral: true,
        });
    }

    await checkAndCreateMatch(guild, modo, valor, categoria, formato);

    // Atualiza novamente após criar o match (limpa os nomes do painel)
    await refreshFilaEmbed(guild, valor);
}

// ============================================================
// CONFIRMAR PARTIDA
// ============================================================

async function handleConfirmMatch(interaction) {
    // Sempre busca o ticket fresquinho do banco
    const ticket = db.getTicket(interaction.channel.id);
    if (!ticket) {
        return interaction.reply({ embeds: [buildErrorEmbed('Ticket não encontrado.')], ephemeral: true });
    }

   const userId    = String(interaction.user.id);
    const isPlayer1 = userId === String(ticket.player1_id);
    const isPlayer2 = userId === String(ticket.player2_id);

    console.log(`[CONFIRM] userId=${userId} | p1=${ticket.player1_id} | p2=${ticket.player2_id} | isP1=${isPlayer1} | isP2=${isPlayer2}`);

    console.log(`[CONFIRM] userId=${userId} | p1=${ticket.player1_id} | p2=${ticket.player2_id} | isP1=${isPlayer1} | isP2=${isPlayer2}`);
    // Só jogadores da partida confirmam
    if (!isPlayer1 && !isPlayer2) {
        return interaction.reply({
            embeds: [buildErrorEmbed('Apenas os jogadores desta partida podem confirmar.')],
            ephemeral: true,
        });
    }

    // Bloqueia se já confirmou
    if (isPlayer1 && ticket.player1_confirmed) {
        return interaction.reply({
            embeds: [buildInfoEmbed('Já confirmado', 'Você já confirmou! Aguardando **o outro jogador** confirmar.')],
            ephemeral: true,
        });
    }
    if (isPlayer2 && ticket.player2_confirmed) {
        return interaction.reply({
            embeds: [buildInfoEmbed('Já confirmado', 'Você já confirmou! Aguardando **o outro jogador** confirmar.')],
            ephemeral: true,
        });
    }

    // Usa funções separadas para player1 e player2 — sem risco de sobrescrever
    let ticketAtualizado;
    if (isPlayer1) {
        ticketAtualizado = db.confirmPlayer1(interaction.channel.id);
    } else {
        ticketAtualizado = db.confirmPlayer2(interaction.channel.id);
    }

    const p1Confirmed    = !!ticketAtualizado.player1_confirmed;
    const p2Confirmed    = !!ticketAtualizado.player2_confirmed;
    const ambosConfirmaram = p1Confirmed && p2Confirmed;

    const confirmEmbed = buildConfirmacaoEmbed(ticket.player1_id, ticket.player2_id, p1Confirmed, p2Confirmed);
    const confirmBtns  = buildConfirmButtons(p1Confirmed, p2Confirmed);
    const adminBtns    = buildAdminButtons();

    // Atualiza os botões na mensagem original
    try {
        const msg = await interaction.channel.messages.fetch(ticket.message_id);
        await msg.edit({ components: [confirmBtns, adminBtns] });
    } catch (err) {
        console.error('[CONFIRM] Erro ao editar mensagem:', err.message);
    }

    // Mostra para todos no canal o status das confirmações
    await interaction.reply({ embeds: [confirmEmbed], ephemeral: false });

    // Dispara o PIX automático apenas quando os DOIS confirmarem
    if (ambosConfirmaram) {
        await sendPixAutomatico(interaction.channel, ticketAtualizado, interaction.guild);
    }
}

// ============================================================
// CANCELAR PARTIDA — apenas jogadores
// ============================================================

async function handleMatchCancelled(interaction) {
    const ticket = db.getTicket(interaction.channel.id);
    if (!ticket) return interaction.reply({ embeds: [buildErrorEmbed('Ticket não encontrado.')], ephemeral: true });

    const isPlayer = interaction.user.id === ticket.player1_id || interaction.user.id === ticket.player2_id;
    if (!isPlayer) {
        return interaction.reply({
            embeds: [buildErrorEmbed('Apenas os jogadores desta partida podem cancelar.')],
            ephemeral: true,
        });
    }

    db.setTicketClosed(interaction.channel.id, 'cancelled');
    db.updateTicketStatus(interaction.channel.id, 'cancelled');

    await interaction.reply({
        embeds: [new EmbedBuilder()
            .setTitle('❌ Partida Cancelada')
            .setDescription(`Cancelada por <@${interaction.user.id}>. Fechando em 5s...`)
            .setColor(COLORS.ERROR).setTimestamp()],
    });

    await closeTicketChannel(interaction.channel, 5000, 'cancelled');
}

// ============================================================
// FECHAR TICKET — apenas admins
// ============================================================

async function handleCloseTicket(interaction) {
    const ticket = db.getTicket(interaction.channel.id);
    if (!ticket) return interaction.reply({ embeds: [buildErrorEmbed('Não é um ticket.')], ephemeral: true });

    const adminRoleId = process.env.ADMIN_ROLE_ID;
    const isAdmin = interaction.member.permissions.has(8n) || (adminRoleId && interaction.member.roles.cache.has(adminRoleId));

    if (!isAdmin) {
        return interaction.reply({
            embeds: [buildErrorEmbed('Apenas administradores podem fechar o ticket.')],
            ephemeral: true,
        });
    }

    db.setTicketClosed(interaction.channel.id, 'admin_closed');

    await interaction.reply({
        embeds: [new EmbedBuilder()
            .setTitle('🔒 Fechando Ticket')
            .setDescription(`Fechado por <@${interaction.user.id}>. Deletando em 5s...`)
            .setColor(COLORS.WARNING).setTimestamp()],
    });

    await closeTicketChannel(interaction.channel, 5000, 'admin_closed');
}

// ============================================================
// ADMIN: CONFIRMAR PIX
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
            .setDescription(`Confirmado por <@${interaction.user.id}>.\n\n✅ **Podem iniciar a partida!** 🎮`)
            .setColor(COLORS.SUCCESS).setTimestamp()],
    });
}

// ============================================================
// ADMIN: FECHAR TICKET (botão admin)
// ============================================================

async function handleAdminCloseTicket(interaction) {
    const adminRoleId = process.env.ADMIN_ROLE_ID;
    const isAdmin = interaction.member.permissions.has(8n) || (adminRoleId && interaction.member.roles.cache.has(adminRoleId));
    if (!isAdmin) return interaction.reply({ embeds: [buildErrorEmbed('Apenas admins.')], ephemeral: true });

    const ticket = db.getTicket(interaction.channel.id);
    if (!ticket) return interaction.reply({ embeds: [buildErrorEmbed('Ticket não encontrado.')], ephemeral: true });

    db.setTicketClosed(interaction.channel.id, 'admin_closed');

    await interaction.reply({
        embeds: [new EmbedBuilder()
            .setTitle('🔒 Fechado pelo Admin')
            .setDescription(`Fechado por <@${interaction.user.id}>. Deletando em 5s...`)
            .setColor(COLORS.ERROR).setTimestamp()],
    });

    await closeTicketChannel(interaction.channel, 5000, 'admin_closed');
}

module.exports = { handleButton, refreshFilaEmbed };
async function handleLeaveQueue(interaction) {
    const entry = db.isInQueue(interaction.user.id);
    if (!entry) {
        return interaction.reply({
            embeds: [buildInfoEmbed('Não está em fila', 'Você não está em nenhuma fila no momento.')],
            ephemeral: true,
        });
    }

    db.removeFromQueue(interaction.user.id);

    await refreshFilaEmbed(interaction.guild, entry.value);

    return interaction.reply({
        embeds: [buildInfoEmbed('Saiu da fila', `Você saiu da fila de **${MODE_LABELS[entry.mode] || entry.mode}** — R$${entry.value},00.`)],
        ephemeral: true,
    });
}
