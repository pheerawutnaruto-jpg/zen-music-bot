const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const http = require('http');
const {
  playCommand, skipCommand, stopCommand, queueCommand, pauseCommand, resumeCommand,
  handlePlayCommand, handleSkipCommand, handleStopCommand, handleQueueCommand, handlePauseCommand, handleResumeCommand,
  initDisTube
} = require('./music');

const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Zen Bot Music is running!\n');
});
httpServer.listen(process.env.PORT || 3001);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', async () => {
  console.log(`🎶 Zen Bot Music Online แล้วจ้า: ${client.user.tag}`);
  initDisTube(client);

  const commands = [
    playCommand,
    skipCommand,
    stopCommand,
    queueCommand,
    pauseCommand,
    resumeCommand
  ].map(command => command.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ ลงทะเบียนคำสั่งเพลงทั้งหมดสำเร็จเรียบร้อย!');
  } catch (error) {
    console.error('❌ Error registering music commands:', error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = interaction.commandName;
  if (cmd === 'play') return await handlePlayCommand(interaction, client);
  if (cmd === 'skip') return await handleSkipCommand(interaction, client);
  if (cmd === 'stop') return await handleStopCommand(interaction, client);
  if (cmd === 'queue') return await handleQueueCommand(interaction, client);
  if (cmd === 'pause') return await handlePauseCommand(interaction, client);
  if (cmd === 'resume') return await handleResumeCommand(interaction, client);
});

client.login(process.env.DISCORD_TOKEN);
