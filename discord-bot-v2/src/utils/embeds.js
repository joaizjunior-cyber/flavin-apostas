// ============================================================
// src/utils/embeds.js
// ============================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS, BUTTONS, MODE_LABELS } = require('../config/constants');

function buildFilaEmbed(valor, normalPlayer, infinitoPlayer, categoria, formato) {
    normalPlayer   = normalPlayer   || null;
    infinitoPlayer = infinitoPlayer || null;
    categoria      = categoria      || 'Mobile';
    formato        = formato        || '1x1';

    const normalText   = normalPlayer   ? `<@${normalPlayer}> — aguardando...`   : 'Nenhum jogador na fila.';
    const infinitoText = infinitoPlayer ? `<@${infinitoPlayer}> — aguardando...` : 'Nenhum jogador na fila.';

    return new EmbedBuilder()
        .setTitle(`${categoria} | ${formato} | R$${valor},00`)
        .setDescription(
            `**🧊 Gelo Normal:**\n${normalText}\n\n` +
            `**❄️ Gelo Infinito:**\n${infinitoText}`
        )
        .setColor(COLORS.ICE_NORM)
        .setTimestamp();
}

function buildFilaButtons(valor, categoria, formato) {
    categoria = categoria || 'Mobile';
    formato   = formato   || '1x1';
    const cat = categoria.toLowerCase().replace(/\s/g, '');
    const fmt = formato.toLowerCase();
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

function buildTicketEmbed(player1, player2, mode, value, adminId, categoria, formato) {
    adminId   = adminId   || null;
    categoria = categoria || 'Mobile';
    formato   = formato   || '1x1';
    const label = MODE_LABELS[mode] || mode;
    const color = mode === 'gelo_infinito' ? COLORS.ICE_INF : COLORS.ICE_NORM;

    return new EmbedBuilder()
        .setTitle(`⚔️ ${player1.username} vs ${player2.username}`)
        .setDescription(
            '> Partida criada! Combinem as regras e cliquem em **Confirmar** para iniciar.\n\n' +
            `👤 **Jogador 1:** <@${player1.id}>\n` +
            `👤 **Jogador 2:** <@${player2.id}>\n` +
            `🎮 **Modo:** ${label}\n` +
            `📱 **Categoria:** ${categoria}\n` +
            `⚔️ **Formato:** ${formato}\n` +
            `💰 **Valor:** R$ ${value},00\n` +
            (adminId ? `👮 **Admin:** <@${adminId}>\n` : '👮 **Admin:** Aguardando...\n') +
            '\n━━━━━━━━━━━━━━━━━━━━━━━\n' +
            '📋 **Instruções:**\n' +
            '1. Combinem as regras da partida\n' +
            '2. **Ambos** cliquem em ✅ Confirmar\n' +
            '3. O bot enviará o PIX automaticamente\n' +
            '4. Realizem o pagamento\n' +
            '5. Admin confirma e envia a sala\n' +
            '6. Após a partida, use /vencedor @player\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
            '⚠️ **Não inicie a partida antes da confirmação do PIX!**'
        )
        .setColor(color)
        .setFooter({ text: 'Sistema de Matchmaking • Ticket Ativo' })
        .setTimestamp();
}

function buildConfirmacaoEmbed(player1Id, player2Id, p1Confirmed, p2Confirmed) {
    const p1Status = p1Confirmed ? '✅' : '⏳';
    const p2Status = p2Confirmed ? '✅' : '⏳';
    const ambos    = p1Confirmed && p2Confirmed;

    return new EmbedBuilder()
        .setTitle(ambos ? '✅ Partida Confirmada!' : '⏳ Aguardando Confirmação')
        .setDescription(
            `${p1Status} <@${player1Id}>\n` +
            `${p2Status} <@${player2Id}>\n\n` +
            (ambos
                ? '🎉 Ambos confirmaram! Enviando informações de pagamento...'
                : 'Aguardando ambos os jogadores clicarem em **Confirmar**.')
        )
        .setColor(ambos ? COLORS.SUCCESS : COLORS.WARNING)
        .setTimestamp();
}

// Linha 1: Confirmar (jogadores) | Cancelar Partida (jogadores)
function buildConfirmButtons(p1Confirmed, p2Confirmed) {
    const ambos = p1Confirmed && p2Confirmed;
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(BUTTONS.CONFIRM_MATCH)
            .setLabel('✅ Confirmar')
            .setStyle(ButtonStyle.Success)
            .setDisabled(ambos),
        new ButtonBuilder()
            .setCustomId(BUTTONS.MATCH_CANCELLED)
            .setLabel('❌ Cancelar Partida')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(ambos),
    );
}

// Linha 2: Confirmar PIX (admin) | Fechar Ticket (admin)
function buildAdminButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(BUTTONS.ADMIN_CONFIRM_PIX)
            .setLabel('💰 Confirmar PIX')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(BUTTONS.CLOSE_TICKET)
            .setLabel('🔒 Fechar Ticket')
            .setStyle(ButtonStyle.Secondary),
    );
}

function buildTicketButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(BUTTONS.CLOSE_TICKET)
            .setLabel('🔒 Fechar Ticket')
            .setStyle(ButtonStyle.Secondary),
    );
}

