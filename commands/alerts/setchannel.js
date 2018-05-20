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
        if (!msg.mentions.channels.first()) return msg.channel.send(`You must mention the channel name by using #channel-name`);
        channel = msg.mentions.channels.first();
        this.client.provider.set(msg.guild.id, channel.id);
        return msg.channel.send(`Streams channel set to **${channel.name} (${channel.id})**`);
    }
}