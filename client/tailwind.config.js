/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)', card: 'var(--card)', ink: 'var(--ink)', mute: 'var(--mute)', line: 'var(--line)',
        brand: 'var(--brand)', onbrand: 'var(--onbrand)', soft: 'var(--soft)', err: 'var(--err)',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], serif: ['Newsreader', 'Georgia', 'serif'] },
    },
  },
};
