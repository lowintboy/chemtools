import { parse, molarMass } from './chem.js';
import { ELEMENTS, ELEMENT_BY_SYMBOL } from './data/elements.js';
import {
  GREEK_PREFIXES, ROMAN, POLYATOMIC_IONS, ELEMENT_NAMING,
  METAL_OXIDATION_STATES, NONMETALS, METALLOIDS,
  OXYACID_ROOTS, ACID_TO_ION, COMMON_NAMES,
} from './data/nomenclature-data.js';

// Build lookup indices
const COMMON_BY_KEY = new Map();
const COMMON_BY_NAME = new Map();
for (const entry of COMMON_NAMES) {
  const parsed = parse(entry.formula);
  if (parsed.ok) {
    COMMON_BY_KEY.set(countsKey(parsed.counts), entry);
  }
  COMMON_BY_NAME.set(entry.name.toLowerCase(), entry);
}

const POLYATOMIC_BY_NAME = new Map();
for (const ion of POLYATOMIC_IONS) {
  POLYATOMIC_BY_NAME.set(ion.name, ion);
}

// Canonical counts key for lookup matching
function countsKey(counts) {
  return Object.keys(counts).sort().map(s => s + counts[s]).join('');
}

function isMetal(sym) {
  return !NONMETALS.has(sym) && !METALLOIDS.has(sym) && ELEMENT_BY_SYMBOL[sym] !== undefined;
}

function isNonmetal(sym) {
  return NONMETALS.has(sym) && sym !== 'He' && sym !== 'Ne' && sym !== 'Ar' && sym !== 'Kr' && sym !== 'Xe' && sym !== 'Rn' && sym !== 'Og';
}

function needsRomanNumeral(sym) {
  const states = METAL_OXIDATION_STATES[sym];
  return states && states.length > 1;
}

function elementName(sym) {
  const el = ELEMENT_BY_SYMBOL[sym];
  return el ? el.n.toLowerCase() : sym;
}

function greekPrefix(n, isFirst) {
  if (n <= 0 || n > 10) return '';
  if (n === 1 && isFirst) return '';
  return GREEK_PREFIXES[n];
}

function dropTrailingVowel(prefix) {
  if (prefix.endsWith('a') || prefix.endsWith('o')) {
    return prefix.slice(0, -1);
  }
  return prefix;
}

// Try to detect polyatomic ion in a compound's counts
// Returns { ion, multiplier, remaining } or null
function detectPolyatomicIon(counts) {
  // Sort by number of element types (more specific first)
  const sorted = [...POLYATOMIC_IONS].sort((a, b) =>
    Object.keys(b.counts).length - Object.keys(a.counts).length
  );

  for (const ion of sorted) {
    // Skip cations (ammonium) for anion detection
    if (ion.charge > 0) continue;

    // Check if ion fits into counts
    const ionSyms = Object.keys(ion.counts);
    const remaining = { ...counts };
    let maxMult = Infinity;

    for (const sym of ionSyms) {
      if (!remaining[sym]) { maxMult = 0; break; }
      maxMult = Math.min(maxMult, Math.floor(remaining[sym] / ion.counts[sym]));
    }

    if (maxMult < 1) continue;

    // Try each multiplier from maxMult down to 1
    for (let mult = maxMult; mult >= 1; mult--) {
      const rem = { ...counts };
      let valid = true;
      for (const sym of ionSyms) {
        rem[sym] -= ion.counts[sym] * mult;
        if (rem[sym] < 0) { valid = false; break; }
        if (rem[sym] === 0) delete rem[sym];
      }
      if (!valid) continue;

      // Check if remaining is a valid cation (metals or ammonium)
      const remSyms = Object.keys(rem);
      if (remSyms.length === 0) continue;

      const allMetal = remSyms.every(s => isMetal(s));
      if (allMetal && remSyms.length <= 1) {
        return { ion, multiplier: mult, remaining: rem };
      }

      // Check for ammonium as cation
      const ammonium = POLYATOMIC_IONS.find(i => i.name === 'ammonium');
      if (ammonium && remSyms.length <= 2) {
        let amMult = Infinity;
        const amRem = { ...rem };
        for (const s of Object.keys(ammonium.counts)) {
          if (!amRem[s]) { amMult = 0; break; }
          amMult = Math.min(amMult, Math.floor(amRem[s] / ammonium.counts[s]));
        }
        if (amMult >= 1) {
          for (const s of Object.keys(ammonium.counts)) {
            amRem[s] -= ammonium.counts[s] * amMult;
            if (amRem[s] === 0) delete amRem[s];
          }
          if (Object.keys(amRem).length === 0) {
            return { ion, multiplier: mult, remaining: rem, cationIon: ammonium, cationMult: amMult };
          }
        }
      }
    }
  }
  return null;
}

