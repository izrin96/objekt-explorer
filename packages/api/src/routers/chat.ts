import { authed } from "../orpc";
import {
  conversationIdInputSchema,
  listConversationsInputSchema,
  markReadInputSchema,
  muteInputSchema,
  sendInputSchema,
  setSettingsInputSchema,
  startInputSchema,
  threadInputSchema,
  unsendInputSchema,
} from "../schemas/chat";
import {
  acceptConversation,
  listConversations,
  loadThread,
  markConversationRead,
  muteConversation,
  requestConversationCount,
  unreadConversationCount,
} from "../services/chat/inbox";
import { updateMember } from "../services/chat/members";
import { publishActivityChanged, publishChatChanged } from "../services/chat/notify";
import { notifyTyping, sendMessage, startConversation, unsendMessage } from "../services/chat/send";
import { fetchSettings, saveSettings } from "../services/chat/settings";

export const chatRouter = {
  start: authed
    .input(startInputSchema)
    .handler(({ input, context: { session } }) =>
      startConversation(session.user.id, new Date(session.user.createdAt), input),
    ),

  send: authed
    .input(sendInputSchema)
    .handler(({ input, context: { session } }) => sendMessage(session.user.id, input)),

  typing: authed
    .input(conversationIdInputSchema)
    .handler(({ input: { id }, context: { session } }) => notifyTyping(session.user.id, id)),

  unsend: authed
    .input(unsendInputSchema)
    .handler(({ input: { messageId }, context: { session } }) =>
      unsendMessage(session.user.id, messageId),
    ),

  list: authed
    .input(listConversationsInputSchema)
    .handler(({ input, context: { session } }) => listConversations(session.user.id, input)),

  thread: authed
    .input(threadInputSchema)
    .handler(({ input, context: { session } }) => loadThread(session.user.id, input)),

  markRead: authed
    .input(markReadInputSchema)
    .handler(({ input: { id, upTo }, context: { session } }) =>
      markConversationRead(session.user.id, id, upTo),
    ),

  archive: authed
    .input(conversationIdInputSchema)
    .handler(async ({ input: { id }, context: { session } }) => {
      await updateMember(id, session.user.id, () => ({ type: "archive" }));
      await publishChatChanged([session.user.id], id);
    }),

  unarchive: authed
    .input(conversationIdInputSchema)
    .handler(async ({ input: { id }, context: { session } }) => {
      await updateMember(id, session.user.id, () => ({ type: "unarchive" }));
      await publishChatChanged([session.user.id], id);
    }),

  mute: authed
    .input(muteInputSchema)
    .handler(({ input, context: { session } }) => muteConversation(session.user.id, input)),

  accept: authed
    .input(conversationIdInputSchema)
    .handler(({ input: { id }, context: { session } }) => acceptConversation(session.user.id, id)),

  /** Archives a request for the recipient only; the sender is never told. */
  decline: authed
    .input(conversationIdInputSchema)
    .handler(async ({ input: { id }, context: { session } }) => {
      const { changed } = await updateMember(id, session.user.id, (state) =>
        state.request ? { type: "decline" } : null,
      );
      if (changed) await publishChatChanged([session.user.id], id);
    }),

  unreadCount: authed.handler(({ context: { session } }) =>
    unreadConversationCount(session.user.id),
  ),

  requestCount: authed.handler(({ context: { session } }) =>
    requestConversationCount(session.user.id),
  ),

  settings: authed.handler(async ({ context: { session } }) => fetchSettings(session.user.id)),

  setSettings: authed
    .input(setSettingsInputSchema)
    .handler(async ({ input, context: { session } }) => {
      const saved = await saveSettings(session.user.id, input);
      if (input.showActivity !== undefined) await publishActivityChanged(session.user.id);
      return saved;
    }),
};
