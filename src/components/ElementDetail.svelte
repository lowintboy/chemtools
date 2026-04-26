<script>
  import { CATEGORY_LABELS } from '$lib/data/elements.js';
  import { formatMass } from '$lib/utils.js';

  let { el, onClose, onAdd } = $props();
</script>

<div class="detail">
  <button class="detail-close" onclick={onClose} aria-label="Close">&times;</button>
  <div class="detail-head">
    <div class="detail-symbol" style="background: var(--c-{el.c})">
      {el.s}
    </div>
    <div>
      <h3 class="detail-name">{el.n}</h3>
      <div class="detail-cat">{CATEGORY_LABELS[el.c]}</div>
    </div>
  </div>
  <dl class="detail-grid">
    <div>
      <dt>Atomic &#8470;</dt>
      <dd>{el.z}</dd>
    </div>
    <div>
      <dt>Atomic mass</dt>
      <dd>{formatMass(el.m)}</dd>
    </div>
    <div>
      <dt>Period</dt>
      <dd>{el.p > 8 ? (el.c === 'lanthanide' ? 6 : 7) : el.p}</dd>
    </div>
    <div>
      <dt>Group</dt>
      <dd>{el.p > 8 ? '\u2014' : el.g}</dd>
    </div>
    <div class="full">
      <dt>Electron configuration</dt>
      <dd class="ec">{el.ec}</dd>
    </div>
  </dl>
  <div class="detail-actions">
    <button class="btn primary" onclick={onAdd}>Add to formula</button>
    <button class="btn" onclick={onClose}>Close</button>
  </div>
</div>
