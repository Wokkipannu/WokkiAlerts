const { MessageEmbed } = require('discord.js');
const request = require('request');
const winston = require('winston');
const moment = require('moment');
const _ = require('lodash');
const { TWITCH_CLIENT_ID, GOOGLE_API_KEY } = require('../config');

exports.checkTwitch = async function(client) {
    if (TWITCH_CLIENT_ID === "") return winston.info(`TWITCH_CLIENT_ID is not defined`);

    let streamers = client.provider.get("global", "twitchStreamers");
    if (!streamers) return winston.info(`Streamers database seems to be empty.`);

    // Construct the request URL
    let url = "https://api.twitch.tv/helix/streams";
    for (let i = 0; i < streamers.length; i++) {
        if (i === 0) url += `?user_login=${streamers[i].user}`;
        else url += `&user_login=${streamers[i].user}`;
    }

    _.each(streamers, streamer => {
        streamer.status = "OFFLINE";
    });

    // Get every streamers status from Twitch
    await request({
        headers: {
            'Client-ID': TWITCH_CLIENT_ID
        },
        uri: url,
        method: 'GET'
    }, (err, res, body) => {
        if (err) return winston.error(err);
        let result = JSON.parse(body);

        _.each(result.data, stream => {
            let streamer = _.find(streamers, { "id": stream.user_id });
            streamer.status = "LIVE";
        });

        client.guilds.forEach(guild => {
            let streamsChannel = client.provider.get(guild.id, "streamsChannel");
            let twitchMessage = client.provider.get(guild.id, "twitchMessage");
            let twitchStreamers = _.filter(streamers, streamer => _.includes(streamer.guilds, guild.id));
            twitchStreamers = _.sortBy(twitchStreamers, 'status');

            if (!streamsChannel) return;
            streamsChannel = guild.channels.find('id', streamsChannel);

            if (!twitchMessage) {
                streamsChannel.send(`Creating a message for Twitch streams...`).then(message => {
                    return [client.provider.set(guild.id, "twitchMessage", message.id),message.edit(`This message will update with Twitch streamer statuses in 2 minutes. Please do not delete the message.`)];
                });
            }

            streamsChannel.messages.fetch(twitchMessage)
                .then(message => {
                    let liveEmbed = new MessageEmbed()
                        .setColor('#00ff00')
                        .setTitle('Twitch Streamers');

                    _.each(twitchStreamers, streamer => {
                        if (streamer.status === "LIVE") {
                            liveEmbed.addField("Streamer", streamer.user, true);
                            liveEmbed.addField("Status", `[🔴 LIVE](https://www.twitch.tv/${streamer.user})`, true);
                        }
                        else {
                            liveEmbed.addField("Streamer", streamer.user, true);
                            liveEmbed.addField("Status", `OFFLINE`, true);
                        }
                        liveEmbed.addBlankField(true);
                    });

                    message.edit(`Last check: ${moment().format('DD.MM.YYYY H:mm:ss')}`, { embed: liveEmbed });
                })
                .catch(winston.error);
        });
    });
}