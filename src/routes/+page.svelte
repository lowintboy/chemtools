<script>
  import { parse, molarMass } from '$lib/chem.js';
  import PeriodicTable from '../components/PeriodicTable.svelte';
  import Calculator from '../components/Calculator.svelte';
  import Nomenclature from '../components/Nomenclature.svelte';
  import SettingsPanel from '../components/SettingsPanel.svelte';
  import { browser } from '$app/environment';

  const FONT_PAIRS = {
    'geist-newsreader': {
      sans: '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      serif: '"Newsreader", "Iowan Old Style", Charter, Georgia, serif',
      mono: '"Geist Mono", "JetBrains Mono", ui-monospace, Menlo, monospace',
    },
    'ibm-plex': {
      sans: '"IBM Plex Sans", system-ui, sans-serif',
      serif: '"IBM Plex Serif", Georgia, serif',
      mono: '"IBM Plex Mono", ui-monospace, monospace',
    },
    'instrument': {
      sans: '"Instrument Sans", system-ui, sans-serif',
      serif: '"Instrument Serif", Georgia, serif',
      mono: '"JetBrains Mono", ui-monospace, monospace',
    },
  };

  // Tweaks state
  let theme = $state('light');
  let density = $state('normal');
  let showMass = $state(true);
  let fontPair = $state('geist-newsreader');

  function setTweak(key, val) {
    if (key === 'theme') theme = val;
    else if (key === 'density') density = val;
    else if (key === 'showMass') showMass = val;
    else if (key === 'fontPair') fontPair = val;
  }

  // Apply theme + density + font to document
  $effect(() => {
    if (!browser) return;
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-density', density);
    const fp = FONT_PAIRS[fontPair] || FONT_PAIRS['geist-newsreader'];
    document.documentElement.style.setProperty('--font-sans', fp.sans);
    document.documentElement.style.setProperty('--font-serif', fp.serif);
    document.documentElement.style.setProperty('--font-mono', fp.mono);
  });

  // Tab + formula state
  let tab = $state('ptable');
  let formula = $state('');

  // History (persisted in localStorage)
  let history = $state(browser ? (() => {
    try { return JSON.parse(localStorage.getItem('chemtools.history') || '[]'); }
    catch { return []; }
  })() : []);

  $effect(() => {
    if (!browser) return;
    localStorage.setItem('chemtools.history', JSON.stringify(history.slice(0, 12)));
  });

  // Parse formula
  let parsed = $derived(parse(formula));
  let result = $derived.by(() => {
    if (!parsed.ok) return parsed;
    const { total, breakdown } = molarMass(parsed.counts);
    return { ok: true, total, breakdown, counts: parsed.counts };
  });

  let formulaCounts = null;

  // Auto-save valid formulas to history
  $effect(() => {
    if (!result.ok || !formula.trim()) return;
    const f = formula.trim();
    const mass = result.total;
    const t = setTimeout(() => {
      if (history[0] && history[0].formula === f) return;
      const filtered = history.filter(x => x.formula !== f);
      history = [{ formula: f, mass, at: Date.now() }, ...filtered].slice(0, 12);
    }, 800);
    return () => clearTimeout(t);
  });

  function onAddElement(sym) {
    formula = formula + sym;
    tab = 'calc';
  }

  function onJumpToElement(sym) {
    tab = 'ptable';
  }
</script>

<header class="topbar">
  <div class="brand">
    <div class="brand-mark">chem<em>tools</em></div>
    <div class="brand-tag">created by <a href="https://sangmin.kim" target="_blank" rel="noopener noreferrer">sangmin kim</a></div>
  </div>
  <div style="display: flex; align-items: center; gap: 12px">
    <span class="version-tag">
      v0.1 &middot; IUPAC 2021 weights
    </span>
    <SettingsPanel {theme} {density} {fontPair} {showMass} onSetTweak={setTweak} />
  </div>
</header>

<nav class="tabs" role="tablist">
  <button
    class="tab"
    role="tab"
    aria-selected={tab === 'ptable'}
    onclick={() => (tab = 'ptable')}
  >
    <span class="tab-num">01</span> Periodic table
  </button>
  <button
    class="tab"
    role="tab"
    aria-selected={tab === 'calc'}
    onclick={() => (tab = 'calc')}
  >
    <span class="tab-num">02</span> Molar mass calculator
  </button>
  <button
    class="tab"
    role="tab"
    aria-selected={tab === 'nomen'}
    onclick={() => (tab = 'nomen')}
  >
    <span class="tab-num">03</span> Nomenclature
  </button>
</nav>

<main class="page">
  {#if tab === 'ptable'}
    <PeriodicTable
      {formulaCounts}
      onElementClick={onAddElement}
      {showMass}
      {density}
    />
  {:else if tab === 'calc'}
    <Calculator
      bind:formula
      {result}
      {history}
      clearHistory={() => (history = [])}
      {onJumpToElement}
    />
  {:else if tab === 'nomen'}
    <Nomenclature />
  {/if}
</main>
