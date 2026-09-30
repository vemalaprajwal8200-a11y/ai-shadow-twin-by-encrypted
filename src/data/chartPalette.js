/** @typedef {import('./chartPalette').ChartPalette} ChartPalette */

/** @type {ChartPalette} */
export const chartPalette = {
  light: {
    grid: 'rgb(var(--rgb-accent) / 0.45)',
    axis: 'rgb(var(--muted))',
    surface: 'rgb(var(--surface))',
    text: 'rgb(var(--text))',
    border: 'rgb(var(--border))',
    contentDefect: 'rgb(var(--danger))',
    abilityGap: 'rgb(var(--ability-gap))',
    clean: 'rgb(var(--rgb-success))',
    confirmed: 'rgb(var(--color-primary))',
    dismissed: 'rgb(var(--rgb-accent))',
  },
  dark: {
    grid: 'rgb(var(--rgb-accent) / 0.45)',
    axis: 'rgb(var(--muted))',
    surface: 'rgb(var(--surface))',
    text: 'rgb(var(--text))',
    border: 'rgb(var(--border))',
    contentDefect: 'rgb(var(--danger))',
    abilityGap: 'rgb(var(--ability-gap))',
    clean: 'rgb(var(--rgb-success))',
    confirmed: 'rgb(var(--color-primary-light))',
    dismissed: 'rgb(var(--rgb-accent))',
  },
}