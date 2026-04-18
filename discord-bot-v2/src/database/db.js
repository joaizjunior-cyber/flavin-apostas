// ============================================================
// src/database/db.js
// ============================================================

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'bot.db'));

db.exec(`
    CREATE TABLE IF NOT EXISTS queue (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     TEXT NOT NULL UNIQUE,
        username    TEXT NOT NULL,
        mode        TEXT NOT NULL,
        value       INTEGER NOT NULL DEFAULT 1,
        guild_id    TEXT NOT NULL,
        categoria   TEXT NOT NULL DEFAULT 'Mobile',
        formato     TEXT NOT NULL DEFAULT '1x1',
        entered_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tickets (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id      TEXT NOT NULL UNIQUE,
        player1_id      TEXT NOT NULL,
        player2_id      TEXT NOT NULL,
        player1_name    TEXT NOT NULL,
        player2_name    TEXT NOT NULL,
        mode            TEXT NOT NULL,
        value           INTEGER NOT NULL DEFAULT 1,
        guild_id        TEXT NOT NULL,
        categoria       TEXT NOT NULL DEFAULT 'Mobile',
        formato         TEXT NOT NULL DEFAULT '1x1',
        admin_id        TEXT,
        status          TEXT DEFAULT 'active',
        created_at      INTEGER NOT NULL,
        message_id      TEXT
    );

    CREATE TABLE IF NOT EXISTS admin_queue (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     TEXT NOT NULL UNIQUE,
        username    TEXT NOT NULL,
        guild_id    TEXT NOT NULL,
        entered_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_pix (
        user_id     TEXT NOT NULL,
        guild_id    TEXT NOT NULL,
        chave       TEXT NOT NULL,
        valor       REAL NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, guild_id)
    );

    CREATE TABLE IF NOT EXISTS historico (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        winner_id       TEXT NOT NULL,
        winner_name     TEXT NOT NULL,
        loser_id        TEXT NOT NULL,
        loser_name      TEXT NOT NULL,
        mode            TEXT NOT NULL,
        value           INTEGER NOT NULL DEFAULT 1,
        guild_id        TEXT NOT NULL,
        channel_id      TEXT,
        created_at      INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fila_messages (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id    TEXT NOT NULL,
        channel_id  TEXT NOT NULL,
        value       INTEGER NOT NULL,
        message_id  TEXT NOT NULL,
        categoria   TEXT NOT NULL DEFAULT 'Mobile',
        formato     TEXT NOT NULL DEFAULT '1x1',
        UNIQUE(guild_id, value, categoria, formato)
    );
`);

// ============================================================
// FILA DE JOGADORES
// ============================================================

