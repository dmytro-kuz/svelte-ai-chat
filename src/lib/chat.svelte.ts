import type { ChatMessage, ChatProvider, Conversation, Settings } from './types';
import { makeTitle, uid } from './chat-utils';
import { personaById } from './personas';
import { DEFAULT_MODEL } from './models';
import { load, save } from './storage';
import { describeError } from './providers/anthropic';

const CHATS_KEY = 'lumen.chats';
const SETTINGS_KEY = 'lumen.settings';

const prefersDark = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;

export class ChatStore {
  conversations = $state<Conversation[]>([]);
  activeId = $state<string | null>(null);
  settings = $state<Settings>({ apiKey: '', model: DEFAULT_MODEL, theme: 'light' });
  streamingId = $state<string | null>(null);

  #controller: AbortController | null = null;
  #provider: (s: Settings) => ChatProvider;

  constructor(provider: (s: Settings) => ChatProvider, persist = true) {
    this.#provider = provider;
    if (persist) {
      this.conversations = load<Conversation[]>(CHATS_KEY, []);
      this.settings = {
        ...this.settings,
        theme: prefersDark() ? 'dark' : 'light',
        ...load<Partial<Settings>>(SETTINGS_KEY, {}),
      };
      this.activeId = this.conversations[0]?.id ?? null;
    }
  }

  active = $derived(this.conversations.find((c) => c.id === this.activeId) ?? null);
  isStreaming = $derived(this.streamingId !== null);
  demoMode = $derived(!this.settings.apiKey.trim());

  persist(): void {
    save(CHATS_KEY, this.conversations);
    save(SETTINGS_KEY, this.settings);
  }

  newChat(persona = 'assistant'): Conversation {
    const now = Date.now();
    const chat: Conversation = { id: uid(), title: 'New chat', persona, messages: [], createdAt: now, updatedAt: now };
    this.conversations.unshift(chat);
    this.activeId = chat.id;
    return this.conversations[0];
  }

  select(id: string): void {
    this.activeId = id;
  }

  rename(id: string, title: string): void {
    const c = this.conversations.find((x) => x.id === id);
    if (c && title.trim()) c.title = title.trim();
  }

  remove(id: string): void {
    if (this.streamingId && this.active?.id === id) this.stop();
    this.conversations = this.conversations.filter((c) => c.id !== id);
    if (this.activeId === id) this.activeId = this.conversations[0]?.id ?? null;
  }

  setPersona(id: string): void {
    if (this.active) this.active.persona = id;
  }

  async send(text: string): Promise<void> {
    const content = text.trim();
    if (!content || this.isStreaming) return;
    const chat = this.active ?? this.newChat();
    if (chat.messages.length === 0) chat.title = makeTitle(content);
    chat.messages.push({ id: uid(), role: 'user', content, createdAt: Date.now() });
    await this.#generate(chat);
  }

  /** Drops the last assistant reply and asks again. */
  async regenerate(): Promise<void> {
    const chat = this.active;
    if (!chat || this.isStreaming) return;
    if (chat.messages.at(-1)?.role === 'assistant') chat.messages.pop();
    if (chat.messages.at(-1)?.role === 'user') await this.#generate(chat);
  }

  stop(): void {
    this.#controller?.abort();
  }

  async #generate(chat: Conversation): Promise<void> {
    const history = chat.messages
      .filter((m) => !m.error)
      .map(({ role, content }) => ({ role, content }));

    chat.messages.push({ id: uid(), role: 'assistant', content: '', createdAt: Date.now() });
    // Read back through the proxy so mutations are reactive.
    const reply: ChatMessage = chat.messages[chat.messages.length - 1];

    const controller = new AbortController();
    this.#controller = controller;
    this.streamingId = reply.id;

    try {
      const stream = this.#provider(this.settings)({
        system: personaById(chat.persona).system,
        messages: history,
        signal: controller.signal,
      });
      for await (const piece of stream) reply.content += piece;
    } catch (err) {
      if (!controller.signal.aborted) reply.error = describeError(err);
    } finally {
      if (!reply.content && !reply.error) reply.error = 'Stopped before any text arrived.';
      chat.updatedAt = Date.now();
      this.streamingId = null;
      this.#controller = null;
    }
  }
}
