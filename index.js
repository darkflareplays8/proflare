require('dotenv').config(); // MUST be first

console.log('[BOOT] Starting ProFlare bot…');

const {
  Client,
  GatewayIntentBits,
  Collection,
  Partials,
  Events,
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
  SUGGEST_CATEGORY_ID,
  JOIN_CHANNEL_ID,
  BOOST_CHANNEL_ID
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

const BUG_TYPES = [
  { id: 'autototem', label: 'AutoTotem' },
  { id: 'autorocket', label: 'AutoRocket' },
  { id: 'performanceeternal', label: 'Performance Eternal' },
  { id: 'other', label: 'Other' }
];

const JOIN_MESSAGES = [
  member => `Welcome **${member.user.username}**!`,
  member => `🎉 Everyone welcome **${member.user.username}**!`,
  member => `🔥 **${member.user.username}** joined the server`,
  member => `💫 Glad you’re here, **${member.user.username}**`
];

const BOOST_MESSAGES = [
  member => `🚀 **${member.user.username}** just boosted the server!`,
  member => `💎 Thanks for the boost, **${member.user.username}**!`,
  member => `🔥 **${member.user.username}** is supporting us!`
];

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

const verificationMap = new Map();

function createEmbed(title, member) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(member.toString())
    .setColor(randomColor())
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setTimestamp();
}

/* =====================
   MESSAGE COMMANDS
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

  // !message command
  if (cmd === 'message' && message.author.id === ALLOWED_USER_ID) {
    const contentToSend = args.join(' ');
    try {
      await message.delete();
      await message.channel.send({ content: contentToSend });
    } catch (err) {
      console.error('[MESSAGE]', err);
    }
  }

  // !panel verify
  if (cmd === 'panel' && args[0] === 'verify' && message.author.id === ALLOWED_USER_ID) {
    console.log('[CMD] !panel verify used');

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

  // !panel bug
  if (cmd === 'panel' && args[0] === 'bug' && message.author.id === ALLOWED_USER_ID) {
    const embed = new EmbedBuilder()
      .setTitle('🐛 Bug Report Panel')
      .setDescription('Click a button below to create a bug ticket.')
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

  // !panel suggest
  if (cmd === 'panel' && args[0] === 'suggest' && message.author.id === ALLOWED_USER_ID) {
    const embed = new EmbedBuilder()
      .setTitle('📩 Suggestion Panel')
      .setDescription('Click the button below to create a suggestion ticket.')
      .setColor(randomColor());

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('suggest_create')
        .setLabel('Create Suggestion')
        .setStyle(ButtonStyle.Primary)
    );

    return message.channel.send({ embeds: [embed], components: [row] });
  }

  // !close command
  if (cmd === 'close') {
    if (
      message.channel.name.startsWith('suggest-') ||
      BUG_TYPES.some(t => message.channel.name.startsWith(t.id))
    ) {
      await message.channel.delete().catch(() => {});
    }
  }
});

/* =====================
   JOIN / BOOST MESSAGES
===================== */
client.on(Events.GuildMemberAdd, member => {
  const ch = member.guild.channels.cache.get(JOIN_CHANNEL_ID);
  if (!ch) return;

  const embed = createEmbed(
    JOIN_MESSAGES[Math.floor(Math.random() * JOIN_MESSAGES.length)](member),
    member
  );

  ch.send({ embeds: [embed] }).catch(() => {});
});

client.on(Events.GuildMemberUpdate, (oldMember, newMember) => {
  if (!oldMember.premiumSince && newMember.premiumSince) {
    const ch = newMember.guild.channels.cache.get(BOOST_CHANNEL_ID);
    if (!ch) return;

    const embed = createEmbed(
      BOOST_MESSAGES[Math.floor(Math.random() * BOOST_MESSAGES.length)](newMember),
      newMember
    );

    ch.send({ embeds: [embed] }).catch(() => {});
  }
});

/* =====================
   INTERACTIONS (Buttons / Modals)
===================== */
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton()) {
    // Verify button
    if (interaction.customId === 'verify_button') {
      console.log('[VERIFY] Button clicked by', interaction.user.tag);

      const a = Math.floor(Math.random() * 10) + 1;
      const b = Math.floor(Math.random() * 10) + 1;

      verificationMap.set(interaction.user.id, a + b);

      try {
        await interaction.user.send(
          `🧮 **Verification Required**\n\nWhat is **${a} + ${b}**? Reply with the number.`
        );
        await interaction.reply({ content: '📬 Check your DMs!', ephemeral: true });
      } catch (err) {
        console.error('[VERIFY] DM failed', err);
        await interaction.reply({ content: '❌ Your DMs are closed.', ephemeral: true });
      }
    }

    // Suggestion modal
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

    // Bug buttons
    if (interaction.customId.startsWith('bug_')) {
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
  }

  // Modal submit
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
      .setDescription(`${description}\n\n💡 **Use \`!close\` to close this ticket.**`)
      .setColor(randomColor())
      .setFooter({ text: `Opened by ${interaction.user.tag}` })
      .setTimestamp();

    await channel.send({ embeds: [embed] });

    // Ticket confirmation with channel link
    await interaction.reply({
      content: `✅ Ticket created: <#${channel.id}>`,
      ephemeral: true
    });
  }
});

/* =====================
   SLASH COMMANDS
===================== */
// Deploy commands via separate script so Railway deploys re-register them automatically
require('./deploy-commands'); // <--- this will handle deploying commands each deploy

/* =====================
   READY
===================== */
client.once(Events.ClientReady, () => {
  console.log(`✅ Bot online as ${client.user.tag}`);
});

client.login(DISCORD_TOKEN);
