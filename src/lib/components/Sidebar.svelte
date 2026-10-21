<script lang="ts">
  import type { ChatStore } from '../chat.svelte';
  import { groupByDate, searchConversations } from '../chat-utils';
  import { personaById } from '../personas';
  import Icon from './Icon.svelte';

  let { store, open = $bindable(false), onsettings }: {
    store: ChatStore;
    open?: boolean;
    onsettings: () => void;
  } = $props();

  let query = $state('');
  let editingId = $state<string | null>(null);
  let draft = $state('');

  const groups = $derived(groupByDate(searchConversations(store.conversations, query)));

  function pick(id: string) {
    store.select(id);
    open = false;
  }

  function startRename(id: string, title: string) {
    editingId = id;
    draft = title;
  }

  function commitRename() {
    if (editingId) store.rename(editingId, draft);
    editingId = null;
  }

  function focus(node: HTMLInputElement) {
    node.focus();
    node.select();
  }
</script>

<aside class="sidebar" class:open aria-label="Conversations">
  <div class="brand">
    <span class="logo" aria-hidden="true">L</span>
    <strong>Lumen Chat</strong>
    <button class="icon-btn close" onclick={() => (open = false)} aria-label="Close menu">
      <Icon name="close" />
    </button>
  </div>

  <button class="btn btn-primary new" onclick={() => { store.newChat(); open = false; }}>
    <Icon name="plus" /> New chat
  </button>

  <label class="search">
    <Icon name="search" size={16} />
    <span class="sr-only">Search chats</span>
    <input type="search" placeholder="Search chats" bind:value={query} />
  </label>

  <nav class="list">
    {#each groups as group (group.label)}
      <h3>{group.label}</h3>
      <ul>
        {#each group.items as chat (chat.id)}
          <li class:active={chat.id === store.activeId}>
            {#if editingId === chat.id}
              <input
                class="rename"
                bind:value={draft}
                use:focus
                onblur={commitRename}
                onkeydown={(e) => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') editingId = null;
                }}
                aria-label="Chat title"
              />
            {:else}
              <button class="item" onclick={() => pick(chat.id)} ondblclick={() => startRename(chat.id, chat.title)}>
                <span aria-hidden="true">{personaById(chat.persona).emoji}</span>
                <span class="title">{chat.title}</span>
              </button>
              <div class="actions">
                <button class="icon-btn" onclick={() => startRename(chat.id, chat.title)} aria-label="Rename chat">
                  <Icon name="edit" size={15} />
                </button>
                <button class="icon-btn" onclick={() => store.remove(chat.id)} aria-label="Delete chat">
                  <Icon name="trash" size={15} />
                </button>
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    {:else}
      <p class="empty">{query ? 'No chats match your search.' : 'Your conversations will appear here.'}</p>
    {/each}
  </nav>

  <footer>
    <button class="btn settings" onclick={onsettings}>
      <Icon name="settings" size={16} /> Settings
      <span class="mode" class:live={!store.demoMode}>{store.demoMode ? 'Demo' : 'Live'}</span>
    </button>
  </footer>
</aside>

{#if open}
  <button class="scrim" aria-label="Close menu" onclick={() => (open = false)}></button>
{/if}

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
    padding: 16px 12px;
    background: var(--sidebar);
    border-right: 1px solid var(--border);
    min-width: 0;
  }
  .brand { display: flex; align-items: center; gap: 10px; padding: 0 4px; }
  .logo {
    display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px;
    background: linear-gradient(135deg, var(--accent), #c084fc); color: #fff; font-weight: 700;
  }
  .close { margin-left: auto; display: none; }
  .new { justify-content: center; }
  .search {
    display: flex; align-items: center; gap: 8px; padding: 0 10px;
    border: 1px solid var(--border); border-radius: 10px; background: var(--panel); color: var(--muted);
  }
  .search input { flex: 1; min-width: 0; border: 0; background: transparent; padding: 8px 0; outline: none; color: var(--text); }
  .list { flex: 1; overflow-y: auto; margin: 0 -4px; padding: 0 4px; }
  h3 { margin: 14px 8px 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
  ul { list-style: none; margin: 0; padding: 0; }
  li { position: relative; display: flex; align-items: center; border-radius: 9px; }
  li:hover, li.active { background: var(--panel); }
  li.active { box-shadow: inset 3px 0 0 var(--accent); }
  .item {
    flex: 1; min-width: 0; display: flex; gap: 8px; align-items: center;
    padding: 8px 10px; border: 0; background: transparent; text-align: left;
  }
  .title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; }
  .actions { display: none; padding-right: 4px; }
  .actions .icon-btn { width: 28px; height: 28px; }
  li:hover .actions, li:focus-within .actions { display: flex; }
  .rename { flex: 1; margin: 3px; padding: 5px 8px; border: 1px solid var(--accent); border-radius: 8px; background: var(--panel); }
  .empty { margin: 16px 8px; font-size: 13px; color: var(--muted); }
  .settings { width: 100%; }
  .mode { margin-left: auto; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 99px; background: var(--accent-soft); color: var(--accent); }
  .mode.live { background: #dcf7e8; color: #13804b; }
  .scrim { display: none; }

  @media (max-width: 820px) {
    .sidebar {
      position: fixed; inset: 0 auto 0 0; width: min(300px, 85vw); z-index: 20;
      transform: translateX(-100%); transition: transform 0.2s ease; box-shadow: var(--shadow);
    }
    .sidebar.open { transform: none; }
    .close { display: inline-grid; }
    .actions { display: flex; }
    .scrim { display: block; position: fixed; inset: 0; z-index: 15; border: 0; background: rgb(0 0 0 / 0.35); }
  }
</style>
