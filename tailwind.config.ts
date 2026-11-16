import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // localHost9 brand palette (terracotta). Every text/background pair used
      // on the site is at least 4.5:1 contrast.
      colors: {
        brand: {
          DEFAULT: '#A8431C', // buttons, accents (6.0:1 with white)
          hover: '#8A3514',
          soft: '#F6E3D8',
        },
        cream: '#FBF6EE',      // page background
        sand: '#F4E6D3',       // soft fills, placeholders
        line: '#EADCC8',       // borders
        ink: '#2B1B12',        // main text (15.4:1 on cream)
        muted: '#6B5646',      // secondary text (6.4:1 on cream)
        gold: '#D9A441',       // footer accent (7.4:1 on footer)
        footer: {
          DEFAULT: '#2B1B12',
          text: '#F3E7D6',
          muted: '#C9B8A6',
        },
      },
    },
  },
  plugins: [],
};

export default config;
