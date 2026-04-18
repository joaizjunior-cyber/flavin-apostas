// ============================================================
// index.js - Ponto de entrada principal
// ============================================================

require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials, REST, Routes } = require('discord.js');
const fs   = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel, Partials.Message],
});

client.commands  = new Collection();
client.cooldowns = new Collection();

// ============================================================
// Auto-registrar comandos slash
// ============================================================
const token   = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;

if (token && guildId) {
    const rest = new REST({ version: '10' }).setToken(token);
    const cmds = [];
    const cmdPath = path.join(__dirname, 'src', 'commands');
    const cmdFiles = fs.readdirSync(cmdPath).filter(f => f.endsWith('.js'));
    for (const file of cmdFiles) {
        const cmd = require(path.join(cmdPath, file));
        if (cmd.data) cmds.push(cmd.data.toJSON());
    }
    const clientId = Buffer.from(token.split('.')[0], 'base64').toString();
    rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: cmds })
        .then(() => console.log(`[DEPLOY] ${cmds.length} comando(s) registrado(s)!`))
        .catch(console.error);
}

// ============================================================
// Carregar handlers
// ============================================================
const handlersPath = path.join(__dirname, 'src', 'handlers');
fs.readdirSync(handlersPath).filter(f => f.endsWith('.js')).forEach(file => {
    require(path.join(handlersPath, file))(client);
    console.log(`[HANDLER] Carregado: ${file}`);
});

client.login(token).catch(err => {
    console.error('[ERRO] Login falhou:', err.message);
    process.exit(1);
});
