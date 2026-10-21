import { describe, expect, it } from 'vitest';
import { estimateTokens, exportMarkdown, groupByDate, makeTitle, searchConversations } from './chat-utils';
import type { Conversation } from './types';

const conv = (id: string, updatedAt: number, title = id, text = ''): Conversation => ({
  id, title, persona: 'assistant', createdAt: updatedAt, updatedAt,
  messages: text ? [{ id: id + 'm', role: 'user', content: text, createdAt: updatedAt }] : [],
});

describe('makeTitle', () => {
  it('strips markdown and collapses whitespace', () => {
    expect(makeTitle('  **Fix**   my `code`\n please ')).toBe('Fix my code please');
  });
  it('truncates long text with an ellipsis', () => {
    const t = makeTitle('a'.repeat(100), 20);
    expect(t).toHaveLength(20);
    expect(t.endsWith('…')).toBe(true);
  });
  it('falls back for empty input', () => {
    expect(makeTitle('   ')).toBe('New chat');
  });
});

describe('groupByDate', () => {
  const now = new Date('2026-10-21T15:00:00').getTime();
  const h = 3_600_000;
  it('buckets by recency and drops empty groups', () => {
    const groups = groupByDate(
      [conv('old', now - 30 * 24 * h), conv('today', now - h), conv('yday', now - 24 * h), conv('week', now - 4 * 24 * h)],
      now,
    );
    expect(groups.map((g) => [g.label, g.items.map((c) => c.id)])).toEqual([
      ['Today', ['today']],
      ['Yesterday', ['yday']],
      ['Previous 7 days', ['week']],
      ['Older', ['old']],
    ]);
  });
  it('sorts newest first inside a group', () => {
    const [today] = groupByDate([conv('a', now - 2 * h), conv('b', now - h)], now);
    expect(today.items.map((c) => c.id)).toEqual(['b', 'a']);
  });
});

describe('searchConversations', () => {
  const list = [conv('1', 1, 'Angular signals'), conv('2', 2, 'Trip', 'Svelte runes question')];
  it('matches titles and message text, case-insensitive', () => {
    expect(searchConversations(list, 'SIGNALS').map((c) => c.id)).toEqual(['1']);
    expect(searchConversations(list, 'runes').map((c) => c.id)).toEqual(['2']);
  });
  it('returns everything for a blank query', () => {
    expect(searchConversations(list, '  ')).toHaveLength(2);
  });
});

it('estimateTokens uses ~4 chars per token', () => {
  expect(estimateTokens('12345678')).toBe(2);
  expect(estimateTokens('123')).toBe(1);
});

it('exportMarkdown writes a readable transcript', () => {
  const c = conv('x', 1, 'Hello', 'Hi there');
  c.messages.push({ id: 'r', role: 'assistant', content: 'Hey!', createdAt: 2 });
  expect(exportMarkdown(c)).toBe('# Hello\n\n### You\n\nHi there\n\n### Assistant\n\nHey!\n');
});
