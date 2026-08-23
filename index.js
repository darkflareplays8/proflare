require('dotenv').config();

const { REST, Routes } = require('discord.js');

const { DISCORD_TOKEN, CLIENT_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('[FATAL] Missing DISCORD_TOKEN or CLIENT_ID');
  process.exit(1);
}

const commands = [];

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log(`[DEPLOY-COMMANDS] Registering ${commands.length} application (/) commands…`);

    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );

    console.log('[DEPLOY-COMMANDS] Successfully registered application commands.');
  } catch (err) {
    console.error('[DEPLOY-COMMANDS] Failed to register commands:', err);
  }
})();