export function formatMass(m) {
  if (Number.isInteger(m) && m > 200) return `[${m}]`;
  return m.toFixed(m < 100 ? 3 : 2).replace(/\.?0+$/, '');
}
