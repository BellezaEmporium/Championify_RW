<script>
  import { _ } from 'svelte-i18n';
  import logo_img from '../img/logo.png';
</script>

<div class="one column row">
  <div class="updating">
    <h3>{$_('downloading_updates')}</h3>
    <br /><img alt="Championify logo" src={logo_img} /><br /><br />
    <div id="update_progress_bar" data-percent="0" class="ui indicating progress">
      <div style="transition-duration: 300ms; -webkit-transition-duration: 300ms;" class="bar">
        <div class="progress">0%</div>
      </div>
    </div>
    <p id="update_current_file"></p>
  </div>
</div>
