import { describe, expect, it } from 'vitest';
import { ChatStore } from './chat.svelte';
import type { ChatProvider } from './types';

const echo: ChatProvider = async function* ({ messages }) {
  yield 'You said: ';
  yield messages.at(-1)!.content;
};

const failing: ChatProvider = async function* () {
  throw new Error('boom');
};

/** Yields one chunk, then waits until the request is aborted. */
const hanging: ChatProvider = async function* ({ signal }) {
  yield 'partial';
  await new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))));
};

describe('ChatStore', () => {
  it('creates a chat, titles it and streams the reply', async () => {
    const store = new ChatStore(() => echo, false);
    await store.send('  Hello there  ');
    const chat = store.active!;
    expect(chat.title).toBe('Hello there');
    expect(chat.messages.map((m) => [m.role, m.content])).toEqual([
      ['user', 'Hello there'],
      ['assistant', 'You said: Hello there'],
    ]);
    expect(store.isStreaming).toBe(false);
  });

  it('ignores blank messages', async () => {
    const store = new ChatStore(() => echo, false);
    await store.send('   ');
    expect(store.conversations).toHaveLength(0);
  });

  it('passes the persona system prompt and full history to the provider', async () => {
    const seen: Parameters<ChatProvider>[0][] = [];
    const spy: ChatProvider = async function* (req) {
      seen.push({ ...req, messages: [...req.messages] });
      yield 'ok';
    };
    const store = new ChatStore(() => spy, false);
    store.newChat('translator');
    await store.send('one');
    await store.send('two');
    expect(seen[1].system).toMatch(/Translate/);
    expect(seen[1].messages.map((m) => m.content)).toEqual(['one', 'ok', 'two']);
  });

  it('records provider errors on the reply and leaves them out of the next request', async () => {
    let provider = failing;
    const store = new ChatStore(() => provider, false);
    await store.send('hi');
    expect(store.active!.messages[1].error).toBe('boom');

    const seen: string[][] = [];
    provider = async function* (req) {
      seen.push(req.messages.map((m) => m.content));
      yield 'fine';
    };
    await store.send('again');
    expect(seen[0]).toEqual(['hi', 'again']);
  });

  it('stop() keeps the partial text', async () => {
    const store = new ChatStore(() => hanging, false);
    const done = store.send('long answer please');
    await new Promise((r) => setTimeout(r, 0));
    expect(store.isStreaming).toBe(true);
    store.stop();
    await done;
    const reply = store.active!.messages[1];
    expect(reply.content).toBe('partial');
    expect(reply.error).toBeUndefined();
    expect(store.isStreaming).toBe(false);
  });

  it('regenerate replaces the last reply', async () => {
    let n = 0;
    const counter: ChatProvider = async function* () {
      yield `answer ${++n}`;
    };
    const store = new ChatStore(() => counter, false);
    await store.send('q');
    await store.regenerate();
    expect(store.active!.messages.map((m) => m.content)).toEqual(['q', 'answer 2']);
  });

  it('remove() selects the next chat', async () => {
    const store = new ChatStore(() => echo, false);
    const a = store.newChat();
    const b = store.newChat();
    store.remove(b.id);
    expect(store.activeId).toBe(a.id);
    store.remove(a.id);
    expect(store.active).toBeNull();
  });
});
