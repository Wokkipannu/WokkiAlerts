const { Command } = require('discord.js-commando');
const winston = require('winston');
const _ = require('lodash');
const request = require('request');

const { GOOGLE_API_KEY } = require('../../config.json');
const streams = require('../../util/streams.js');

module.exports = class RefreshCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'refresh',
            group: 'alerts',
            memberName: 'refresh',
            description: 'Refresh alerts immediately',
            details: 'Does not overwrite the current timer of stream check. Still occurs every 2 minutes.',
            examples: [`${client.commandPrefix}refresh`],
            guildOnly: true,
            clientPermissions: ['SEND_MESSAGES']
        });
    }

    run(msg) {
        streams.checkTwitch(this.client);
        //streams.checkYoutube(this.client);
        if (msg.channel.id === this.client.provider.get(msg.guild.id, "streamsChannel")) msg.channel.send(`Streamer statuses refreshed`).then(message => message.delete({ timeout: 5000 }));
        else msg.channel.send(`Streamer statuses refreshed`);
    }
}