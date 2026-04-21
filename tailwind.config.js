module.exports = {
  darkMode: "class",
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border:      'hsl(var(--border))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        // Starbucks Design System
        'sb-green':   '#006241',  // Starbucks Green — headings, brand signal
        'sb-accent':  '#00754A',  // Green Accent — CTAs, links
        'sb-house':   '#1E3932',  // House Green — dark surfaces, footer
        'sb-uplift':  '#2b5148',  // Green Uplift — dark card surfaces
        'sb-light':   '#d4e9e2',  // Green Light — tints, subtle backgrounds
        'sb-warm':    '#f2f0eb',  // Neutral Warm — page canvas
        'sb-ceramic': '#edebe9',  // Ceramic — zone separators
        'sb-gold':    '#cba258',  // Gold — rewards only
        'sb-red':     '#c82014',  // Red — error / destructive
      },
      letterSpacing: {
        tight: '-0.01em',
      },
    },
  },
  plugins: [],
}
