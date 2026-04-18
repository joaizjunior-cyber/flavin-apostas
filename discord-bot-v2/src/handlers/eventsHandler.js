// src/handlers/eventsHandler.js
const fs   = require('fs');
const path = require('path');

module.exports = (client) => {
    const eventsPath = path.join(__dirname, '..', 'events');
    fs.readdirSync(eventsPath).filter(f => f.endsWith('.js')).forEach(file => {
        const event = require(path.join(eventsPath, file));
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
        console.log(`[EVENTOS] Registrado: ${event.name}`);
    });
};
