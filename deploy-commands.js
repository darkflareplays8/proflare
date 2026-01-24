const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
require('dotenv').config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

(async () => {
  const commands = [];
  const dir = path.join(__dirname, 'commands');

  if (!fs.existsSync(dir)) {
    console.warn('[SLASH] Commands directory does not exist.');
    return;
  }

  for (const file of fs.readdirSync(dir)) {
    const commandModule = require(path.join(dir, file));

    if (Array.isArray(commandModule)) {
      for (const cmd of commandModule) {
        if (cmd?.data?.toJSON) {
          commands.push(cmd.data.toJSON());
        } else {
          console.warn('[SLASH] Skipped invalid command in array:', file);
        }
      }
    } else if (commandModule?.data?.toJSON) {
      commands.push(commandModule.data.toJSON());
    } else {
      console.warn('[SLASH] Skipped invalid command file:', file);
    }
  }

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log(`[SLASH] Registered ${commands.length} commands`);
  } catch (err) {
    console.error('[SLASH] Failed to register commands', err);
  }
})();
