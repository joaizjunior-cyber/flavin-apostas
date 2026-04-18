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

// ============================================================
// ATUALIZA EMBED DA FILA
// ============================================================

async function refreshFilaEmbed(guild, valor) {
    try {
        const records = db.getFilaMessagesByValue(guild.id, valor);
        if (!records || records.length === 0) return;

        for (const record of records) {
            const channel = await guild.channels.fetch(record.channel_id).catch(() => null);
            if (!channel) continue;

            const msg = await channel.messages.fetch(record.message_id).catch(() => null);
            if (!msg) continue;

            const normalPlayers   = db.getQueueByModeAndValue('gelo_normal',   valor, guild.id, record.categoria, record.formato);
            const infinitoPlayers = db.getQueueByModeAndValue('gelo_infinito', valor, guild.id, record.categoria, record.formato);

            const normalId   = normalPlayers[0]   ? normalPlayers[0].user_id   : null;
            const infinitoId = infinitoPlayers[0] ? infinitoPlayers[0].user_id : null;

            await msg.edit({
                embeds: [buildFilaEmbed(valor, normalId, infinitoId, record.categoria, record.formato)],
                components: [buildFilaButtons(valor, record.categoria, record.formato)],
            });
        }
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

    if (customId.startsWith('copiar_sala_id_')) {
        const salaId = customId.replace('copiar_sala_id_', '');
        return interaction.reply({
            content: `\`${salaId}\``,
            ephemeral: true,
        });
    }

    switch (customId) {
        case BUTTONS.LEAVE_QUEUE:        await handleLeaveQueue(interaction);       break;
        case BUTTONS.MATCH_CANCELLED:    await handleMatchCancelled(interaction);   break;
        case BUTTONS.CLOSE_TICKET:       await handleCloseTicket(interaction);      break;
        case BUTTONS.ADMIN_CONFIRM_PIX:  await handleAdminConfirmPix(interaction);  break;
        case BUTTONS.ADMIN_CLOSE_TICKET: await handleAdminCloseTicket(interaction); break;
        default: console.warn(`[BOTÃO] ID desconhecido: ${customId}`);
    }
}

// ============================================================
// ENTRAR NA FILA
// ============================================================

async function handleFilaButton(inter