function addToQueue(userId, username, mode, value, guildId, categoria = 'Mobile', formato = '1x1') {
    try {
        db.prepare(`
            INSERT INTO queue (user_id, username, mode, value, guild_id, categoria, formato, entered_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(userId, username, mode, value, guildId, categoria, formato, Date.now());
        return { success: true };
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return { success: false, error: 'already_in_queue' };
        }
        throw err;
    }
}

function removeFromQueue(userId) {
    return db.prepare('DELETE FROM queue WHERE user_id = ?').run(userId);
}

function isInQueue(userId) {
    return db.prepare('SELECT * FROM queue WHERE user_id = ?').get(userId) || null;
}

function getQueuePair(mode, value, guildId, categoria = 'Mobile', formato = '1x1') {
    const players = db.prepare(`
        SELECT * FROM queue
        WHERE mode = ? AND value = ? AND guild_id = ? AND categoria = ? AND formato = ?
        ORDER BY entered_at ASC
        LIMIT 2
    `).all(mode, value, guildId, categoria, formato);
    return players.length >= 2 ? players : null;
}

function getQueueByModeAndValue(mode, value, guildId, categoria = 'Mobile', formato = '1x1') {
    return db.prepare(`
        SELECT * FROM queue
        WHERE mode = ? AND value = ? AND guild_id = ? AND categoria = ? AND formato = ?
        ORDER BY entered_at ASC
    `).all(mode, value, guildId, categoria, formato);
}

function getQueueCounts(guildId) {
    return db.prepare(`
        SELECT mode, value, categoria, formato, COUNT(*) as count
        FROM queue WHERE guild_id = ?
        GROUP BY mode, value, categoria, formato
    `).all(guildId);
}

// ============================================================
// MENSAGENS DO PAINEL
// ============================================================

function saveFilaMessageId(guildId, channelId, value, messageId, categoria = 'Mobile', formato = '1x1') {
    db.prepare(`
        INSERT INTO fila_messages (guild_id, channel_id, value, message_id, categoria, formato)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(guild_id, value, categoria, formato) DO UPDATE SET message_id = ?, channel_id = ?
    `).run(guildId, channelId, value, messageId, categoria, formato, messageId, channelId);
}

function getFilaMessageId(guildId, value, categoria = 'Mobile', formato = '1x1') {
    return db.prepare(`
        SELECT * FROM fila_messages WHERE guild_id = ? AND value = ? AND categoria = ? AND formato = ?
    `).get(guildId, value, categoria, formato) || null;
}

function getFilaMessagesByValue(guildId, value) {
    return db.prepare(`
        SELECT * FROM fila_messages WHERE guild_id = ? AND value = ?
    `).all(guildId, value);
}

// ============================================================
// TICKETS
// ============================================================

function createTicket(channelId, player1, player2, mode, value, guildId, adminId = null, categoria = 'Mobile', formato = '1x1') {
    db.prepare(`
        INSERT INTO tickets
        (channel_id, player1_id, player2_id, player1_name, player2_name, mode, value, guild_id, categoria, formato, admin_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(channelId, player1.id, player1.username, player2.id, player2.username, mode, value, guildId, categoria, formato, adminId, Date.now());
}

function updateTicketMessage(channelId, messageId) {
    db.prepare('UPDATE tickets SET message_id = ? WHERE channel_id = ?').run(messageId, channelId);
}

function updateTicketStatus(channelId, status) {
    db.prepare('UPDATE tickets SET status = ? WHERE channel_id = ?').run(status, channelId);
}

function updateTicketAdmin(channelId, adminId) {
    db.prepare('UPDATE tickets SET admin_id = ? WHERE channel_id = ?').run(adminId, channelId);
}

function getTicket(channelId) {
    return db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channelId) || null;
}

function deleteTicket(channelId) {
    return db.prepare('DELETE FROM tickets WHERE channel_id = ?').run(channelId);
}

function getActiveTickets(guildId) {
    return db.prepare(`
        SELECT * FROM tickets WHERE guild_id = ? AND status = 'active'
        ORDER BY created_at DESC
    `).all(guildId);
}

// ============================================================
// FILA DE ADMINS
// ============================================================

function addAdminToQueue(userId, username, guildId) {
    try {
        db.prepare(`
            INSERT INTO admin_queue (user_id, username, guild_id, entered_at)
            VALUES (?, ?, ?, ?)
        `).run(userId, username, guildId, Date.now());
        return { success: true };
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return { success: false, error: 'already_in_queue' };
        }
        throw err;
    }
}

function removeAdminFromQueue(userId) {
    return db.prepare('DELETE FROM admin_queue WHERE user_id = ?').run(userId);
}

function getNextAdmin(guildId) {
    return db.prepare(`
        SELECT * FROM admin_queue WHERE guild_id = ?
        ORDER BY entered_at ASC LIMIT 1
    `).get(guildId) || null;
}

function getAdminQueue(guildId) {
    return db.prepare(`
        SELECT * FROM admin_queue WHERE guild_id = ?
        ORDER BY entered_at ASC
    `).all(guildId);
}

function isAdminInQueue(userId) {
    return db.prepare('SELECT * FROM admin_queue WHERE user_id = ?').get(userId) || null;
}

// ============================================================
// PIX DOS ADMINS
// ============================================================

function setAdminPix(userId, guildId, chave, valor) {
    db.prepare(`
        INSERT INTO admin_pix (user_id, guild_id, chave, valor)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, guild_id) DO UPDATE SET chave = ?, valor = ?
    `).run(userId, guildId, chave, valor, chave, valor);
}

function getAdminPix(userId, guildId) {
    return db.prepare('SELECT * FROM admin_pix WHERE user_id = ? AND guild_id = ?').get(userId, guildId) || null;
}

// ============================================================
// HISTÓRICO
// ============================================================

function addHistorico(winnerId, winnerName, loserId, loserName, mode, value, guildId, channelId) {
    db.prepare(`
        INSERT INTO historico (winner_id, winner_name, loser_id, loser_name, mode, value, guild_id, channel_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(winnerId, winnerName, loserId, loserName, mode, value, guildId, channelId, Date.now());
}

function getHistorico(userId, guildId) {
    return db.prepare(`
        SELECT * FROM historico
        WHERE (winner_id = ? OR loser_id = ?) AND guild_id = ?
        ORDER BY created_at DESC
        LIMIT 20
    `).all(userId, userId, guildId);
}

function getRanking(guildId) {
    return db.prepare(`
        SELECT winner_id, winner_name, COUNT(*) as vitorias
        FROM historico WHERE guild_id = ?
        GROUP BY winner_id
        ORDER BY vitorias DESC
        LIMIT 10
    `).all(guildId);
}

module.exports = {
    addToQueue, removeFromQueue, isInQueue, getQueuePair,
    getQueueByModeAndValue, getQueueCounts,
    saveFilaMessageId, getFilaMessageId, getFilaMessagesByValue,
    createTicket, updateTicketMessage, updateTicketStatus,
    updateTicketAdmin, getTicket, deleteTicket, getActiveTickets,
    addAdminToQueue, removeAdminFromQueue, getNextAdmin,
    getAdminQueue, isAdminInQueue,
    setAdminPix, getAdminPix,
    addHistorico, getHistorico, getRanking,
    db,
};
