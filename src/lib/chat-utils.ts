import type { Conversation } from './types';

export const uid = (): string =>
  crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);

/** Short sidebar title from the first user message. */
export function makeTitle(text: string, max = 40): string {
  const clean = text.replace(/[`*_#>]/g, '').replace(/\s+/g, ' ').trim();
  if (!clean) return 'New chat';
  return clean.length > max ? clean.slice(0, max - 1).trimEnd() + '…' : clean;
}

export type Group = { label: string; items: Conversation[] };

/** Groups conversations like ChatGPT/Claude sidebars: Today, Yesterday, Previous 7 days, Older. */
export function groupByDate(list: Conversation[], now = Date.now()): Group[] {
  const day = 86_400_000;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const today = start.getTime();
  const buckets: Group[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Previous 7 days', items: [] },
    { label: 'Older', items: [] },
  ];
  for (const c of [...list].sort((a, b) => b.updatedAt - a.updatedAt)) {
    const t = c.updatedAt;
    const i = t >= today ? 0 : t >= today - day ? 1 : t >= today - 7 * day ? 2 : 3;
    buckets[i].items.push(c);
  }
  return buckets.filter((b) => b.items.length);
}

export function searchConversations(list: Conversation[], query: string): Conversation[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (c) =>
      c.title.toLowerCase().includes(q) ||
      c.messages.some((m) => m.content.toLowerCase().includes(q)),
  );
}

/** Rough token estimate (~4 chars per token) for the context meter. */
export const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

export function exportMarkdown(c: Conversation): string {
  const body = c.messages
    .map((m) => `### ${m.role === 'user' ? 'You' : 'Assistant'}\n\n${m.content}`)
    .join('\n\n');
  return `# ${c.title}\n\n${body}\n`;
}
