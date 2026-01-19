require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials, Events } = require('discord.js');
const express = require('express');

const token = process.env.DISCORD_TOKEN;
const port = process.env.PORT || 3000;

if (!token) {
  console.error('[ERROR] DISCORD_TOKEN missing');
  process.exit(1);
}

// Express for Railway
const app = express();
app.use(express.json());
app.get('/health', (req, res) => res.sendStatus(200));
app.listen(port, '0.0.0.0', () => console.log(`[INFO] Web on port ${port}`));

// Bot
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel]
});

client.commands = new Collection();
const commandsPath = './commands';
const fs = require('node:fs');
const path = require('node:path');

fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'))
  .forEach(file => {
    const command = require(path.join(__dirname, commandsPath, file));
    client.commands.set(command.data.name, command);
  });

client.once(Events.ClientReady, () => {
  console.log(`✅ ProFlare Bot online as ${client.user.tag}!`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    console.log(`[CMD] ${interaction.commandName} by ${interaction.user.tag}`);
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (!interaction.replied) {
      await interaction.reply({ content: '❌ Error!', ephemeral: true });
    }
  }
});

client.login(token);

