// ============================================================
// src/commands/painel.js
// ============================================================

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { buildPanelMessages } = require('../utils/embeds');
const db = require('../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('painel')
        .setDescription('Envia o painel principal de matchmaking')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ Apenas admins.', ephemeral: true });
        }

        await interaction.reply({ content: '✅ Enviando painel...', ephemeral: true });

        const messages = buildPanelMessages(); // 20 mensagens, 1 por fila

        for (let i = 0; i < messages.length; i++) {
            const valor = i + 1;
            const msg = await interaction.channel.send(messages[i]);
            // Salva o messageId para edição dinâmica depois
            db.saveFilaMessageId(interaction.guild.id, interaction.channel.id, valor, msg.id);
        }
    },
};
