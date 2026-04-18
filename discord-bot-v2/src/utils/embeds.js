// ============================================================
// src/utils/embeds.js
// ============================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS, BUTTONS, MODE_LABELS } = require('../config/constants');

// ============================================================
// PAINEL — 1 embed por fila (R$1 a R$20) mostrando jogadores
// ============================================================

/**
 * Gera o embed de uma fila específica com os jogadores atuais.
 * @param {number} valor - Valor da fila (ex: 5)
 * @param {string|null} normalPlayer - Username de quem está na fila gelo_normal (ou null)
 * @param {string|null} infinitoPlayer - Username de quem está na fila gelo_infinito (ou null)
 */
function buildFilaEmbed(valor, normalPlayer = null, infinitoPlayer = null) {
    const normalText  = normalPlayer  ? `<@${normalPlayer}>`  : 'Nenhum jogador na fila.';
    const infinitoText = infinitoPlayer ? `<@${infinitoPlayer}>` : 'Nenhum jogador na fila.';

    return new EmbedBuilder()
        .setTitle(`1x1 Mobile | R$${valor},00`)
        .setDescription(
            `**Gel Normal:**\n${normalText}\n\n` +
            `**Gel Inf:**\n${infinitoText}`
        )
        .setColor(COLORS.ICE_NORM)
        .setTimestamp();
}

/**
 * Gera os botões de uma fila: Gel Normal | Gel Inf | Sair
 */
function buildFilaButtons(valor) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`fila_normal_${valor}`)
            .setLabel('🧊 Gel Normal')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`fila_infinito_${valor}`)
            .setLabel('❄️ Gel Inf')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(BUTTONS.LEAVE_QUEUE)
            .setLabel('Sair')
            .setEmoji('📤')
            .setStyle(ButtonStyle.Danger),
    );
}

/**
 * Retorna array de { embeds, components } — 1 item por fila (R$1 a R$20).
 * Usado no /painel para enviar todas as mensagens de uma vez.
 */
function buildPanelMessages() {
    const messages = [];
    for (let valor = 1; valor <= 20; valor++) {
        messages.push({
            embeds: [buildFilaEmbed(valor)],
            components: [buildFilaButtons(valor)],
        });
    }
    return messages;
}

// ============================================================
// EMBED DE TICKET
// ============================================================

