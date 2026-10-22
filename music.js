const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { DisTube } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');

let distube = null;

function initDisTube(client) {
  if (distube) return distube;

  distube = new DisTube(client, {
    emitNewSongOnly: true,
    leaveOnEmpty: true,
    leaveOnFinish: true,
    leaveOnStop: true,
    plugins: [new YtDlpPlugin()]
  });

  distube
    .on('playSong', (queue, song) => {
      const embed = new EmbedBuilder()
        .setTitle('🎶 กำลังเล่นเพลง')
        .setDescription(`[${song.name}](${song.url})`)
        .addFields(
          { name: '⏱️ ระยะเวลา', value: song.formattedDuration, inline: true },
          { name: '👤 ขอโดย', value: `${song.user}`, inline: true }
        )
        .setColor('#1DB954')
        .setThumbnail(song.thumbnail);
      queue.textChannel?.send({ embeds: [embed] }).catch(() => {});
    })
    .on('addSong', (queue, song) => {
      const embed = new EmbedBuilder()
        .setTitle('➕ เพิ่มเพลงลงในคิว')
        .setDescription(`[${song.name}](${song.url}) (\`${song.formattedDuration}\`)`)
        .setColor('#FFD700');
      queue.textChannel?.send({ embeds: [embed] }).catch(() => {});
    })
    .on('error', (channel, error) => {
      console.error('DisTube Error:', error);
      if (channel) {
        channel.send(`❌ เกิดข้อผิดพลาด: \`${error.message.slice(0, 100)}\``).catch(() => {});
      }
    });

  return distube;
}

// 🎵 คำสั่ง /play
const playCommand = new SlashCommandBuilder()
  .setName('play')
  .setDescription('🎶 เล่นเพลงจาก YouTube หรือลิงก์ที่กำหนด')
  .addStringOption(option =>
    option.setName('query')
      .setDescription('ชื่อเพลง หรือ ลิงก์ YouTube')
      .setRequired(true)
  );

async function handlePlayCommand(interaction, client) {
  const channel = interaction.member.voice.channel;
  if (!channel) {
    return await interaction.reply({ content: '❌ คุณต้องเข้าห้องเสียง (Voice Channel) ก่อนใช้งานคำสั่งนี้ครับ!', ephemeral: true });
  }

  const query = interaction.options.getString('query');
  const music = initDisTube(client);

  await interaction.deferReply();
  try {
    await music.play(channel, query, {
      textChannel: interaction.channel,
      member: interaction.member,
    });
    await interaction.editReply({ content: `🔍 กำลังค้นหาและเล่นเพลง: \`${query}\`` });
  } catch (e) {
    console.error(e);
    await interaction.editReply({ content: `❌ เกิดข้อผิดพลาดในการเล่นเพลง: ${e.message}` });
  }
}

// ⏭️ คำสั่ง /skip
const skipCommand = new SlashCommandBuilder()
  .setName('skip')
  .setDescription('⏭️ ข้ามไปยังเพลงถัดไปในคิว');

async function handleSkipCommand(interaction, client) {
  const music = initDisTube(client);
  const queue = music.getQueue(interaction.guildId);
  if (!queue) {
    return await interaction.reply({ content: '❌ ไม่มีเพลงกำลังเล่นอยู่ในขณะนี้ครับ!', ephemeral: true });
  }
  try {
    const song = await queue.skip();
    await interaction.reply({ content: `⏭️ ข้ามเพลงสำเร็จ! กำลังเล่น: **${song.name}**` });
  } catch (e) {
    await interaction.reply({ content: '❌ ไม่สามารถข้ามเพลงได้ (อาจไม่มีเพลงถัดไปในคิว)', ephemeral: true });
  }
}

// ⏹️ คำสั่ง /stop
const stopCommand = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('⏹️ หยุดเล่นเพลงและให้บอทออกจากห้องเสียง');

async function handleStopCommand(interaction, client) {
  const music = initDisTube(client);
  const queue = music.getQueue(interaction.guildId);
  if (!queue) {
    return await interaction.reply({ content: '❌ ไม่มีเพลงกำลังเล่นอยู่ในขณะนี้ครับ!', ephemeral: true });
  }
  queue.stop();
  await interaction.reply({ content: '⏹️ หยุดเล่นเพลงและออกจากห้องเสียงเรียบร้อยแล้วครับ!' });
}

// 📜 คำสั่ง /queue
const queueCommand = new SlashCommandBuilder()
  .setName('queue')
  .setDescription('📜 ดูรายชื่อเพลงทั้งหมดในคิวปัจจุบัน');

async function handleQueueCommand(interaction, client) {
  const music = initDisTube(client);
  const queue = music.getQueue(interaction.guildId);
  if (!queue) {
    return await interaction.reply({ content: '❌ ไม่มีคิวเพลงในขณะนี้ครับ!', ephemeral: true });
  }

  const q = queue.songs.map((song, i) => `${i === 0 ? '▶️ **กำลังเล่น:**' : `\`${i}.\``} ${song.name} - \`${song.formattedDuration}\``).join('\n');
  const embed = new EmbedBuilder()
    .setTitle('🎶 คิวเพลงปัจจุบัน (Music Queue)')
    .setDescription(q.length > 4000 ? q.slice(0, 4000) + '...' : q)
    .setColor('#1DB954');

  await interaction.reply({ embeds: [embed] });
}

// ⏸️ คำสั่ง /pause
const pauseCommand = new SlashCommandBuilder()
  .setName('pause')
  .setDescription('⏸️ พักการเล่นเพลงชั่วคราว');

async function handlePauseCommand(interaction, client) {
  const music = initDisTube(client);
  const queue = music.getQueue(interaction.guildId);
  if (!queue) return await interaction.reply({ content: '❌ ไม่มีเพลงกำลังเล่นครับ!', ephemeral: true });
  queue.pause();
  await interaction.reply({ content: '⏸️ พักการเล่นเพลงเรียบร้อยแล้ว' });
}

// ▶️ คำสั่ง /resume
const resumeCommand = new SlashCommandBuilder()
  .setName('resume')
  .setDescription('▶️ เล่นเพลงต่อจากที่พักไว้');

async function handleResumeCommand(interaction, client) {
  const music = initDisTube(client);
  const queue = music.getQueue(interaction.guildId);
  if (!queue) return await interaction.reply({ content: '❌ ไม่มีเพลงในคิวครับ!', ephemeral: true });
  queue.resume();
  await interaction.reply({ content: '▶️ เล่นเพลงต่อเรียบร้อยแล้ว' });
}

module.exports = {
  playCommand, skipCommand, stopCommand, queueCommand, pauseCommand, resumeCommand,
  handlePlayCommand, handleSkipCommand, handleStopCommand, handleQueueCommand, handlePauseCommand, handleResumeCommand,
  initDisTube
};
