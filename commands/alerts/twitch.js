const { Command } = require('discord.js-commando');
const winston = require('winston');
const _ = require('lodash');
const request = require('request');

const { TWITCH_CLIENT_ID } = require('../../config');

module.exports = class TwitchCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'twitch',
            group: 'alerts',
            memberName: 'twitch',
            description: 'Add or remove Twitch streamer from alerts',
            details: 'Using the add argument after the command allows user to add new Twitch streamer to the alerts and using the remove argument allows the user to remove an existing Twitch streamer from the alerts',
            examples: [`${client.commandPrefix}twitch add wokki`, `${client.commandPrefix}twitch remove wokki`],
            guildOnly: true,
            clientPermissions: ['SEND_MESSAGES'],
            args: [
                {
                    key: 'method',
                    prompt: 'Add or remove',
                    type: 'string'
                },
                {
                    key: 'target',
                    prompt: 'Enter streamer name',
                    type: 'string',
                    default: ''
                }
            ]
        });
    }

    async run(msg, { method, target }) {
        target = target.toLowerCase();
        method = method.toLowerCase();

        if (!this.client.provider.get(msg.guild.id, "streamsChannel")) msg.channel.send(`It seems like you don't have alerts channel set in this server. Please use the **>setchannel** command to set a channel as alerts channel.\n**NOTE:** Setting a channel as alerts channel means that WokkiAlerts will delete all current and new messages from the channel. Only use this in an empty, newly create channel!`);
        let streamers = this.client.provider.get("global", "twitchStreamers", []);

        if (!target || target === "") return msg.channel.send(`Uh oh! The streamer name part of the argument seems to be invalid. Please try again.`);

        if (method === "add") {
            let twitchStreamers = _.filter(streamers, streamer => _.includes(streamer.guilds, guild.id));
            if (twitchStreamers.length >= 8) return msg.channel.send(`Due to Discord Embed limitations, the current amount of maximum streamers per server is 8. In future versions, WokkiAlerts will support more streamers by sending multiple embeds.`);

            await msg.channel.send(`Adding **${target}** to the list of streamers...`).then(message => {
                request({
                    headers: {
                        'Client-ID': TWITCH_CLIENT_ID
                    },
                    uri: `https://api.twitch.tv/helix/users?login=${target}`,
                    method: 'GET'
                }, (err, res, body) => {
                    if (err) return [winston.error(err),message.edit(`An error occurred while attempting to fetch user data from twitch`)];
                    let result = JSON.parse(body).data[0];

                    if (_.find(streamers, { "user": target })) {
                        let user = _.find(streamers, { "user": target });
                        if (_.includes(user.guilds, msg.guild.id)) return message.edit(`Already receiving alerts of **${target}**`);
                        user.guilds.push(msg.guild.id);
                    }
                    else {
                        let user = {
                            "user": target,
                            "id": result.id,
                            "guilds": [msg.guild.id]
                        };
                        streamers.push(user);
                    }
                    return [this.client.provider.set("global", "twitchStreamers", streamers),message.edit(`You will now receive live alerts from **${target}**`)];
                });
            });
        }
        else if (method === "remove") {
            await msg.channel.send(`Removing **${target}** from the list of streamers...`).then(message => {
                let user = _.find(streamers, { "user": target });
                if (user) {
                    _.pull(user.guilds, msg.guild.id);
                    if (user.guilds.length === 0) _.remove(streamers, { "user": target });
                    return [this.client.provider.set("global", "twitchStreamers", streamers),message.edit(`You will no longer receive live alerts from **${target}**`)];
                }
                else {
                    return message.edit(`**${target}** is not in the list of alerts. Make sure you wrote the name correctly and try again.`);
                }
            });
        }
        else {
            return msg.channel.send(`Invalid method. Use **>twitch add <name>** or **>twitch remove <name>**.`);
        }
    }
}