import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('renders GFM tables and inline code', () => {
    const html = renderMarkdown('| a | b |\n|---|---|\n| 1 | `x` |');
    expect(html).toContain('<table>');
    expect(html).toContain('<code>x</code>');
  });

  it('wraps fenced code with a language label and copy button', () => {
    const html = renderMarkdown('```ts\nconst a = 1 < 2;\n```');
    expect(html).toContain('<span>ts</span>');
    expect(html).toContain('class="copy-code"');
    expect(html).toContain('const a = 1 &lt; 2;');
  });

  it('strips scripts and event handlers from model output', () => {
    const html = renderMarkdown('<img src=x onerror="alert(1)"><script>alert(2)</script>hello');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('<script');
    expect(html).toContain('hello');
  });

  it('opens links in a new tab safely', () => {
    const html = renderMarkdown('[site](https://example.com)');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('drops javascript: links', () => {
    expect(renderMarkdown('[x](javascript:alert(1))')).not.toContain('javascript:');
  });
});
