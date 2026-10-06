(function () {
  "use strict";
  var module = { exports: {} };

  var CONFIG = {
    guildIds: [],
    minDelay: 1500,
    maxDelay: 4000,
    reply: true,
    messages: [
      "Welcome to the server, {user}! 👋",
      "Hey {user}, glad you're here! Make yourself at home 🎉",
      "Welcome aboard, {user}! Don't be shy, say hi 😄",
      "{user} just joined, welcome! 🥳"
    ]
  };

  var findByProps = vendetta.metro.findByProps;
  var FluxDispatcher = vendetta.metro.common.FluxDispatcher;
  var logger = vendetta.logger;

  var MessageActions = findByProps("sendMessage", "receiveMessage");
  var UserStore = findByProps("getCurrentUser", "getUser");

  var USER_JOIN = 7;
  var greeted = new Set();

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function onMessage(event) {
    try {
      var message = event && event.message;
      if (!message || event.optimistic || message.type !== USER_JOIN) return;
      if (CONFIG.guildIds.length && CONFIG.guildIds.indexOf(message.guild_id) === -1) return;
      if (greeted.has(message.id)) return;
      greeted.add(message.id);

      var me = UserStore.getCurrentUser();
      var userId = message.author && message.author.id;
      if (!userId || (me && userId === me.id)) return;

      var content = pick(CONFIG.messages).replace("{user}", "<@" + userId + ">");
      var delay = CONFIG.minDelay + Math.random() * Math.max(0, CONFIG.maxDelay - CONFIG.minDelay);

      setTimeout(function () {
        var extra = CONFIG.reply
          ? {
              messageReference: {
                guild_id: message.guild_id,
                channel_id: message.channel_id,
                message_id: message.id
              },
              allowedMentions: { parse: ["users"], replied_user: true }
            }
          : { allowedMentions: { parse: ["users"] } };

        MessageActions.sendMessage(
          message.channel_id,
          { content: content, tts: false, invalidEmojis: [], validNonShortcutEmojis: [] },
          undefined,
          extra
        );
      }, delay);
    } catch (e) {
      logger.error("[AutoWelcome] failed to greet", e);
    }
  }

  module.exports = {
    onLoad: function () {
      FluxDispatcher.subscribe("MESSAGE_CREATE", onMessage);
    },
    onUnload: function () {
      FluxDispatcher.unsubscribe("MESSAGE_CREATE", onMessage);
      greeted.clear();
    }
  };

  return module.exports;
})();