// Detect ammonium as cation
function detectAmmoniumCation(counts) {
  const ammonium = POLYATOMIC_IONS.find(i => i.name === 'ammonium');
  if (!ammonium) return null;

  const remaining = { ...counts };
  let maxMult = Infinity;
  for (const sym of Object.keys(ammonium.counts)) {
    if (!remaining[sym]) return null;
    maxMult = Math.min(maxMult, Math.floor(remaining[sym] / ammonium.counts[sym]));
  }
  if (maxMult < 1) return null;

  for (let mult = maxMult; mult >= 1; mult--) {
    const rem = { ...counts };
    for (const sym of Object.keys(ammonium.counts)) {
      rem[sym] -= ammonium.counts[sym] * mult;
      if (rem[sym] === 0) delete rem[sym];
    }
    const remSyms = Object.keys(rem);
    // Remaining should be a simple anion (one nonmetal) or polyatomic anion
    if (remSyms.length === 1 && isNonmetal(remSyms[0])) {
      return { cation: ammonium, cationMult: mult, remaining: rem };
    }
  }
  return null;
}

/**
 * Convert a chemical formula to its IUPAC name
 */
export function formulaToName(formula) {
  const parsed = parse(formula);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const counts = parsed.counts;
  const symbols = Object.keys(counts);
  const key = countsKey(counts);

  // Check common names first — if found, use as primary name
  const common = COMMON_BY_KEY.get(key);
  const mm = molarMass(counts);

  if (common) {
    return { ok: true, name: common.name, trivialName: null, compoundType: 'Compound', counts, molarMass: mm.total, formula };
  }

  // Classify the compound
  const metals = symbols.filter(s => isMetal(s));
  const nonmetals = symbols.filter(s => isNonmetal(s));

  let name = null;
  let compoundType = null;
  let trivialName = null;

  // 1. Single element
  if (symbols.length === 1) {
    name = elementName(symbols[0]);
    compoundType = 'Element';
    return { ok: true, name, trivialName, compoundType, counts, molarMass: mm.total, formula };
  }

  // 2. Binary acid: H + one halogen/chalcogen, no oxygen
  if (symbols.length === 2 && counts.H && nonmetals.length === 2) {
    const anion = symbols.find(s => s !== 'H');
    const naming = ELEMENT_NAMING[anion];
    if (naming && naming.acidRoot && !counts.O) {
      name = `hydro${naming.acidRoot}ic acid`;
      compoundType = 'Binary acid';
      return { ok: true, name, trivialName, compoundType, counts, molarMass: mm.total, formula };
    }
  }

  // 3. Oxyacid: H + nonmetal + O
  if (counts.H && counts.O && metals.length === 0) {
    const poly = detectPolyatomicIon(counts);
    if (poly) {
      const remaining = poly.remaining;
      // Check if remaining is just H
      if (Object.keys(remaining).length === 1 && remaining.H) {
        const acidInfo = OXYACID_ROOTS[poly.ion.name];
        if (acidInfo) {
          name = `${acidInfo.root}${acidInfo.suffix} acid`;
          compoundType = 'Oxyacid';
          return { ok: true, name, trivialName, compoundType, counts, molarMass: mm.total, formula };
        }
      }
    }
  }

  // 4. Ionic with polyatomic ion
  const polyResult = detectPolyatomicIon(counts);
  if (polyResult) {
    const { ion, multiplier, remaining, cationIon, cationMult } = polyResult;

    if (cationIon) {
      // Ammonium + polyatomic anion
      name = `${cationIon.name} ${ion.name}`;
      compoundType = 'Ionic compound';
    } else {
      const metalSyms = Object.keys(remaining);
      if (metalSyms.length === 1 && isMetal(metalSyms[0])) {
        const metalSym = metalSyms[0];
        const metalCount = remaining[metalSym];
        const totalNegCharge = ion.charge * multiplier;
        const oxidationState = Math.abs(totalNegCharge) / metalCount;

        let metalName = elementName(metalSym);
        if (needsRomanNumeral(metalSym) && Number.isInteger(oxidationState) && oxidationState > 0) {
          metalName += `(${ROMAN[oxidationState]})`;
        }
        name = `${metalName} ${ion.name}`;
        compoundType = 'Ionic compound';
      }
    }

    if (name) {
      return { ok: true, name, trivialName, compoundType, counts, molarMass: mm.total, formula };
    }
  }

  // Check for ammonium + simple anion
  const amResult = detectAmmoniumCation(counts);
  if (amResult) {
    const anionSym = Object.keys(amResult.remaining)[0];
    const naming = ELEMENT_NAMING[anionSym];
    if (naming) {
      name = `ammonium ${naming.anionName}`;
      compoundType = 'Ionic compound';
      return { ok: true, name, trivialName, compoundType, counts, molarMass: mm.total, formula };
    }
  }

  // 5. Binary ionic: one metal + one nonmetal
  if (symbols.length === 2 && metals.length === 1 && nonmetals.length === 1) {
    const metalSym = metals[0];
    const nonmetalSym = nonmetals[0];
    const naming = ELEMENT_NAMING[nonmetalSym];

    if (naming) {
      let metalName = elementName(metalSym);
      if (needsRomanNumeral(metalSym)) {
        const anionCharge = nonmetalSym === 'O' ? -2 : nonmetalSym === 'N' ? -3 :
          nonmetalSym === 'S' ? -2 : nonmetalSym === 'P' ? -3 : -1;
        const totalNegCharge = anionCharge * counts[nonmetalSym];
        const oxidationState = Math.abs(totalNegCharge) / counts[metalSym];
        if (Number.isInteger(oxidationState) && oxidationState > 0 && oxidationState <= 7) {
          metalName += `(${ROMAN[oxidationState]})`;
        }
      }
      name = `${metalName} ${naming.anionName}`;
      compoundType = 'Binary ionic compound';
      return { ok: true, name, trivialName, compoundType, counts, molarMass: mm.total, formula };
    }
  }

  // 6. Binary molecular: two nonmetals
  if (symbols.length === 2 && metals.length === 0) {
    // Order by electronegativity (less electronegative first)
    const ordered = [...symbols].sort((a, b) => {
      const ea = ELEMENT_NAMING[a]?.eneg ?? 2.0;
      const eb = ELEMENT_NAMING[b]?.eneg ?? 2.0;
      return ea - eb;
    });

    const first = ordered[0];
    const second = ordered[1];
    const naming2 = ELEMENT_NAMING[second];

    if (naming2) {
      let prefix1 = greekPrefix(counts[first], true);
      let prefix2 = greekPrefix(counts[second], false);

      let name1 = elementName(first);
      let name2Root = naming2.anionName.replace(/ide$/, '');

      // Drop trailing vowel before element names starting with vowel
      if (prefix1 && /^[aeiou]/i.test(name1)) {
        prefix1 = dropTrailingVowel(prefix1);
      }
      if (prefix2 && /^[aeiou]/i.test(name2Root + 'ide')) {
        prefix2 = dropTrailingVowel(prefix2);
      }

      name = `${prefix1}${name1} ${prefix2}${naming2.anionName}`;
      compoundType = 'Binary molecular compound';
      return { ok: true, name, trivialName, compoundType, counts, molarMass: mm.total, formula };
    }
  }

  return { ok: false, error: 'Cannot determine systematic name for this compound' };
}

