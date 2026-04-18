// ============================================================
// src/utils/embeds.js
// ============================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS, BUTTONS, MODE_LABELS } = require('../config/constants');

function buildFilaEmbed(valor, normalPlayer, infinitoPlayer, categoria, formato) {
    normalPlayer = normalPlayer || null;
    infinitoPlayer = infinitoPlayer || null;
    categoria = categoria || 'Mobile';
    formato = formato || '1x1';

    const normalText   = normalPlayer   ? '<@' + normalPlayer + '>'   : 'Nenhum jogador na fila.';
    const infinitoText = infinitoPlayer ? '<@' + infinitoPlayer + '>' : 'Nenhum jogador na fila.';

    return new EmbedBuilder()
        .setTitle(categoria + ' | ' + formato + ' | R$' + valor + ',00')
        .setDescription('**Gel Normal:**\n' + normalText + '\n\n**Gel Inf:**\n' + infinitoText)
        .setColor(COLORS.ICE_NORM)
        .setTimestamp();
}

function buildFilaButtons(valor, categoria, formato) {
    categoria = categoria || 'Mobile';
    formato = formato || '1x1';
    const cat = categoria.toLowerCase().replace(/\s/g, '');
    const fmt = formato.toLowerCase();
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('fila_normal_' + valor + '_' + cat + '_' + fmt)
            .setLabel('🧊 Gel Normal')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('fila_infinito_' + valor + '_' + cat + '_' + fmt)
            .setLabel('❄️ Gel Inf')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(BUTTONS.LEAVE_QUEUE)
            .setLabel('Sair')
            .setEmoji('📤')
            .setStyle(ButtonStyle.Danger),
    );
}

