// Lewis structure builder — pure chemistry/model, no Svelte/DOM.
// Scope: single-central-atom molecules (AXn) + diatomics, plus polyatomic ions
// entered with a charge suffix (NO3-, SO4^2-, NH4+). Ionic salts and
// multi-central-atom chains are reported as `unsupported` with a friendly message.
//
// Consumed by LewisStructure.svelte / LewisDiagram.svelte. All chemistry lives
// here, mirroring the nomenclature.js <-> Nomenclature.svelte split.

import { parse } from './chem.js';
import { ELEMENT_BY_SYMBOL } from './data/elements.js';
import { ELEMENT_NAMING } from './data/nomenclature-data.js';

// Layout radius (abstract units; the SVG scales these). Central atom sits at (0,0).
const R = 60;

// Metal categories that indicate an ionic compound rather than a covalent molecule.
const IONIC_METALS = new Set(['alkali', 'alkaline', 'transition', 'lanthanide', 'actinide']);

// Central atoms that stay electron-deficient (don't force an octet).
const ELECTRON_DEFICIENT = new Set(['B', 'Be', 'Al']);

// Electronegativity fallbacks for elements not covered by ELEMENT_NAMING.eneg.
const EXTRA_ENEG = {
  Xe: 2.6, Kr: 3.0, Be: 1.57, Al: 1.61, Ga: 1.81, In: 1.78,
  Ge: 2.01, Sn: 1.96, Pb: 1.87, Sb: 2.05, Bi: 2.02, At: 2.2, Po: 2.0,
  Li: 0.98, Na: 0.93, K: 0.82, Rb: 0.82, Cs: 0.79,
  Mg: 1.31, Ca: 1.0, Sr: 0.95, Ba: 0.89,
};

// Polyvalent elements (groups 13-15) — more than one beyond the central implies a chain.
const POLYVALENT_GROUPS = new Set([13, 14, 15]);

// Main-group "valence" group number: 1,2 stay; 13-18 -> 3-8.
function groupMain(el) {
  return el.g <= 2 ? el.g : el.g - 10;
}

// Number of valence electrons for a main-group element.
export function valenceElectrons(symbol) {
  const el = ELEMENT_BY_SYMBOL[symbol];
  if (!el) return 0;
  if (symbol === 'He') return 2;
  return groupMain(el);
}

function electronegativity(symbol) {
  if (ELEMENT_NAMING[symbol]) return ELEMENT_NAMING[symbol].eneg;
  if (EXTRA_ENEG[symbol] != null) return EXTRA_ENEG[symbol];
  const el = ELEMENT_BY_SYMBOL[symbol];
  if (!el) return 2.0;
  // Last-resort monotone proxy: eneg rises with group, falls down a period.
  return 1.0 + 0.35 * groupMain(el) - 0.2 * el.p;
}

function isIonicMetal(symbol) {
  const el = ELEMENT_BY_SYMBOL[symbol];
  return !!el && IONIC_METALS.has(el.c);
}

// Strip a trailing charge suffix (X-, X2-, X^2-, X+ ...) before handing the bare
// formula to chem.js parse(), which doesn't understand charge notation.
export function parseCharge(input) {
  const norm = input.trim().replace(/−/g, '-').replace(/\s+/g, '');
  // Caret form carries the magnitude: SO4^2-, Ca^2+, NO3^-.
  let m = norm.match(/\^(\d*)([+-])$/);
  if (m) {
    const sign = m[2] === '-' ? -1 : 1;
    const mag = m[1] ? parseInt(m[1], 10) : 1;
    return { body: norm.slice(0, m.index), charge: sign * mag };
  }
  // Bare trailing sign is ±1; any preceding digit is a formula subscript (NO3-, NH4+).
  m = norm.match(/([+-])$/);
  if (m) return { body: norm.slice(0, m.index), charge: m[1] === '-' ? -1 : 1 };
  return { body: norm, charge: 0 };
}

