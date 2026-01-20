require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials, Events, REST, Routes } = require('discord.js');
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');

const token = process.env.DISCORD_TOKEN;
const port = process.env.PORT || 3000;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error('[ERROR] DISCORD_TOKEN or CLIENT_ID missing');
  process.exit(1);
}

const app = express();
app.use(express.json());
app.get('/health', (req, res) => res.sendStatus(200));
app.listen(port, '0.0.0.0', () => console.log(`[INFO] Web on port ${port}`));

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

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;
  
  if (!message.content.startsWith(PREFIX)) return;
  
  const fullContent = message.content.slice(PREFIX.length).trim();
  const args = fullContent.split(/ +/);
  const commandName = args.shift().toLowerCase();
  
  if (commandName === 'message' && message.author.id === ALLOWED_USER_ID) {
    console.log(`[!MSG] ${message.author.tag}`);
    
    try {
      await message.delete();
      const contentToCopy = fullContent.slice('message'.length).trim();
      
      await message.channel.send({
        content: contentToCopy,
        allowedMentions: { parse: ['users', 'roles'] }
      });
      
      console.log(`✅ Copied: "${contentToCopy}"`);
    } catch (error) {
      console.error('❌ Failed:', error);
    }
    return;
  }
});

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
          }
        });
      } else if ('data' in loaded && 'execute' in loaded) {
        client.commands.set(loaded.data.name, loaded);
        slashCommands.push(loaded.data.toJSON());
      }
    }
  }
  
  const rest = new REST({ version: '10' }).setToken(token);
  try {
    await rest.put(Routes.applicationCommands(clientId), { body: slashCommands });
    console.log(`🔥 Deployed ${slashCommands.length} slash commands!`);
  } catch (error) {
    console.error('Deploy error:', error);
  }
}

loadAndDeployCommands();

client.once(Events.ClientReady, () => {
  console.log(`✅ ProFlare Bot online!`);
  console.log(`📊 Slash: ${client.commands.size} | !message ready`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    if (!interaction.replied) {
      await interaction.reply({ content: '❌ Error!', ephemeral: true });
    }
  }
});

client.login(token);
