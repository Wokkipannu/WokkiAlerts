const Commando = require('discord.js-commando');
const path = require('path');
const winston = require('winston');
const sqlite = require('sqlite');
const _ = require('lodash');

const streams = require('./util/streams.js');
const { OWNER, TOKEN, PREFIX } = require('./config.json');

const client = new Commando.Client({
    owner: OWNER,
    commandPrefix: PREFIX,
    unknownCommandResponse: false
});

client.on('ready', () => {
        winston.info(`WokkiAlerts is ready`);
        client.user.setActivity(`for streams`, { type: "WATCHING" });
    })
    .on('error', winston.error)
    .on('warn', winston.warn)
    .on('disconnect', () => winston.warn(`Disconnected`))
    .on('reconnect', () => winston.warn(`Reconnected`))
    .on('commandRun', (cmd, promise, msg, args) => winston.info(`User ${msg.author.tag} (${msg.author.id}) ran command ${cmd.memberName}`))
    .on('commandError', (cmd, err) => winston.error(`Error in command ${cmd.groupID}:${cmd.memberName}`, err))
    .on('message', msg => {
        if (msg.channel.id === client.provider.get(msg.guild.id, "streamsChannel")) {
            if (msg.content.startsWith(client.commandPrefix)) {
                let cmdTxt = msg.content.split(client.commandPrefix)[1];
                if (_.includes(client.registry.commands, cmdTxt)) {
                    msg.delete();
                }
                else {
                    msg.reply(`Keep this channel clean. It's for stream alerts only. (Message deleted)`).then(message => {
                        msg.delete();
                        message.delete({ timeout: 5000 });
                    });
                }
            }
            else {
                msg.reply(`Keep this channel clean. It's for stream alerts only. (Message deleted)`).then(message => {
                    msg.delete();
                    message.delete({ timeout: 5000 });
                });
            }
        }
    });

client.registry
    .registerGroups([
        ['alerts', 'Twitch and YouTube alerts']
    ])
    .registerDefaults()
    .registerCommandsIn(path.join(__dirname, 'commands'));

// Check for livestreams every 2 minutes
setInterval(() => {
    winston.info(`Running scheduled stream check`);
    streams.checkTwitch(client);
}, 120000);

client.setProvider(
    sqlite.open(path.join(__dirname, 'settings.sqlite3')).then(db => new Commando.SQLiteProvider(db))
).catch(winston.error);

client.login(TOKEN);