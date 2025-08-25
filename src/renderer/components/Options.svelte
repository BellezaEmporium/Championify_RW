<script>
  import { onMount } from 'svelte';
  import {
    browseTitle,
    sourcesInfo,
    selectedSourcesArray,
    lolVersion,
    setSelectedSources,
  } from '../stores/app.js';
  import electronBridge from '../services/electronBridge.js';
  import { currentView } from '../stores/view.js';
  import { _ } from 'svelte-i18n';
  import Modal from './_modals.svelte';

  // Local reactive state (plain JS).
  let sourceVersions = {};

  // modal to confirm delete-all-builds
  let showDeleteModal = false;

  // derive from stores using $ shorthand
  // $sourcesInfo and $selectedSourcesArray are provided by Svelte store auto-subscription
  $: sources = $sourcesInfo || [];
  $: selected = $selectedSourcesArray || [];

  // Initialize options as a plain object. We'll replace properties immutably so Svelte detects changes.
  let options = {
    aram: false,
    splititems: false,
    skillsformat: false,
    consumables: true,
    trinkets: true,
    locksr: false,
    dontdeleteold: false,
  };

  function setOption(key, value) {
    options = { ...options, [key]: value };
  }

  function toggleSource(id) {
    if (selected.includes(id)) {
      setSelectedSources(selected.filter(s => s !== id));
    } else {
      setSelectedSources([...selected, id]);
    }
  }

  async function browse() {
    const p = await electronBridge?.selectDirectory?.();
    if (p) {
      browseTitle.set(p);
      const v = await electronBridge?.getLolVersionFromPath?.(p);
      if (v) lolVersion.set(v);
    }
  }

  // On mount, if a path is already set (from prefs), try to resolve LoL version
  onMount(async () => {
    if ($browseTitle) {
      const v = await electronBridge?.getLolVersionFromPath?.($browseTitle);
      if (v) lolVersion.set(v);
    }
  });

  async function importSelectedSources() {
    // Switch view to main which contains the progress UI, then start import
    currentView.set('main');
    try {
      await electronBridge?.startImport?.({
        sources: selected,
        path: $browseTitle,
        preferences: options,
      });
    } catch (err) {
      console.error('Import failed from Options:', err);
      // leave it to main.svelte to display errors via stores
    }
  }

  async function deleteAllBuilds() {
    await electronBridge?.deleteAllBuilds?.();
  }

  // Fetch and populate source versions when sources change
  $: if (sources && sources.length) {
    // initialize missing entries to 'loading'
    const missing = {};
    for (const s of sources) if (!(s.id in sourceVersions)) missing[s.id] = 'loading';
    if (Object.keys(missing).length) sourceVersions = { ...sourceVersions, ...missing };

    // fetch versions asynchronously (fire-and-forget for each source)
    for (const s of sources) {
      // don't re-fetch if we already have a non-loading value
      if (sourceVersions[s.id] && sourceVersions[s.id] !== 'loading') continue;
      (async () => {
        try {
          const v = await electronBridge?.getSourceVersion?.(s.id);
          sourceVersions = { ...sourceVersions, [s.id]: v ?? 'unknown' };
        } catch (err) {
          sourceVersions = { ...sourceVersions, [s.id]: 'error' };
        }
      })();
    }
  }
</script>

