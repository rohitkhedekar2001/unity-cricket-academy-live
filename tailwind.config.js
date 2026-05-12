module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        academy: {
          black: '#0b0b0f',
          red: '#d71920',
          orange: '#f97316',
          ink: '#171717'
        }
      },
      boxShadow: {
        soft: '0 12px 30px rgba(15, 23, 42, 0.10)'
      }
    }
  },
  plugins: []
};
