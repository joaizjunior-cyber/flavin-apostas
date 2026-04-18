// ============================================================
// src/commands/historico.js - Histórico e Ranking
// ============================================================

const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { buildHistoricoEmbed, buildRankingEmbed, buildInfoEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('historico')
        .setDescription('Ver histórico de partidas de um jogador')
        .addUserOption(opt =>
            opt.setName('jogador')
                .setDescription('Jogador para ver o histórico (padrão: você mesmo)')
                .setRequired(false)
        ),

    async execute(interaction) {
        const alvo = interaction.options.getUser('jogador') || interaction.user;
        const historico = db.getHistorico(alvo.id, interaction.guild.id);

        return interaction.reply({
            embeds: [buildHistoricoEmbed(alvo.id, alvo.username, historico)],
            ephemeral: true,
        });
    },
};
