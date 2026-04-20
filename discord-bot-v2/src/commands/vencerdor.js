// ============================================================
// src/commands/vencedor.js
// ============================================================

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { closeTicketChannel } = require('../services/matchmaking');
const { buildErrorEmbed, buildVencedorEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vencedor')
        .setDescription('Designar o vencedor da partida (Admin)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(opt =>
            opt.setName('player')
                .setDescription('O jogador que venceu a partida')
                .setRequired(true)
        ),

    async execute(interaction) {
        const { member, channel, guild } = interaction;

        const adminRoleId = process.env.ADMIN_ROLE_ID;
        const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator)
            || (adminRoleId && member.roles.cache.has(adminRoleId));

        if (!isAdmin) {
            return interaction.reply({
                embeds: [buildErrorEmbed('Apenas administradores podem usar este comando.')],
                ephemeral: true,
            });
        }

        const ticket = db.getTicket(channel.id);
        if (!ticket) {
            return interaction.reply({
                embeds: [buildErrorEmbed('Este canal não é um ticket ativo.')],
                ephemeral: true,
            });
        }

        const winner = interaction.options.getUser('player');

        const isPlayer = winner.id === ticket.player1_id || winner.id === ticket.player2_id;
        if (!isPlayer) {
            return interaction.reply({
                embeds: [buildErrorEmbed('O jogador informado não faz parte desta partida.')],
                ephemeral: true,
            });
        }

        const winnerId   = winner.id;
        const winnerName = winner.username;
        const loserId    = winner.id === ticket.player1_id ? ticket.player2_id   : ticket.player1_id;
        const loserName  = winner.id === ticket.player1_id ? ticket.player2_name : ticket.player1_name;

        db.addHistorico(winnerId, winnerName, loserId, loserName, ticket.mode, ticket.value, ticket.guild_id, ticket.channel_id);
        db.setTicketResult(channel.id, winnerId, winnerName, loserId, loserName, 'finished');
        db.updateTicketStatus(channel.id, 'finished');

        await interaction.reply({
            embeds: [buildVencedorEmbed(winnerId, loserId, ticket.mode, ticket.value)],
        });

        await closeTicketChannel(channel, 8000, 'finished');
    },
};