function buildTicketEmbed(player1, player2, mode, value, adminId = null) {
    const label = MODE_LABELS[mode];
    const color = mode === 'gelo_infinito' ? COLORS.ICE_INF : COLORS.ICE_NORM;

    return new EmbedBuilder()
        .setTitle(`⚔️ ${player1.username} vs ${player2.username}`)
        .setDescription(
            `> Partida criada! Boa sorte aos jogadores.\n\n` +
            `👤 **Jogador 1:** <@${player1.id}>\n` +
            `👤 **Jogador 2:** <@${player2.id}>\n` +
            `🎮 **Modo:** ${label}\n` +
            `💰 **Valor:** R$ ${value},00\n` +
            (adminId ? `👮 **Admin:** <@${adminId}>\n` : `👮 **Admin:** Aguardando...\n`) +
            `\n━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `📋 **Instruções:**\n` +
            `1. Aguarde o admin enviar o PIX\n` +
            `2. Realize o pagamento\n` +
            `3. Admin confirma e envia a sala\n` +
            `4. Joguem e divirtam-se!\n` +
            `5. Após a partida, o admin designa o vencedor\n` +
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

function buildAdminButtons(player1Name, player2Name) {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(BUTTONS.ADMIN_CONFIRM_PIX)
            .setLabel('💰 Confirmar PIX')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(BUTTONS.ADMIN_CLOSE_TICKET)
            .setLabel('🔒 Fechar (Admin)')
            .setStyle(ButtonStyle.Danger),
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(BUTTONS.ADMIN_SET_WINNER_P1)
            .setLabel(`🏆 Vencedor: ${player1Name.substring(0, 20)}`)
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(BUTTONS.ADMIN_SET_WINNER_P2)
            .setLabel(`🏆 Vencedor: ${player2Name.substring(0, 20)}`)
            .setStyle(ButtonStyle.Success),
    );
    return [row1, row2];
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

// ============================================================
// EMBED DE VENCEDOR
// ============================================================

function buildVencedorEmbed(winnerId, loserId, mode, value) {
    return new EmbedBuilder()
        .setTitle('🏆 Partida Finalizada!')
        .setDescription(
            `**Vencedor:** <@${winnerId}> 🎉\n` +
            `**Perdedor:** <@${loserId}>\n\n` +
            `🎮 **Modo:** ${MODE_LABELS[mode]}\n` +
            `💰 **Valor:** R$ ${value},00\n\n` +
            `Vitória registrada no histórico! O ticket será fechado em breve.`
        )
        .setColor(COLORS.GOLD)
        .setTimestamp();
}

// ============================================================
// EMBED DE HISTÓRICO
// ============================================================

function buildHistoricoEmbed(userId, username, historico) {
    const vitorias = historico.filter(h => h.winner_id === userId).length;
    const derrotas  = historico.filter(h => h.loser_id  === userId).length;

    const lista = historico.slice(0, 10).map(h => {
        const ganhou   = h.winner_id === userId;
        const emoji    = ganhou ? '✅' : '❌';
        const oponente = ganhou ? h.loser_name : h.winner_name;
        const data     = new Date(h.created_at).toLocaleDateString('pt-BR');
        return `${emoji} vs **${oponente}** — R$${h.value} — ${MODE_LABELS[h.mode] || h.mode} — ${data}`;
    }).join('\n') || 'Nenhuma partida registrada.';

    return new EmbedBuilder()
        .setTitle(`📊 Histórico de ${username}`)
        .setDescription(
            `✅ **Vitórias:** ${vitorias}\n` +
            `❌ **Derrotas:** ${derrotas}\n\n` +
            `**Últimas partidas:**\n${lista}`
        )
        .setColor(COLORS.INFO)
        .setTimestamp();
}

// ============================================================
// EMBED DE RANKING
// ============================================================

function buildRankingEmbed(ranking) {
    const medals = ['🥇', '🥈', '🥉'];
    const lista = ranking.map((r, i) => {
        const medal = medals[i] || `**${i + 1}.**`;
        return `${medal} <@${r.winner_id}> — **${r.vitorias}** vitória(s)`;
    }).join('\n') || 'Nenhuma partida registrada ainda.';

    return new EmbedBuilder()
        .setTitle('🏆 Ranking Geral')
        .setDescription(lista)
        .setColor(COLORS.GOLD)
        .setFooter({ text: 'Top 10 jogadores por vitórias' })
        .setTimestamp();
}

// ============================================================
// EMBEDS GENÉRICOS
// ============================================================

function buildErrorEmbed(message) {
    return new EmbedBuilder().setTitle('❌ Erro').setDescription(message).setColor(COLORS.ERROR).setTimestamp();
}

function buildWarningEmbed(title, message) {
    return new EmbedBuilder().setTitle(`⚠️ ${title}`).setDescription(message).setColor(COLORS.WARNING).setTimestamp();
}

function buildInfoEmbed(title, message) {
    return new EmbedBuilder().setTitle(`ℹ️ ${title}`).setDescription(message).setColor(COLORS.INFO).setTimestamp();
}

function buildSuccessEmbed(title, message) {
    return new EmbedBuilder().setTitle(`✅ ${title}`).setDescription(message).setColor(COLORS.SUCCESS).setTimestamp();
}

module.exports = {
    buildFilaEmbed, buildFilaButtons, buildPanelMessages,
    buildTicketEmbed, buildTicketButtons, buildAdminButtons,
    buildPixEmbed, buildSalaEmbed, buildVencedorEmbed,
    buildHistoricoEmbed, buildRankingEmbed,
    buildErrorEmbed, buildWarningEmbed, buildInfoEmbed, buildSuccessEmbed,
};
