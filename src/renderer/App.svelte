<script>
  import Layout from './components/Layout.svelte';
  import ViewManager from './pages/viewmanager.svelte';
  import electronBridge from './services/electronBridge.js';
  import { init } from 'svelte-i18n';
  import { onMount } from 'svelte';

  import './styles/index.scss';

  let initialized = false;

  onMount(async () => {
    await init({ fallbackLocale: 'en', initialLocale: 'en' });
    await electronBridge.initialize();
    initialized = true;
  });
</script>

<div class="h-screen flex flex-col">
  {#if initialized}
    <Layout class="flex-1 flex flex-col">
      <ViewManager class="flex-1 overflow-auto" />
    </Layout>
  {:else}
    <div class="flex-1 flex items-center justify-center">
      <div class="ui active inverted dimmer">
        <div class="ui text loader">Loading...</div>
      </div>
    </div>
  {/if}
</div>
