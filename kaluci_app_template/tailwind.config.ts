import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        kaluci: {
          black: '#0B0D0E',
          charcoal: '#1C1F22',
          olive: '#3E4B3A',
          sand: '#EDEBE6',
          accent: '#B08C4F',
        }
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
      },
      boxShadow: {
        card: '0 6px 18px rgba(0,0,0,0.06)'
      }
    },
  },
  plugins: [],
}
export default config
