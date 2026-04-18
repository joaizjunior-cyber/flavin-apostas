// ============================================================
// src/services/matchmaking.js
// ============================================================

const { ChannelType, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { buildTicketEmbed, buildTicketButtons, buildAdminButtons, buildPixEmbed } = require('../utils/embeds');
const { MODE_LABELS } = require('../config/constants');

async function checkAndCreateMatch(guild, mode, value, categoria = 'Mobile', formato = '1x1') {
    const pair = db.getQueuePair(mode, value, guild.id, categoria, formato);
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
        db.addToQueue(p1Data.user_id, p1Data.username, mode, value, guild.id, categoria, formato);
        db.addToQueue(p2Data.user_id, p2Data.username, mode, value, guild.id, categoria, formato);
        return false;
    }

    const nextAdmin = db.getNextAdmin(guild.id);
    if (nextAdmin) {
        db.removeAdminFromQueue(nextAdmin.user_id);
        console.log(`[MATCHMAKING] Admin designado: ${nextAdmin.username}`);
    }

    await createTicketChannel(guild, player1, player2, mode, value, nextAdmin, categoria, formato);
    return true;
}

async function createTicketChannel(guild, player1, player2, mode, value, adminData = null, categoria = 'Mobile', formato = '1x1') {
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
        topic: `${categoria} | ${formato} | ${MODE_LABELS[mode]} | R$${value} | ${player1.user.username} vs ${player2.user.username}`,
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
    db.createTicket(
        channel.id,
        { id: player1.id, username: player1.user.username },
        { id: player2.id, username: player2.user.u
