export interface ChartPaletteSet {
  grid: string
  axis: string
  surface: string
  text: string
  border: string
  contentDefect: string
  abilityGap: string
  clean: string
  confirmed: string
  dismissed: string
}

export interface ChartPalette {
  light: ChartPaletteSet
  dark: ChartPaletteSet
}

export const chartPalette: ChartPalette