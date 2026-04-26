<script>
  import FormulaDisplay from './FormulaDisplay.svelte';
  import ResultPanel from './ResultPanel.svelte';

  let { formula = $bindable(), result, history, clearHistory, onJumpToElement } = $props();

  const PRESETS = ['H2O', 'CO2', 'NaCl', 'C6H12O6', 'CH3COOH', 'Ca(OH)2', 'H2SO4', 'CuSO4\u00B75H2O', '2H2+O2', 'H2O+3NaCl'];
</script>

<div>
  <div class="section-head">
    <div>
      <h2 class="section-title">Molar mass calculator</h2>
      <p class="section-subtitle">
        Type a chemical formula. Use parentheses like <span style="font-family: var(--font-mono)">Ca(OH)2</span>,
        a middle dot for hydrates (<span style="font-family: var(--font-mono)">CuSO4&middot;5H2O</span>),
        or <span style="font-family: var(--font-mono)">+</span> to sum compounds (<span style="font-family: var(--font-mono)">H2O + 3NaCl</span>).
      </p>
    </div>
  </div>

  <div class="calc-grid">
    <div class="calc-input-card">
      <form onsubmit={(e) => e.preventDefault()}>
        <input
          class="formula-input"
          class:error={formula && !result.ok}
          bind:value={formula}
          placeholder="e.g. C6H12O6"
          spellcheck="false"
          autocomplete="off"
        />
      </form>
      <div class="input-meta">
        <span>
          {#if !formula}
            Enter a formula to begin
          {:else if result.ok}
            <span style="color: var(--ink-3)">Auto-saved to recent</span>
          {:else}
            <span class="err">&#9888; {result.error}</span>
          {/if}
        </span>
        {#if formula}
          <button class="btn" onclick={() => (formula = '')} type="button">Clear</button>
        {/if}
      </div>

      <div class="presets">
        <div class="presets-label">Common formulas</div>
        {#each PRESETS as p}
          <button class="preset" onclick={() => (formula = p)}>{p}</button>
        {/each}
      </div>

      {#if history.length > 0}
        <div class="history">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px">
            <div class="history-label" style="margin-bottom: 0">Recent &middot; {history.length}</div>
            <button class="preset" onclick={clearHistory} style="font-size: 10px">Clear all</button>
          </div>
          <ul class="history-list">
            {#each history as h, i}
              <li class="history-item" onclick={() => (formula = h.formula)} title="Load this formula" role="button" tabindex="0">
                <span class="history-formula"><FormulaDisplay formula={h.formula} /></span>
                <span class="history-mass">{h.mass.toFixed(3)} g/mol</span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>

    <div class="result-card">
      {#if !formula || !result.ok}
        <div class="result-empty">
          <span class="result-empty-icon">&sum;</span>
          {#if !formula}
            Result will appear here
          {:else}
            Enter a valid formula to see breakdown
          {/if}
        </div>
      {:else}
        <ResultPanel {formula} {result} {onJumpToElement} />
      {/if}
    </div>
  </div>
</div>
