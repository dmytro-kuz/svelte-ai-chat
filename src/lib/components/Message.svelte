<script lang="ts">
  import type { ChatMessage } from '../types';
  import { renderMarkdown } from '../markdown';
  import Icon from './Icon.svelte';

  let { message, streaming = false, last = false, onregenerate }: {
    message: ChatMessage;
    streaming?: boolean;
    last?: boolean;
    onregenerate?: () => void;
  } = $props();

  let copied = $state(false);
  const html = $derived(message.role === 'assistant' ? renderMarkdown(message.content) : '');

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  async function copyMessage() {
    copied = await copy(message.content);
    setTimeout(() => (copied = false), 1500);
  }

  // Event delegation for the "Copy" buttons rendered inside code blocks.
  async function onclick(e: MouseEvent) {
    const btn = (e.target as HTMLElement).closest('.copy-code');
    const code = btn?.closest('.code')?.querySelector('code')?.textContent;
    if (btn && code != null && (await copy(code))) {
      btn.textContent = 'Copied';
      setTimeout(() => (btn.textContent = 'Copy'), 1500);
    }
  }
</script>

<article class="msg {message.role}" aria-busy={streaming}>
  {#if message.role === 'user'}
    <div class="bubble">{message.content}</div>
  {:else}
    <div class="avatar" aria-hidden="true">L</div>
    <div class="body">
      {#if message.content}
        <!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized by DOMPurify -->
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
        <div class="md" class:streaming {onclick}>{@html html}</div>
      {/if}
      {#if streaming && !message.content}
        <div class="typing" aria-label="Assistant is typing"><span></span><span></span><span></span></div>
      {/if}
      {#if message.error}
        <p class="error" role="alert">{message.error}</p>
      {/if}
      {#if !streaming && (message.content || message.error)}
        <div class="tools">
          {#if message.content}
            <button class="icon-btn" onclick={copyMessage} aria-label="Copy reply" title="Copy">
              <Icon name={copied ? 'check' : 'copy'} size={15} />
            </button>
          {/if}
          {#if last && onregenerate}
            <button class="icon-btn" onclick={onregenerate} aria-label="Regenerate reply" title="Regenerate">
              <Icon name="refresh" size={15} />
            </button>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</article>

<style>
  .msg { display: flex; gap: 12px; }
  .msg.user { justify-content: flex-end; }
  .bubble {
    max-width: min(78%, 620px);
    padding: 10px 14px;
    border-radius: 16px 16px 4px 16px;
    background: var(--user-bubble);
    color: #fff;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .avatar {
    flex: none; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px;
    background: linear-gradient(135deg, var(--accent), #c084fc); color: #fff; font-weight: 700; font-size: 14px;
  }
  .body { flex: 1; min-width: 0; padding-top: 3px; overflow-wrap: anywhere; }
  /* Blinking caret at the end of the text that is still streaming. */
  .md.streaming :global(> :last-child:not(ol, ul))::after,
  .md.streaming :global(> :is(ol, ul):last-child > li:last-child)::after {
    content: '';
    display: inline-block; width: 8px; height: 1.1em; margin-left: 3px; vertical-align: text-bottom;
    background: var(--accent); border-radius: 2px; animation: blink 1s steps(2) infinite;
  }
  .typing { display: flex; gap: 4px; padding: 8px 0; }
  .typing span { width: 7px; height: 7px; border-radius: 50%; background: var(--muted); animation: bounce 1.2s infinite; }
  .typing span:nth-child(2) { animation-delay: 0.15s; }
  .typing span:nth-child(3) { animation-delay: 0.3s; }
  .error {
    margin: 4px 0 0; padding: 8px 12px; border-radius: 10px;
    background: var(--danger-soft); color: var(--danger); font-size: 14px;
  }
  .tools { display: flex; gap: 2px; margin-top: 4px; margin-left: -8px; opacity: 0.75; }
  .tools:hover { opacity: 1; }
  .tools .icon-btn { width: 30px; height: 30px; }
  @keyframes blink { to { opacity: 0; } }
  @keyframes bounce { 0%, 60%, 100% { transform: none; opacity: 0.5; } 30% { transform: translateY(-4px); opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .md.streaming :global(> :last-child)::after, .typing span { animation: none; } }
</style>
