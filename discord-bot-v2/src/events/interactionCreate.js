// src/events/interactionCreate.js
const { handleButton } = require('../interactions/buttonHandler');

module.exports = {
    name: 'interactionCreate',
    once: false,
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction);
            } catch (err) {
                console.error(`[ERRO] /${interaction.commandName}:`, err);
                const msg = { content: '❌ Erro ao executar o comando.', ephemeral: true };
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(msg).catch(() => {});
                } else {
                    await interaction.reply(msg).catch(() => {});
                }
            }
            return;
        }

        if (interaction.isButton()) {
            try {
                await handleButton(interaction);
            } catch (err) {
                console.error(`[ERRO] Botão ${interaction.customId}:`, err);
                const msg = { content: '❌ Erro ao processar botão.', ephemeral: true };
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(msg).catch(() => {});
                } else {
                    await interaction.reply(msg).catch(() => {});
                }
            }
        }
    },
};
