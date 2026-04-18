// ============================================================
// src/interactions/buttonHandler.js
// ============================================================

const { EmbedBuilder } = require('discord.js');
const { BUTTONS, MODE_LABELS, COLORS } = require('../config/constants');
const db = require('../database/db');
const { closeTicketChannel } = require('../services/matchmaking');
const {
    buildErrorEmbed, buildWarningEmbed, buildInfoEmbed,
    buildFilaEmbed, buildFilaButtons,
} = require('../utils/embeds');

async function refreshFilaEmbed(guild, valor) {
    try {
        const records = db.getFilaMessagesByValue(guild.id, valor);
        if (!records || records.length === 0) return;
        for (var i = 0; i < records.length; i++) {
            var record = records[i];
            var channel = await guild.channels.fetch(record.channel_id).catch(function() { return null; });
            if (!channel) continue;
            var msg = await channel.messages.fetch(record.message_id).catch(function() { return null; });
            if (!msg) continue;
            var normalPlayers   = db.getQueueByModeAndValue('gelo_normal',   valor, guild.id, record.categoria, record.formato);
            var infinitoPlayers = db.getQueueByModeAndValue('gelo_infinito', valor, guild.id, record.categoria, record.formato);
            var normalId   = normalPlayers[0]   ? normalPlayers[0].user_id   : null;
            var infinitoId = infinitoPlayers[0] ? infinitoPlayers[0].user_id : null;
            await msg.edit({
                embeds: [buildFilaEmbed(valor, normalId, infinitoId, record.categoria, record.formato)],
                components: [buildFilaButtons(valor, record.categoria, record.formato)],
            });
        }
    } catch (err) {
        console.error('[PAINEL] Erro ao atualizar embed da fila R$' + valor + ':', err.message);
    }
}

async function handleButton(interaction) {
    var customId = interaction.customId;

    if (customId.startsWith('fila_normal_') || customId.startsWith('fila_infinito_')) {
        await handleFilaButton(interaction);
        return;
    }

    if (customId.startsWith('copiar_sala_id_')) {
        var salaId = customId.replace('copiar_sala_id_', '');
        return interaction.reply({ content: '`' + salaId + '`', ephemeral: true });
    }

    switch (customId) {
        case BUTTONS.LEAVE_QUEUE:        await handleLeaveQueue(interaction);       break;
        case BUTTONS.MATCH_CANCELLED:    await handleMatchCancelled(interaction);   break;
        case BUTTONS.CLOSE_TICKET:       await handleCloseTicket(interaction);      break;
        case BUTTONS.ADMIN_CONFIRM_PIX:  await handleAdminConfirmPix(interaction);  break;
        case BUTTONS.ADMIN_CLOSE_TICKET: await handleAdminCloseTicket(interaction); break;
        default: console.warn('[BOTAO] ID desconhecido: ' + customId);
    }
}

async function handleFilaButton(interaction) {
    var customId = interaction.customId;
    var user     = interaction.user;
    var guild    = interaction.guild;
    var checkAndCreateMatch = require('../services/matchmaking').checkAndCreateMatch;

    var parts       = customId.split('_');
    var modoKey     = parts[1];
    var valor       = parseInt(parts[2]);
    var categoriaRaw = parts[3] || 'mobile';
    var formato     = parts[4] || '1x1';

    var categoriaMap = { mobile: 'Mobile', mobilador: 'Mobilador', emulador: 'Emulador' };
    var categoria = categoriaMap[categoriaRaw] || categoriaRaw;
    var modo = modoKey === 'infinito' ? 'gelo_infinito' : 'gelo_normal';

    var existing = db.isInQueue(user.id);
    if (existing) {
        return interaction.reply({
            embeds: [buildWarningEmbed('Ja esta em fila!', 'Voce ja esta em uma fila.\n\nClique em **Sair** para sair antes de entrar em outra.')],
            ephemeral: true,
        });
    }

    var result = db.addToQueue(user.id, user.username, modo, valor, guild.id, categoria, formato);
    if (!result.success) {
        return interaction.reply({ embeds: [buildErrorEmbed('Erro ao entrar na fila. Tente novamente.')], ephemeral: true });
    }

    await refreshFilaEmbed(guild, valor);

    var pair  = db.getQueuePair(modo, valor, guild.id, categoria, formato);
    var emoji = modo === 'gelo_infinito' ? '❄️' : '🧊';

    if (pair) {
        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setTitle(emoji + ' Partida encontrada!')
                .setDescription('**Categoria:** ' + categoria + '\n**Formato:** ' + formato + '\n**Modo:** ' + (MODE_LABELS[modo] || modo) + '\n**Valor:** R$ ' + valor + ',00\n\n✅ Criando o ticket...')
                .setColor(COLORS.SUCCESS).setTimestamp()],
            ephemeral: true,
        });
    } else {
        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setTitle(emoji + ' Voce entrou na fila!')
                .setDescription('**Categoria:** ' + categoria + '\n**Formato:** ' + formato + '\n**Modo:** ' + (MODE_LABELS[modo] || modo) + '\n**Valor:** R$ ' + valor + ',00\n\nAguarde mais **1** jogador para a partida comecar!')
                .setColor(COLORS.SUCCESS)
                .setFooter({ text: 'Clique em Sair para cancelar' })
                .setTimestamp()],
            ephemeral: true,
        });
    }

    await checkAndCreateMatch(guild, modo, valor, categoria, formato);
    if (pair) await refreshFilaEmbed(guild, valor);
}

