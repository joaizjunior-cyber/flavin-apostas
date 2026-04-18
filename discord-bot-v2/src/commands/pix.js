// ============================================================
// src/commands/pix.js - Comando /pix
// ============================================================

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { buildErrorEmbed, buildSuccessEmbed, buildInfoEmbed, buildPixEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pix')
        .setDescription('Gerenciar configurações de PIX (Admin)')
        .addSubcommand(sub =>
            sub.setName('cadastrar')
                .setDescription('Cadastrar sua chave PIX e valor')
                .addStringOption(opt =>
                    opt.setName('chave')
                        .setDescription('Sua chave PIX (CPF, email, telefone, aleatória)')
                        .setRequired(true)
                )
                .addNumberOption(opt =>
                    opt.setName('valor')
                        .setDescription('Valor padrão que você cobra por partida')
                        .setRequired(true)
                        .setMinValue(0.01)
                )
        )
        .addSubcommand(sub =>
            sub.setName('ver')
                .setDescription('Ver seu PIX cadastrado')
        )
        .addSubcommand(sub =>
            sub.setName('enviar')
                .setDescription('Enviar PIX manualmente no ticket atual')
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const { user, guild, member } = interaction;

        // Verificar se é admin
        const adminRoleId = process.env.ADMIN_ROLE_ID;
        const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator)
            || (adminRoleId && member.roles.cache.has(adminRoleId));

        if (!isAdmin) {
            return interaction.reply({
                embeds: [buildErrorEmbed('Apenas administradores podem usar este comando.')],
                ephemeral: true,
            });
        }

        // --------------------------------------------------------
        // CADASTRAR PIX
        // --------------------------------------------------------
        if (sub === 'cadastrar') {
            const chave = interaction.options.getString('chave');
            const valor = interaction.options.getNumber('valor');

            db.setAdminPix(user.id, guild.id, chave, valor);

            return interaction.reply({
                embeds: [buildSuccessEmbed(
                    'PIX Cadastrado!',
                    `**Chave:** \`${chave}\`\n**Valor:** R$ ${valor.toFixed(2)}\n\nSeu PIX será enviado automaticamente nos tickets!`
                )],
                ephemeral: true,
            });
        }

        // --------------------------------------------------------
        // VER PIX
        // --------------------------------------------------------
        if (sub === 'ver') {
            const pixData = db.getAdminPix(user.id, guild.id);
            if (!pixData) {
                return interaction.reply({
                    embeds: [buildInfoEmbed('Sem PIX', 'Você não tem PIX cadastrado. Use **/pix cadastrar**.')],
                    ephemeral: true,
                });
            }

            return interaction.reply({
                embeds: [buildInfoEmbed(
                    'Seu PIX',
                    `**Chave:** \`${pixData.chave}\`\n**Valor:** R$ ${pixData.valor.toFixed(2)}`
                )],
                ephemeral: true,
            });
        }

        // --------------------------------------------------------
        // ENVIAR PIX NO TICKET
        // --------------------------------------------------------
        if (sub === 'enviar') {
            const ticket = db.getTicket(interaction.channel.id);
            if (!ticket) {
                return interaction.reply({
                    embeds: [buildErrorEmbed('Este canal não é um ticket ativo.')],
                    ephemeral: true,
                });
            }

            const pixData = db.getAdminPix(user.id, guild.id);
            if (!pixData) {
                return interaction.reply({
                    embeds: [buildErrorEmbed('Você não tem PIX cadastrado. Use **/pix cadastrar** primeiro.')],
                    ephemeral: true,
                });
            }

            await interaction.reply({
                embeds: [buildPixEmbed(user.id, pixData.chave, pixData.valor, ticket.player1_id, ticket.player2_id)],
            });
        }
    },
};
