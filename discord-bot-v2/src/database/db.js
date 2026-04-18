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

functi