<div class="mx-auto w-full max-w-[420px] sm:max-w-[520px] lg:max-w-[640px] space-y-6">
  <!-- Browse section (single-line) -->

  <!-- Ligne Browse plus plate -->
  <div class="flex items-center gap-2 w-full">
    <input
      id="install_path"
      type="text"
      class="flex-1 rounded border border-gray-300 px-3 py-2 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      value={$browseTitle}
      readonly
      placeholder={$_('browse')}
    />
    <button
      on:click={browse}
      class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow"
    >
      {$_('browse')}
    </button>
  </div>

  {#if $lolVersion}
    <div class="text-sm text-green-500 font-semibold mt-1">Found League of Legends !</div>
  {/if}

  <!-- Sources + Options -->

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
    <!-- Sélecteur de sources intelligent -->
    <div>
      <div class="flex flex-wrap gap-1">
        {#each sources as source (source.id)}
          <button
            type="button"
            class={`flex items-center gap-1 px-2 py-1 rounded border text-sm transition focus:outline-none ${selected.includes(source.id) ? 'bg-green-500 text-white border-green-600' : 'bg-gray-200 text-gray-500 border-gray-300 hover:bg-gray-300'}`}
            on:click={() => toggleSource(source.id)}
            aria-pressed={selected.includes(source.id)}
            title={source.name}
          >
            <img src={`img/sources/${source.id}.png`} alt={source.name} class="w-4 h-4 rounded" />
            <span>{source.name}</span>
          </button>
        {/each}
      </div>
    </div>

    <!-- Options avec tooltips -->
    <div>
      <div class="space-y-2">
        {#each Object.entries(options) as [key, value] (key)}
          <label class="flex items-center gap-2 text-white relative">
            <input
              type="checkbox"
              class="h-4 w-4 text-indigo-500 rounded"
              checked={options[key]}
              on:change={e => setOption(key, e.target.checked)}
            />
            <span class="text-sm">
              {#if key === 'skillsformat'}
                {$_(`options_${key}`)} (Q&gt;W&gt;E)
              {:else}
                {$_(`options_${key === 'aram' ? 'aram_tooltip' : key}`)}
              {/if}
            </span>
            {#if key === 'consumables' || key === 'trinkets'}
              <span class="ml-1 cursor-pointer text-indigo-300 relative group">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z"
                  /></svg
                >
                <span
                  class="tooltip-popup invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100 absolute left-6 top-1/2 -translate-y-1/2 w-56 bg-gray-900 text-white text-xs rounded shadow-lg px-3 py-2 z-50 transition-opacity duration-200 pointer-events-auto"
                  style="white-space: pre-line;"
                >
                  {key === 'consumables'
                    ? $_('options_consumables_tooltip')
                    : $_('options_trinkets_tooltip')}
                </span>
              </span>
            {/if}
          </label>
        {/each}
      </div>
    </div>
  </div>

  <!-- Actions Import/Delete -->
  <div class="mt-2 flex flex-col items-center gap-3">
    <div class="flex gap-3">
      <button
        on:click={importSelectedSources}
        class="px-8 py-2 bg-green-600 hover:bg-green-700 text-white rounded shadow"
      >
        {$_('import')}
      </button>
      <button
        on:click={() => (showDeleteModal = true)}
        class="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
      >
        {$_('delete')}
      </button>
    </div>

    <!-- modal to confirm delete-all-builds -->
    <Modal bind:showDeleteModal>
      {#snippet header()}
        <h2>Confirm delete</h2>
      {/snippet}

      <div class="py-4 text-sm">
        Are you sure you want to delete all builds? This action cannot be undone.
      </div>

      <div class="flex justify-end gap-2 mt-4">
        <button
          class="px-4 py-2 bg-gray-300 rounded"
          on:click={() => (showDeleteModal = false)}
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 bg-red-600 text-white rounded"
          on:click={async () => {
            try {
              await deleteAllBuilds();
            } catch (err) {
              console.error('Delete all builds failed:', err);
            } finally {
              showDeleteModal = false;
            }
          }}
        >
          Delete
        </button>
      </div>
    </Modal>

    <!-- Two-column grid layout -->
    <div class="w-full mt-1">
      <div class="flex flex-wrap -mx-2">
        <!-- Left column: Local items and LoL version -->
        <div class="w-1/2 px-2">
          <div class="text-sm text-white mb-2">
            {$_('local_items_version')}: <span class="font-semibold">{$_('unknown')}</span><br />
            LoL Version: <span class="font-semibold">{$lolVersion || $_('loading')}</span>
          </div>
        </div>
        
        <!-- Right column: Sources -->
        <div class="w-1/2 px-2">
          <div class="space-y-1">
            {#each sources as source (source.id)}
              <div class="flex items-center gap-2 text-sm text-white">
                <span>
                  {source.name.length > 12
                    ? source.name
                        .split(/(?=[A-Z])/)
                        .map(s => s[0])
                        .join('')
                    : source.name}:
                </span>
                <span class="font-semibold">{sourceVersions[source.id] || $_('loading')}</span>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