/**
 * Convert an IUPAC name to a chemical formula
 */
export function nameToFormula(input) {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return { ok: false, error: 'Empty name' };

  // 1. Check common names lookup
  const common = COMMON_BY_NAME.get(normalized);
  if (common) {
    const parsed = parse(common.formula);
    const mm = parsed.ok ? molarMass(parsed.counts) : null;
    return {
      ok: true,
      formula: common.formula,
      counts: parsed.ok ? parsed.counts : {},
      name: common.name,
      molarMass: mm ? mm.total : 0,
    };
  }

  // 2. Binary acid: "hydro[root]ic acid"
  const acidMatch = normalized.match(/^hydro(\w+)ic\s+acid$/);
  if (acidMatch) {
    const root = acidMatch[1];
    for (const [sym, data] of Object.entries(ELEMENT_NAMING)) {
      if (data.acidRoot === root || data.acidRoot === 'hydr' + root) {
        const formula = `H${sym}`;
        const parsed = parse(formula);
        if (parsed.ok) {
          const mm = molarMass(parsed.counts);
          return { ok: true, formula, counts: parsed.counts, name: input.trim(), molarMass: mm.total };
        }
      }
    }
  }

  // 3. Oxyacid: "[root]ic acid" or "[root]ous acid"
  const oxyMatch = normalized.match(/^(\w+)(ic|ous)\s+acid$/);
  if (oxyMatch) {
    const acidName = oxyMatch[1] + oxyMatch[2];
    const ionName = ACID_TO_ION[acidName];
    if (ionName) {
      const ion = POLYATOMIC_BY_NAME.get(ionName);
      if (ion) {
        const hCount = Math.abs(ion.charge);
        let formula = hCount === 1 ? 'H' : `H${hCount}`;
        formula += ion.formula;
        const parsed = parse(formula);
        if (parsed.ok) {
          const mm = molarMass(parsed.counts);
          return { ok: true, formula, counts: parsed.counts, name: input.trim(), molarMass: mm.total };
        }
      }
    }
  }

  // 4. "[metal/element](Roman) [polyatomic ion name]"
  const ionicPolyMatch = normalized.match(/^(\w+?)(?:\(([ivx]+)\))?\s+(\w[\w\s]*)$/);
  if (ionicPolyMatch) {
    const cationName = ionicPolyMatch[1];
    const romanStr = ionicPolyMatch[2];
    const anionName = ionicPolyMatch[3].trim();

    // Find cation element
    let cationSym = null;
    for (const el of ELEMENTS) {
      if (el.n.toLowerCase() === cationName) {
        cationSym = el.s;
        break;
      }
    }

    // Check if anion is a polyatomic ion
    const anionIon = POLYATOMIC_BY_NAME.get(anionName);

    // Check if anion is a simple -ide
    let anionSym = null;
    let anionCharge = 0;
    if (!anionIon) {
      for (const [sym, data] of Object.entries(ELEMENT_NAMING)) {
        if (data.anionName === anionName) {
          anionSym = sym;
          anionCharge = sym === 'O' || sym === 'S' || sym === 'Se' || sym === 'Te' ? -2 :
            sym === 'N' || sym === 'P' || sym === 'As' ? -3 : -1;
          break;
        }
      }
    }

    if (cationSym && (anionIon || anionSym)) {
      let cationCharge;
      if (romanStr) {
        cationCharge = romanStr === 'i' ? 1 : romanStr === 'ii' ? 2 : romanStr === 'iii' ? 3 :
          romanStr === 'iv' ? 4 : romanStr === 'v' ? 5 : romanStr === 'vi' ? 6 : romanStr === 'vii' ? 7 : 0;
      } else {
        const states = METAL_OXIDATION_STATES[cationSym];
        cationCharge = states ? states[states.length === 1 ? 0 : 0] : 1;
        if (states && states.length === 1) cationCharge = states[0];
        else if (!states) cationCharge = 1;
        else cationCharge = states[0]; // default to first
      }

      if (anionIon) {
        // Balance charges: cationCharge * cationCount = |anionCharge| * anionCount
        const totalPos = cationCharge;
        const totalNeg = Math.abs(anionIon.charge);
        const lcm = (totalPos * totalNeg) / gcd(totalPos, totalNeg);
        const cationCount = lcm / cationCharge;
        const anionCount = lcm / Math.abs(anionIon.charge);

        let formula = cationSym;
        if (cationCount > 1) formula += cationCount;
        if (anionCount > 1) {
          formula += `(${anionIon.formula})${anionCount}`;
        } else {
          formula += anionIon.formula;
        }

        const parsed = parse(formula);
        if (parsed.ok) {
          const mm = molarMass(parsed.counts);
          return { ok: true, formula, counts: parsed.counts, name: input.trim(), molarMass: mm.total };
        }
      } else if (anionSym) {
        const totalPos = cationCharge;
        const totalNeg = Math.abs(anionCharge);
        const lcm = (totalPos * totalNeg) / gcd(totalPos, totalNeg);
        const cationCount = lcm / cationCharge;
        const anionCountVal = lcm / Math.abs(anionCharge);

        let formula = cationSym;
        if (cationCount > 1) formula += cationCount;
        formula += anionSym;
        if (anionCountVal > 1) formula += anionCountVal;

        const parsed = parse(formula);
        if (parsed.ok) {
          const mm = molarMass(parsed.counts);
          return { ok: true, formula, counts: parsed.counts, name: input.trim(), molarMass: mm.total };
        }
      }
    }

    // Check for ammonium cation
    if (cationName === 'ammonium' && (anionIon || anionSym)) {
      const ammonium = POLYATOMIC_BY_NAME.get('ammonium');
      if (ammonium && anionIon) {
        const totalPos = ammonium.charge;
        const totalNeg = Math.abs(anionIon.charge);
        const lcm = (totalPos * totalNeg) / gcd(totalPos, totalNeg);
        const cationCount = lcm / ammonium.charge;
        const anionCount = lcm / Math.abs(anionIon.charge);

        let formula = cationCount > 1 ? `(NH4)${cationCount}` : 'NH4';
        if (anionCount > 1) {
          formula += `(${anionIon.formula})${anionCount}`;
        } else {
          formula += anionIon.formula;
        }
        const parsed = parse(formula);
        if (parsed.ok) {
          const mm = molarMass(parsed.counts);
          return { ok: true, formula, counts: parsed.counts, name: input.trim(), molarMass: mm.total };
        }
      } else if (ammonium && anionSym) {
        const totalNeg = Math.abs(anionCharge);
        const cationCount = totalNeg;
        let formula = cationCount > 1 ? `(NH4)${cationCount}` : 'NH4';
        formula += anionSym;
        const parsed = parse(formula);
        if (parsed.ok) {
          const mm = molarMass(parsed.counts);
          return { ok: true, formula, counts: parsed.counts, name: input.trim(), molarMass: mm.total };
        }
      }
    }
  }

  // 5. Binary molecular: "[prefix][element] [prefix][element]ide"
  const molMatch = normalized.match(/^(mono|di|tri|tetra|penta|hexa|hepta|octa|nona|deca)?(\w+)\s+(mono|di|tri|tetra|penta|hexa|hepta|octa|nona|deca)?(\w+)ide$/);
  if (molMatch) {
    const prefix1 = molMatch[1] || '';
    const name1 = molMatch[2];
    const prefix2 = molMatch[3] || 'mono';
    const name2root = molMatch[4];

    const count1 = Math.max(1, GREEK_PREFIXES.indexOf(prefix1 || 'mono'));
    const count2 = Math.max(1, GREEK_PREFIXES.indexOf(prefix2));

    // Find elements by name
    let sym1 = null, sym2 = null;
    for (const el of ELEMENTS) {
      const eln = el.n.toLowerCase();
      if (eln === name1 || eln.startsWith(name1)) sym1 = sym1 || el.s;
    }
    // Find by anion root
    for (const [sym, data] of Object.entries(ELEMENT_NAMING)) {
      const root = data.anionName.replace(/ide$/, '');
      if (name2root === root || name2root + 'ide' === data.anionName.replace(/^.*/, name2root + 'ide')) {
        if (data.anionName === name2root + 'ide') {
          sym2 = sym;
          break;
        }
      }
    }

    if (sym1 && sym2) {
      let formula = sym1;
      if (count1 > 1) formula += count1;
      formula += sym2;
      if (count2 > 1) formula += count2;

      const parsed = parse(formula);
      if (parsed.ok) {
        const mm = molarMass(parsed.counts);
        return { ok: true, formula, counts: parsed.counts, name: input.trim(), molarMass: mm.total };
      }
    }
  }

  return { ok: false, error: 'Could not recognize this compound name' };
}

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

/**
 * Detect whether input is a formula or a name
 */
export function detectInputType(input) {
  const trimmed = input.trim();
  if (!trimmed) return 'unknown';
  if (/^[A-Z][A-Za-z0-9()\[\].+\u00B7\u2022\u2219]*$/.test(trimmed)) return 'formula';
  return 'name';
}