// Pick the central atom: never H, prefer the element appearing exactly once,
// break ties by lowest electronegativity. Returns a symbol or null.
export function pickCentral(counts) {
  const syms = Object.keys(counts).filter((s) => s !== 'H');
  if (syms.length === 0) return null;
  const once = syms.filter((s) => counts[s] === 1);
  const pool = once.length ? once : syms;
  return pool.reduce((a, b) => (electronegativity(b) < electronegativity(a) ? b : a));
}

function chargeLabel(charge) {
  if (charge === 0) return '';
  const mag = Math.abs(charge) === 1 ? '' : String(Math.abs(charge));
  return mag + (charge < 0 ? '−' : '+');
}

function combinations(n, k) {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return Math.round(r);
}

// (bondingDomains, lonePairs) -> VSEPR geometry names + idealized bond angle.
const VSEPR = {
  '2,0': { e: 'linear', m: 'linear', angle: '180°' },
  '3,0': { e: 'trigonal planar', m: 'trigonal planar', angle: '120°' },
  '2,1': { e: 'trigonal planar', m: 'bent', angle: '~118°' },
  '4,0': { e: 'tetrahedral', m: 'tetrahedral', angle: '109.5°' },
  '3,1': { e: 'tetrahedral', m: 'trigonal pyramidal', angle: '~107°' },
  '2,2': { e: 'tetrahedral', m: 'bent', angle: '~104.5°' },
  '5,0': { e: 'trigonal bipyramidal', m: 'trigonal bipyramidal', angle: '90°/120°' },
  '4,1': { e: 'trigonal bipyramidal', m: 'seesaw', angle: null },
  '3,2': { e: 'trigonal bipyramidal', m: 'T-shaped', angle: null },
  '2,3': { e: 'trigonal bipyramidal', m: 'linear', angle: '180°' },
  '6,0': { e: 'octahedral', m: 'octahedral', angle: '90°' },
  '5,1': { e: 'octahedral', m: 'square pyramidal', angle: null },
  '4,2': { e: 'octahedral', m: 'square planar', angle: '90°' },
};

function fail(error, unsupported = false) {
  return { ok: false, error, unsupported };
}

export function buildLewis(input) {
  if (!input || !input.trim()) return fail('Enter a formula');

  const { body, charge } = parseCharge(input);
  if (!body) return fail('Enter a formula before the charge');

  const parsed = parse(body);
  if (!parsed.ok) return fail(parsed.error, false);

  const counts = parsed.counts;
  const symbols = Object.keys(counts);
  const totalAtoms = symbols.reduce((n, s) => n + counts[s], 0);

  // Total valence electrons (subtract net charge: +1 removes one e-, -1 adds one).
  let totalElectrons = 0;
  for (const s of symbols) totalElectrons += valenceElectrons(s) * counts[s];
  totalElectrons -= charge;

  const meta = { formula: body, charge, chargeLabel: chargeLabel(charge), totalElectrons };

  if (totalAtoms === 1) return buildMonatomic(symbols[0], totalElectrons, charge, meta);
  if (totalAtoms === 2) return buildDiatomic(counts, totalElectrons, meta);
  return buildCentral(counts, totalElectrons, charge, meta);
}

// --- monatomic (single atom / monatomic ion) ---
function buildMonatomic(symbol, totalElectrons, charge, meta) {
  const lonePairs = Math.floor(totalElectrons / 2);
  const unpaired = totalElectrons % 2;
  const atom = {
    id: 0, symbol, role: 'lone', x: 0, y: 0, angle: 0,
    lonePairs, unpaired, formalCharge: charge,
  };
  return {
    ok: true, error: null, unsupported: false,
    ...meta,
    bondingPairs: 0, lonePairs,
    geometry: null,
    resonance: { has: false, count: 1, note: null },
    layoutKind: 'monatomic',
    atoms: [atom],
    bonds: [],
    radical: unpaired === 1,
  };
}

