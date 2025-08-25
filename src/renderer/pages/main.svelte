<script>
  import { onMount } from 'svelte';
  import {
    sourcesInfo,
    selectedSources,
    selectedSourcesArray,
    browseTitle,
    lolVersion,
    sourceVersions,
    isImporting,
    importProgress,
    statusLogs,
    setSelectedSources,
    resetMainView,
  } from '../stores/app.js';
  import { currentView } from '../stores/view.js';
  import { _ } from 'svelte-i18n';
  import electronBridge from '../services/electronBridge.js';
  import Options from '../components/Options.svelte';

  // Local reactive aliases
  $: sources = $sourcesInfo || [];
  $: selectedArray = $selectedSourcesArray || [];
  $: importing = $isImporting;

  onMount(() => resetMainView());

  function toggleSource(id) {
    const exists = selectedArray.includes(id);
    if (exists) {
      setSelectedSources(selectedArray.filter(s => s !== id));
    } else {
      setSelectedSources([...selectedArray, id]);
    }
  }

  async function startImport() {
    if (importing) return;
    isImporting.set(true);
    statusLogs.set([]);

    try {
      const payload = {
        sources: selectedArray,
        path: $browseTitle,
      };

      const result = await electronBridge?.startImport?.(payload);
      if (result && result.success) {
        currentView.set('complete');
      } else {
        throw new Error(result?.error || 'Import failed');
      }
    } catch (err) {
      console.error('Import error', err);
      currentView.set('error');
    } finally {
      isImporting.set(false);
    }
  }

  async function browse() {
    if (importing) return;
    try {
      const path = await electronBridge?.selectDirectory?.();
      if (path) {
        browseTitle.set(path);
        const v = await electronBridge?.getLolVersionFromPath?.(path);
        if (v) lolVersion.set(v);
      }
    } catch (err) {
      console.warn('Browse cancelled or failed', err);
    }
  }
</script>

<div class="main-view">
  <div class="ui container">
    <h2 class="ui header">
      <i class="folder open icon"></i>
      <div class="content">
        {$_('summoners_rift_source')}
        <div class="sub header">{$_('options_locksr_tooltip')}</div>
      </div>
    </h2>

    <Options />

    <div class="ui segment">
      <div class="ui divided list">
        {#each sources as source}
          <div class="item">
            <div class="ui checkbox">
              <input
                type="checkbox"
                id={source.id}
                checked={selectedArray.includes(source.id)}
                disabled={importing}
                on:change={() => toggleSource(source.id)}
                aria-checked={selectedArray.includes(source.id)}
              />
              <label for={source.id}>
                <strong>{source.name}</strong>
                <span class="version">
                  {#if $sourceVersions[source.id]}
                    v{$sourceVersions[source.id]}
                  {:else}
                    <i class="spinner loading icon"></i>
                  {/if}
                </span>
              </label>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div class="ui segment">
      <h3 class="ui header">
        <i class="gamepad icon"></i>
        {$_('select')}
      </h3>

      <div class="ui action input fluid">
        <input
          type="text"
          value={$browseTitle}
          readonly
          placeholder={$_('browse_placeholder')}
          aria-readonly="true"
        />
        <button class="ui button blue" disabled={importing} on:click={browse}>
          {$_('browse')}
        </button>
      </div>

      <div class="ui label">
        {$_('lol_version')}:
        {#if $lolVersion}
          {$lolVersion}
        {:else}
          <i class="spinner loading icon"></i>
        {/if}
      </div>
    </div>

    {#if importing}
      <div class="ui segment">
        <div class="ui indicating progress" data-percent={$importProgress}>
          <div class="bar" style="width: {$importProgress}%;">
            <div class="progress">{$importProgress}%</div>
          </div>
        </div>

        {#if $statusLogs.length > 0}
          <div class="ui list">
            {#each $statusLogs as log}
              <div class="item">{log}</div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <div class="ui segment center aligned">
      <button
        class="ui button green large"
        disabled={importing || selectedArray.length === 0}
        on:click={startImport}
      >
        {#if importing}
          <i class="spinner loading icon"></i>
          {$_('import_in_progress')}
        {:else}
          <i class="download icon"></i>
          {$_('import_builds')}
        {/if}
      </button>
    </div>
  </div>
</div>
