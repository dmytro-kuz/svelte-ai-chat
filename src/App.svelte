<script lang="ts">
  import { ChatStore } from './lib/chat.svelte';
  import { anthropicProvider } from './lib/providers/anthropic';
  import { demoProvider } from './lib/providers/demo';
  import { PERSONAS, personaById } from './lib/personas';
  import { estimateTokens, exportMarkdown } from './lib/chat-utils';
  import { MODELS } from './lib/models';
  import Sidebar from './lib/components/Sidebar.svelte';
  import Message from './lib/components/Message.svelte';
  import Composer from './lib/components/Composer.svelte';
  import SettingsDialog from './lib/components/SettingsDialog.svelte';
  import Icon from './lib/components/Icon.svelte';

  const store = new ChatStore((s) =>
    s.apiKey.trim() ? anthropicProvider(s.apiKey.trim(), s.model) : demoProvider(),
  );

  let menuOpen = $state(false);
  let settingsOpen = $state(false);
  let draft = $state('');
  let scroller = $state<HTMLElement>();
  let composer: Composer;
  let stickToBottom = true;

  const chat = $derived(store.active);
  const persona = $derived(personaById(chat?.persona ?? 'assistant'));
  const tokens = $derived(
    chat ? chat.messages.reduce((n, m) => n + estimateTokens(m.content), 0) : 0,
  );
  const modelLabel = $derived(
    store.demoMode ? 'Demo mode' : (MODELS.find((m) => m.id === store.settings.model)?.label ?? store.settings.model),
  );

  const SUGGESTIONS = [
    'How does streaming work in this app?',
    'Show me Svelte 5 runes with an example',
    'Review this React effect for bugs',
  ];

  // Persist everything whenever chats or settings change.
  $effect(() => {
    JSON.stringify(store.conversations);
    JSON.stringify(store.settings);
    store.persist();
  });

  $effect(() => {
    document.documentElement.dataset.theme = store.settings.theme;
  });

  // Follow the stream unless the user scrolled up to read.
  $effect(() => {
    const last = chat?.messages.at(-1);
    void last?.content;
    void chat?.messages.length;
    if (scroller && stickToBottom) scroller.scrollTop = scroller.scrollHeight;
  });

  function onscroll() {
    if (!scroller) return;
    stickToBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80;
  }

  function send(text: string) {
    stickToBottom = true;
    store.send(text);
  }

  function choosePersona(id: string) {
    if (!chat) store.newChat(id);
    else store.setPersona(id);
    composer?.focus();
  }

  function download() {
    if (!chat) return;
    const blob = new Blob([exportMarkdown(chat)], { type: 'text/markdown' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `${chat.title.replace(/[^\w\- ]+/g, '').trim() || 'chat'}.md`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function toggleTheme() {
    store.settings.theme = store.settings.theme === 'dark' ? 'light' : 'dark';
  }
</script>

<div class="shell">
  <Sidebar {store} bind:open={menuOpen} onsettings={() => (settingsOpen = true)} />

  <main>
    <header class="top">
      <button class="icon-btn menu" onclick={() => (menuOpen = true)} aria-label="Open menu">
        <Icon name="menu" />
      </button>
      <div class="heading">
        <h1>{chat?.title ?? 'New chat'}</h1>
        <span class="meta">
          {[`${persona.emoji} ${persona.name}`, modelLabel, tokens ? `~${tokens.toLocaleString()} tokens` : ''].filter(Boolean).join(' · ')}
        </span>
      </div>
      <div class="top-actions">
        {#if chat?.messages.length}
          <button class="icon-btn" onclick={download} aria-label="Export chat as Markdown" title="Export as Markdown">
            <Icon name="download" />
          </button>
        {/if}
        <button class="icon-btn" onclick={toggleTheme} aria-label="Toggle theme" title="Toggle theme">
          <Icon name={store.settings.theme === 'dark' ? 'sun' : 'moon'} />
        </button>
      </div>
    </header>

    {#if store.demoMode}
      <div class="banner" role="status">
        <span><strong>Demo mode.</strong> Replies are simulated.{' '}<span class="long">Add your Anthropic API key to chat with Claude.</span></span>
        <button class="btn" onclick={() => (settingsOpen = true)}>Add key</button>
      </div>
    {/if}

    <section class="thread" bind:this={scroller} {onscroll} aria-live="polite">
      <div class="inner">
        {#if !chat || chat.messages.length === 0}
          <div class="welcome">
            <div class="hero" aria-hidden="true">L</div>
            <h2>What can I help with?</h2>
            <p>Pick a persona, then ask anything. Replies stream in token by token.</p>
            <div class="personas" role="radiogroup" aria-label="Persona">
              {#each PERSONAS as p (p.id)}
                <button
                  role="radio"
                  aria-checked={persona.id === p.id}
                  class="persona"
                  class:selected={persona.id === p.id}
                  onclick={() => choosePersona(p.id)}
                >
                  <span class="emoji">{p.emoji}</span>{p.name}
                </button>
              {/each}
            </div>
            <div class="suggestions">
              {#each SUGGESTIONS as s (s)}
                <button class="suggestion" onclick={() => send(s)}>{s}</button>
              {/each}
            </div>
          </div>
        {:else}
          {#each chat.messages as m, i (m.id)}
            <Message
              message={m}
              streaming={store.streamingId === m.id}
              last={i === chat.messages.length - 1}
              onregenerate={() => store.regenerate()}
            />
          {/each}
        {/if}
      </div>
    </section>

    <div class="dock">
      <Composer
        bind:this={composer}
        bind:value={draft}
        streaming={store.isStreaming}
        onsend={send}
        onstop={() => store.stop()}
      />
    </div>
  </main>
</div>

<SettingsDialog {store} bind:open={settingsOpen} />

<style>
  .shell { display: grid; grid-template-columns: 280px minmax(0, 1fr); height: 100dvh; }
  main { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
  .top {
    display: flex; align-items: center; gap: 10px; padding: 10px 20px;
    border-bottom: 1px solid var(--border); background: var(--panel);
  }
  .menu { display: none; }
  .heading { flex: 1; min-width: 0; }
  h1 { margin: 0; font-size: 16px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .meta { font-size: 12.5px; color: var(--muted); }
  .top-actions { display: flex; gap: 2px; }
  .banner {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    margin: 12px 20px 0; padding: 8px 8px 8px 14px; border-radius: 12px;
    background: var(--accent-soft); font-size: 13.5px;
  }
  .banner .btn { flex: none; padding: 5px 12px; font-size: 13px; }
  .thread { flex: 1; overflow-y: auto; min-height: 0; }
  .inner { display: flex; flex-direction: column; gap: 22px; max-width: 780px; margin: 0 auto; padding: 24px 20px 12px; }
  .dock { width: 100%; max-width: 780px; margin: 0 auto; padding: 8px 20px 14px; }

  .welcome { display: flex; flex-direction: column; align-items: center; text-align: center; padding-top: 6vh; }
  .hero {
    display: grid; place-items: center; width: 56px; height: 56px; border-radius: 16px;
    background: linear-gradient(135deg, var(--accent), #c084fc); color: #fff; font-size: 26px; font-weight: 700;
    box-shadow: 0 10px 30px rgb(124 92 255 / 0.35);
  }
  .welcome h2 { margin: 18px 0 4px; font-size: 24px; }
  .welcome p { margin: 0; color: var(--muted); }
  .personas { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin: 24px 0 18px; }
  .persona {
    display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px;
    border: 1px solid var(--border); border-radius: 99px; background: var(--panel); font-size: 14px;
  }
  .persona.selected { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); font-weight: 600; }
  .suggestions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; width: 100%; }
  .suggestion {
    padding: 14px; border: 1px solid var(--border); border-radius: 12px; background: var(--panel);
    text-align: left; font-size: 14px; line-height: 1.4; transition: border-color 0.15s, transform 0.15s;
  }
  .suggestion:hover { border-color: var(--accent); transform: translateY(-1px); }

  @media (max-width: 820px) {
    .shell { grid-template-columns: minmax(0, 1fr); }
    .menu { display: inline-grid; }
    .top { padding: 8px 12px; }
    .banner { margin: 10px 12px 0; }
    .banner .long { display: none; }
    .inner { padding: 18px 14px 8px; }
    .dock { padding: 6px 12px 12px; }
    .suggestions { grid-template-columns: minmax(0, 1fr); }
    .welcome { padding-top: 2vh; }
  }
</style>
