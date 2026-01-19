require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials, Events, REST, Routes } = require('discord.js');
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');

const token = process.env.DISCORD_TOKEN;
const port = process.env.PORT || 3000;
const clientId = process.env.CLIENT_ID; // Bot Application ID from Railway Variables

if (!token || !clientId) {
  console.error('[ERROR] DISCORD_TOKEN or CLIENT_ID missing');
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
const ALLOWED_USER_ID = '1343244701507260416'; 

// 🔥 !message COMMAND - Copies message with ALL formatting 🔥
client.on(Events.MessageCreate, async message => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;
  
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();
  
  // !message - only for specific user
  if (commandName === 'message' && message.author.id === ALLOWED_USER_ID) {
    console.log(`[!MSG] message by ${message.author.tag}`);
    
    try {
      // Delete original !message
      await message.delete();
      
      // Send copied message with PERFECT formatting + mentions
      await message.channel.send({
        content: args.join(' '),
        allowedMentions: { parse: ['users', 'roles'] }
      });
      
      console.log(`✅ !message copied by ${message.author.tag}`);
    } catch (error) {
      console.error('❌ !message failed:', error);
    }
    return;
  }
});

// 🔥 LOAD + AUTO-DEPLOY SLASH COMMANDS 🔥
async function loadAndDeployCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  const slashCommands = [];
  
  if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const loaded = require(filePath);
      
      if (Array.isArray(loaded)) {
        loaded.forEach(command => {
          if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            slashCommands.push(command.data.toJSON());
            console.log(`✅ Loaded slash: ${command.data.name}`);
          }
        });
      } else if ('data' in loaded && 'execute' in loaded) {
        client.commands.set(loaded.data.name, loaded);
        slashCommands.push(loaded.data.toJSON());
        console.log(`✅ Loaded slash: ${loaded.data.name}`);
      }
    }
  }
  
  // Auto-deploy slash commands
  const rest = new REST({ version: '10' }).setToken(token);
  try {
    await rest.put(Routes.applicationCommands(clientId), { body: slashCommands });
    console.log(`🔥 Auto-deployed ${slashCommands.length} slash commands!`);
  } catch (error) {
    console.error('❌ Auto-deploy failed:', error);
  }
}

// Load commands on startup
loadAndDeployCommands();

client.once(Events.ClientReady, () => {
  console.log(`✅ ProFlare Bot online as ${client.user.tag}!`);
  console.log(`📊 Slash commands: ${client.commands.size} | !message ready`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    console.log(`[/CMD] ${interaction.commandName}`);
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (!interaction.replied) {
      await interaction.reply({ content: '❌ Error!', ephemeral: true });
    }
  }
});

client.login(token);
