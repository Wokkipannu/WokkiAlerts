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

            if (!streamsChannel || twitchStreamers.length >= 0) return;
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

exports.checkYoutube = async function(client) {
    if (GOOGLE_API_KEY === "") return winston.error(`Tried to check youtube channels but Google API key is not defined`);

    let streamers = client.provider.get("global", "youtubeStreamers");
    if (!streamers) return winston.info(`Streamers database seems to be empty.`);

    _.each(streamers, streamer => {
        streamer.status = "OFFLINE";

        request({
            uri: `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${stream.id}&type=video&eventType=live&key=${GOOGLE_API_KEY}`,
            method: 'GET'
        }, (err, res, body) => {
            if (err) return winston.error(err);
            let result = JSON.parse(body);

            _.each(result.items, stream => {
                streamer.status = "LIVE";
            });
        });
    });

    client.guilds.forEach(guild => {
        let streamsChannel = client.provider.get(guild.id, "streamsChannel");
        let youtubeMessage = client.provider.get(guild.id, "youtubeMessage");
        let youtubeStreamers = _.filter(streamers, streamer => _.includes(streamer.guilds, guild.id));
        youtubeStreamers = _.sortBy(youtubeStreamers, 'status');

        if (!streamsChannel || youtubeStreamers.length >= 0) return;
        streamsChannel = guild.channels.find('id', streamsChannel);

        if (!youtubeMessage) {
            streamsChannel.send(`Creating a message for Youtube streams...`).then(message => {
                return [client.provider.set(guild.id, "youtubeMessage", message.id),message.edit(`This message will update with YouTube streamer statuses in 2 minutes. Please do not delete the message.`)];
            });
        }

        streamsChannel.messages.fetch(youtubeMessage)
            .then(message => {
                let liveEmbed = new MessageEmbed()
                    .setColor('#ff0000')
                    .setTitle('YouTube Streamers');
                //https://www.youtube.com/ice_poseidon/live
                _.each(youtubeStreamers, streamer => {
                    if (streamer.status === "LIVE") {
                        liveEmbed.addField("Streamer", streamer.user, true);
                        liveEmbed.addField("Status", `[🔴 LIVE](https://www.youtube.com/${streamer.user}/live)`, true);
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
}