import { describe, expect, it } from 'vitest';
import { chunk, demoProvider, pickDemoReply } from './demo';

describe('demo provider', () => {
  it('chunks text without losing characters', () => {
    const text = 'Hello  world,\n\n- item `code`';
    expect(chunk(text).join('')).toBe(text);
  });

  it('picks a topical reply and falls back otherwise', () => {
    expect(pickDemoReply('tell me about svelte')).toContain('runes');
    expect(pickDemoReply('hello')).toContain('demo mode');
  });

  it('streams the whole reply', async () => {
    const provider = demoProvider(0);
    let out = '';
    for await (const piece of provider({
      system: '',
      messages: [{ role: 'user', content: 'how does streaming work' }],
      signal: new AbortController().signal,
    })) out += piece;
    expect(out).toBe(pickDemoReply('how does streaming work'));
  });
});
