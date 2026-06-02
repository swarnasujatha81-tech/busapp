export const colors = {
  bg: '#07111f',
  panel: '#0f1d31',
  panel2: '#16263d',
  border: '#27405f',
  text: '#f8fafc',
  muted: '#94a3b8',
  blue: '#2563eb',
  cyan: '#06b6d4',
  green: '#22c55e',
  yellow: '#eab308',
  orange: '#f97316',
  red: '#ef4444',
  purple: '#7c3aed'
};

export const crowdMeta = {
  empty: { label: 'Empty', color: colors.green },
  available: { label: 'Available', color: colors.yellow },
  standing: { label: 'Standing', color: colors.orange },
  overcrowded: { label: 'Overcrowded', color: colors.red }
} as const;

export function crowdFromCount(count: number, maxCapacity = 50) {
  const ratio = count / maxCapacity;
  if (ratio < 0.3) return 'empty';
  if (ratio < 0.6) return 'available';
  if (ratio < 0.85) return 'standing';
  return 'overcrowded';
}
