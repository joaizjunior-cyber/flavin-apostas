// ============================================================
// src/commands/painel.js
// ============================================================

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { buildFilaEmbed, buildFilaButtons } = require('../utils/embeds');
const db = require('../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('painel')
        .setDescription('Envia o painel de matchmaking')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt =>
            opt.setName('categoria')
                .setDescription('Categoria das filas')
                .setRequired(true)
                .addChoices(
                    { name: 'Mobile',   value: 'Mobile'   },
                    { name: 'Misto',    value: 'Misto'    },
                    { name: 'Emulador', value: 'Emulador' },
                )
        )
        .addStringOption(opt =>
            opt.setName('formato')
                .setDescription('Formato das partidas')
                .setRequired(true)
                .addChoices(
                    { name: '1x1', value: '1x1' },
                    { name: '2x2', value: '2x2' },
                    { name: '3x3', value: '3x3' },
                    { name: '4x4', value: '4x4' },
                )
        ),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ Apenas admins.', ephemeral: true });
        }

        const categoria = interaction.options.getString('categoria');
        const formato   = interaction.options.getString('formato');

        await interaction.reply({ content: '✅ Enviando painel **' + categoria + ' | ' + formato + '**...', ephemeral: true });

        for (let valor = 20; valor >= 1; valor--) {
            const msg = await interaction.channel.send({
                embeds: [buildFilaEmbed(valor, null, null, categoria, formato)],
                components: [buildFilaButtons(valor, categoria, formato)],
            });
            db.saveFilaMessageId(interaction.guild.id, interaction.channel.id, valor, msg.id, categoria, formato);
        }
    },
};
