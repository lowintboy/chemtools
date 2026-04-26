<script>
  import { ELEMENT_BY_SYMBOL } from '$lib/data/elements.js';
  import { formatMass } from '$lib/utils.js';
  import FormulaDisplay from './FormulaDisplay.svelte';

  let { formula, result, onJumpToElement } = $props();
</script>

<div>
  <p class="result-formula"><FormulaDisplay {formula} /></p>
  <div class="result-mass-row">
    <span class="result-mass">{result.total.toFixed(3)}</span>
    <span class="result-mass-unit">g / mol</span>
  </div>

  <p class="result-section-label">
    Composition &middot; {result.breakdown.length} {result.breakdown.length === 1 ? 'element' : 'elements'}
  </p>
  <div class="breakdown">
    {#each result.breakdown as b}
      {@const el = ELEMENT_BY_SYMBOL[b.symbol]}
      <div
        class="b-sym"
        style="background: var(--c-{el.c}); cursor: pointer"
        onclick={() => onJumpToElement?.(b.symbol)}
        title="Show {b.name} on table"
        role="button"
        tabindex="0"
      >
        {b.symbol}
      </div>
      <div class="b-name">
        {b.name}<span class="b-count">&times; {b.count}</span>
      </div>
      <div class="b-am">{formatMass(b.atomicMass)}</div>
      <div class="b-mass">{b.mass.toFixed(3)}</div>
      <div class="b-pct">{b.percent.toFixed(2)}%</div>
    {/each}
  </div>

  <div class="percent-bar-row">
    {#each result.breakdown as b}
      {@const el = ELEMENT_BY_SYMBOL[b.symbol]}
      <div
        style="flex: {b.percent}; background: var(--c-{el.c})"
        title="{b.symbol} \u2014 {b.percent.toFixed(1)}%"
      ></div>
    {/each}
  </div>
  <div class="percent-bar-legend">
    {#each result.breakdown as b}
      {@const el = ELEMENT_BY_SYMBOL[b.symbol]}
      <span>
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 2px; background: var(--c-{el.c}); margin-right: 5px; vertical-align: middle"></span>
        {b.symbol} {b.percent.toFixed(1)}%
      </span>
    {/each}
  </div>
</div>
