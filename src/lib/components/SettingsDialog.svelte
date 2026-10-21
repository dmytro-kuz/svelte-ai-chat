<script lang="ts">
  import type { ChatStore } from '../chat.svelte';
  import { MODELS } from '../models';
  import Icon from './Icon.svelte';

  let { store, open = $bindable(false) }: { store: ChatStore; open?: boolean } = $props();

  let dialog: HTMLDialogElement;
  let key = $state('');
  let model = $state('');

  $effect(() => {
    if (open && !dialog.open) {
      key = store.settings.apiKey;
      model = store.settings.model;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  });

  function save(e: SubmitEvent) {
    e.preventDefault();
    store.settings.apiKey = key.trim();
    store.settings.model = model;
    open = false;
  }
</script>

<dialog bind:this={dialog} onclose={() => (open = false)} aria-labelledby="settings-title">
  <form onsubmit={save}>
    <header>
      <h2 id="settings-title">Settings</h2>
      <button type="button" class="icon-btn" onclick={() => (open = false)} aria-label="Close">
        <Icon name="close" />
      </button>
    </header>

    <label>
      <span>Anthropic API key</span>
      <div class="key">
        <Icon name="key" size={16} />
        <input type="password" bind:value={key} placeholder="sk-ant-…" autocomplete="off" spellcheck="false" />
      </div>
      <small>
        Leave empty to use demo mode. The key is stored only in this browser's localStorage and sent only to
        api.anthropic.com. Get one at
        <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">console.anthropic.com</a>.
      </small>
    </label>

    <fieldset disabled={!key.trim()}>
      <legend>Model</legend>
      {#each MODELS as m (m.id)}
        <label class="radio">
          <input type="radio" name="model" value={m.id} bind:group={model} />
          <span>{m.label}</span>
          <small>{m.hint}</small>
        </label>
      {/each}
    </fieldset>

    <footer>
      {#if store.settings.apiKey}
        <button type="button" class="btn danger" onclick={() => (key = '')}>Remove key</button>
      {/if}
      <button type="submit" class="btn btn-primary">Save</button>
    </footer>
  </form>
</dialog>

<style>
  dialog {
    width: min(460px, calc(100vw - 32px));
    padding: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--panel);
    color: var(--text);
    box-shadow: var(--shadow);
  }
  dialog::backdrop { background: rgb(10 10 20 / 0.45); }
  form { display: grid; gap: 18px; padding: 20px; }
  header { display: flex; justify-content: space-between; align-items: center; }
  h2 { margin: 0; font-size: 18px; }
  label > span, legend { display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px; }
  .key {
    display: flex; align-items: center; gap: 8px; padding: 0 12px;
    border: 1px solid var(--border); border-radius: 10px; color: var(--muted);
  }
  .key:focus-within { border-color: var(--accent); }
  .key input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent; padding: 9px 0; color: var(--text); }
  small { display: block; margin-top: 6px; color: var(--muted); font-size: 12.5px; line-height: 1.5; }
  small a { color: var(--accent); }
  fieldset { border: 0; margin: 0; padding: 0; display: grid; gap: 6px; }
  fieldset:disabled { opacity: 0.5; }
  .radio {
    display: flex; align-items: center; gap: 10px; padding: 9px 12px;
    border: 1px solid var(--border); border-radius: 10px; cursor: pointer;
  }
  .radio:has(input:checked) { border-color: var(--accent); background: var(--accent-soft); }
  .radio span { margin: 0; font-weight: 500; }
  .radio small { margin: 0 0 0 auto; }
  footer { display: flex; justify-content: flex-end; gap: 8px; }
  .danger { color: var(--danger); margin-right: auto; }
</style>
