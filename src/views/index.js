import Main from '../routes/+page.svelte';
import Complete from '../routes/complete/+page.svelte';
import ErrorView from '../routes/error/+page.svelte';
import UpdateView from '../routes/update/+page.svelte';
import ManualUpdateView from '../routes/manual_update/+page.svelte';

export const views = {
  main: Main,
  complete: Complete,
  error: ErrorView,
  update: UpdateView,
  manual_update: ManualUpdateView
};
