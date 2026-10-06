(function () {
  "use strict";
  var module = { exports: {} };

  var CONFIG = {
    // Leave empty to greet in every server, or put guild IDs here to limit it
    guildIds: [],
    // Delay before sending, in ms (random between min and max)
    minDelay: 1000,
    maxDelay: 3000
  };

  var findByProps = vendetta.metro.findByProps;
  var FluxDispatcher = vendetta.metro.common.FluxDispatcher;
  var logger = vendetta.logger;

  var MessageActions = findByProps("sendMessage", "receiveMessage");
  var UserStore = findByProps("getCurrentUser", "getUser");

  var USER_JOIN = 7;
  var greeted = new Set();
  var stickerIds = [];

  // Discord's default sticker packs (public endpoint, no login needed)
  function loadStickers() {
    return fetch("https://discord.com/api/v10/sticker-packs")
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var ids = [];
        (data.sticker_packs || []).forEach(function (pack) {
          (pack.stickers || []).forEach(function (s) { ids.push(s.id); });
        });
        if (ids.length) stickerIds = ids;
        return ids;
      })
      .catch(function (e) {
        logger.error("[AutoWelcome] could not load stickers", e);
        return [];
      });
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function sendSticker(message) {
    var stickerId = pick(stickerIds);
    MessageActions.sendMessage(
      message.channel_id,
      { content: "", tts: false, invalidEmojis: [], validNonShortcutEmojis: [] },
      undefined,
      {
        stickerIds: [stickerId],
        messageReference: {
          guild_id: message.guild_id,
          channel_id: message.channel_id,
          message_id: message.id
        },
        allowedMentions: { parse: ["users"], replied_user: true }
      }
    );
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

      var delay = CONFIG.minDelay + Math.random() * Math.max(0, CONFIG.maxDelay - CONFIG.minDelay);

      setTimeout(function () {
        if (stickerIds.length) {
          sendSticker(message);
        } else {
          loadStickers().then(function (ids) {
            if (ids.length) sendSticker(message);
          });
        }
      }, delay);
    } catch (e) {
      logger.error("[AutoWelcome] failed to greet", e);
    }
  }

  module.exports = {
    onLoad: function () {
      loadStickers();
      FluxDispatcher.subscribe("MESSAGE_CREATE", onMessage);
    },
    onUnload: function () {
      FluxDispatcher.unsubscribe("MESSAGE_CREATE", onMessage);
      greeted.clear();
    }
  };

  return module.exports;
})();
