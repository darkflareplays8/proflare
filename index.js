require('dotenv').config(); // MUST be first

console.log('[BOOT] Starting ProFlare bot…');

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

const fs = require('node:fs');
const path = require('node:path');

/* =====================
   ENV
===================== */
const {
  DISCORD_TOKEN,
  CLIENT_ID,
  VERIFIED_ROLE_ID,
  VERIFY_LOG_CHANNEL_ID,
  SUGGEST_CATEGORY_ID
} = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('[FATAL] Missing DISCORD_TOKEN or CLIENT_ID');
  process.exit(1);
}

console.log('[ENV] Loaded successfully');

/* =====================
   CONSTANTS
===================== */
const PREFIX = '!';
const ALLOWED_USER_ID = '1343244701507260416';
const JOIN_GUILD_ID = '1455924604085473361';
const JOIN_CHANNEL_ID = '1455930364810756169';
const BOOST_CHANNEL_ID = '1455935047554040037';

/* =====================
   CLIENT
===================== */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel, Partials.Message]
});

client.commands = new Collection();

/* =====================
   HELPERS
===================== */
const randomColor = () => Math.floor(Math.random() * 0xffffff);

const JOIN_MESSAGES = [
  m => `👋 Welcome **${m.user.username}**!`,
  m => `🎉 Everyone welcome **${m.user.username}**!`,
  m => `🔥 **${m.user.username}** joined the server`,
  m => `💫 Glad you’re here, **${m.user.username}**`,
];

const BOOST_MESSAGES = [
  m => `🚀 **${m.user.username}** just boosted the server!`,
  m => `💎 Thanks for the boost, **${m.user.username}**!`,
  m => `🔥 **${m.user.username}** is supporting us!`,
];

const BUG_TYPES = [
  { id: 'autototem', label: 'AutoTotem' },
  { id: 'autorocket', label: 'AutoRocket' },
  { id: 'performanceeternal', label: 'Performance Eternal' },
  { id: 'other', label: 'Other' }
];

const verificationMap = new Map();

function createEmbed(description, member) {
  return new EmbedBuilder()
    .setDescription(description)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setColor(randomColor())
    .setTimestamp();
}

/* =====================
   MESSAGE HANDLER
===================== */
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  // DM verification reply
  if (!message.guild && verificationMap.has(message.author.id)) {
    const expected = verificationMap.get(message.author.id);
    console.log('[VERIFY] DM from', message.author.tag, '->', message.content);

    if (parseInt(message.content) === expected) {
      verificationMap.delete(message.author.id);

      for (const guild of client.guilds.cache.values()) {
        const member = await guild.members.fetch(message.author.id).catch(() => null);
        if (!member) continue;

        await member.roles.add(VERIFIED_ROLE_ID).catch(console.error);
        guild.channels.cache
          .get(VERIFY_LOG_CHANNEL_ID)
          ?.send(`✅ ${message.author.tag} verified`);
      }

      return message.reply('✅ Verification successful!');
    } else {
      return message.reply('❌ Wrong answer. Click verify again.');
    }
  }

  if (!message.content.startsWith(PREFIX)) return;
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift()?.toLowerCase();

  // !message (allowed user)
  if (cmd === 'message' && message.author.id === ALLOWED_USER_ID) {
    const contentToSend = args.join(' ');
    console.log('[CMD] !message ->', contentToSend);
    try {
      await message.delete();
      await message.channel.send({ content: contentToSend });
    } catch (err) { console.error('[CMD] Failed !message:', err); }
  }

  // !panel verify
  if (cmd === 'panel' && args[0] === 'verify' && message.author.id === ALLOWED_USER_ID) {
    const embed = new EmbedBuilder()
      .setTitle('✅ Verification')
      .setDescription('Click the button below to verify.')
      .setColor(randomColor());

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('verify_button')
        .setLabel('Verify')
        .setStyle(ButtonStyle.Success)
    );

    return message.channel.send({ embeds: [embed], components: [row] });
  }

  // !panel suggest
  if (cmd === 'panel' && args[0] === 'suggest' && message.author.id === ALLOWED_USER_ID) {
    const embed = new EmbedBuilder()
      .setTitle('📩 Suggestion Panel')
      .setDescription('Click below to create a suggestion ticket')
      .setColor(randomColor());

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('suggest_create')
        .setLabel('Create Suggestion')
        .setStyle(ButtonStyle.Primary)
    );

    return message.channel.send({ embeds: [embed], components: [row] });
  }

  // !panel bug
  if (cmd === 'panel' && args[0] === 'bug' && message.author.id === ALLOWED_USER_ID) {
    const embed = new EmbedBuilder()
      .setTitle('🐛 Bug Report Panel')
      .setDescription('Click a button below to report a bug')
      .setColor(randomColor());

    const row = new ActionRowBuilder();
    BUG_TYPES.forEach(type => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`bug_${type.id}`)
          .setLabel(type.label)
          .setStyle(ButtonStyle.Danger)
      );
    });

    return message.channel.send({ embeds: [embed], components: [row] });
  }

  // !close tickets
  if (cmd === 'close') {
    const name = message.channel.name;
    const isTicket =
      name.startsWith('suggest-') ||
      BUG_TYPES.some(t => name.startsWith(t.id));

    if (!isTicket) return;

    console.log('[TICKET] Closing ticket:', name);

    try {
      await message.channel.send('🔒 Closing ticket…');
      await message.channel.delete();
    } catch (err) {
      console.error('[TICKET] Failed to close:', err);
    }
  }
});

