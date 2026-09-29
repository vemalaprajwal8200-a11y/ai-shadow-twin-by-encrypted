/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        text: 'rgb(var(--text) / <alpha-value>)',
        heading: 'rgb(var(--heading) / <alpha-value>)',
        muted: 'rgb(var(--muted) / calc(var(--muted-opacity) * <alpha-value>))',
        border: 'rgb(var(--border) / calc(var(--border-opacity) * <alpha-value>))',
        track: 'rgb(var(--track) / var(--track-opacity))',
        primary: 'rgb(var(--primary) / <alpha-value>)',
        'primary-fg': 'rgb(var(--primary-fg) / <alpha-value>)',
        'primary-hover': 'rgb(var(--primary-hover) / <alpha-value>)',
        'primary-hover-fg': 'rgb(var(--primary-hover-fg) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-fg': 'rgb(var(--accent-fg) / <alpha-value>)',
        sidebar: 'rgb(var(--sidebar) / <alpha-value>)',
        'sidebar-fg': 'rgb(var(--sidebar-fg) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        warn: 'rgb(var(--warn) / <alpha-value>)',
      },
      boxShadow: {
        soft: '0 10px 30px rgb(var(--shadow) / 0.08)',
      },
    },
  },
  plugins: [],
}