function buildPixEmbed(adminId, chave, valorBase, taxa, player1Id, player2Id) {
    const valorTotal = (valorBase + taxa).toFixed(2);
    const taxaStr    = taxa > 0 ? `R$ ${taxa.toFixed(2)}` : 'Sem taxa';

    return new EmbedBuilder()
        .setTitle('💰 Informações de Pagamento PIX')
        .setDescription(
            `<@${player1Id}> e <@${player2Id}>, realizem o pagamento:\n\n` +
            `👮 **Admin:** <@${adminId}>\n` +
            `🔑 **Chave PIX:** \`${chave}\`\n` +
            `💵 **Valor da aposta:** R$ ${Number(valorBase).toFixed(2)}\n` +
            `➕ **Taxa de inscrição:** ${taxaStr}\n` +
            `💳 **Total a pagar:** R$ ${valorTotal}\n\n` +
            '⚠️ Após pagar, aguarde a confirmação do admin!\n' +
            '❌ **Bancos proibidos:** Mercado Pago, Inter, PicPay.'
        )
        .setColor(COLORS.SUCCESS)
        .setTimestamp();
}

function buildSalaEmbed(adminId, salaId, senha, player1Id, player2Id) {
    return new EmbedBuilder()
        .setTitle('🎮 Informações da Sala')
        .setDescription(
            `<@${player1Id}> e <@${player2Id}>, entrem na sala:\n\n` +
            `👮 **Admin:** <@${adminId}>\n` +
            `🏠 **ID da Sala:** \`${salaId}\`\n` +
            (senha ? `🔐 **Senha:** \`${senha}\`\n` : '') +
            '\n✅ **Boa sorte a ambos os jogadores!**'
        )
        .setColor(COLORS.INFO)
        .setTimestamp();
}

function buildSalaButtons(salaId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`copiar_sala_id_${salaId}`)
            .setLabel('📋 Copiar ID da Sala')
            .setStyle(ButtonStyle.Secondary),
    );
}

function buildVencedorEmbed(winnerId, loserId, mode, value) {
    return new EmbedBuilder()
        .setTitle('🏆 Partida Finalizada!')
        .setDescription(
            `**Vencedor:** <@${winnerId}> 🎉\n` +
            `**Perdedor:** <@${loserId}>\n\n` +
            `🎮 **Modo:** ${MODE_LABELS[mode] || mode}\n` +
            `💰 **Valor:** R$ ${value},00\n\n` +
            'Vitória registrada no histórico! O ticket será fechado em breve.'
        )
        .setColor(COLORS.GOLD)
        .setTimestamp();
}

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
        .setDescription(`✅ **Vitórias:** ${vitorias}\n❌ **Derrotas:** ${derrotas}\n\n**Últimas partidas:**\n${lista}`)
        .setColor(COLORS.INFO)
        .setTimestamp();
}

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

function buildLogEmbed(ticket) {
    const closeReason = {
        finished:     '✅ Partida Concluída',
        cancelled:    '❌ Cancelada pelos jogadores',
        admin_closed: '🔒 Fechada pelo admin',
        admin_cmd:    '🔒 Fechada via comando',
    }[ticket.close_reason] || ticket.close_reason || 'Desconhecido';

    const dataAbertura   = new Date(ticket.created_at).toLocaleString('pt-BR');
    const dataFechamento = ticket.closed_at ? new Date(ticket.closed_at).toLocaleString('pt-BR') : 'N/A';
    const valorTotal     = ticket.taxa > 0
        ? `R$ ${ticket.value},00 + R$ ${Number(ticket.taxa).toFixed(2)} (taxa) = R$ ${(ticket.value + ticket.taxa).toFixed(2)}`
        : `R$ ${ticket.value},00`;

    return new EmbedBuilder()
        .setTitle(`📁 Log — ${ticket.player1_name} vs ${ticket.player2_name}`)
        .setDescription(
            `**Status:** ${closeReason}\n\n` +
            `👤 **Jogador 1:** <@${ticket.player1_id}> (${ticket.player1_name})\n` +
            `👤 **Jogador 2:** <@${ticket.player2_id}> (${ticket.player2_name})\n` +
            `👮 **Admin:** ${ticket.admin_id ? `<@${ticket.admin_id}>` : 'Nenhum'}\n\n` +
            `🎮 **Modo:** ${MODE_LABELS[ticket.mode] || ticket.mode}\n` +
            `📱 **Categoria:** ${ticket.categoria}\n` +
            `⚔️ **Formato:** ${ticket.formato}\n` +
            `💰 **Valor:** ${valorTotal}\n` +
            `🔑 **Chave PIX usada:** ${ticket.pix_chave ? `\`${ticket.pix_chave}\`` : 'Não enviado'}\n\n` +
            (ticket.winner_id
                ? `🏆 **Vencedor:** <@${ticket.winner_id}> (${ticket.winner_name})\n` +
                  `💀 **Perdedor:** <@${ticket.loser_id}> (${ticket.loser_name})\n\n`
                : '') +
            `🕐 **Abertura:** ${dataAbertura}\n` +
            `🕐 **Fechamento:** ${dataFechamento}`
        )
        .setColor(ticket.winner_id ? COLORS.GOLD : COLORS.ERROR)
        .setFooter({ text: `Canal: ${ticket.channel_id}` })
        .setTimestamp();
}

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
    buildFilaEmbed, buildFilaButtons,
    buildTicketEmbed, buildTicketButtons, buildAdminButtons,
    buildConfirmacaoEmbed, buildConfirmButtons,
    buildPixEmbed, buildSalaEmbed, buildSalaButtons, buildVencedorEmbed,
    buildHistoricoEmbed, buildRankingEmbed,
    buildLogEmbed,
    buildErrorEmbed, buildWarningEmbed, buildInfoEmbed, buildSuccessEmbed,
};
