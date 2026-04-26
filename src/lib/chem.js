import { ELEMENT_BY_SYMBOL } from './data/elements.js';

function parseGroup(s, i) {
  const counts = {};
  while (i < s.length) {
    const ch = s[i];
    if (ch === "(" || ch === "[") {
      const close = ch === "(" ? ")" : "]";
      const inner = parseGroup(s, i + 1);
      if (!inner.ok) return inner;
      if (s[inner.next] !== close) {
        return { ok: false, error: `Missing '${close}'`, counts: {} };
      }
      let j = inner.next + 1;
      const numMatch = s.slice(j).match(/^\d+/);
      const mult = numMatch ? parseInt(numMatch[0], 10) : 1;
      if (numMatch) j += numMatch[0].length;
      for (const sym in inner.counts) {
        counts[sym] = (counts[sym] || 0) + inner.counts[sym] * mult;
      }
      i = j;
    } else if (ch === ")" || ch === "]") {
      return { ok: true, counts, next: i };
    } else if (/[A-Z]/.test(ch)) {
      let sym = ch;
      let j = i + 1;
      if (j < s.length && /[a-z]/.test(s[j])) {
        sym += s[j];
        j++;
      }
      const numMatch = s.slice(j).match(/^\d+/);
      const mult = numMatch ? parseInt(numMatch[0], 10) : 1;
      if (numMatch) j += numMatch[0].length;
      counts[sym] = (counts[sym] || 0) + mult;
      i = j;
    } else if (/[a-z]/.test(ch)) {
      return { ok: false, error: `Element symbols start with a capital letter (got '${ch}')`, counts: {} };
    } else if (/\d/.test(ch)) {
      return { ok: false, error: `Unexpected number at position ${i + 1}`, counts: {} };
    } else {
      return { ok: false, error: `Unexpected '${ch}'`, counts: {} };
    }
  }
  return { ok: true, counts, next: i };
}

export function parse(input) {
  if (!input || !input.trim()) return { ok: false, error: "Empty formula", counts: {} };
  const cleaned = input
    .replace(/[\u00B7\u2022\u2219]/g, ".")
    .replace(/\s+/g, "");
  if (!/^[A-Za-z0-9()\[\]\.\+]+$/.test(cleaned)) {
    return { ok: false, error: "Unexpected character \u2014 use letters, digits, ( ) [ ] \u00B7 + only", counts: {} };
  }

  const compounds = cleaned.split("+");
  const total = {};
  for (const compound of compounds) {
    if (!compound) return { ok: false, error: "Stray '+'", counts: {} };
    const lead = compound.match(/^(\d+)(.*)$/);
    let coeff = 1;
    let body = compound;
    if (lead) {
      coeff = parseInt(lead[1], 10);
      body = lead[2];
      if (!body) return { ok: false, error: "Number without a formula", counts: {} };
    }
    const parts = body.split(".");
    for (const part of parts) {
      if (!part) return { ok: false, error: "Stray dot", counts: {} };
      const innerLead = part.match(/^(\d+)(.*)$/);
      let multiplier = 1;
      let pbody = part;
      if (innerLead) {
        multiplier = parseInt(innerLead[1], 10);
        pbody = innerLead[2];
      }
      const r = parseGroup(pbody, 0);
      if (!r.ok) return r;
      if (r.next !== pbody.length) {
        return { ok: false, error: `Unexpected character at position ${r.next + 1}`, counts: {} };
      }
      for (const sym in r.counts) {
        total[sym] = (total[sym] || 0) + r.counts[sym] * multiplier * coeff;
      }
    }
  }
  for (const sym in total) {
    if (!ELEMENT_BY_SYMBOL[sym]) {
      return { ok: false, error: `Unknown element: ${sym}`, counts: {} };
    }
  }
  return { ok: true, counts: total };
}

export function molarMass(counts) {
  let total = 0;
  const breakdown = [];
  for (const sym in counts) {
    const el = ELEMENT_BY_SYMBOL[sym];
    if (!el) continue;
    const n = counts[sym];
    const contrib = el.m * n;
    total += contrib;
    breakdown.push({ symbol: sym, name: el.n, atomicMass: el.m, count: n, mass: contrib });
  }
  breakdown.sort((a, b) => b.mass - a.mass);
  breakdown.forEach(b => (b.percent = (b.mass / total) * 100));
  return { total, breakdown };
}
