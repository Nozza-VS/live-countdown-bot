import { Client, Intents, Options } from "discord.js";

import process, { env } from "process";
import config from "../config.js";
import { initGuilds, addGuild, removeMessageWithReplyId, removeGuild, closeDb } from "./sqlite3.js";
import { messageHandler } from "./messageHandler.js";
import { updateCountdowns } from "./updateManager.js";

const client = new Client({
  makeCache: Options.cacheWithLimits({
    MessageManager: 0,
    PresenceManager: 0,
    ThreadManager: 0,
  }),
  intents: [Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

export const clientId = Math.round(Math.random() * 1e9);

const { token } = config;
const log = console.log;

client.once("ready", () => {
  log(`Initialized client ${clientId} (${client.shard.ids.join()}).`);

  initGuilds(client.guilds.cache, clientId);
  updateCountdowns(client, clientId);
});

client.on("messageCreate", messageHandler);

// client.on("messageUpdate", (_, message) => {
//   if (message.partial || message.author.bot) return;

//   const messageReply = message[Symbol.for("messageReply")];
//   if (messageReply && !messageReply.deleted) messageHandler(message, messageReply);
// });

// client.on("messageDelete", message => {
//   const { guild, client, author } = message;
//   if (message.partial || author.id !== client.user.id || !guild.available) return;

//   removeMessageWithReplyId(message.id);
// });

client.on("guildCreate", guild => {
  addGuild(guild.id, clientId);
  log(`Added to ${guild.name} (${guild.id})`);
});

client.on("guildDelete", guild => {
  log(`Removed from ${guild.name} (${guild.id})`);
  removeGuild(guild.id);
});

client.on("rateLimit", rateLimitInfo => {
  log(rateLimitInfo);
});

// Start client
client.login(token);
if (env.NODE_ENV === "debug") client.on("debug", console.info);

process.on("unhandledRejection", log);
process.on("SIGHUP", () => process.exit(128 + 1));
process.on("SIGINT", () => process.exit(128 + 2));
process.on("SIGTERM", () => process.exit(128 + 15));
process.on("exit", code => {
  console.log(`Destroying client ${clientId} (${client.shard.ids.join()}). Code ${code}.`);
  client.destroy();
  closeDb();
});
