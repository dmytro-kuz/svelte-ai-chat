import { Marked } from 'marked';
import DOMPurify from 'dompurify';

const marked = new Marked({ gfm: true, breaks: true });

marked.use({
  renderer: {
    code({ text, lang }) {
      const language = (lang ?? '').split(/\s/)[0];
      const label = language ? `<span>${escapeHtml(language)}</span>` : '<span>code</span>';
      return `<div class="code"><div class="code-head">${label}<button type="button" class="copy-code">Copy</button></div><pre><code>${escapeHtml(text)}</code></pre></div>`;
    },
    link({ href, text }) {
      return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    },
  },
});

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Renders model output to safe HTML. Model text is untrusted, so it always goes through DOMPurify. */
export function renderMarkdown(src: string): string {
  const html = marked.parse(src, { async: false });
  return DOMPurify.sanitize(html, { ADD_ATTR: ['target'] });
}
