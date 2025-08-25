<script>
  import { onMount } from 'svelte';
  import {
    sourcesInfo,
    selectedSources,
    browseTitle,
    lolVersion,
    sourceVersions,
  } from '../stores/app.js';
  import { currentView } from '../stores/view.js';
  import Options from '../components/Options.svelte';
  import electronBridge from '../services/electronBridge.js';

  // Ensure view is set and check for updates when the page mounts
  onMount(async () => {
    currentView.set('options');
    // Check for updates early; ignore result but allow bridge to wire events
    try {
      await electronBridge.checkForUpdates();
    } catch (err) {
      // non-fatal; keep silent but log for debugging
      console.warn('Update check failed:', err);
    }
  });
</script>

<Options />
