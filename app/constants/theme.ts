export const spacing = {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    11: 44,
    12: 48,
    14: 56,
    16: 64,
    18: 72,
    20: 80,
    24: 96,
    30: 120,
} as const;

export const components = {
    tabBar: {
        height: spacing[18],
        horizontalInset: spacing[5],
        radius: spacing[8],
        iconFrame: spacing[12],
        itemPaddingVertical: spacing[2],
    },
} as const;

const tabBar = components.tabBar

/**
 * One accent for the whole app.
 *
 * The tab bar is the largest permanently-coloured surface, so it sets the accent:
 * a primary button must not introduce a second blue or indigo next to it. Risky
 * actions are the only buttons allowed to leave the accent, and they use `danger`.
 */
export const colors = {
  accent: '#2563EB',
  accentPressed: '#1D4ED8',
  danger: '#DC2626',
  dangerPressed: '#B91C1C',
} as const;

export const getTabBarClearance = (insetBottom: number) =>
  tabBar.height + Math.max(insetBottom, tabBar.horizontalInset);