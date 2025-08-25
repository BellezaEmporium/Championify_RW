<script>
  import { _ } from 'svelte-i18n';
  import package_img from '../img/package.png';
</script>

<div class="one column row">
  <div class="breaking_changes">
    <h3>{$_('manual_update')}</h3>
    <br />
    <img src={package_img} alt={$_('manual_update')} />
    <p>{$_('breaking_changes_1')}</p>
    <br />
    <button id="release_button" class="ui green button">{$_('download')}</button>
  </div>
</div>
