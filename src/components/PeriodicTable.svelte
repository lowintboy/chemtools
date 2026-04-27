<script>
  import { onMount } from 'svelte';
  import { ELEMENTS, CATEGORY_LABELS } from '$lib/data/elements.js';
  import { formatMass } from '$lib/utils.js';
  import ElementDetail from './ElementDetail.svelte';

  const CAS_GROUPS = ['1A','2A','3B','4B','5B','6B','7B','8B','8B','8B','1B','2B','3A','4A','5A','6A','7A','8A'];

  let { formulaCounts = null, onElementClick, showMass, density } = $props();

  let selected = $state(null);
  let search = $state('');
  let filterCat = $state(null);
  let tooltip = $state(null);
  let searchInput = $state(null);

  onMount(() => {
    function onKeydown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        searchInput?.focus();
        searchInput?.select();
      }
    }
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  });

  let matches = $derived.by(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const set = new Set();
    for (const e of ELEMENTS) {
      if (
        e.s.toLowerCase().startsWith(q) ||
        e.n.toLowerCase().includes(q) ||
        String(e.z) === q
      ) set.add(e.z);
    }
    return set;
  });

  function handleSearchKey(e) {
    if (e.key === 'Enter' && matches && matches.size === 1) {
      const z = [...matches][0];
      selected = ELEMENTS.find(x => x.z === z);
    }
  }

  function handleMouseEnter(e, el) {
    const r = e.currentTarget.getBoundingClientRect();
    tooltip = { x: r.left + r.width / 2, y: r.top - 6, el };
  }
</script>

<div>
  <div class="section-head">
    <div>
      <h2 class="section-title">Periodic table</h2>
      <p class="section-subtitle">
        Click an element for details. Click <strong>Add to formula</strong> to send it to the calculator.
      </p>
    </div>
    <div class="search">
      <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        bind:this={searchInput}
        bind:value={search}
        onkeydown={handleSearchKey}
        placeholder="Search by name, symbol, or number"
      />
    </div>
  </div>

  <div class="ptable-wrap">
    <div class="ptable-header" data-density={density}>
      {#each Array(18) as _, i}
        <div class="group-label iupac">{i + 1}</div>
      {/each}
      {#each CAS_GROUPS as cas}
        <div class="group-label cas">{cas}</div>
      {/each}
    </div>
    <div class="ptable" data-density={density}>
      {#each ELEMENTS as el (el.z)}
        {@const dimmed = (matches && !matches.has(el.z)) || (filterCat && el.c !== filterCat)}
        {@const inFormula = formulaCounts && formulaCounts[el.s]}
        <div
          class="cell"
          class:selected={selected?.z === el.z}
          class:in-formula={!!inFormula}
          class:dimmed={!!dimmed}
          data-cat={el.c}
          data-fcount={inFormula || ''}
          style="grid-column: {el.g}; grid-row: {el.p}"
          onclick={() => (selected = el)}
          onmouseenter={(e) => handleMouseEnter(e, el)}
          onmouseleave={() => (tooltip = null)}
          role="button"
          tabindex="0"
        >
          <div style="display: flex; justify-content: space-between; align-items: flex-start">
            <span class="z">{el.z}</span>
          </div>
          <div style="display: flex; flex-direction: column; align-items: center; flex: 1; justify-content: center; gap: 1px">
            <span class="sym">{el.s}</span>
            <span class="name">{el.n}</span>
          </div>
          {#if showMass}
            <span class="am" style="text-align: center">{formatMass(el.m)}</span>
          {/if}
        </div>
      {/each}
      <div class="f-block-label" style="grid-column: 1 / span 3; grid-row: 9">57&ndash;71</div>
      <div class="f-block-label" style="grid-column: 1 / span 3; grid-row: 10">89&ndash;103</div>
    </div>
  </div>

  <div class="legend">
    {#each Object.entries(CATEGORY_LABELS) as [key, label]}
      <div
        class="legend-item"
        onclick={() => (filterCat = filterCat === key ? null : key)}
        style={filterCat === key ? 'background: var(--surface-2); color: var(--ink)' : ''}
        role="button"
        tabindex="0"
      >
        <span class="legend-swatch" style="background: var(--c-{key})"></span>
        {label}
      </div>
    {/each}
    {#if filterCat}
      <button class="btn" style="margin-left: auto" onclick={() => (filterCat = null)}>
        Clear filter
      </button>
    {/if}
  </div>

  {#if tooltip}
    <div class="cell-tooltip" style="left: {tooltip.x}px; top: {tooltip.y}px; transform: translate(-50%, -100%)">
      {tooltip.el.n} &middot; {formatMass(tooltip.el.m)} g/mol
    </div>
  {/if}

  {#if selected}
    <ElementDetail
      el={selected}
      onClose={() => (selected = null)}
      onAdd={() => onElementClick(selected.s)}
    />
  {/if}
</div>
