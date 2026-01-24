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
  VERIFY_LOG_CHANNEL_ID
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
const SUGGEST_CATEGORY_ID = '1455955288346595348';

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

  const args = message.content.slice(1).trim().split(/ +/);
  const cmd = args.shift()?.toLowerCase();

  // !panel verify
  if (cmd === 'panel' && args[0] === 'verify' && message.author.id === ALLOWED_USER_ID) {
    console.log('[CMD] !panel verify used');

    const embed = new EmbedBuilder()
      .setTitle('✅ Verification')
      .setDescription('Click the button below to verify via DM math challenge.')
      .setColor(randomColor());

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('verify_button')
        .setLabel('Verify')
        .setStyle(ButtonStyle.Success)
    );

    return message.channel.send({ embeds: [embed], components: [row] });
  }
});

/* =====================
   INTERACTIONS
===================== */
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'verify_button') {
    console.log('[VERIFY] Button clicked by', interaction.user.tag);

    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;

    verificationMap.set(interaction.user.id, a + b);

    try {
      await interaction.user.send(
        `🧮 **Verification Required**\n\nWhat is **${a} + ${b}**?\nReply with the number.`
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
