const { SlashCommandBuilder } = require('discord.js');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('autototem')
      .setDescription('AutoTotem+'),
    async execute(interaction) {
      await interaction.reply('🔥 **AutoTotem+**: https://placehold.com');
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('autorocket')
      .setDescription('AutoRocket+'),
    async execute(interaction) {
      await interaction.reply('🚀 **AutoRocket+**: https://placehold.co');
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('performance-eternal')
      .setDescription('Performance Eternal'),
    async execute(interaction) {
      await interaction.reply('⚡ **Performance Eternal**: Coming soon!');
    }
  }
];