async function handleLeaveQueue(interaction) {
    var entry = db.isInQueue(interaction.user.id);
    if (!entry) {
        return interaction.reply({ embeds: [buildInfoEmbed('Nao esta em fila', 'Voce nao esta em nenhuma fila.')], ephemeral: true });
    }
    db.removeFromQueue(interaction.user.id);
    await refreshFilaEmbed(interaction.guild, entry.value);
    return interaction.reply({
        embeds: [buildInfoEmbed('Saiu da fila', 'Voce saiu da fila de **' + (MODE_LABELS[entry.mode] || entry.mode) + '** — R$' + entry.value + '.')],
        ephemeral: true,
    });
}

async function handleMatchCancelled(interaction) {
    var ticket = db.getTicket(interaction.channel.id);
    if (!ticket) return interaction.reply({ embeds: [buildErrorEmbed('Ticket nao encontrado.')], ephemeral: true });
    var isPlayer = interaction.user.id === ticket.player1_id || interaction.user.id === ticket.player2_id;
    if (!isPlayer) return interaction.reply({ embeds: [buildErrorEmbed('Apenas jogadores podem cancelar.')], ephemeral: true });
    db.updateTicketStatus(interaction.channel.id, 'cancelled');
    await interaction.reply({
        embeds: [new EmbedBuilder().setTitle('❌ Partida Cancelada').setDescription('Cancelada por <@' + interaction.user.id + '>. Fechando em 5s...').setColor(COLORS.ERROR).setTimestamp()],
    });
    await closeTicketChannel(interaction.channel, 5000);
}

async function handleCloseTicket(interaction) {
    var ticket = db.getTicket(interaction.channel.id);
    if (!ticket) return interaction.reply({ embeds: [buildErrorEmbed('Nao e um ticket.')], ephemeral: true });
    var adminRoleId = process.env.ADMIN_ROLE_ID;
    var isAdmin  = interaction.member.permissions.has(8n) || (adminRoleId && interaction.member.roles.cache.has(adminRoleId));
    var isPlayer = interaction.user.id === ticket.player1_id || interaction.user.id === ticket.player2_id;
    if (!isPlayer && !isAdmin) return interaction.reply({ embeds: [buildErrorEmbed('Sem permissao.')], ephemeral: true });
    await interaction.reply({
        embeds: [new EmbedBuilder().setTitle('🔒 Fechando Ticket').setDescription('Solicitado por <@' + interaction.user.id + '>. Fechando em 5s...').setColor(COLORS.WARNING).setTimestamp()],
    });
    await closeTicketChannel(interaction.channel, 5000);
}

async function handleAdminConfirmPix(interaction) {
    var adminRoleId = process.env.ADMIN_ROLE_ID;
    var isAdmin = interaction.member.permissions.has(8n) || (adminRoleId && interaction.member.roles.cache.has(adminRoleId));
    if (!isAdmin) return interaction.reply({ embeds: [buildErrorEmbed('Apenas admins.')], ephemeral: true });
    var ticket = db.getTicket(interaction.channel.id);
    if (!ticket) return interaction.reply({ embeds: [buildErrorEmbed('Ticket nao encontrado.')], ephemeral: true });
    await interaction.reply({
        embeds: [new EmbedBuilder().setTitle('💰 PIX Confirmado!').setDescription('Confirmado por <@' + interaction.user.id + '>.\n\n✅ **Podem iniciar a partida!** 🎮').setColor(COLORS.SUCCESS).setTimestamp()],
    });
}

async function handleAdminCloseTicket(interaction) {
    var adminRoleId = process.env.ADMIN_ROLE_ID;
    var isAdmin = interaction.member.permissions.has(8n) || (adminRoleId && interaction.member.roles.cache.has(adminRoleId));
    if (!isAdmin) return interaction.reply({ embeds: [buildErrorEmbed('Apenas admins.')], ephemeral: true });
    var ticket = db.getTicket(interaction.channel.id);
    if (!ticket) return interaction.reply({ embeds: [buildErrorEmbed('Ticket nao encontrado.')], ephemeral: true });
    await interaction.reply({
        embeds: [new EmbedBuilder().setTitle('🔒 Fechado pelo Admin').setDescription('Fechado por <@' + interaction.user.id + '>. Deletando em 5s...').setColor(COLORS.ERROR).setTimestamp()],
    });
    await closeTicketChannel(interaction.channel, 5000);
}

module.exports = { handleButton };
