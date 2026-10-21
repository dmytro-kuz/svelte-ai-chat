<script lang="ts">
  import Icon from './Icon.svelte';

  let { streaming = false, onsend, onstop, value = $bindable('') }: {
    streaming?: boolean;
    onsend: (text: string) => void;
    onstop: () => void;
    value?: string;
  } = $props();

  let textarea: HTMLTextAreaElement;

  // Grow with the content up to a limit, like most chat apps.
  $effect(() => {
    void value;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 220) + 'px';
  });

  function submit(e?: Event) {
    e?.preventDefault();
    if (streaming || !value.trim()) return;
    onsend(value);
    value = '';
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) submit(e);
  }

  export function focus() {
    textarea?.focus();
  }
</script>

<form class="composer" onsubmit={submit}>
  <label class="sr-only" for="prompt">Message</label>
  <textarea
    id="prompt"
    bind:this={textarea}
    bind:value
    {onkeydown}
    rows="1"
    placeholder="Message Lumen…"
  ></textarea>
  {#if streaming}
    <button type="button" class="send stop" onclick={onstop} aria-label="Stop generating">
      <Icon name="stop" />
    </button>
  {:else}
    <button type="submit" class="send" disabled={!value.trim()} aria-label="Send message">
      <Icon name="send" />
    </button>
  {/if}
</form>
<p class="hint">Enter to send · Shift + Enter for a new line</p>

<style>
  .composer {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 8px 8px 8px 16px;
    border: 1px solid var(--border);
    border-radius: 18px;
    background: var(--panel);
    box-shadow: var(--shadow);
  }
  .composer:focus-within { border-color: var(--accent); }
  textarea {
    flex: 1;
    min-width: 0;
    resize: none;
    border: 0;
    outline: none;
    background: transparent;
    padding: 7px 0;
    max-height: 220px;
    line-height: 1.5;
  }
  .send {
    flex: none; display: grid; place-items: center; width: 38px; height: 38px;
    border: 0; border-radius: 12px; background: var(--accent); color: var(--accent-text);
  }
  .send:disabled { opacity: 0.35; cursor: default; }
  .stop { background: var(--text); color: var(--panel); }
  .hint { margin: 6px 0 0; text-align: center; font-size: 12px; color: var(--muted); }
  @media (max-width: 820px) { .hint { display: none; } }
</style>
