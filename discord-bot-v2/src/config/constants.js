// ============================================================
// src/config/constants.js
// ============================================================

module.exports = {
    MODES: {
        GELO_INFINITO: 'gelo_infinito',
        GELO_NORMAL:   'gelo_normal',
    },
    MODE_LABELS: {
        gelo_infinito: '❄️ Gelo Infinito',
        gelo_normal:   '🧊 Gelo Normal',
    },
    MODE_EMOJIS: {
        gelo_infinito: '❄️',
        gelo_normal:   '🧊',
    },
    COLORS: {
        PRIMARY:   0x5865F2,
        SUCCESS:   0x57F287,
        WARNING:   0xFEE75C,
        ERROR:     0xED4245,
        INFO:      0x5DADE2,
        TICKET:    0x9B59B6,
        ICE_INF:   0x00BFFF,
        ICE_NORM:  0x7EC8E3,
        GOLD:      0xF1C40F,
    },
    BUTTONS: {
        LEAVE_QUEUE:         'leave_queue',
        CONFIRM_MATCH:       'confirm_match',
        MATCH_CANCELLED:     'match_cancelled',
        CLOSE_TICKET:        'close_ticket',
        ADMIN_CONFIRM_PIX:   'admin_confirm_pix',
        ADMIN_CLOSE_TICKET:  'admin_close_ticket',
        ADMIN_SET_WINNER_P1: 'admin_winner_p1',
        ADMIN_SET_WINNER_P2: 'admin_winner_p2',
    },
    QUEUE_VALUES: Array.from({ length: 20 }, (_, i) => i + 1),
    TICKET_CLOSE_DELAY: 5000,
    PLAYERS_PER_MATCH: 2,
};
