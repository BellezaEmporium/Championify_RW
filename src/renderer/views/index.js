import Main from '../pages/main.svelte';
import Complete from '../pages/complete.svelte';
import ErrorView from '../pages/error.svelte';
import UpdateView from '../pages/update.svelte';
import ManualUpdateView from '../pages/manual_update.svelte';

export const views = {
  main: Main,
  complete: Complete,
  error: ErrorView,
  update: UpdateView,
  manual_update: ManualUpdateView
};
