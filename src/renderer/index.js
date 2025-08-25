import { i18nReady } from './i18n.js';
import { mount } from 'svelte';
import './styles/tailwind.scss';
import App from './App.svelte';

// Async function to wait for i18n and then mount the app
async function startApp() {
  try {
    // Wait for i18n to be fully initialized
    await i18nReady;

    // Mount the app once i18n is ready
    const app = mount(App, {
      target: document.getElementById('app'),
    });

    console.log('App mounted with i18n ready');
    return app;
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
}

// Start the app
startApp();

export default null;
