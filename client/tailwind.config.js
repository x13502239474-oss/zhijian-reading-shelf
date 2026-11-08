/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#2b2620',
        'ink-soft': '#6d6356',
        'ink-faint': '#9a9082',
        paper: '#f5f0e6',
        'paper-light': '#fbf8f1',
        line: '#dfd6c5',
        wood: '#2a1d15',
        'wood-deep': '#20160f',
        brass: '#a9854c',
        'brass-light': '#d7bd8c',
        oxblood: '#7c4a41',
        forest: '#4d5e4b',
        navy: '#41536b',
        ochre: '#97784c',
        slate: '#5a5c5c',
        plum: '#6b4e60',
        teal: '#3f6260',
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"PingFang SC"',
          '"Microsoft YaHei"', '"Noto Sans SC"', 'sans-serif',
        ],
        serif: [
          '"Noto Serif SC"', '"Source Han Serif SC"', '"Songti SC"',
          '"STSong"', '"SimSun"', 'Georgia', 'serif',
        ],
      },
      maxWidth: {
        shelf: '1440px',
      },
    },
  },
  plugins: [],
};
