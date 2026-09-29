/** @typedef {import('./chartPalette').ChartPalette} ChartPalette */

/** @type {ChartPalette} */
export const chartPalette = {
  light: {
    grid: 'rgb(119 117 108)',
    axis: 'rgb(87 86 80)',
    surface: 'rgb(250 248 243)',
    text: 'rgb(23 23 23)',
    border: 'rgb(119 117 108)',
    contentDefect: 'rgb(158 40 31)',
    abilityGap: 'rgb(120 66 0)',
    clean: 'rgb(0 71 65)',
    confirmed: 'rgb(0 71 65)',
    dismissed: 'rgb(120 66 0)',
  },
  dark: {
    grid: 'rgb(119 129 125)',
    axis: 'rgb(193 203 198)',
    surface: 'rgb(30 38 36)',
    text: 'rgb(240 237 228)',
    border: 'rgb(119 129 125)',
    contentDefect: 'rgb(255 137 125)',
    abilityGap: 'rgb(250 204 120)',
    clean: 'rgb(33 241 168)',
    confirmed: 'rgb(33 241 168)',
    dismissed: 'rgb(250 204 120)',
  },
}