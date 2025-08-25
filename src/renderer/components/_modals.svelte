<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { _ } from 'svelte-i18n';

  // Allow parent to bind to this boolean
  export let showDeleteModal = false;
  export let id = 'delete_notification';

  const dispatch = createEventDispatcher();

  // Keep document class in sync for simple styling hooks
  $: if (typeof document !== 'undefined') {
    if (showDeleteModal) document.body.classList.add('modal-open');
    else document.body.classList.remove('modal-open');
  }

  function close() {
    showDeleteModal = false;
    dispatch('close');
  }

  function backdropClick(e) {
    if (e.target === e.currentTarget) close();
  }

  onMount(() => {
    const onKey = e => {
      if (e.key === 'Escape' && showDeleteModal) close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
</script>

{#if showDeleteModal}
  <div
    {id}
    class="ui basic modal active"
    role="button"
    tabindex="0"
    aria-label="Close dialog"
    on:click={backdropClick}
    on:keydown={e => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        backdropClick(e);
      }
    }}
    style="display:flex;align-items:center;justify-content:center;position:fixed;inset:0;z-index:1000;"
  >
    <div
      class="content"
      style="background:rgba(0,0,0,0.85);padding:1.25rem;border-radius:6px;min-width:320px;max-width:560px;color:#fff;position:relative;"
    >
      <button
        aria-label="close"
        on:click={close}
        style="position:absolute;right:8px;top:8px;background:transparent;border:0;color:#fff;font-size:1.25rem;cursor:pointer;"
        >✕</button
      >
      <div class="header" id={id + '-title'} style="font-weight:700;margin-bottom:0.5rem;">
        <slot name="header">{$_('deleting_old_builds')}</slot>
      </div>
      <div class="body" style="margin-bottom:0.75rem;">
        <slot />
      </div>
      <div class="footer" style="display:flex;gap:0.5rem;justify-content:flex-end;">
        <slot name="footer" />
      </div>
    </div>
  </div>
{/if}