// --- diatomic (A-B) ---
function buildDiatomic(counts, totalElectrons, meta) {
  const syms = [];
  for (const s of Object.keys(counts)) for (let i = 0; i < counts[s]; i++) syms.push(s);

  if (syms.some(isIonicMetal)) {
    return fail(
      'This looks like an ionic compound (a salt). Lewis structures here cover covalent molecules and polyatomic ions — try the ion alone, e.g. NO3-.',
      true,
    );
  }

  // Order so the more electronegative atom fills its octet first.
  const ordered = [...syms].sort((a, b) => electronegativity(b) - electronegativity(a));
  const atoms = ordered.map((symbol, id) => ({
    id, symbol, role: id === 0 ? 'central' : 'terminal',
    lonePairs: 0, unpaired: 0, formalCharge: 0,
    x: id === 0 ? -R / 2 : R / 2, y: 0, angle: id === 0 ? Math.PI : 0,
  }));
  const bond = { a: 0, b: 1, order: 1 };

  let remaining = totalElectrons - 2;
  for (const at of atoms) {
    const need = at.symbol === 'H' ? 0 : Math.max(0, 6);
    const give = Math.min(need, remaining);
    at.lonePairs = give / 2;
    remaining -= give;
  }
  // Any leftover electrons pile onto the first atom.
  atoms[0].lonePairs += Math.floor(remaining / 2);
  const radical = remaining % 2 === 1;
  if (radical) atoms[0].unpaired = 1;

  const target = (at) => (at.symbol === 'H' ? 2 : 8);
  const ecount = (at) => 2 * bond.order + 2 * at.lonePairs + at.unpaired;
  while (bond.order < 3 && atoms.some((at) => ecount(at) < target(at))) {
    const donor = atoms.find((at) => at.lonePairs > 0 && ecount(at) >= target(at)) ||
      atoms.find((at) => at.lonePairs > 0);
    if (!donor) break;
    donor.lonePairs -= 1;
    bond.order += 1;
  }

  for (const at of atoms) {
    at.formalCharge = valenceElectrons(at.symbol) - 2 * at.lonePairs - at.unpaired - bond.order;
  }

  return {
    ok: true, error: null, unsupported: false,
    ...meta,
    bondingPairs: bond.order,
    lonePairs: atoms.reduce((n, a) => n + a.lonePairs, 0),
    geometry: {
      steric: 1, bondingDomains: 1, centralLonePairs: atoms[0].lonePairs,
      axe: 'AX', electronGeometry: 'linear', molecularGeometry: 'linear', bondAngle: '180°',
    },
    resonance: { has: false, count: 1, note: null },
    layoutKind: 'diatomic',
    atoms,
    bonds: [bond],
    radical,
  };
}

