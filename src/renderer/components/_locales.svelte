<script>
  import { locale } from 'svelte-i18n';
  import { get } from 'svelte/store';
  import * as Icon from 'svelte-flag-icons';

  // All supported locales
  const languages = [
    { code: 'en', label: 'English', flag: 'Us' },
    { code: 'id', label: 'Bahasa Indonesia', flag: 'Id' },
    { code: 'bs', label: 'Bosanski', flag: 'Ba' },
    { code: 'ca', label: 'Català', flag: 'Es' },
    { code: 'cs', label: 'čeština', flag: 'Cz' },
    { code: 'da', label: 'Danske', flag: 'Dk' },
    { code: 'de', label: 'Deutsch', flag: 'De' },
    { code: 'es', label: 'Español', flag: 'Es' },
    { code: 'fr', label: 'Français', flag: 'Fr' },
    { code: 'hr', label: 'Hrvatska', flag: 'Hr' },
    { code: 'it', label: 'Italiano', flag: 'It' },
    { code: 'lv', label: 'Latvijā', flag: 'Lv' },
    { code: 'lt', label: 'Lietuvos', flag: 'Lt' },
    { code: 'hu', label: 'Magyar', flag: 'Hu' },
    { code: 'ms', label: 'Melayu', flag: 'My' },
    { code: 'nl', label: 'Nederlandse', flag: 'Nl' },
    { code: 'no', label: 'Norsk', flag: 'No' },
    { code: 'pl', label: 'Polski', flag: 'Pl' },
    { code: 'pt', label: 'Português', flag: 'Pt' },
    { code: 'pt-BR', label: 'Português Brasileiro', flag: 'Br' },
    { code: 'ro', label: 'Român', flag: 'Ro' },
    { code: 'sl', label: 'Slovenščina', flag: 'Si' },
    { code: 'sk', label: 'Slovenský', flag: 'Sk' },
    { code: 'sr', label: 'Srpski', flag: 'Sr' },
    { code: 'fi', label: 'Suomi', flag: 'Fi' },
    { code: 'sv', label: 'Svenska', flag: 'Sv' },
    { code: 'vi', label: 'Tiếng Việt', flag: 'Vi' },
    { code: 'tr', label: 'Türk', flag: 'Tr' },
    { code: 'ar', label: 'العربية', flag: 'Ar' },
    { code: 'bg', label: 'български', flag: 'Bg' },
    { code: 'zh-CN', label: '简体中文', flag: 'Cn' },
    { code: 'zh-TW', label: '繁體中文', flag: 'Tw' },
    { code: 'ka', label: 'ქართული', flag: 'Ge' },
    { code: 'el', label: 'Ελληνικά', flag: 'Gr' },
    { code: 'he', label: 'עברית', flag: 'Il' },
    { code: 'hi', label: 'हिंदी', flag: 'In' },
    { code: 'ja', label: '日本語', flag: 'Jp' },
    { code: 'km', label: 'ភាសាខ្មែរ', flag: 'Kh' },
    { code: 'ko', label: '한국어', flag: 'Kr' },
    { code: 'ru', label: 'русский', flag: 'Ru' },
    { code: 'th', label: 'ภาษาไทย', flag: 'Th' },
  ];

  let selected = get(locale) || 'en';
  let open = false;

  $: selectedLanguage = languages.find(l => l.code === selected) || languages[0];

  function select(code) {
    selected = code;
    locale.set(selected);
    open = false;
  }
</script>

<div class="relative">
  <button
    type="button"
    class="relative focus:outline-none"
    aria-haspopup="listbox"
    aria-expanded={open}
    on:click={() => (open = !open)}
    on:keydown={e => {
      if (e.key === 'Enter' || e.key === ' ') {
        open = !open;
      }
    }}
  >
    <span class="text-xl cursor-pointer"><svelte:component this={Icon[selectedLanguage.flag]} /></span>
  </button>

  {#if open}
    <div
      class="absolute top-8 left-0 bg-white dark:bg-gray-800 shadow-lg rounded p-2 space-y-1 z-50"
      role="listbox"
    >
      {#each languages as l}
        <button
          type="button"
          class="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded w-full text-left"
          role="option"
          aria-selected={selected === l.code}
          on:click={() => select(l.code)}
          on:keydown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              select(l.code);
            }
          }}
        >
          <span class="text-lg inline-block w-6 h-4"><svelte:component this={Icon[l.flag]} /></span>
          <span class="text-sm">{l.label}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>
