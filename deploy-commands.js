require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Replace YOUR_BOT_ID with your bot's Application ID
const clientId = 'YOUR_BOT_ID_HERE';

(async () => {
  try {
    console.log('Deploying commands...');
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('✅ Global commands deployed!');
  } catch (error) {
    console.error(error);
  }
})();
