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
  partials: [Partials.Channel]
});

client.commands = new Collection();

/* =====================
   HELPERS
===================== */
const randomColor = () => Math.floor(Math.random() * 0xffffff);

/* =====================
   VERIFICATION STATE
===================== */
const verificationMap = new Map();

/* =====================
   BUG TYPES
===================== */
const BUG_TYPES = [
  { id: 'autototem', label: 'AutoTotem' },
  { id: 'autorocket', label: 'AutoRocket' },
  { id: 'performanceeternal', label: 'Performance Eternal' },
  { id: 'other', label: 'Other' }
];

/* =====================
   JOIN & BOOST MESSAGES
===================== */
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

/* =====================
   HELPERS
===================== */
function createEmbed(title, member) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(member.toString())
    .setColor(randomColor())
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setTimestamp();
}

/* =====================
   MESSAGE HANDLER
===================== */
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  // DM verification
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

  // !message command (allowed user only)
  if (cmd === 'message' && message.author.id === ALLOWED_USER_ID) {
    try {
      await message.delete();
      const contentToSend = args.join(' ');
      await message.channel.send({ content: contentToSend, allowedMentions: { parse: ['users', 'roles'] } });
    } catch (err) {
      console.error('[MESSAGE] Failed to send message:', err);
    }
  }

  // !panel verify
  if (cmd === 'panel' && args[0] === 'verify' && message.author.id === ALLOWED_USER_ID) {
    console.log('[CMD] !panel verify used');

    const embed = new EmbedBuilder()
      .setTitle('✅ Verification')
      .setDescription('Click the button below to verify.') // simplified description
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
      .setDescription('Select the bug type')
      .setColor(randomColor());

    const row = new ActionRowBuilder();
    BUG_TYPES.forEach(t => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`bug_${t.id}`)
          .setLabel(t.label)
          .setStyle(ButtonStyle.Danger)
      );
    });

    return message.channel.send({ embeds: [embed], components: [row] });
  }

  // !close for tickets
  if (cmd === 'close') {
    if (message.channel.parentId === SUGGEST_CATEGORY_ID || BUG_TYPES.some(t => message.channel.name.startsWith(t.id))) {
      await message.channel.delete().catch(() => {});
    }
  }
});

/* =====================
   JOIN MESSAGES
===================== */
client.on(Events.GuildMemberAdd, member => {
  if (member.guild.id !== JOIN_GUILD_ID) return;
  const ch = member.guild.channels.cache.get(JOIN_CHANNEL_ID);
  if (!ch) return;

  const embed = createEmbed(
    JOIN_MESSAGES[Math.floor(Math.random() * JOIN_MESSAGES.length)](member),
    member
  );

  ch.send({ embeds: [embed] }).catch(() => {});
});

/* =====================
   BOOST MESSAGES
===================== */
client.on(Events.GuildMemberUpdate, (oldMember, newMember) => {
  if (newMember.guild.id !== JOIN_GUILD_ID) return;
  const ch = newMember.guild.channels.cache.get(BOOST_CHANNEL_ID);
  if (!ch) return;

  if (!oldMember.premiumSince && newMember.premiumSince) {
    const embed = createEmbed(
      BOOST_MESSAGES[Math.floor(Math.random() * BOOST_MESSAGES.length)](newMember),
      newMember
    );
    ch.send({ embeds: [embed] }).catch(() => {});
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
      await interaction.user.send(`🧮 Verification:\nWhat is **${a} + ${b}**?\nReply with the number.`);
      await interaction.reply({ content: '📬 Check your DMs!', ephemeral: true });
    } catch (err) {
      console.error('[VERIFY] DM failed', err);
      await interaction.reply({ content: '❌ Your DMs are closed.', ephemeral: true });
    }
  }

  // SUGGESTION / BUG MODALS
  if (interaction.isButton()) {
    if (interaction.customId === 'suggest_create') {
      const modal = new ModalBuilder()
        .setCustomId('suggest_modal')
        .setTitle('Create Suggestion');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('title').setLabel('Title').setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('desc').setLabel('Description').setStyle(TextInputStyle.Paragraph).setRequired(true)
        )
      );

      await interaction.showModal(modal);
    }

    if (interaction.customId.startsWith('bug_')) {
      const bugType = interaction.customId.split('_')[1];
      const modal = new ModalBuilder()
        .setCustomId(`bug_modal_${bugType}`)
        .setTitle(`${BUG_TYPES.find(t => t.id === bugType).label} Bug Report`);

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('title').setLabel('Title').setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('desc').setLabel('Description').setStyle(TextInputStyle.Paragraph).setRequired(true)
        )
      );

      await interaction.showModal(modal);
    }
  }

  // MODAL SUBMIT
  if (interaction.type === InteractionType.ModalSubmit) {
    const guild = interaction.guild;
    if (!guild) return;
    let channelName, title, description;

    if (interaction.customId === 'suggest_modal') {
      channelName = `suggest-${Math.floor(Math.random() * 10000)}`;
      title = interaction.fields.getTextInputValue('title');
      description = interaction.fields.getTextInputValue('desc');
    } else if (interaction.customId.startsWith('bug_modal_')) {
      const bugType = interaction.customId.split('_')[2];
      channelName = `${bugType}-${Math.floor(Math.random() * 10000)}`;
      title = interaction.fields.getTextInputValue('title');
      description = interaction.fields.getTextInputValue('desc');
    } else return;

    const channel = await guild.channels.create({
      name: channelName,
      parent: SUGGEST_CATEGORY_ID,
      permissionOverwrites: [
        { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages'] },
        { id: guild.roles.everyone.id, deny: ['ViewChannel'] }
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(`${description}\n\n💡 **Do \`!close\` to close this ticket.**`)
      .setColor(randomColor())
      .setFooter({ text: `Opened by ${interaction.user.tag}` })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    await interaction.reply({ content: `✅ Ticket created: ${channel}`, ephemeral: true });
  }
});

/* =====================
   SLASH COMMAND LOADER
===================== */
require('./deploy-commands'); // separate file redeploys commands each deployment

/* =====================
   READY
===================== */
client.once(Events.ClientReady, () => {
  console.log(`✅ Bot online as ${client.user.tag}`);
  client.user.setActivity('Mod Downloads', { type: 'WATCHING' });
});

client.login(DISCORD_TOKEN);
