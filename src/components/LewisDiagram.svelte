<script>
  // Pure-presentation SVG renderer. All chemistry is precomputed in lewis.js;
  // this component only turns the model's atoms/bonds into dots and lines.
  let { model } = $props();

  const AR = 14;        // atom "radius" — bonds stop short of the letters
  const DOT = 2.2;      // electron dot radius
  const LP_GAP = 3.2;   // half-spacing between the two dots of a lone pair
  const LP_DIST = 6;    // distance from atom edge to the lone-pair centre

  function unit(dx, dy) {
    const len = Math.hypot(dx, dy) || 1;
    return [dx / len, dy / len];
  }

  // Bond line segments (1-3 parallel lines depending on order).
  let bondLines = $derived.by(() => {
    const lines = [];
    for (const b of model.bonds) {
      const a = model.atoms[b.a];
      const c = model.atoms[b.b];
      const [dx, dy] = unit(c.x - a.x, c.y - a.y);
      const [px, py] = [-dy, dx]; // perpendicular
      const x1 = a.x + dx * AR, y1 = a.y + dy * AR;
      const x2 = c.x - dx * AR, y2 = c.y - dy * AR;
      const offsets = b.order === 1 ? [0] : b.order === 2 ? [-3, 3] : [-5, 0, 5];
      for (const o of offsets) {
        lines.push({ x1: x1 + px * o, y1: y1 + py * o, x2: x2 + px * o, y2: y2 + py * o });
      }
    }
    return lines;
  });

  // For each atom: directions to its bonded neighbours, plus an "outward" direction.
  function bondDirs(atom) {
    const dirs = [];
    for (const b of model.bonds) {
      let other = null;
      if (b.a === atom.id) other = model.atoms[b.b];
      else if (b.b === atom.id) other = model.atoms[b.a];
      if (other) dirs.push(Math.atan2(other.y - atom.y, other.x - atom.x));
    }
    return dirs;
  }

  function outwardDir(atom, dirs) {
    if (dirs.length === 0) return -Math.PI / 2; // monatomic: dots start at top
    // Average inward direction, then point opposite.
    let sx = 0, sy = 0;
    for (const d of dirs) { sx += Math.cos(d); sy += Math.sin(d); }
    return Math.atan2(-sy, -sx);
  }

  // Lone-pair + unpaired-electron dots, placed on the atom's free sides.
  let dots = $derived.by(() => {
    const out = [];
    const TWO_PI = Math.PI * 2;
    for (const atom of model.atoms) {
      const pairs = atom.lonePairs || 0;
      const single = atom.unpaired || 0;
      if (pairs + single === 0) continue;
      const dirs = bondDirs(atom);
      const outward = outwardDir(atom, dirs);
      // 8 candidate slots; drop any too close to a bond.
      const slots = [];
      for (let i = 0; i < 8; i++) {
        const ang = -Math.PI / 2 + (i * TWO_PI) / 8;
        const tooClose = dirs.some((d) => {
          let diff = Math.abs(((ang - d + Math.PI) % TWO_PI) - Math.PI);
          return diff < (30 * Math.PI) / 180;
        });
        if (!tooClose) slots.push(ang);
      }
      // Prefer slots pointing outward (away from bonds).
      slots.sort((p, q) => {
        const dp = Math.cos(p - outward);
        const dq = Math.cos(q - outward);
        return dq - dp;
      });
      const needed = pairs + single;
      const chosen = slots.slice(0, needed);
      chosen.forEach((ang, idx) => {
        const cx = atom.x + Math.cos(ang) * (AR + LP_DIST);
        const cy = atom.y + Math.sin(ang) * (AR + LP_DIST);
        const [px, py] = [-Math.sin(ang), Math.cos(ang)];
        if (idx < pairs) {
          out.push({ cx: cx + px * LP_GAP, cy: cy + py * LP_GAP });
          out.push({ cx: cx - px * LP_GAP, cy: cy - py * LP_GAP });
        } else {
          out.push({ cx, cy }); // unpaired single electron
        }
      });
    }
    return out;
  });

  // Formal-charge badges, offset further out than the lone pairs.
  let badges = $derived.by(() => {
    const out = [];
    for (const atom of model.atoms) {
      if (!atom.formalCharge) continue;
      const dirs = bondDirs(atom);
      // Place the badge perpendicular-ish to the outward direction so it clears dots.
      const outward = outwardDir(atom, dirs) + Math.PI / 2;
      const cx = atom.x + Math.cos(outward) * (AR + 9);
      const cy = atom.y + Math.sin(outward) * (AR + 9);
      const n = atom.formalCharge;
      const sign = n > 0 ? '+' : '−';
      const text = Math.abs(n) === 1 ? sign : Math.abs(n) + sign;
      out.push({ cx, cy, text });
    }
    return out;
  });
</script>

<div class="lewis-svg-wrap">
  <svg viewBox="-100 -100 200 200" role="img" aria-label="Lewis structure diagram">
    {#each bondLines as l}
      <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
        stroke="var(--ink)" stroke-width="1.6" stroke-linecap="round" />
    {/each}

    {#each dots as d}
      <circle cx={d.cx} cy={d.cy} r={DOT} fill="var(--ink)" />
    {/each}

    {#each model.atoms as atom}
      <text x={atom.x} y={atom.y} text-anchor="middle" dominant-baseline="central"
        font-size="16" font-family="var(--font-serif)" fill="var(--ink)">{atom.symbol}</text>
    {/each}

    {#each badges as b}
      <circle cx={b.cx} cy={b.cy} r="7.5" fill="var(--surface)" stroke="var(--accent)" stroke-width="1" />
      <text x={b.cx} y={b.cy} text-anchor="middle" dominant-baseline="central"
        font-size="9" font-family="var(--font-sans)" fill="var(--accent)">{b.text}</text>
    {/each}
  </svg>
</div>
