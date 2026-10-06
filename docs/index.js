(function () {
  "use strict";

  // ---------- CONFIG (edit these) ----------
  const CONFIG = {
    // Leave empty to greet in every server, or put guild IDs here to limit it
    guildIds: [],
    // Delay before greeting, in ms (a small random delay looks more natural)
    minDelay: 1500,
    maxDelay: 4000,
    // Reply to the join message (true) or just send a normal message (false)
    reply: true,
    // {user} becomes a mention of the new member
    messages: [
      "Welcome to the server, {user}! 👋",
      "Hey {user}, glad you're here! Make yourself at home 🎉",
      "Welcome aboard, {user}! Don't be shy, say hi 😄",
      "{user} just joined, welcome! 🥳",
    ],
  };
  // -----------------------------------------

  const { metro, logger } = vendetta;
  const { findByProps } = metro;
  const { FluxDispatcher } = metro.common;

  const MessageActions = findByProps("sendMessage", "receiveMessage");
  const UserStore = findByProps("getCurrentUser", "getUser");

  const USER_JOIN = 7; // Discord's "welcome" system message type
  const greeted = new Set();

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function onMessage({ message, optimistic }) {
    try {
      if (!message || optimistic || message.type !== USER_JOIN) return;
      if (CONFIG.guildIds.length && !CONFIG.guildIds.includes(message.guild_id)) return;
      if (greeted.has(message.id)) return;
      greeted.add(message.id);

      // Don't greet yourself
      const me = UserStore.getCurrentUser();
      if (me && message.author && message.author.id === me.id) return;

      const userId = message.author && message.author.id;
      if (!userId) return;

      const content = pick(CONFIG.messages).replace("{user}", `<@${userId}>`);
      const delay =
        CONFIG.minDelay + Math.random() * Math.max(0, CONFIG.maxDelay - CONFIG.minDelay);

      setTimeout(() => {
        const extra = CONFIG.reply
          ? {
              messageReference: {
                guild_id: message.guild_id,
                channel_id: message.channel_id,
                message_id: message.id,
              },
              allowedMentions: { parse: ["users"], replied_user: true },
            }
          : { allowedMentions: { parse: ["users"] } };

        MessageActions.sendMessage(
          message.channel_id,
          { content, tts: false, invalidEmojis: [], validNonShortcutEmojis: [] },
          undefined,
          extra
        );
      }, delay);
    } catch (e) {
      logger.error("[AutoWelcome] failed to greet", e);
    }
  }

  return {
    onLoad() {
      FluxDispatcher.subscribe("MESSAGE_CREATE", onMessage);
    },
    onUnload() {
      FluxDispatcher.unsubscribe("MESSAGE_CREATE", onMessage);
      greeted.clear();
    },
  };
})();
