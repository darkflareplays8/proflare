require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Collection,
  Partials,
  Events,
  REST,
  Routes,
  EmbedBuilder
} = require('discord.js');
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const port = process.env.PORT || 3000;

if (!token || !clientId) process.exit(1);

const PREFIX = '!';
const ALLOWED_USER_ID = '1343244701507260416';
const JOIN_GUILD_ID = '1455924604085473361';
const JOIN_CHANNEL_ID = '1455930364810756169';
const BOOST_CHANNEL_ID = '1455935047554040037';

const JOIN_MESSAGES = [
  member => `Welcome ${member} to **${member.guild.name}**!`,
  member => `${member.user.username} just joined — say hi!`,
  member => `Everyone welcome ${member}!`,
  member => `${member} has entered the server`,
  member => `${member.user.username} joined the party!`
];

const BOOST_MESSAGES = [
  member => `${member.user.username} just boosted the server! Thank you!`,
  member => `${member.user.username} is a booster! Much appreciated!`,
  member => `${member} gave the server a boost!`,
  member => `${member.user.username} just supported us with a boost!`,
  member => `${member} just became a server booster!`
];

const app = express();
app.use(express.json());
app.get('/health', (req, res) => res.sendStatus(200));
app.listen(port, '0.0.0.0', () => console.log(`[INFO] Web on port ${port}`));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message]
});

client.commands = new Collection();

function randomColor() {
  return Math.floor(Math.random() * 0xffffff);
}

function createEmbed(title, member) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(member.toString())
    .setColor(randomColor())
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setTimestamp();
}

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const fullContent = message.content.slice(PREFIX.length).trim();
  const args = fullContent.split(/ +/);
  const commandName = args.shift().toLowerCase();

  if (commandName === 'message' && message.author.id === ALLOWED_USER_ID) {
    try {
      await message.delete();
      const contentToCopy = fullContent.slice('message'.length).trim();
      await message.channel.send({
        content: contentToCopy,
        allowedMentions: { parse: ['users', 'roles'] }
      });
    } catch (error) {
      console.error('❌ Failed:', error);
    }
  }
});

client.on(Events.GuildMemberAdd, async member => {
  if (member.guild.id !== JOIN_GUILD_ID) return;
  const channel = member.guild.channels.cache.get(JOIN_CHANNEL_ID);
  if (!channel) return;

  const text = JOIN_MESSAGES[Math.floor(Math.random() * JOIN_MESSAGES.length)](member);
  const embed = createEmbed(text, member);

  try { await channel.send({ embeds: [embed] }); } catch {}
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  if (newMember.guild.id !== JOIN_GUILD_ID) return;
  const channel = newMember.guild.channels.cache.get(BOOST_CHANNEL_ID);
  if (!channel) return;

  if (!oldMember.premiumSince && newMember.premiumSince) {
    const text = BOOST_MESSAGES[Math.floor(Math.random() * BOOST_MESSAGES.length)](newMember);
    const embed = createEmbed(text, newMember);

    try { await channel.send({ embeds: [embed] }); } catch {}
  }
});

async function loadAndDeployCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  const slashCommands = [];

  if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
    for (const file of commandFiles) {
      const loaded = require(path.join(commandsPath, file));
      if (Array.isArray(loaded)) {
        loaded.forEach(cmd => {
          if (cmd.data && cmd.execute) {
            client.commands.set(cmd.data.name, cmd);
            slashCommands.push(cmd.data.toJSON());
          }
        });
      } else if (loaded.data && loaded.execute) {
        client.commands.set(loaded.data.name, loaded);
        slashCommands.push(loaded.data.toJSON());
      }
    }
  }

  const rest = new REST({ version: '10' }).setToken(token);
  await rest.put(Routes.applicationCommands(clientId), { body: slashCommands });
}

loadAndDeployCommands();

client.once(Events.ClientReady, () => console.log('✅ ProFlare Bot online'));

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try { await command.execute(interaction); } catch { if (!interaction.replied) await interaction.reply({ content: '❌ Error!', ephemeral: true }); }
});

client.login(token);
