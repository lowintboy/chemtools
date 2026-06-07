<script>
  import { buildLewis } from '$lib/lewis.js';
  import FormulaDisplay from './FormulaDisplay.svelte';
  import LewisDiagram from './LewisDiagram.svelte';
  import { browser } from '$app/environment';

  let input = $state('');

  let model = $derived.by(() => {
    if (!input.trim()) return null;
    return buildLewis(input);
  });

  // History
  let history = $state(browser ? (() => {
    try { return JSON.parse(localStorage.getItem('chemtools.lewis-history') || '[]'); }
    catch { return []; }
  })() : []);

  $effect(() => {
    if (!browser) return;
    localStorage.setItem('chemtools.lewis-history', JSON.stringify(history.slice(0, 12)));
  });

  $effect(() => {
    if (!model || !model.ok || !input.trim()) return;
    const inp = input.trim();
    const t = setTimeout(() => {
      if (history[0] && history[0].input === inp) return;
      const filtered = history.filter(x => x.input !== inp);
      history = [{ input: inp, formula: model.formula, chargeLabel: model.chargeLabel, at: Date.now() }, ...filtered].slice(0, 12);
    }, 800);
    return () => clearTimeout(t);
  });

  const PRESETS = [
    'H2O', 'CO2', 'NH3', 'CH4', 'BF3', 'SO3',
    'NO3-', 'SO4^2-', 'NH4+', 'CO3^2-',
    'PCl5', 'SF6', 'XeF4', 'O2', 'N2', 'CO', 'HCl',
  ];
</script>

<div>
  <div class="section-head">
    <div>
      <h2 class="section-title">Lewis structures</h2>
      <p class="section-subtitle">
        Type a formula to draw its Lewis dot structure. For ions, add a charge suffix &mdash; e.g. <code>NO3-</code>, <code>SO4^2-</code>, <code>NH4+</code>.
      </p>
    </div>
  </div>

  <div class="calc-grid">
    <div class="calc-input-card">
      <form onsubmit={(e) => e.preventDefault()}>
        <input
          class="formula-input"
          class:error={input && model && !model.ok && !model.unsupported}
          bind:value={input}
          placeholder="e.g. H2O or SO4^2-"
          spellcheck="false"
          autocomplete="off"
        />
      </form>
      <div class="input-meta">
        <span>
          {#if !input}
            Enter a formula to see its Lewis structure
          {:else if model && model.ok}
            <span class="nomen-detect">{model.geometry ? model.geometry.molecularGeometry : 'single atom'}</span>
          {:else if model && !model.unsupported}
            <span class="err">&#9888; {model.error}</span>
          {:else if model}
            <span>&#9432; Not drawable here</span>
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
                  <FormulaDisplay formula={h.formula} />{#if h.chargeLabel}<span class="lewis-charge">{h.chargeLabel}</span>{/if}
                </span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>

    <div class="result-card">
      {#if !input || !model}
        <div class="result-empty">
          <span class="result-empty-icon">&#9676;</span>
          Enter a formula to draw its Lewis structure
        </div>
      {:else if model.unsupported}
        <div class="lewis-unsupported">{model.error}</div>
      {:else if !model.ok}
        <div class="result-empty">
          <span class="result-empty-icon">&#9676;</span>
          Enter a valid chemical formula
        </div>
      {:else}
        <div>
          <p class="result-formula">
            <FormulaDisplay formula={model.formula} />{#if model.chargeLabel}<span class="lewis-charge">{model.chargeLabel}</span>{/if}
          </p>

          <LewisDiagram {model} />

          {#if model.radical}
            <div class="lewis-note">Heads up: this is a radical &mdash; it has an odd number of valence electrons, so one electron is unpaired.</div>
          {/if}

          <div class="lewis-summary">
            <div><span class="num">{model.totalElectrons}</span><span class="lbl">Valence e&#8315;</span></div>
            <div><span class="num">{model.bondingPairs}</span><span class="lbl">Bonding pairs</span></div>
            <div><span class="num">{model.lonePairs}</span><span class="lbl">Lone pairs</span></div>
          </div>

          {#if model.geometry}
            <div class="lewis-geom">
              <span class="axe">{model.geometry.axe}</span>
              &middot; electron geometry: {model.geometry.electronGeometry}
              &middot; molecular shape: <strong>{model.geometry.molecularGeometry}</strong>
              {#if model.geometry.bondAngle}&middot; bond angle {model.geometry.bondAngle}{/if}
            </div>
          {/if}

          {#if model.resonance.has}
            <div class="lewis-note">{model.resonance.note}</div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>
