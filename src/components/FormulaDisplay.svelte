<script>
  let { formula } = $props();

  let segments = $derived.by(() => {
    const result = [];
    let i = 0;
    while (i < formula.length) {
      const ch = formula[i];
      if (ch === '+') {
        result.push({ type: 'plus' });
        i++;
      } else if (/\d/.test(ch)) {
        let num = '';
        while (i < formula.length && /\d/.test(formula[i])) { num += formula[i]; i++; }
        const prev = result[result.length - 1];
        const isLeading = result.length === 0 || (prev && prev.type === 'plus');
        result.push({ type: isLeading ? 'coeff' : 'sub', value: num });
      } else {
        result.push({ type: 'text', value: ch });
        i++;
      }
    }
    return result;
  });
</script>

{#each segments as seg}
  {#if seg.type === 'plus'}
    <span style="margin: 0 0.35em; color: var(--ink-3)">+</span>
  {:else if seg.type === 'coeff'}
    <span style="margin-right: 1px">{seg.value}</span>
  {:else if seg.type === 'sub'}
    <sub>{seg.value}</sub>
  {:else}
    {seg.value}
  {/if}
{/each}
