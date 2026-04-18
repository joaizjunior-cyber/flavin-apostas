// ============================================================
// src/commands/fila.js - Comando /fila
// ============================================================

const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { checkAndCreateMatch } = require('../services/matchmaking');
const { buildErrorEmbed, buildWarningEmbed, buildInfoEmbed, buildSuccessEmbed } = require('../utils/embeds');
const { MODE_LABELS, QUEUE_VALUES } = require('../config/constants');
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../config/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fila')
        .setDescription('Sistema de filas de matchmaking')
        .addSubcommand(sub =>
            sub.setName('entrar')
                .setDescription('Entrar em uma fila')
                .addIntegerOption(opt =>
                    opt.setName('valor')
                        .setDescription('Valor da aposta em reais (R$1 a R$50)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(50)
                )
                .addStringOption(opt =>
                    opt.setName('modo')
                        .setDescription('Modo de jogo')
                        .setRequired(true)
                        .addChoices(
                            { name: '❄️ Gelo Infinito', value: 'gelo_infinito' },
                            { name: '🧊 Gelo Normal',   value: 'gelo_normal'   },
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('sair')
                .setDescription('Sair da fila atual')
        )
        .addSubcommand(sub =>
            sub.setName('status')
                .setDescription('Ver status das filas')
                .addIntegerOption(opt =>
                    opt.setName('valor')
                        .setDescription('Filtrar por valor (opcional)')
                        .setMinValue(1)
                        .setMaxValue(50)
                )
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const { user, guild } = interaction;

        // --------------------------------------------------------
        // ENTRAR NA FILA
        // --------------------------------------------------------
        if (sub === 'entrar') {
            const valor = interaction.options.getInteger('valor');
            const modo = interaction.options.getString('modo');

            const existing = db.isInQueue(user.id);
            if (existing) {
                return interaction.reply({
                    embeds: [buildWarningEmbed(
                        'Já está em fila!',
                        `Você já está na fila de **${MODE_LABELS[existing.mode]}** — R$${existing.value}.\n\nUse **/fila sair** para sair antes de entrar em outra.`
                    )],
                    ephemeral: true,
                });
            }

            const result = db.addToQueue(user.id, user.username, modo, valor, guild.id);
            if (!result.success) {
                return interaction.reply({
                    embeds: [buildErrorEmbed('Erro ao entrar na fila. Tente novamente.')],
                    ephemeral: true,
                });
            }

            const queueList = db.getQueueByModeAndValue(modo, valor, guild.id);
            const position = queueList.findIndex(p => p.user_id === user.id) + 1;
            const needed = 2 - position;

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`${modo === 'gelo_infinito' ? '❄️' : '🧊'} Você entrou na fila!`)
                        .setDescription(
                            `**Modo:** ${MODE_LABELS[modo]}\n` +
                            `**Valor:** R$ ${valor},00\n` +
                            `**Posição:** #${position}\n\n` +
                            `Aguarde mais **${needed}** jogador(es) para a partida começar!`
                        )
                        .setColor(COLORS.SUCCESS)
                        .setFooter({ text: 'Use /fila sair para cancelar' })
                        .setTimestamp()
                ],
                ephemeral: true,
            });

            // Verificar se pode criar partida
            await checkAndCreateMatch(guild, modo, valor);
        }

        // --------------------------------------------------------
        // SAIR DA FILA
        // --------------------------------------------------------
        if (sub === 'sair') {
            const entry = db.isInQueue(user.id);
            if (!entry) {
                return interaction.reply({
                    embeds: [buildInfoEmbed('Não está em fila', 'Você não está em nenhuma fila.')],
                    ephemeral: true,
                });
            }

            db.removeFromQueue(user.id);
            return interaction.reply({
                embeds: [buildInfoEmbed('Saiu da fila', `Você saiu da fila de **${MODE_LABELS[entry.mode]}** — R$${entry.value}.`)],
                ephemeral: true,
            });
        }

        // --------------------------------------------------------
        // STATUS DAS FILAS
        // --------------------------------------------------------
        if (sub === 'status') {
            const filtroValor = interaction.options.getInteger('valor');
            const counts = db.getQueueCounts(guild.id);

            if (counts.length === 0) {
                return interaction.reply({
                    embeds: [buildInfoEmbed('Filas Vazias', 'Não há jogadores em nenhuma fila no momento.')],
                    ephemeral: true,
                });
            }

            const filtered = filtroValor
                ? counts.filter(c => c.value === filtroValor)
                : counts;

            const lista = filtered.map(c =>
                `**R$${c.value}** — ${MODE_LABELS[c.mode] || c.mode}: \`${c.count}/2\``
            ).join('\n');

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('📋 Status das Filas')
                        .setDescription(lista || 'Nenhuma fila com jogadores.')
                        .setColor(COLORS.INFO)
                        .setTimestamp()
                ],
                ephemeral: true,
            });
        }
    },
};
