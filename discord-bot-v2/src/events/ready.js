// src/events/ready.js
const { ActivityType } = require('discord.js');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log('─────────────────────────────────────────');
        console.log(`✅ Bot online: ${client.user.tag}`);
        console.log(`📡 Servidores: ${client.guilds.cache.size}`);
        console.log(`🎮 Modos: Gelo Infinito | Gelo Normal`);
        console.log('─────────────────────────────────────────');
        client.user.setPresence({
            activities: [{ name: '❄️ Matchmaking | /fila entrar', type: ActivityType.Watching }],
            status: 'online',
        });
    },
};
