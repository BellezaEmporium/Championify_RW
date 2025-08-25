<script>
  import { onMount } from 'svelte';
  import { _ } from 'svelte-i18n';
  import { currentView } from '../stores/view.js';
  import { undefinedBuilds, resetCompleteView, resetMainView } from '../stores/app.js';
  import electronBridge from '../services/electronBridge.js';
  import cat from '../img/cat.gif';
  
  let formattedUnavailable = [];
  
  onMount(() => {
    resetCompleteView();
    formatUnavailableBuilds();
  });
  
  function formatUnavailableBuilds() {
    const builds = $undefinedBuilds || [];
    
    if (builds.length === 0) {
      formattedUnavailable = [{
        text: $_('all_available'),
        isSuccess: true
      }];
      return;
    }
    
    formattedUnavailable = builds
      .sort((a, b) => a.source.localeCompare(b.source))
      .map(entry => {
        const champTranslation = $_(entry.champ);
        if (!champTranslation) return null;
        
        return {
          text: `${entry.source} ${champTranslation}: ${$_(entry.position)}`,
          isSuccess: false
        };
      })
      .filter(Boolean);
  }
  
  function handleBackToMain() {
    resetMainView();
    currentView.set('main');
  }
  
  async function handleStartLeague() {
    try {
      await electronBridge.startLeague();
      // Optionally close the app or minimize
    } catch (error) {
      console.error('Failed to start League:', error);
    }
  }
  
  // React to changes in undefined builds
  $: if ($undefinedBuilds) {
    formatUnavailableBuilds();
  }
</script>

<div class="complete-view">
  <div class="ui container center aligned">
    <div class="ui segment">
      <h2 class="ui header">
        <i class="check circle green icon"></i>
        {$_('done')}
      </h2>
      
      <img class="celebration-image" alt="A cat tilting its head around" src={cat} />
      
      <div class="ui divider"></div>
      
      <div class="button-group">
        <button 
          class="ui blue button large"
          on:click={handleBackToMain}
        >
          <i class="arrow left icon"></i>
          {$_('back')}
        </button>
        
        <button 
          class="ui green button large"
          on:click={handleStartLeague}
        >
          <i class="play icon"></i>
          {$_('start_league')}
        </button>
      </div>
    </div>
    
    <div class="ui segment">
      <h3 class="ui header">
        <i class="info circle icon"></i>
        {$_('na')}
        <div class="sub header">{$_('status')}</div>
      </h3>
      
      <div class="ui divider"></div>
      
      <div class="unavailable-list">
        {#if formattedUnavailable.length > 0}
          <div class="ui relaxed list">
            {#each formattedUnavailable as item}
              <div class="item">
                {#if item.isSuccess}
                  <i class="check green icon"></i>
                {:else}
                  <i class="exclamation triangle yellow icon"></i>
                {/if}
                <div class="content">
                  {item.text}
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="ui message">
            <p>{$_('loading')}</p>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>