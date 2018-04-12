const { Command } = require('discord.js-commando');
const winston = require('winston');
const _ = require('lodash');
const request = require('request');

const { GOOGLE_API_KEY } = require('../../config.json');

module.exports = class YoutubehCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'youtube',
            group: 'alerts',
            memberName: 'youtube',
            description: 'Add or remove youtube stream notifications',
            details: '',
            examples: [`${client.commandPrefix}youtube add UCv9Edl_WbtbPeURPtFDo-uA`, `${client.commandPrefix}youtube remove UCv9Edl_WbtbPeURPtFDo-uA`],
            guildOnly: true,
            clientPermissions: ['SEND_MESSAGES'],
            args: [
                {
                    key: 'method',
                    prompt: 'Add or remove?',
                    type: 'string'
                },
                {
                    key: 'target',
                    prompt: 'Enter YouTube channel ID, not the name of the channel',
                    type: 'string',
                    default: ''
                }
            ]
        });
    }

    async run(msg, { method, target }) {
        method = method.toLowerCase();

        if (!this.client.provider.get(msg.guild.id, "streamsChannel")) msg.channel.send(`It seems like you don't have alerts channel set in this server. Please use the **>setchannel** command to set a channel as alerts channel.\n**NOTE:** Setting a channel as alerts channel means that WokkiAlerts will delete all current and new messages from the channel. Only use this in an empty, newly create channel!`);
        let streamers = this.client.provider.get("global", "youtubeStreamers", []);

        if (!target || target === "") return msg.channel.send(`Uh oh! The streamer name part of the argument seems to be invalid. Please try again.`);

        if (method === "add") {
            msg.channel.send(`Subscribing to receive notifications of channel **${target}**...`).then(message => {
                request({
                    uri: `https://www.googleapis.com/youtube/v3/channels?key=${GOOGLE_API_KEY}&id=${target}&part=snippet`,
                    method: 'GET'
                }, (err, res, body) => {
                    if (err) return [winston.error(err),message.edit(`An error occurred while attempting to fetch user data from youtube`)];
                    if (JSON.parse(body).items.length < 1) return message.edit(`Couldn't get info from youtube. Maybe the channel ID is wrong?`);
                    let result = JSON.parse(body).items[0];

                    if (_.find(streamers, { "id": target })) {
                        let user = _.find(streamers, { "id": target });
                        if (_.includes(user.guilds, msg.guild.id)) return message.edit(`Already receiving notifications of channel **${result.snippet.title}**`);
                        user.guilds.push(msg.guild.id);
                    }
                    else {
                        let user = {
                            "user": result.snippet.title,
                            "id": target,
                            "guilds": [msg.guild.id]
                        };
                        streamers.push(user);
                    }
                    return [this.client.provider.set(msg.guild.id, "youtube", streamers),message.edit(`Succesfully subscribed to receive notifications of channel **${result.snippet.title}**!`)];
                });
            });
        }
        else if (method === "remove") {
            msg.channel.send(`Removing notifications of channel...`).then(message => {
                let user = _.find(streamers, { "id": target });
                if (user) {
                    _.pull(user.guilds, msg.guild.id);
                    if (user.guilds.length === 0) _.remove(streamers, { "id": target });
                    return [this.client.provider.set(msg.guild.id, "youtube", streamers),message.edit(`Succesfully removed **${target}** from this servers subscriptions`)];
                }
                else {
                    user = _.find(streamers, { "user": target });
                    if (user) {
                        _.pull(user.guilds, msg.guild.id);
                        if (user.guilds.length === 0) _.remove(streamers, { "user": target });
                        return [this.client.provider.set(msg.guild.id, "youtube", streamers),message.edit(`Succesfully removed **${target}** from this servers subscriptions`)];
                    }
                    return message.edit(`Could not find **${target}** in the servers subscriptions`);
                }
            });
        }
        else {
            return msg.channel.send(`Invalid method. Use **>youtube add <name>** or **>youtube remove <name>**.`);
        }
    }
}