function buildTicketEmbed(player1, player2, mode, value, adminId, categoria, formato) {
    adminId = adminId || null;
    categoria = categoria || 'Mobile';
    formato = formato || '1x1';
    const label = MODE_LABELS[mode] || mode;
    const color = mode === 'gelo_infinito' ? COLORS.ICE_INF : COLORS.ICE_NORM;

    return new EmbedBuilder()
        .setTitle('⚔️ ' + player1.username + ' vs ' + player2.username)
        .setDescription(
            '> Partida criada! Boa sorte aos jogadores.\n\n' +
            '👤 **Jogador 1:** <@' + player1.id + '>\n' +
            '👤 **Jogador 2:** <@' + player2.id + '>\n' +
            '🎮 **Modo:** ' + label + '\n' +
            '📱 **Categoria:** ' + categoria + '\n' +
            '⚔️ **Formato:** ' + formato + '\n' +
            '💰 **Valor:** R$ ' + value + ',00\n' +
            (adminId ? '👮 **Admin:** <@' + adminId + '>\n' : '👮 **Admin:** Aguardando...\n') +
            '\n━━━━━━━━━━━━━━━━━━━━━━━\n' +
            '📋 **Instruções:**\n' +
            '1. Aguarde o admin enviar o PIX\n' +
            '2. Realize o pagamento\n' +
            '3. Admin confirma e envia a sala\n' +
            '4. Joguem e divirtam-se!\n' +
            '5. Após a partida, use /vencedor @player\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
            '⚠️ **Não inicie a partida antes da confirmação do PIX!**'
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

function buildPixEmbed(adminId, chave, valor, player1Id, player2Id) {
    return new EmbedBuilder()
        .setTitle('💰 Informações de Pagamento PIX')
        .setDescription(
            '<@' + player1Id + '> e <@' + player2Id + '>, realizem o pagamento:\n\n' +
            '👮 **Admin:** <@' + adminId + '>\n' +
            '🔑 **Chave PIX:** `' + chave + '`\n' +
            '💵 **Valor:** R$ ' + valor.toFixed(2) + '\n\n' +
            '⚠️ Após pagar, aguarde a confirmação do admin!'
        )
        .setColor(COLORS.SUCCESS)
        .setTimestamp();
}

function buildSalaEmbed(adminId, salaId, senha, player1Id, player2Id) {
    return new EmbedBuilder()
        .setTitle('🎮 Informações da Sala')
        .setDescription(
            '<@' + player1Id + '> e <@' + player2Id + '>, entrem na sala:\n\n' +
            '👮 **Admin:** <@' + adminId + '>\n' +
            '🏠 **ID da Sala:** `' + salaId + '`\n' +
            (senha ? '🔐 **Senha:** `' + senha + '`\n' : '') +
            '\n✅ **Boa sorte a ambos os jogadores!**'
        )
        .setColor(COLORS.INFO)
        .setTimestamp();
}

function buildSalaButtons(salaId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('copiar_sala_id_' + salaId)
            .setLabel('📋 Copiar ID da Sala')
            .setStyle(ButtonStyle.Secondary),
    );
}

function buildVencedorEmbed(winnerId, loserId, mode, value) {
    return new EmbedBuilder()
        .setTitle('🏆 Partida Finalizada!')
        .setDescription(
            '**Vencedor:** <@' + winnerId + '> 🎉\n' +
            '**Perdedor:** <@' + loserId + '>\n\n' +
            '🎮 **Modo:** ' + (MODE_LABELS[mode] || mode) + '\n' +
            '💰 **Valor:** R$ ' + value + ',00\n\n' +
            'Vitória registrada no histórico! O ticket será fechado em breve.'
        )
        .setColor(COLORS.GOLD)
        .setTimestamp();
}

function buildHistoricoEmbed(userId, username, historico) {
    const vitorias = historico.filter(function(h) { return h.winner_id === userId; }).length;
    const derrotas  = historico.filter(function(h) { return h.loser_id  === userId; }).length;

    const lista = historico.slice(0, 10).map(function(h) {
        const ganhou   = h.winner_id === userId;
        const emoji    = ganhou ? '✅' : '❌';
        const oponente = ganhou ? h.loser_name : h.winner_name;
        const data     = new Date(h.created_at).toLocaleDateString('pt-BR');
        return emoji + ' vs **' + oponente + '** — R$' + h.value + ' — ' + (MODE_LABELS[h.mode] || h.mode) + ' — ' + data;
    }).join('\n') || 'Nenhuma partida registrada.';

    return new EmbedBuilder()
        .setTitle('📊 Histórico de ' + username)
        .setDescription('✅ **Vitórias:** ' + vitorias + '\n❌ **Derrotas:** ' + derrotas + '\n\n**Últimas partidas:**\n' + lista)
        .setColor(COLORS.INFO)
        .setTimestamp();
}

function buildRankingEmbed(ranking) {
    const medals = ['🥇', '🥈', '🥉'];
    const lista = ranking.map(function(r, i) {
        const medal = medals[i] || '**' + (i + 1) + '.**';
        return medal + ' <@' + r.winner_id + '> — **' + r.vitorias + '** vitória(s)';
    }).join('\n') || 'Nenhuma partida registrada ainda.';

    return new EmbedBuilder()
        .setTitle('🏆 Ranking Geral')
        .setDescription(lista)
        .setColor(COLORS.GOLD)
        .setFooter({ text: 'Top 10 jogadores por vitórias' })
        .setTimestamp();
}

function buildErrorEmbed(message) {
    return new EmbedBuilder().setTitle('❌ Erro').setDescription(message).setColor(COLORS.ERROR).setTimestamp();
}

function buildWarningEmbed(title, message) {
    return new EmbedBuilder().setTitle('⚠️ ' + title).setDescription(message).setColor(COLORS.WARNING).setTimestamp();
}

function buildInfoEmbed(title, message) {
    return new EmbedBuilder().setTitle('ℹ️ ' + title).setDescription(message).setColor(COLORS.INFO).setTimestamp();
}

function buildSuccessEmbed(title, message) {
    return new EmbedBuilder().setTitle('✅ ' + title).setDescription(message).setColor(COLORS.SUCCESS).setTimestamp();
}

module.exports = {
    buildFilaEmbed, buildFilaButtons,
    buildTicketEmbed, buildTicketButtons, buildAdminButtons,
    buildPixEmbed, buildSalaEmbed, buildSalaButtons, buildVencedorEmbed,
    buildHistoricoEmbed, buildRankingEmbed,
    buildErrorEmbed, buildWarningEmbed, buildInfoEmbed, buildSuccessEmbed,
};
