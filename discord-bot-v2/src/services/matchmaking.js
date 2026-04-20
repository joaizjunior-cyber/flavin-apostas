// ============================================================
// src/services/matchmaking.js
// ============================================================

const { ChannelType, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const QRCode = require('qrcode');
const db = require('../database/db');
const {
    buildTicketEmbed, buildConfirmacaoEmbed, buildConfirmButtons,
    buildAdminButtons, buildLogEmbed,
} = require('../utils/embeds');
const { MODE_LABELS } = require('../config/constants');

// ============================================================
// MATCHMAKING
// ============================================================

async function checkAndCreateMatch(guild, mode, value, categoria, formato) {
    categoria = categoria || 'Mobile';
    formato   = formato   || '1x1';
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
    if (nextAdmin) db.removeAdminFromQueue(nextAdmin.user_id);

    await createTicketChannel(guild, player1, player2, mode, value, nextAdmin, categoria, formato);
    return true;
}

// ============================================================
// CRIAÇÃO DO TICKET
// ============================================================

async function createTicketChannel(guild, player1, player2, mode, value, adminData, categoria, formato) {
    adminData = adminData || null;
    categoria = categoria || 'Mobile';
    formato   = formato   || '1x1';

    const modeSlug   = mode === 'gelo_infinito' ? 'gelo-inf' : 'gelo-norm';
    const name1      = sanitizeName(player1.user.username);
    const name2      = sanitizeName(player2.user.username);
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
        topic: `${categoria} | ${formato} | ${MODE_LABELS[mode] || mode} | R$${value} | ${player1.user.username} vs ${player2.user.username}`,
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
        { id: player2.id, username: player2.user.username },
        mode, value, guild.id, adminId, categoria, formato
    );

    try {
        const ticket = db.getTicket(channel.id);
        const embed       = buildTicketEmbed(player1.user, player2.user, mode, value, adminId, categoria, formato);
        const confirmEmbed = buildConfirmacaoEmbed(player1.id, player2.id, false, false);
        const confirmBtns  = buildConfirmButtons(false, false);
        const adminBtns    = buildAdminButtons();

        const mentions = adminId
            ? `<@${player1.id}> <@${player2.id}> <@${adminId}>`
            : `<@${player1.id}> <@${player2.id}>`;

        const msg = await channel.send({
            content: mentions,
            embeds: [embed, confirmEmbed],
            components: [confirmBtns, adminBtns],
        });

        db.updateTicketMessage(channel.id, msg.id);

    } catch (err) {
        console.error('[TICKET] Erro ao enviar mensagem:', err.message);
    }
}

// ============================================================
// ENVIO AUTOMÁTICO DO PIX (chamado quando os 2 confirmam)
// ============================================================

async function sendPixAutomatico(channel, ticket, guild) {
    try {
        const adminId = ticket.admin_id;
        if (!adminId) {
            await channel.send({ content: '⚠️ Nenhum admin designado para este ticket. Aguarde um admin enviar o PIX manualmente com `/pix enviar`.' });
            return;
        }

        const pixData = db.getAdminPix(adminId, guild.id);
        if (!pixData) {
            await channel.send({ content: `⚠️ <@${adminId}> não tem chave PIX cadastrada. Use \`/pix cadastrar\` primeiro.` });
            return;
        }

        const valorBase  = ticket.value;
        const taxa       = ticket.taxa || 0;
        const valorTotal = valorBase + taxa;

        // Gera QR Code
        const qrBuffer = await QRCode.toBuffer(pixData.chave, {
            width: 300,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
        });

        const attachment = new AttachmentBuilder(qrBuffer, { name: 'qrcode-pix.png' });

        const { buildPixEmbed } = require('../utils/embeds');
        const pixEmbed = buildPixEmbed(adminId, pixData.chave, valorBase, taxa, ticket.player1_id, ticket.player2_id)
            .setImage('attachment://qrcode-pix.png');

        await channel.send({
            content: `<@${ticket.player1_id}> <@${ticket.player2_id}> <@${adminId}>`,
            embeds: [pixEmbed],
            files: [attachment],
        });

        db.markPixSent(channel.id, pixData.chave);

    } catch (err) {
        console.error('[PIX AUTO] Erro ao enviar PIX:', err.message);
    }
}

// ============================================================
// FECHAR TICKET + LOG
// ============================================================

async function closeTicketChannel(channel, delayMs, closeReason) {
    delayMs     = delayMs     || 5000;
    closeReason = closeReason || 'cancelled';

    db.updateTicketStatus(channel.id, 'closed');

    // Salva o motivo de fechamento se ainda não foi salvo por setTicketResult
    const ticket = db.getTicket(channel.id);
    if (ticket && !ticket.closed_at) {
        db.setTicketClosed(channel.id, closeReason);
    }

    // Envia log para o canal específico
    await sendTicketLog(channel.guild, channel.id);

    await new Promise(resolve => setTimeout(resolve, delayMs));

    try {
        await channel.delete('Ticket encerrado');
        db.deleteTicket(channel.id);
    } catch (err) {
        console.error('[TICKET] Erro ao deletar canal:', err.message);
    }
}

async function sendTicketLog(guild, channelId) {
    try {
        const logChannelId = process.env.LOG_CHANNEL_ID;
        if (!logChannelId) return;

        const logChannel = await guild.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) return;

        const ticket = db.getTicket(channelId);
        if (!ticket) return;

        const logEmbed = buildLogEmbed(ticket);
        await logChannel.send({ embeds: [logEmbed] });

    } catch (err) {
        console.error('[LOG] Erro ao enviar log:', err.message);
    }
}

// ============================================================
// UTILITÁRIOS
// ============================================================

function sanitizeName(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 12) || 'jogador';
}

module.exports = { checkAndCreateMatch, closeTicketChannel, sendPixAutomatico };
