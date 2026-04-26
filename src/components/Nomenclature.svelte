<script>
  import { formulaToName, nameToFormula, detectInputType } from '$lib/nomenclature.js';
  import FormulaDisplay from './FormulaDisplay.svelte';
  import { browser } from '$app/environment';

  let input = $state('');

  let inputType = $derived(detectInputType(input));

  let result = $derived.by(() => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    if (inputType === 'formula') {
      return { ...formulaToName(trimmed), inputType: 'formula' };
    } else {
      return { ...nameToFormula(trimmed), inputType: 'name' };
    }
  });

  // History
  let history = $state(browser ? (() => {
    try { return JSON.parse(localStorage.getItem('chemtools.nomen-history') || '[]'); }
    catch { return []; }
  })() : []);

  $effect(() => {
    if (!browser) return;
    localStorage.setItem('chemtools.nomen-history', JSON.stringify(history.slice(0, 12)));
  });

  $effect(() => {
    if (!result || !result.ok || !input.trim()) return;
    const inp = input.trim();
    const t = setTimeout(() => {
      if (history[0] && history[0].input === inp) return;
      const filtered = history.filter(x => x.input !== inp);
      const entry = {
        input: inp,
        formula: result.formula,
        name: result.name,
        inputType: result.inputType,
        at: Date.now(),
      };
      history = [entry, ...filtered].slice(0, 12);
    }, 800);
    return () => clearTimeout(t);
  });

  const PRESETS = [
    'NaCl', 'CO2', 'H2SO4', 'FeCl3', 'Na2SO4', 'Ca(OH)2',
    'calcium carbonate', 'sulfuric acid', 'carbon dioxide', 'ammonia',
  ];
</script>

<div>
  <div class="section-head">
    <div>
      <h2 class="section-title">Nomenclature</h2>
      <p class="section-subtitle">
        Type a chemical formula to get its IUPAC name, or type a name to get the formula.
      </p>
    </div>
  </div>

  <div class="calc-grid">
    <div class="calc-input-card">
      <form onsubmit={(e) => e.preventDefault()}>
        <input
          class="formula-input"
          class:error={input && result && !result.ok}
          bind:value={input}
          placeholder="e.g. NaCl or sodium chloride"
          spellcheck="false"
          autocomplete="off"
        />
      </form>
      <div class="input-meta">
        <span>
          {#if !input}
            Enter a formula or compound name
          {:else if result && result.ok}
            <span class="nomen-detect">Detected as {inputType === 'formula' ? 'formula' : 'name'}</span>
          {:else if result}
            <span class="err">&#9888; {result.error}</span>
          {/if}
        </span>
        {#if input}
          <button class="btn" onclick={() => (input = '')} type="button">Clear</button>
        {/if}
      </div>

      <div class="presets">
        <div class="presets-label">Examples</div>
        {#each PRESETS as p}
          <button class="preset" onclick={() => (input = p)}>{p}</button>
        {/each}
      </div>

      {#if history.length > 0}
        <div class="history">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px">
            <div class="history-label" style="margin-bottom: 0">Recent &middot; {history.length}</div>
            <button class="preset" onclick={() => (history = [])} style="font-size: 10px">Clear all</button>
          </div>
          <ul class="history-list">
            {#each history as h}
              <li class="history-item" onclick={() => (input = h.input)} title="Load this entry" role="button" tabindex="0">
                <span class="history-formula">
                  {#if h.inputType === 'formula'}
                    <FormulaDisplay formula={h.formula} />
                  {:else}
                    {h.name}
                  {/if}
                </span>
                <span class="history-mass" style="font-size: 11px">
                  {#if h.inputType === 'formula'}
                    &rarr; {h.name}
                  {:else}
                    &rarr; {h.formula}
                  {/if}
                </span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>

    <div class="result-card">
      {#if !input || !result || !result.ok}
        <div class="result-empty">
          <span class="result-empty-icon">&hArr;</span>
          {#if !input}
            Enter a formula or name to see its translation
          {:else}
            Enter a valid formula or recognized compound name
          {/if}
        </div>
      {:else}
        <div>
          {#if result.inputType === 'formula'}
            <p class="result-formula"><FormulaDisplay formula={result.formula} /></p>
            <div class="nomen-name">{result.name}</div>
            {#if result.trivialName && result.trivialName !== result.name}
              <div class="nomen-trivial">Also known as: {result.trivialName}</div>
            {/if}
          {:else}
            <div class="nomen-name" style="margin-bottom: 6px">{result.name}</div>
            <p class="result-formula"><FormulaDisplay formula={result.formula} /></p>
          {/if}

          {#if result.compoundType}
            <span class="nomen-type-tag">{result.compoundType}</span>
          {/if}

          {#if result.molarMass}
            <div class="result-mass-row" style="margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--rule)">
              <span class="result-mass" style="font-size: 32px">{result.molarMass.toFixed(3)}</span>
              <span class="result-mass-unit">g / mol</span>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>
