require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials, Events, SlashCommandBuilder } = require('discord.js');
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
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel]
});

client.commands = new Collection();

// 🔥 BUILT-IN TEST COMMAND: /protest 🔥
client.commands.set('protest', {
  data: new SlashCommandBuilder()
    .setName('protest')
    .setDescription('🪧 Test command for ProFlare Studios'),
  async execute(interaction) {
    await interaction.reply('🪧 **Protest mode activated!** This is a test command working perfectly on Railway! ✅');
  }
});

// 🔥 LOAD ALL COMMANDS FROM /commands FOLDER (handles both single files AND all.js array) 🔥
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const loaded = require(filePath);
    
    // Handle all.js ARRAY
    if (Array.isArray(loaded)) {
      loaded.forEach(command => {
        if ('data' in command && 'execute' in command) {
          client.commands.set(command.data.name, command);
          console.log(`✅ Loaded array command: ${command.data.name}`);
        }
      });
    } 
    // Handle single command files
    else if ('data' in loaded && 'execute' in loaded) {
      client.commands.set(loaded.data.name, loaded);
      console.log(`✅ Loaded: ${loaded.data.name}`);
    } 
    else {
      console.log(`[WARNING] Invalid: ${file}`);
    }
  }
}

client.once(Events.ClientReady, () => {
  console.log(`✅ ProFlare Bot online as ${client.user.tag}!`);
  console.log(`📊 Total commands: ${client.commands.size} (including /protest)`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  const command = client.commands.get(interaction.commandName);
  if (!command) {
    console.log(`❌ No command: ${interaction.commandName}`);
    return;
  }

  try {
    console.log(`[CMD] ${interaction.commandName} by ${interaction.user.tag}`);
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Command failed!', ephemeral: true });
    }
  }
});

client.login(token);
