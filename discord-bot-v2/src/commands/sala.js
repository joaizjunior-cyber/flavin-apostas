// ============================================================
// src/commands/sala.js - Comando /sala
// ============================================================

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { buildErrorEmbed, buildSalaEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sala')
        .setDescription('Enviar informações da sala para os jogadores (Admin)')
        .addStringOption(opt =>
            opt.setName('id')
                .setDescription('ID da sala')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('senha')
                .setDescription('Senha da sala (opcional)')
                .setRequired(false)
        ),

    async execute(interaction) {
        const { user, guild, member } = interaction;

        const adminRoleId = process.env.ADMIN_ROLE_ID;
        const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator)
            || (adminRoleId && member.roles.cache.has(adminRoleId));

        if (!isAdmin) {
            return interaction.reply({
                embeds: [buildErrorEmbed('Apenas administradores podem usar este comando.')],
                ephemeral: true,
            });
        }

        const ticket = db.getTicket(interaction.channel.id);
        if (!ticket) {
            return interaction.reply({
                embeds: [buildErrorEmbed('Este canal não é um ticket ativo.')],
                ephemeral: true,
            });
        }

        const salaId = interaction.options.getString('id');
        const senha = interaction.options.getString('senha');

        await interaction.reply({
            embeds: [buildSalaEmbed(user.id, salaId, senha, ticket.player1_id, ticket.player2_id)],
        });
    },
};
