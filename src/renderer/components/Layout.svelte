<script>
  import { onMount } from 'svelte';
  import Locales from './_locales.svelte';
  import osx_close from '../img/osx_buttons/close.png';
  import osx_minimize from '../img/osx_buttons/minimize.png';
  import win_minimize from '../img/win_buttons/minimize.png';
  import win_maximize from '../img/win_buttons/maximize.png';
  import win_close from '../img/win_buttons/x.png';
  import logo from '../img/logo.png';

  let platform = 'unknown';
  let version = '3.0.0';

  onMount(() => {
    const electronPlatform = window.electronAPI?.process?.platform;
    if (electronPlatform) {
      platform = electronPlatform;
    } else {
      const str = navigator.platform?.toLowerCase() || '';
      platform = str.includes('mac') ? 'darwin' : str.includes('win') ? 'win32' : 'unknown';
    }
  });

  function onMinimize() {
    window.electronAPI?.window?.minimize?.();
  }
  function onMaximize() {
    window.electronAPI?.window?.maximize?.();
  }
  function onClose() {
    window.electronAPI?.window?.close?.();
  }
</script>

<!-- Background wrapper -->
<div class="relative min-h-screen w-screen text-white">
  <!-- Overlay (darken background for readability, plus subtil) -->
  <div class="absolute inset-0 bg-black/20 pointer-events-none"></div>

  <!-- Content wrapper -->
  <div class="relative flex flex-col min-h-screen">
    <!-- HEADER -->
    <header
      class="flex items-center justify-between px-1 h-6 select-none"
      style="-webkit-app-region: drag;"
    >
      <!-- Windows buttons (absolute right) -->
      {#if platform === 'win32'}
        <div
          class="absolute right-1 top-1 h-6 flex items-center space-x-1 -webkit-app-region-no-drag z-50"
          style="-webkit-app-region: no-drag;"
        >
          <button
            class="h-6 flex items-center justify-center px-1 rounded hover:bg-gray-700/40 focus:outline-none active:scale-95 transition"
            on:click={onMinimize}
            aria-label="Minimize window"
            title="Minimize"
          >
            <div class="w-3 h-0.5 bg-white"></div>
          </button>
          <button
            class="h-6 flex items-center justify-center px-1 rounded hover:bg-gray-700/40 focus:outline-none active:scale-95 transition"
            on:click={onMaximize}
            aria-label="Maximize window"
            title="Maximize"
          >
            <div class="w-3 h-3 border border-white border-t-2"></div>
          </button>
          <button
            class="h-6 flex items-center justify-center px-1 rounded hover:bg-red-600 focus:outline-none active:scale-95 transition"
            on:click={onClose}
            aria-label="Close window"
            title="Close"
          >
            <svg class="w-3 h-3" viewBox="0 0 12 12" fill="white">
              <path
                d="M6 4.59L10.59 0 12 1.41 7.41 6 12 10.59 10.59 12 6 7.41 1.41 12 0 10.59 4.59 6 0 1.41 1.41 0 6 4.59z"
              />
            </svg>
          </button>
        </div>
      {/if}

      <!-- OSX buttons (absolute right) -->
      {#if platform === 'darwin'}
        <div
          class="absolute right-2 top-2 h-8 flex items-center space-x-2 -webkit-app-region-no-drag z-50"
          style="-webkit-app-region: no-drag;"
        >
          <button
            class="h-8 flex items-center justify-center px-2 rounded hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 active:scale-95 transition"
            on:click={onMinimize}
            title="Minimize"
            aria-label="Minimize window"
          ></button>
          <button
            class="h-8 flex items-center justify-center px-2 rounded hover:bg-red-600/90 focus:outline-none focus:ring-2 focus:ring-red-500 active:scale-95 transition"
            on:click={onClose}
            title="Close"
            aria-label="Close window"
          ></button>
        </div>
      {/if}
    </header>

    <!-- LOCALES (moved to top-left, same level as window controls) -->
    <div class="absolute left-1 top-1 h-6 flex items-center z-50 -webkit-app-region-no-drag">
      <Locales style="height:20px;min-width:24px;" />
    </div>

    <!-- BANNER -->
    <div class="flex flex-col items-center mt-4 sm:mt-8">
      <img src={logo} alt="Logo" class="h-10 sm:h-14 mb-2" />
      <div class="w-32 border-t border-gray-400"></div>
    </div>

    <!-- MAIN -->
    <main class="flex-1 p-4 sm:p-6 pb-20">
      <slot />
    </main>

    <footer class="w-full border-t border-gray-700 bg-gray-900 fixed bottom-0 left-0 z-20 h-14">
      <div class="max-w-4xl mx-auto grid grid-cols-3 items-center px-4 text-xs sm:text-sm text-gray-300 h-full">
        <!-- Donate à gauche -->
        <div class="flex items-center justify-start gap-1">
          <a
            href="https://ko-fi.com/shadx777"
            target="_blank"
            rel="noopener"
            class="hover:text-red-400 inline-flex items-center gap-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 fill-current text-red-500"
              viewBox="0 0 20 20"
            >
              <path
                d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 18.657l-6.828-6.829a4 4 0 010-5.656z"
              />
            </svg>
            <span class="truncate max-w-[6rem] leading-none">Donate</span>
          </a>
        </div>

        <!-- GitHub centré -->
        <div class="flex items-center justify-center">
          <a
            href="https://github.com/BellezaEmporium"
            target="_blank"
            rel="noopener"
            class="hover:text-indigo-400 inline-flex items-center gap-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 fill-current"
              viewBox="0 0 24 24"
            >
              <path
                fill-rule="evenodd"
                d="M12 0C5.37 0 0 5.37 0 12a12 12 0 008.21 11.44c.6.11.82-.26.82-.58v-2c-3.34.72-4.05-1.61-4.05-1.61-.55-1.4-1.34-1.77-1.34-1.77-1.1-.76.08-.74.08-.74 1.22.09 1.87 1.25 1.87 1.25 1.08 1.87 2.84 1.33 3.53 1.02.11-.78.42-1.33.76-1.63-2.67-.3-5.48-1.34-5.48-5.94 0-1.31.47-2.38 1.25-3.22-.13-.31-.54-1.55.12-3.23 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 016 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.68.25 2.92.12 3.23.78.84 1.25 1.91 1.25 3.22 0 4.61-2.81 5.63-5.49 5.93.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.82.58A12 12 0 0024 12c0-6.63-5.37-12-12-12z"
              />
            </svg>
            <span class="truncate max-w-[8rem] leading-none">BellezaEmporium</span>
          </a>
        </div>

        <!-- Version à droite -->
        <div class="flex items-center justify-end">
          <span class="leading-none text-white">v{version}</span>
        </div>
      </div>
    </footer>
  </div>
</div>
