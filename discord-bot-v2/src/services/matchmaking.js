// ============================================================
// src/services/matchmaking.js
// ============================================================

const { ChannelType, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { buildTicketEmbed, buildTicketButtons, buildAdminButtons, buildPixEmbed } = require('../utils/embeds');
const { MODE_LABELS, MODE_EMOJIS } = require('../config/constants');

async function checkAndCreateMatch(guild, mode, value) {
    const pair = db.getQueuePair(mode, value, guild.id);
    if (!pair) return false;

    const [p1Data, p2Data] = pair;
    db.removeFromQueue(p1Data.user_id);
    db.removeFromQueue(p2Data.user_id);

    let player1, player2;
    try {
        player1 = await guild.members.fetch(p1Data.user_id);
        player2 = await guild.members.fetch(p2Data.user_id);
    } catch (err) {
        console.error('[MATCHMAKING] Erro ao buscar membros:', err.message);
        db.addToQueue(p1Data.user_id, p1Data.username, mode, value, guild.id);
        db.addToQueue(p2Data.user_id, p2Data.username, mode, value, guild.id);
        return false;
    }

    // Pegar próximo admin disponível
    const nextAdmin = db.getNextAdmin(guild.id);
    if (nextAdmin) {
        db.removeAdminFromQueue(nextAdmin.user_id);
        console.log(`[MATCHMAKING] Admin designado: ${nextAdmin.username}`);
    }

    await createTicketChannel(guild, player1, player2, mode, value, nextAdmin);
    return true;
}

async function createTicketChannel(guild, player1, player2, mode, value, adminData = null) {
    const modeSlug = mode === 'gelo_infinito' ? 'gelo-inf' : 'gelo-norm';
    const name1 = sanitizeName(player1.user.username);
    const name2 = sanitizeName(player2.user.username);
    const channelName = `${modeSlug}-r${value}-${name1}-vs-${name2}`;

    const permissionOverwrites = [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
            id: player1.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
        {
            id: player2.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
    ];

    const adminRoleId = process.env.ADMIN_ROLE_ID;
    if (adminRoleId) {
        permissionOverwrites.push({
            id: adminRoleId,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels],
        });
    }

    // Adicionar admin designado às permissões
    if (adminData) {
        permissionOverwrites.push({
            id: adminData.user_id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels],
        });
    }

    const channelOptions = {
        name: channelName,
        type: ChannelType.GuildText,
        permissionOverwrites,
        topic: `${MODE_LABELS[mode]} | R$${value} | ${player1.user.username} vs ${player2.user.username}`,
    };

    const categoryId = process.env.TICKET_CATEGORY_ID;
    if (categoryId) channelOptions.parent = categoryId;

    let channel;
    try {
        channel = await guild.channels.create(channelOptions);
    } catch (err) {
        console.error('[TICKET] Erro ao criar canal:', err.message);
        return;
    }

    const adminId = adminData ? adminData.user_id : null;
    db.createTicket(channel.id, { id: player1.id, username: player1.user.username }, { id: player2.id, username: player2.user.username }, mode, value, guild.id, adminId);

    try {
        const embed = buildTicketEmbed(player1.user, player2.user, mode, value, adminId);
        const ticketBtns = buildTicketButtons();
        const adminBtns = buildAdminButtons(player1.user.username, player2.user.username);

        const mentions = adminId
            ? `<@${player1.id}> <@${player2.id}> <@${adminId}>`
            : `<@${player1.id}> <@${player2.id}>`;

        const msg = await channel.send({
            content: mentions,
            embeds: [embed],
            components: [ticketBtns, ...adminBtns],
        });

        db.updateTicketMessage(channel.id, msg.id);

        // Se admin tem PIX cadastrado, envia automaticamente
        if (adminId) {
            const pixData = db.getAdminPix(adminId, guild.id);
            if (pixData) {
                const pixEmbed = buildPixEmbed(adminId, pixData.chave, pixData.valor, player1.id, player2.id);
                await channel.send({ embeds: [pixEmbed] });
            }
        }

    } catch (err) {
        console.error('[TICKET] Erro ao enviar mensagem:', err.message);
    }
}

async function closeTicketChannel(channel, delayMs = 5000) {
    db.updateTicketStatus(channel.id, 'closed');
    await new Promise(resolve => setTimeout(resolve, delayMs));
    try {
        await channel.delete('Ticket encerrado');
        db.deleteTicket(channel.id);
    } catch (err) {
        console.error('[TICKET] Erro ao deletar canal:', err.message);
    }
}

function sanitizeName(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 12) || 'jogador';
}

module.exports = { checkAndCreateMatch, closeTicketChannel };
