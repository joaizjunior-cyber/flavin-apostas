// ============================================================
// src/commands/admin.js
// ============================================================

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { closeTicketChannel } = require('../services/matchmaking');
const { COLORS, MODE_LABELS } = require('../config/constants');
const { buildErrorEmbed, buildSuccessEmbed, buildInfoEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Comandos administrativos')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('fila_entrar')
                .setDescription('Entrar na fila de admins disponíveis')
        )
        .addSubcommand(sub =>
            sub.setName('fila_sair')
                .setDescription('Sair da fila de admins')
        )
        .addSubcommand(sub =>
            sub.setName('fila_ver')
                .setDescription('Ver admins disponíveis na fila')
        )
        .addSubcommand(sub =>
            sub.setName('tickets')
                .setDescription('Listar tickets ativos')
        )
        .addSubcommand(sub =>
            sub.setName('fechar')
                .setDescription('Fechar ticket do canal atual')
        )
        .addSubcommand(sub =>
            sub.setName('aviso')
                .setDescription('Enviar aviso no canal atual')
                .addStringOption(opt =>
                    opt.setName('mensagem').setDescription('Mensagem').setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('limpar_fila')
                .setDescription('Limpar fila de jogadores')
                .addStringOption(opt =>
                    opt.setName('modo')
                        .setDescription('Modo')
                        .setRequired(true)
                        .addChoices(
                            { name: '❄️ Gelo Infinito', value: 'gelo_infinito' },
                            { name: '🧊 Gelo Normal', value: 'gelo_normal' },
                            { name: '🔥 Todas', value: 'all' },
                        )
                )
        ),

    async execute(interaction) {
        const adminRoleId = process.env.ADMIN_ROLE_ID;
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator)
            || (adminRoleId && interaction.member.roles.cache.has(adminRoleId));

        if (!isAdmin) {
            return interaction.reply({ embeds: [buildErrorEmbed('Sem permissão.')], ephemeral: true });
        }

        const sub = interaction.options.getSubcommand();
        const { user, guild } = interaction;

        // --------------------------------------------------------
        // FILA DE ADMINS
        // --------------------------------------------------------
        if (sub === 'fila_entrar') {
            const result = db.addAdminToQueue(user.id, user.username, guild.id);
            if (!result.success) {
                return interaction.reply({ embeds: [buildInfoEmbed('Já na fila', 'Você já está na fila de admins.')], ephemeral: true });
            }
            const queue = db.getAdminQueue(guild.id);
            return interaction.reply({
                embeds: [buildSuccessEmbed('Entrou na fila de admins!', `Você está na posição **#${queue.length}** da fila.\n\nSerá designado automaticamente para a próxima partida!`)],
                ephemeral: true,
            });
        }

        if (sub === 'fila_sair') {
            const entry = db.isAdminInQueue(user.id);
            if (!entry) {
                return interaction.reply({ embeds: [buildInfoEmbed('Não está na fila', 'Você não está na fila de admins.')], ephemeral: true });
            }
            db.removeAdminFromQueue(user.id);
            return interaction.reply({ embeds: [buildSuccessEmbed('Saiu da fila', 'Você saiu da fila de admins.')], ephemeral: true });
        }

        if (sub === 'fila_ver') {
            const queue = db.getAdminQueue(guild.id);
            const lista = queue.length > 0
                ? queue.map((a, i) => `**${i + 1}.** ${a.username}`).join('\n')
                : 'Nenhum admin disponível.';
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`👮 Fila de Admins (${queue.length})`)
                        .setDescription(lista)
                        .setColor(COLORS.INFO)
                        .setTimestamp()
                ],
                ephemeral: true,
            });
        }

        // --------------------------------------------------------
        // TICKETS
        // --------------------------------------------------------
        if (sub === 'tickets') {
            const tickets = db.getActiveTickets(guild.id);
            if (tickets.length === 0) {
                return interaction.reply({ content: 'ℹ️ Sem tickets ativos.', ephemeral: true });
            }
            const list = tickets.map((t, i) => {
                const mode = MODE_LABELS[t.mode] || t.mode;
                return `**${i + 1}.** <#${t.channel_id}> — ${mode} — R$${t.value}\n└ ${t.player1_name} vs ${t.player2_name}`;
            }).join('\n\n');
            return interaction.reply({
                embeds: [new EmbedBuilder().setTitle(`🎫 Tickets (${tickets.length})`).setDescription(list).setColor(COLORS.TICKET).setTimestamp()],
                ephemeral: true,
            });
        }

        if (sub === 'fechar') {
            const ticket = db.getTicket(interaction.channel.id);
            if (!ticket) return interaction.reply({ embeds: [buildErrorEmbed('Não é um ticket.')], ephemeral: true });
            await interaction.reply({
                embeds: [new EmbedBuilder().setTitle('🔒 Fechando...').setDescription(`Fechado por <@${user.id}>. Deletando em 5s...`).setColor(COLORS.ERROR).setTimestamp()],
            });
            await closeTicketChannel(interaction.channel, 5000);
        }

        if (sub === 'aviso') {
            const msg = interaction.options.getString('mensagem');
            await interaction.reply({
                embeds: [new EmbedBuilder().setTitle('📢 Aviso do Admin').setDescription(msg).setColor(COLORS.WARNING).setFooter({ text: `Por ${user.tag}` }).setTimestamp()],
            });
        }

        if (sub === 'limpar_fila') {
            const modo = interaction.options.getString('modo');
            if (modo === 'all') {
                db.db.prepare('DELETE FROM queue WHERE guild_id = ?').run(guild.id);
                return interaction.reply({ content: '✅ Todas as filas limpas.', ephemeral: true });
            }
            db.db.prepare('DELETE FROM queue WHERE mode = ? AND guild_id = ?').run(modo, guild.id);
            return interaction.reply({ content: `✅ Fila de **${MODE_LABELS[modo]}** limpa.`, ephemeral: true });
        }
    },
};
