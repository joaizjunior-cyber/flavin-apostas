// src/handlers/commandsHandler.js
const fs   = require('fs');
const path = require('path');

module.exports = (client) => {
    const commandsPath = path.join(__dirname, '..', 'commands');
    fs.readdirSync(commandsPath).filter(f => f.endsWith('.js')).forEach(file => {
        const command = require(path.join(commandsPath, file));
        if (command.data && command.execute) {
            client.commands.set(command.data.name, command);
            console.log(`[COMANDOS] Registrado: /${command.data.name}`);
        }
    });
};
