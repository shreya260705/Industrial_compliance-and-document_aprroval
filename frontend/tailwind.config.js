/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          'deep-sage': '#344B3F',  // Primary Brand Anchor
          'sage': '#87A96B',       // Secondary Brand Accent
          'walnut': '#5A3E2B',     // Industrial Warmth / Headers
          'amber': '#D5851F',      // Highlight / Warning Accent
          'cream': '#F5F1E8',      // Background Canvas
          'charcoal': '#303A34',   // Typography Primary / Headings
          'pale-sage': '#E7EDE2',  // Card Accent Surfaces
          'white': '#FFFFFF',      // Pure White Cards & Sheets
        },
        status: {
          success: '#4A7C59',
          warning: '#D5851F',
          danger: '#A83232',
          info: '#344B3F',
          draft: '#6B7280',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}
