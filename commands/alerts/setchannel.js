const { Command } = require('discord.js-commando');
const winston = require('winston');

module.exports = class SetChannelCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'setchannel',
            group: 'alerts',
            memberName: 'setchannel',
            description: 'Set channel for livestream notifications',
            examples: [`${client.commandPrefix}setchannel`],
            guildOnly: true,
            clientPermissions: ['SEND_MESSAGES'],
            args: [
                {
                    key: 'channel',
                    prompt: 'Which channel should stream alerts be sent to?',
                    type: 'string',
                    default: ''
                }
            ]
        });
    }

    hasPermission(msg) {
        if (msg.author === msg.guild.owner.user) return true;
        else return this.client.isOwner(msg.author);
    }

    run(msg, { channel }) {
        if (!channel || channel === "") {
            winston.info(`Setting stream alerts channel to ${msg.channel.name} (${msg.channel.id}) in guild ${msg.guild.name} (${msg.guild.id})`);
            this.client.provider.set(msg.guild.id, "streamsChannel", msg.channel.id);
            if (msg.channel.id === this.client.provider.get(msg.guild.id, "streamsChannel")) return msg.channel.send(`Streams channel set to **${msg.channel.name} (${msg.channel.id})**.`).then(message => message.delete({ timeout: 5000 }));
            else return msg.channel.send(`Streams channel set to **${msg.channel.name} (${msg.channel.id})**.`);
        }
        else {
            let alertsChannel = msg.guild.channels.find('name', channel);
            if (!alertsChannel) return msg.channel.send(`Could not find a channel with the name **${channel}**. Please make sure the channel name is written correctly.\nIf the channel name incldues dashes (-) include those in the channel name.`);
            this.client.provider.set(msg.guild.id, "streamsChannel", alertsChannel.id);
            return msg.channel.send(`Streams channel set to **${alertsChannel.name} (${alertsChannel.id})**.`);
        }
    }
}