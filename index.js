require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials, Events } = require('discord.js');
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');

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

// Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message]
});

client.commands = new Collection();
const PREFIX = '!';

// 🔥 BUILT-IN PREFIX COMMAND: !protest 🔥
client.on(Events.MessageCreate, message => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;
  
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();
  
  if (commandName === 'protest') {
    console.log(`[!CMD] protest by ${message.author.tag}`);
    return message.reply('🪧 **Protest mode activated!** This is a test command working perfectly on Railway! ✅');
  }
});

// 🔥 LOAD ALL SLASH COMMANDS FROM /commands FOLDER 🔥
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const loaded = require(filePath);
    
    if (Array.isArray(loaded)) {
      loaded.forEach(command => {
        if ('data' in command && 'execute' in command) {
          client.commands.set(command.data.name, command);
          console.log(`✅ Loaded slash: ${command.data.name}`);
        }
      });
    } else if ('data' in loaded && 'execute' in loaded) {
      client.commands.set(loaded.data.name, loaded);
      console.log(`✅ Loaded slash: ${loaded.data.name}`);
    } else {
      console.log(`[WARNING] Invalid: ${file}`);
    }
  }
}

client.once(Events.ClientReady, () => {
  console.log(`✅ ProFlare Bot online as ${client.user.tag}!`);
  console.log(`📊 Slash commands: ${client.commands.size} | Prefix: !protest`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    console.log(`[/CMD] ${interaction.commandName} by ${interaction.user.tag}`);
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (!interaction.replied) {
      await interaction.reply({ content: '❌ Error!', ephemeral: true });
    }
  }
});

client.login(token);
