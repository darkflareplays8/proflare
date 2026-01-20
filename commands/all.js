const { SlashCommandBuilder } = require('discord.js');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('autototem')
      .setDescription('AutoTotem+'),
    async execute(interaction) {
      await interaction.reply('🔥 **AutoTotem+**: https://modrinth.com/mod/autototem+');
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('autorocket')
      .setDescription('AutoRocket+'),
    async execute(interaction) {
      await interaction.reply('🚀 **AutoRocket+**: https://modrinth.com/mod/autorocket+');
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('performance-eternal')
      .setDescription('Performance Eternal'),
    async execute(interaction) {
      await interaction.reply('⚡ **Performance Eternal**: https://modrinth.com/modpack/performance-eternal');
    }
  }
];
