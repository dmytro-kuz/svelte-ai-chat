import type { ChatProvider } from '../types';

const REPLIES: { match: RegExp; text: string }[] = [
  {
    match: /svelte|rune|\$state/i,
    text: `Svelte 5 replaces stores-for-everything with **runes**. State is just a variable:

\`\`\`svelte
<script lang="ts">
  let count = $state(0);
  let double = $derived(count * 2);
</script>

<button onclick={() => count++}>{count} × 2 = {double}</button>
\`\`\`

| Rune | Use it for |
| --- | --- |
| \`$state\` | mutable reactive values |
| \`$derived\` | values computed from state |
| \`$effect\` | side effects (DOM, timers, storage) |

This chat keeps conversations in a \`$state\` class and saves them to \`localStorage\` from one \`$effect\`.`,
  },
  {
    match: /review|bug|code/i,
    text: `Here is a quick review of a common pattern:

\`\`\`ts
// ❌ creates a new interval on every render
useEffect(() => {
  setInterval(tick, 1000);
});

// ✅ one interval, cleaned up on unmount
useEffect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}, []);
\`\`\`

1. **Bug:** missing dependency array, so the effect runs after every render.
2. **Leak:** the interval is never cleared.
3. **Nit:** name the callback after what it does, e.g. \`refreshClock\`.`,
  },
  {
    match: /stream|how.*work|architecture/i,
    text: `This app streams tokens as they arrive:

1. The composer sends the history to a **provider**, an async generator of text chunks.
2. With an API key, the provider is \`client.messages.stream()\` from the official Anthropic SDK.
3. Without a key, a **demo provider** (this one) replays canned answers at typing speed.
4. Each chunk is appended to the message in \`$state\`, and Svelte updates only that bubble.
5. **Stop** aborts the request through an \`AbortController\`.

Swapping providers needs no UI changes, so moving the key to a backend proxy is a one-file change.`,
  },
];

const FALLBACK = `Hi! I'm running in **demo mode**, so my answers are pre-written and streamed locally.

Try asking about:
- *"How does streaming work here?"*
- *"Show me Svelte runes"*
- *"Review this code"*

To talk to a real model, open **Settings** and paste your Anthropic API key. It is stored only in this browser.`;

export function pickDemoReply(prompt: string): string {
  return REPLIES.find((r) => r.match.test(prompt))?.text ?? FALLBACK;
}

/** Splits text into word-sized chunks so the stream looks like real token output. */
export function chunk(text: string): string[] {
  return text.match(/\s*\S+|\s+/g) ?? [];
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });

export function demoProvider(delayMs = 22): ChatProvider {
  return async function* ({ messages, signal }) {
    const last = messages.at(-1)?.content ?? '';
    await sleep(delayMs * 12, signal);
    for (const piece of chunk(pickDemoReply(last))) {
      if (signal.aborted) return;
      yield piece;
      if (delayMs) await sleep(delayMs + Math.random() * delayMs, signal);
    }
  };
}
