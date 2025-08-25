<script>
  import { _ } from 'svelte-i18n';
  import sad from '../img/sad.png';
</script>

<div class="one column row">
  <div class="error">
    <h3>{$_('something_broke')}</h3>
    <img alt="A sad face" src={sad} />

    {#if window.error_message}
      <br /><span class="message">{window.error_message}</span>
    {/if}
    <p>
      {$_('error_1')}<br />
      {$_('error_2')}<br />
      {$_('error_3')}
    </p>
    <br />
    <button id="open_log" class="ui button blue">{$_('open_log')}</button>
  </div>
</div>