/* =====================
   JOIN/BOOST MESSAGES
===================== */
client.on(Events.GuildMemberAdd, member => {
  if (member.guild.id !== JOIN_GUILD_ID) return;
  const channel = member.guild.channels.cache.get(JOIN_CHANNEL_ID);
  if (!channel) return;

  const text = JOIN_MESSAGES[Math.floor(Math.random() * JOIN_MESSAGES.length)](member);
  channel.send({ embeds: [createEmbed(text, member)] }).catch(() => {});
});

client.on(Events.GuildMemberUpdate, (oldMember, newMember) => {
  if (newMember.guild.id !== JOIN_GUILD_ID) return;
  const channel = newMember.guild.channels.cache.get(BOOST_CHANNEL_ID);
  if (!channel) return;

  if (!oldMember.premiumSince && newMember.premiumSince) {
    const text = BOOST_MESSAGES[Math.floor(Math.random() * BOOST_MESSAGES.length)](newMember);
    channel.send({ embeds: [createEmbed(text, newMember)] }).catch(() => {});
  }
});

/* =====================
   INTERACTIONS
===================== */
client.on(Events.InteractionCreate, async interaction => {
  // VERIFY BUTTON
  if (interaction.isButton() && interaction.customId === 'verify_button') {
    console.log('[VERIFY] Button clicked by', interaction.user.tag);

    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;

    verificationMap.set(interaction.user.id, a + b);

    try {
      await interaction.user.send(
        `🧮 **Verification Required**\nWhat is **${a} + ${b}**?\nReply with the number.`
      );
      await interaction.reply({ content: '📬 Check your DMs!', ephemeral: true });
    } catch (err) {
      console.error('[VERIFY] DM failed', err);
      await interaction.reply({
        content: '❌ Your DMs are closed.',
        ephemeral: true
      });
    }
  }

  // SUGGESTION BUTTON
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

    modal.addComponents(new ActionRowBuilder().addComponents(titleInput));
    modal.addComponents(new ActionRowBuilder().addComponents(descInput));

    await interaction.showModal(modal);
  }

  // BUG BUTTONS
  if (interaction.isButton() && interaction.customId.startsWith('bug_')) {
    const bugType = interaction.customId.split('_')[1];
    const modal = new ModalBuilder()
      .setCustomId(`bug_modal_${bugType}`)
      .setTitle(`${BUG_TYPES.find(t => t.id === bugType).label} Bug Report`);

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

  // MODAL SUBMIT
  if (interaction.type === InteractionType.ModalSubmit) {
    const guild = interaction.guild;

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
      type: 0, // GUILD_TEXT
      parent: SUGGEST_CATEGORY_ID,
      permissionOverwrites: [
        { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages'] },
        { id: everyone.id, deny: ['ViewChannel'] },
        ...guild.roles.cache
          .filter(r => r.permissions.has('Administrator'))
          .map(r => ({ id: r.id, allow: ['ViewChannel', 'SendMessages'] }))
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(`${description}\n\n💡 Use \`!close\` to close this ticket.`)
      .setColor(randomColor())
      .setFooter({ text: `Opened by ${interaction.user.tag}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Go to channel')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${guild.id}/${channel.id}`)
    );

    await channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
  }
});

/* =====================
   SLASH COMMAND LOADER
===================== */
(async () => {
  console.log('[SLASH] Loading slash commands…');

  const commands = [];
  const dir = path.join(__dirname, 'commands');

  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir)) {
      const cmd = require(path.join(dir, file));
      if (cmd?.data && cmd?.execute) {
        commands.push(cmd.data.toJSON());
        client.commands.set(cmd.data.name, cmd);
      }
    }
  }

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

  console.log('[SLASH] Registered', commands.length, 'commands');
})();

/* =====================
   READY
===================== */
client.once(Events.ClientReady, () => {
  console.log(`✅ Bot online as ${client.user.tag}`);
});

client.login(DISCORD_TOKEN);
