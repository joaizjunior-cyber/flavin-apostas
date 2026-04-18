// ============================================================
// src/utils/embeds.js
// ============================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS, BUTTONS, MODE_LABELS } = require('../config/constants');

// ============================================================
// PAINEL — 1 embed por fila mostrando jogadores
// ============================================================

function buildFilaEmbed(valor, normalPlayer = null, infinitoPlayer = null, categoria = 'Mobile', formato = '1x1') {
    const normalText   = normalPlayer   ? `<@${normalPlayer}>`   : 'Nenhum jogador na fila.';
    const infinitoText = infinitoPlayer ? `<@${infinitoPlayer}>` : 'Nenhum jogador na fila.';

    return new EmbedBuilder()
        .setTitle(`${categoria} | ${formato} | R$${valor},00`)
        .setDescription(
            `**Gel Normal:**\n${normalText}\n\n` +
            `**Gel Inf:**\n${infinitoText}`
        )
        .setColor(COLORS.ICE_NORM)
        .setTimestamp();
}

function buildFilaButtons(valor, categoria = 'Mobile', formato = '1x1') {
    const cat = categoria.toLowerCase().replace(/\s/g, '');
    const fmt = formato.toLowerCase().replace('x', 'x');
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`fila_normal_${valor}_${cat}_${fmt}`)
            .setLabel('🧊 Gel Normal')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`fila_infinito_${valor}_${cat}_${fmt}`)
            .setLabel('❄️ Gel Inf')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(BUTTONS.LEAVE_QUEUE)
            .setLabel('Sair')
            .setEmoji('📤')
            .setStyle(ButtonStyle.Danger),
    );
}

// ============================================================
// EMBED DE TICKET
// ============================================================

function buildTicketEmbed(player1, player2, mode, value, adminId = null, categoria = 'Mobile', formato = '1x1') {
    const label = MODE_LABELS[mode];
    const color = mode === 'gelo_infinito' ? COLORS.ICE_INF : COLORS.ICE_NORM;

    return new EmbedBuilder()
        .setTitle(`⚔️ ${player1.username} vs ${player2.username}`)
        .setDescription(
            `> Partida criada! Boa sorte aos jogadores.\n\n` +
            `👤 **Jogador 1:** <@${player1.id}>\n` +
            `👤 **Jogador 2:** <@${player2.id}>\n` +
            `🎮 **Modo:** ${label}\n` +
            `📱 **Categoria:** ${categoria}\n` +
            `⚔️ **Formato:** ${formato}\n` +
            `💰 **Valor:** R$ ${value},00\n` +
            (adminId ? `👮 **Admin:** <@${adminId}>\n` : `👮 **Admin:** Aguardando...\n`) +
            `\n━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `📋 **Instruções:**\n` +
            `1. Aguarde o admin enviar o PIX\n` +
            `2. Realize o pagamento\n` +
            `3. Admin confirma e envia a sala\n` +
            `4. Joguem e divirtam-se!\n` +
            `5. Após a partida, use /vencedor @player\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `⚠️ **Não inicie a partida antes da confirmação do PIX!**`
        )
        .setColor(color)
        .setFooter({ text: 'Sistema de Matchmaking • Ticket Ativo' })
        .setTimestamp();
}

function buildTicketButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(BUTTONS.MATCH_CANCELLED)
            .setLabel('❌ Cancelar Partida')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(BUTTONS.CLOSE_TICKET)
            .setLabel('🔒 Fechar Ticket')
            .setStyle(ButtonStyle.Secondary),
    );
}

function buildAdminButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(BUTTONS.ADMIN_CONFIRM_PIX)
            .setLabel('💰 Confirmar PIX')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(BUTTONS.ADMIN_CLOSE_TICKET)
            .setLabel('🔒 Fechar (Admin)')
            .setStyle(ButtonStyle.Danger),
    );
}

// ============================================================
// EMBED DE PIX
// ============================================================

function buildPixEmbed(adminId, chave, valor, player1Id, player2Id) {
    return new EmbedBuilder()
        .setTitle('💰 Informações de Pagamento PIX')
        .setDescription(
            `<@${player1Id}> e <@${player2Id}>, realizem o pagamento:\n\n` +
            `👮 **Admin:** <@${adminId}>\n` +
            `🔑 **Chave PIX:** \`${chave}\`\n` +
            `💵 **Valor:** R$ ${valor.toFixed(2)}\n\n` +
            `⚠️ Após pagar, aguarde a confirmação do admin!`
        )
        .setColor(COLORS.SUCCESS)
        .setTimestamp();
}

// ============================================================
// EMBED DE SALA
// ============================================================

function buildSalaEmbed(adminId, salaId, senha, player1Id, player2Id) {
    return new EmbedBuilder()
        .setTitle('🎮 Informações da Sala')
        .setDescription(
            `<@${player1Id}> e <@${player2Id}>, entrem na sala:\n\n` +
            `👮 **Admin:** <@${adminId}>\n` +
            `🏠 **ID da Sala:** \`${salaId}\`\n` +
            (senha ? `🔐 **Senha:** \`${senha}\`\n` : '') +
            `\n✅ **Boa sorte a ambos os jogadores!**`
        )
        .setColor(COLORS.INFO)
        .setTimestamp();
}

function buildSalaButtons(salaId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomI
