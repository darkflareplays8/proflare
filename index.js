require('dotenv').config();
const fs = require('fs');
const path = require('path');

const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  Collection,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  InteractionType,
  REST,
  Routes
} = require('discord.js');

/* =====================
   ENV
===================== */
const {
  DISCORD_TOKEN,
  CLIENT_ID,
  JOIN_CHANNEL_ID,
  BOOST_CHANNEL_ID,
  VERIFIED_ROLE_ID,
  VERIFY_LOG_CHANNEL_ID,
  SUGGEST_CATEGORY_ID
} = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('❌ Missing DISCORD_TOKEN or CLIENT_ID');
  process.exit(1);
}

/* =====================
   CONSTANTS
===================== */
const PREFIX = '!';
const ALLOWED_USER_ID = '1455955288346595348';
const BUG_TYPES = ['AutoTotem', 'AutoRocket', 'Performance Eternal', 'Other'];

const verificationMap = new Map();

/* =====================
   HELPERS
===================== */
const randomColor = () => Math.floor(Math.random() * 0xffffff);

const JOIN_MESSAGES = [
  m => `👋 Welcome **${m.user.username}**!`,
  m => `🎉 Everyone welcome **${m.user.username}**!`,
  m => `🔥 **${m.user.username}** joined the server`,
  m => `💫 Glad you’re here, **${m.user.username}**`
];

const BOOST_MESSAGES = [
  m => `🚀 **${m.user.username}** just boosted the server!`,
  m => `💎 Thanks for the boost, **${m.user.username}**!`,
  m => `🔥 **${m.user.username}** is supporting us!`
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
   MESSAGE COMMANDS
===================== */
client.on(Events.MessageCreate, async message => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const cmd = args.shift()?.toLowerCase();

  if (cmd === 'panel' && message.author.id === ALLOWED_USER_ID) {
    if (args[0] === 'suggest') {
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

    if (args[0] === 'bug') {
      const embed = new EmbedBuilder()
        .setTitle('🐛 Bug Report Panel')
        .setDescription('Select the bug type')
        .setColor(randomColor());

      const row = new ActionRowBuilder();
      BUG_TYPES.forEach(t =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`bug_${t}`)
            .setLabel(t)
            .setStyle(ButtonStyle.Danger)
        )
      );

      return message.channel.send({ embeds: [embed], components: [row] });
    }

    if (args[0] === 'verify') {
      const embed = new EmbedBuilder()
        .setTitle('✅ Verification')
        .setDescription('Click the button and solve the math in DMs')
        .setColor(randomColor());

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('verify_button')
          .setLabel('Verify')
          .setStyle(ButtonStyle.Success)
      );

      return message.channel.send({ embeds: [embed], components: [row] });
    }
  }

  if (cmd === 'close' && message.channel.parentId === SUGGEST_CATEGORY_ID) {
    message.channel.delete().catch(() => {});
  }
});

/* =====================
   JOIN EMBEDS
===================== */
client.on(Events.GuildMemberAdd, member => {
  const ch = member.guild.channels.cache.get(JOIN_CHANNEL_ID);
  if (!ch) return;

  const embed = new EmbedBuilder()
    .setDescription(
      JOIN_MESSAGES[Math.floor(Math.random() * JOIN_MESSAGES.length)](member)
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setColor(randomColor())
    .setTimestamp();

  ch.send({ embeds: [embed] }).catch(() => {});
});

/* =====================
   BOOST EMBEDS
===================== */
client.on(Events.GuildMemberUpdate, (o, n) => {
  if (!o.premiumSince && n.premiumSince) {
    const ch = n.guild.channels.cache.get(BOOST_CHANNEL_ID);
    if (!ch) return;

    const embed = new EmbedBuilder()
      .setDescription(
        BOOST_MESSAGES[Math.floor(Math.random() * BOOST_MESSAGES.length)](n)
      )
      .setThumbnail(n.user.displayAvatarURL({ dynamic: true }))
      .setColor(randomColor())
      .setTimestamp();

    ch.send({ embeds: [embed] }).catch(() => {});
  }
});

/* =====================
   INTERACTIONS
===================== */
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton() && interaction.customId === 'verify_button') {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;

    verificationMap.set(interaction.user.id, a + b);

    try {
      await interaction.user.send(
        `🧮 Verification:\nWhat is **${a} + ${b}**?\nReply with the number.`
      );
      await interaction.reply({ content: '📬 Check your DMs!', ephemeral: true });
    } catch {
      await interaction.reply({
        content: '❌ Your DMs are closed.',
        ephemeral: true
      });
    }
  }

  if (interaction.isButton() && interaction.customId === 'suggest_create') {
    const modal = new ModalBuilder()
      .setCustomId('suggest_modal')
      .setTitle('Create Suggestion')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('title')
            .setLabel('Title')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('desc')
            .setLabel('Description')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        )
      );

    interaction.showModal(modal);
  }

  if (interaction.type === InteractionType.ModalSubmit) {
    const ch = await interaction.guild.channels.create({
      name: `suggest-${Math.floor(Math.random() * 9999)}`,
      parent: SUGGEST_CATEGORY_ID,
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone, deny: ['ViewChannel'] },
        { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages'] }
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle(interaction.fields.getTextInputValue('title'))
      .setDescription(
        interaction.fields.getTextInputValue('desc') +
          '\n\n🔒 Use `!close` to close this ticket.'
      )
      .setColor(randomColor());

    ch.send({ embeds: [embed] });
    interaction.reply({ content: `Created ${ch}`, ephemeral: true });
  }
});

/* =====================
   DM VERIFICATION
===================== */
client.on(Events.MessageCreate, async msg => {
  if (msg.guild) return;
  if (!verificationMap.has(msg.author.id)) return;

  const expected = verificationMap.get(msg.author.id);

  if (parseInt(msg.content) === expected) {
    verificationMap.delete(msg.author.id);

    for (const g of client.guilds.cache.values()) {
      const m = await g.members.fetch(msg.author.id).catch(() => null);
      if (!m) continue;

      await m.roles.add(VERIFIED_ROLE_ID).catch(() => {});
      g.channels.cache
        .get(VERIFY_LOG_CHANNEL_ID)
        ?.send(`✅ ${msg.author.tag} verified`);
    }

    msg.reply('✅ Verified!');
  } else {
    msg.reply('❌ Incorrect answer. Click verify again.');
  }
});

/* =====================
   SLASH COMMAND LOADER
===================== */
(async () => {
  const commands = [];
  const dir = path.join(__dirname, 'commands');

  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir)) {
      const cmd = require(path.join(dir, file));
      if (cmd?.data && cmd?.execute) {
        client.commands.set(cmd.data.name, cmd);
        commands.push(cmd.data.toJSON());
      }
    }
  }

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
})();

/* =====================
   READY
===================== */
client.once(Events.ClientReady, () => {
  console.log(`✅ Bot online as ${client.user.tag}`);
});

client.login(DISCORD_TOKEN);
