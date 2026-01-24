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
  TextInputStyle
} = require('discord.js');

const fs = require('fs');
const path = require('path');

/* =====================
   ENV
===================== */
const {
  DISCORD_TOKEN,
  CLIENT_ID,
  VERIFIED_ROLE_ID,
  VERIFY_LOG_CHANNEL_ID
} = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('[FATAL] Missing env vars');
  process.exit(1);
}

/* =====================
   CONSTANTS
===================== */
const PREFIX = '!';
const ALLOWED_USER_ID = '1343244701507260416';

const JOIN_CHANNEL_ID = '1455930364810756169';
const BOOST_CHANNEL_ID = '1455935047554040037';

const TICKET_CATEGORY_ID = '1455955288346595348';

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
   ROTATING MESSAGES
===================== */
const joinMessages = [
  '👋 Welcome {user}!',
  '🔥 {user} just joined!',
  '🎉 Everyone welcome {user}!',
  '💙 Glad you’re here {user}!'
];

const boostMessages = [
  '🚀 {user} boosted the server!',
  '💜 Huge thanks to {user}!',
  '⭐ {user} is a legend!',
  '🔥 Boost received from {user}!'
];

let joinIndex = 0;
let boostIndex = 0;

/* =====================
   VERIFICATION STATE
===================== */
const verificationMap = new Map();

/* =====================
   MESSAGE HANDLER
===================== */
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  /* DM verification */
  if (!message.guild && verificationMap.has(message.author.id)) {
    const expected = verificationMap.get(message.author.id);

    if (parseInt(message.content) === expected) {
      verificationMap.delete(message.author.id);

      for (const guild of client.guilds.cache.values()) {
        const member = await guild.members.fetch(message.author.id).catch(() => null);
        if (!member) continue;

        await member.roles.add(VERIFIED_ROLE_ID).catch(() => {});
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

  const args = message.content.slice(1).trim().split(/ +/);
  const cmd = args.shift()?.toLowerCase();

  /* VERIFY PANEL */
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

  /* BUG PANEL */
  if (cmd === 'panel' && args[0] === 'bug' && message.author.id === ALLOWED_USER_ID) {
    const embed = new EmbedBuilder()
      .setTitle('🐞 Bug Reports')
      .setDescription('Choose what your bug relates to.')
      .setColor(randomColor());

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('bug_autototem').setLabel('AutoTotem').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('bug_autorocket').setLabel('AutoRocket').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('bug_performance').setLabel('Performance Eternal').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('bug_other').setLabel('Other').setStyle(ButtonStyle.Secondary)
    );

    return message.channel.send({ embeds: [embed], components: [row] });
  }

  /* SUGGEST PANEL */
  if (cmd === 'panel' && args[0] === 'suggest' && message.author.id === ALLOWED_USER_ID) {
    const embed = new EmbedBuilder()
      .setTitle('💡 Suggestions')
      .setDescription('Click below to submit a suggestion.')
      .setColor(randomColor());

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('suggest_button')
        .setLabel('Make a Suggestion')
        .setStyle(ButtonStyle.Success)
    );

    return message.channel.send({ embeds: [embed], components: [row] });
  }
});

/* =====================
   INTERACTIONS
===================== */
client.on(Events.InteractionCreate, async interaction => {
  /* VERIFY BUTTON */
  if (interaction.isButton() && interaction.customId === 'verify_button') {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    verificationMap.set(interaction.user.id, a + b);

    try {
      await interaction.user.send(`🧮 What is **${a} + ${b}**?`);
      await interaction.reply({ content: '📬 Check your DMs!', ephemeral: true });
    } catch {
      await interaction.reply({ content: '❌ DMs closed.', ephemeral: true });
    }
  }

  /* BUG BUTTONS */
  if (interaction.isButton() && interaction.customId.startsWith('bug_')) {
    const modal = new ModalBuilder()
      .setCustomId(`bug_modal_${interaction.customId}`)
      .setTitle('Bug Report');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('bug_desc')
          .setLabel('Describe the bug')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      )
    );

    return interaction.showModal(modal);
  }

  /* SUGGEST BUTTON */
  if (interaction.isButton() && interaction.customId === 'suggest_button') {
    const modal = new ModalBuilder()
      .setCustomId('suggest_modal')
      .setTitle('Suggestion');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('suggest_text')
          .setLabel('Your suggestion')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      )
    );

    return interaction.showModal(modal);
  }

  /* MODAL SUBMITS */
  if (interaction.isModalSubmit()) {
    const guild = interaction.guild;
    const category = guild.channels.cache.get(TICKET_CATEGORY_ID);

    const ticketNum = Math.floor(Math.random() * 9999);

    if (interaction.customId.startsWith('bug_modal_')) {
      const desc = interaction.fields.getTextInputValue('bug_desc');

      const channel = await guild.channels.create({
        name: `bug-${ticketNum}`,
        parent: category
      });

      channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('🐞 Bug Report')
            .setDescription(desc)
            .setFooter({ text: `By ${interaction.user.tag}` })
            .setColor(randomColor())
        ]
      });

      return interaction.reply({ content: '✅ Bug ticket created!', ephemeral: true });
    }

    if (interaction.customId === 'suggest_modal') {
      const text = interaction.fields.getTextInputValue('suggest_text');

      const channel = await guild.channels.create({
        name: `suggest-${ticketNum}`,
        parent: category
      });

      channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('💡 Suggestion')
            .setDescription(text)
            .setFooter({ text: `By ${interaction.user.tag}` })
            .setColor(randomColor())
        ]
      });

      return interaction.reply({ content: '✅ Suggestion submitted!', ephemeral: true });
    }
  }
});

/* =====================
   JOIN / BOOST
===================== */
client.on(Events.GuildMemberAdd, member => {
  const ch = member.guild.channels.cache.get(JOIN_CHANNEL_ID);
  if (!ch) return;

  const msg = joinMessages[joinIndex].replace('{user}', `<@${member.id}>`);
  joinIndex = (joinIndex + 1) % joinMessages.length;

  ch.send(msg);
});

client.on(Events.MessageCreate, msg => {
  if (msg.type === 8 && msg.channel.id === BOOST_CHANNEL_ID) {
    const text = boostMessages[boostIndex].replace('{user}', `<@${msg.author.id}>`);
    boostIndex = (boostIndex + 1) % boostMessages.length;
    msg.channel.send(text);
  }
});

/* =====================
   SLASH COMMAND LOADER (ARRAY FILES)
===================== */
(async () => {
  const commands = [];
  const dir = path.join(__dirname, 'commands');

  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir)) {
      const exported = require(path.join(dir, file));
      for (const cmd of exported) {
        commands.push(cmd.data.toJSON());
        client.commands.set(cmd.data.name, cmd);
      }
    }
  }

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

  console.log('[SLASH] Loaded', commands.length);
})();

/* =====================
   READY
===================== */
client.once(Events.ClientReady, () => {
  console.log(`✅ Bot online as ${client.user.tag}`);
});

client.login(DISCORD_TOKEN);
