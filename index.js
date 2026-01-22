require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Collection,
  Partials,
  Events,
  REST,
  Routes,
  EmbedBuilder,
  ActionRowBuilder,require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Collection,
  Partials,
  Events,
  REST,
  Routes,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType
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
const SUGGEST_CATEGORY_ID = '1455955288346595348';

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

const BUG_TYPES = ['autototem', 'autorocket', 'performanceeternal', 'other'];

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

  if (message.content.startsWith(PREFIX)) {
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
      } catch (error) { console.error('❌ Failed:', error); }
    }

    if (commandName === 'panel' && args[0] === 'suggest' && message.author.id === ALLOWED_USER_ID) {
      const embed = new EmbedBuilder()
        .setTitle('📩 Suggestion Panel')
        .setDescription('Click the button below to create a suggestion ticket!')
        .setColor(randomColor())
        .setFooter({ text: 'Only one ticket per suggestion.' });

      const button = new ButtonBuilder()
        .setCustomId('suggest_create')
        .setLabel('Create Suggestion Ticket')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(button);

      await message.channel.send({ embeds: [embed], components: [row] });
    }

    if (commandName === 'panel' && args[0] === 'bug' && message.author.id === ALLOWED_USER_ID) {
      const embed = new EmbedBuilder()
        .setTitle('🐛 Bug Report Panel')
        .setDescription('Click one of the buttons below to report a bug!')
        .setColor(randomColor())
        .setFooter({ text: 'Choose the type of bug.' });

      const row = new ActionRowBuilder();
      BUG_TYPES.forEach(type => {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`bug_${type}`)
            .setLabel(type.charAt(0).toUpperCase() + type.slice(1))
            .setStyle(ButtonStyle.Danger)
        );
      });

      await message.channel.send({ embeds: [embed], components: [row] });
    }

    if (commandName === 'close') {
      if (message.channel.name.startsWith('suggest-') || BUG_TYPES.some(t => message.channel.name.startsWith(t))) {
        await message.channel.delete().catch(() => {});
      }
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

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton()) {
    if (interaction.customId === 'suggest_create') {
      const modal = new ModalBuilder()
        .setCustomId('suggest_modal')
        .setTitle('Create Suggestion');

      const titleInput = new TextInputBuilder()
        .setCustomId('suggest_title')
        .setLabel('Title')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const descInput = new TextInputBuilder()
        .setCustomId('suggest_desc')
        .setLabel('Description')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(titleInput));
      modal.addComponents(new ActionRowBuilder().addComponents(descInput));

      await interaction.showModal(modal);
    }

    if (interaction.customId.startsWith('bug_')) {
      const bugType = interaction.customId.split('_')[1];
      const modal = new ModalBuilder()
        .setCustomId(`bug_modal_${bugType}`)
        .setTitle(`${bugType.charAt(0).toUpperCase() + bugType.slice(1)} Bug Report`);

      const titleInput = new TextInputBuilder()
        .setCustomId('bug_title')
        .setLabel('Title')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const descInput = new TextInputBuilder()
        .setCustomId('bug_desc')
        .setLabel('Description')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(titleInput));
      modal.addComponents(new ActionRowBuilder().addComponents(descInput));

      await interaction.showModal(modal);
    }
  }

  if (interaction.type === InteractionType.ModalSubmit) {
    const guild = interaction.guild;
    const category = guild.channels.cache.get(SUGGEST_CATEGORY_ID);
    if (!category) return await interaction.reply({ content: 'Category not found.', ephemeral: true });

    let channelName, title, description;

    if (interaction.customId === 'suggest_modal') {
      channelName = `suggest-${Math.floor(Math.random() * 10000)}`;
      title = interaction.fields.getTextInputValue('suggest_title');
      description = interaction.fields.getTextInputValue('suggest_desc');
    } else if (interaction.customId.startsWith('bug_modal_')) {
      const bugType = interaction.customId.split('_')[2];
      channelName = `${bugType}-${Math.floor(Math.random() * 10000)}`;
      title = interaction.fields.getTextInputValue('bug_title');
      description = interaction.fields.getTextInputValue('bug_desc');
    } else return;

    const everyone = guild.roles.everyone;
    const channel = await guild.channels.create({
      name: channelName,
      type: 0,
      parent: SUGGEST_CATEGORY_ID,
      permissionOverwrites: [
        { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages'] },
        { id: everyone.id, deny: ['ViewChannel'] },
        ...guild.roles.cache.filter(r => r.permissions.has('Administrator')).map(r => ({
          id: r.id,
          allow: ['ViewChannel', 'SendMessages']
        }))
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(`${description}\n\n💡 **Do \`!close\` to close this ticket.**`)
      .setColor(randomColor())
      .setFooter({ text: `Opened by ${interaction.user.tag}` })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    await interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
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
        loaded.forEach(cmd => { if (cmd.data && cmd.execute) { client.commands.set(cmd.data.name, cmd); slashCommands.push(cmd.data.toJSON()); } });
      } else if (loaded.data && loaded.execute) { client.commands.set(loaded.data.name, loaded); slashCommands.push(loaded.data.toJSON()); }
    }
  }
  const rest = new REST({ version: '10' }).setToken(token);
  await rest.put(Routes.applicationCommands(clientId), { body: slashCommands });
}

loadAndDeployCommands();
client.once(Events.ClientReady, () => console.log('✅ ProFlare Bot online'));
client.login(token);

  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType
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
const SUGGEST_CATEGORY_ID = '1455955288346595348';

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

  if (message.content.startsWith(PREFIX)) {
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
      } catch (error) { console.error('❌ Failed:', error); }
    }

    if (commandName === 'panel' && args[0] === 'suggest' && message.author.id === ALLOWED_USER_ID) {
      const embed = new EmbedBuilder()
        .setTitle('📩 Suggestion Panel')
        .setDescription('Click the button below to create a suggestion ticket!')
        .setColor(randomColor())
        .setFooter({ text: 'Only one ticket per suggestion.' });

      const button = new ButtonBuilder()
        .setCustomId('suggest_create')
        .setLabel('Create Suggestion Ticket')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(button);

      await message.channel.send({
        embeds: [embed],
        components: [row]
      });
    }

    if (commandName === 'close') {
      if (message.channel.name.startsWith('suggest-')) {
        await message.channel.delete().catch(() => {});
      }
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

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton() && interaction.customId === 'suggest_create') {
    const modal = new ModalBuilder()
      .setCustomId('suggest_modal')
      .setTitle('Create Suggestion');

    const titleInput = new TextInputBuilder()
      .setCustomId('suggest_title')
      .setLabel('Title')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const descInput = new TextInputBuilder()
      .setCustomId('suggest_desc')
      .setLabel('Description')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const row1 = new ActionRowBuilder().addComponents(titleInput);
    const row2 = new ActionRowBuilder().addComponents(descInput);

    modal.addComponents(row1, row2);

    await interaction.showModal(modal);
  }

  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'suggest_modal') {
    const title = interaction.fields.getTextInputValue('suggest_title');
    const description = interaction.fields.getTextInputValue('suggest_desc');
    const guild = interaction.guild;

    const category = guild.channels.cache.get(SUGGEST_CATEGORY_ID);
    if (!category) return await interaction.reply({ content: 'Category not found.', ephemeral: true });

    const channelName = `suggest-${Math.floor(Math.random() * 10000)}`;
    const everyone = guild.roles.everyone;

    const channel = await guild.channels.create({
      name: channelName,
      type: 0, // GUILD_TEXT
      parent: SUGGEST_CATEGORY_ID,
      permissionOverwrites: [
        { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages'] },
        { id: everyone.id, deny: ['ViewChannel'] },
        ...guild.roles.cache.filter(r => r.permissions.has('Administrator')).map(r => ({
          id: r.id,
          allow: ['ViewChannel', 'SendMessages']
        }))
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(`${description}\n\n💡 **Do \`!close\` to close this ticket.**`)
      .setColor(randomColor())
      .setFooter({ text: `Opened by ${interaction.user.tag}` })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    await interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
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
        loaded.forEach(cmd => { if (cmd.data && cmd.execute) { client.commands.set(cmd.data.name, cmd); slashCommands.push(cmd.data.toJSON()); } });
      } else if (loaded.data && loaded.execute) { client.commands.set(loaded.data.name, loaded); slashCommands.push(loaded.data.toJSON()); }
    }
  }
  const rest = new REST({ version: '10' }).setToken(token);
  await rest.put(Routes.applicationCommands(clientId), { body: slashCommands });
}

loadAndDeployCommands();
client.once(Events.ClientReady, () => console.log('✅ ProFlare Bot online'));
client.login(token);