// --- single central atom (AXn) ---
function buildCentral(counts, totalElectrons, charge, meta) {
  const centralSym = pickCentral(counts);
  if (!centralSym) return fail("Couldn't identify a central atom for this formula.", true);

  if (isIonicMetal(centralSym)) {
    return fail(
      'This looks like an ionic compound (a salt). Lewis structures here cover covalent molecules and polyatomic ions — try the ion alone, e.g. NO3-.',
      true,
    );
  }

  // Chain / multi-center detection.
  if (counts[centralSym] >= 2) {
    return fail(
      'This molecule has more than one central atom (a chain or ring), like C2H6 or ethanol. This tool draws single-central-atom molecules and diatomics.',
      true,
    );
  }
  for (const s of Object.keys(counts)) {
    if (s === centralSym) continue;
    const el = ELEMENT_BY_SYMBOL[s];
    if (el && POLYVALENT_GROUPS.has(el.g) && counts[s] >= 2) {
      return fail(
        'This molecule has more than one central atom (a chain or ring). This tool draws single-central-atom molecules and diatomics.',
        true,
      );
    }
  }

  // Build atom list: central first, then terminals.
  const central = {
    id: 0, symbol: centralSym, role: 'central', x: 0, y: 0, angle: 0,
    lonePairs: 0, unpaired: 0, formalCharge: 0,
  };
  const terminals = [];
  for (const s of Object.keys(counts)) {
    const n = s === centralSym ? counts[s] - 1 : counts[s];
    for (let i = 0; i < n; i++) {
      terminals.push({ symbol: s, lonePairs: 0, unpaired: 0, formalCharge: 0 });
    }
  }
  const nT = terminals.length;
  terminals.forEach((t, i) => {
    t.id = i + 1;
    t.role = 'terminal';
    t.angle = -Math.PI / 2 + (i * 2 * Math.PI) / nT;
    t.x = R * Math.cos(t.angle);
    t.y = R * Math.sin(t.angle);
  });
  const atoms = [central, ...terminals];
  const bonds = terminals.map((t) => ({ a: 0, b: t.id, order: 1 }));

  // Distribute lone pairs: complete terminal octets first, leftovers to central.
  let remaining = totalElectrons - 2 * nT;
  for (const t of terminals) {
    const need = t.symbol === 'H' ? 0 : 6;
    const give = Math.max(0, Math.min(need, remaining));
    t.lonePairs = give / 2;
    remaining -= give;
  }
  central.lonePairs = Math.max(0, Math.floor(remaining / 2));
  remaining -= central.lonePairs * 2;
  if (remaining === 1) central.unpaired = 1;

  const bondSum = (id) => bonds.filter((b) => b.a === id || b.b === id)
    .reduce((n, b) => n + b.order, 0);
  const centralElectrons = () => 2 * bondSum(0) + 2 * central.lonePairs + central.unpaired;
  const centralFC = () => valenceElectrons(centralSym) - 2 * central.lonePairs - central.unpaired - bondSum(0);

  const el = ELEMENT_BY_SYMBOL[centralSym];
  const canExpand = el.p >= 3 && el.g >= 13;
  const deficient = ELECTRON_DEFICIENT.has(centralSym);

  // Promote a terminal lone pair into the central bond (forms a multiple bond).
  // Pick the eligible bond with the lowest current order so multiple bonds spread
  // across equivalent terminals (O=C=O, not O≡C–O).
  function promote() {
    let best = null;
    for (const b of bonds) {
      if (b.order >= 3) continue;
      const t = atoms[b.b];
      if (t.symbol === 'H' || t.lonePairs <= 0) continue;
      if (!best || b.order < best.order) best = b;
    }
    if (!best) return false;
    atoms[best.b].lonePairs -= 1;
    best.order += 1;
    return true;
  }

  // 1) Complete the central octet if it's short (unless electron-deficient).
  if (!deficient) {
    while (centralElectrons() < 8 && promote()) { /* keep going */ }
  }
  // 2) Expanded-octet centrals: add bonds to minimize a positive central formal charge.
  if (canExpand) {
    while (centralFC() > 0 && promote()) { /* keep going */ }
  }

  // Final formal charges.
  for (const at of atoms) {
    at.formalCharge = valenceElectrons(at.symbol) - 2 * at.lonePairs - at.unpaired - bondSum(at.id);
  }

  // Resonance: a multiple bond that could sit on any of several equivalent terminals.
  let resonance = { has: false, count: 1, note: null };
  const multi = bonds.filter((b) => b.order >= 2);
  if (multi.length) {
    const dblSym = atoms[multi[0].b].symbol;
    const equivalent = terminals.filter((t) => t.symbol === dblSym);
    if (equivalent.length > multi.length) {
      const count = combinations(equivalent.length, multi.length);
      resonance = {
        has: true, count,
        note: `${count} equivalent resonance structures exist; one is shown.`,
      };
    }
  }

  const bondingDomains = nT;
  const centralLonePairs = central.lonePairs;
  const key = `${bondingDomains},${centralLonePairs}`;
  const v = VSEPR[key];
  const eCount = bondingDomains + centralLonePairs;
  const geometry = {
    steric: eCount,
    bondingDomains,
    centralLonePairs,
    axe: `AX${bondingDomains}${centralLonePairs ? 'E' + (centralLonePairs > 1 ? centralLonePairs : '') : ''}`,
    electronGeometry: v ? v.e : '—',
    molecularGeometry: v ? v.m : '—',
    bondAngle: v ? v.angle : null,
  };

  return {
    ok: true, error: null, unsupported: false,
    ...meta,
    bondingPairs: bonds.reduce((n, b) => n + b.order, 0),
    lonePairs: atoms.reduce((n, a) => n + a.lonePairs, 0),
    geometry,
    resonance,
    layoutKind: 'central',
    atoms,
    bonds,
    radical: central.unpaired === 1,
  };
}
