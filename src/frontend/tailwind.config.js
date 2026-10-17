import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    path.join(__dirname, "./index.html"),
    path.join(__dirname, "./**/*.{js,ts,jsx,tsx}"),
  ],
  theme: {
    extend: {
      colors: {
        hextech: {
          obsidian: '#070B13',
          deep: '#091428',
          surface: '#0F172A',
          card: '#0B121E',
          border: '#1E293B',
          gold: '#C89B3C',
          goldLight: '#F0E6D2',
          goldMuted: '#937328',
          blueSide: '#0AC8B9',
          blueGlow: '#005A82',
          redSide: '#E84057',
          redGlow: '#821422',
          cyan: '#06B6D4',
        }
      },
      fontFamily: {
        hextech: ['Cinzel', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'hextech-gold': '0 0 20px rgba(200, 155, 60, 0.25)',
        'hextech-blue': '0 0 20px rgba(10, 200, 185, 0.35)',
        'hextech-red': '0 0 20px rgba(232, 64, 87, 0.35)',
        'saas-cyan': '0 0 25px rgba(6, 182, 212, 0.25)',
      }
    },
  },
  plugins: [],
}
