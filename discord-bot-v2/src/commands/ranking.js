// ============================================================
// src/commands/ranking.js
// ============================================================

const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { buildRankingEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ranking')
        .setDescription('Ver o ranking geral de vitórias'),

    async execute(interaction) {
        const ranking = db.getRanking(interaction.guild.id);
        return interaction.reply({
            embeds: [buildRankingEmbed(ranking)],
        });
    },
};
