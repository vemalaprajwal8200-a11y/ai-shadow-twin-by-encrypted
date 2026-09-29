/** @typedef {import('./chartPalette').ChartPalette} ChartPalette */

/** @type {ChartPalette} */
export const chartPalette = {
  light: {
    grid: 'rgba(37, 61, 44, 0.1)',
    axis: 'rgba(37, 61, 44, 0.72)',
    surface: 'rgb(255 255 255)',
    text: 'rgb(37 61 44)',
    border: 'rgba(37, 61, 44, 0.14)',
    contentDefect: 'rgb(158 40 31)',
    abilityGap: 'rgb(120 66 0)',
    clean: 'rgb(46 111 64)',
    confirmed: 'rgb(46 111 64)',
    dismissed: 'rgb(120 66 0)',
  },
  dark: {
    grid: 'rgba(207, 255, 220, 0.1)',
    axis: 'rgba(207, 255, 220, 0.72)',
    surface: 'rgb(37 61 44)',
    text: 'rgb(207 255 220)',
    border: 'rgba(207, 255, 220, 0.12)',
    contentDefect: 'rgb(255 137 125)',
    abilityGap: 'rgb(250 204 120)',
    clean: 'rgb(104 186 127)',
    confirmed: 'rgb(104 186 127)',
    dismissed: 'rgb(250 204 120)',
  },
}