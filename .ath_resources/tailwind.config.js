/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html',
  ],
  theme: {
    extend: {
      // Add custom tooltip delay
      transitionDelay: {
        'tooltip': '100ms', // Default is 500ms, we're making it much faster
      },
    },
  },
  plugins: [
    // Add custom tooltip plugin
    function({ addUtilities }) {
      addUtilities({
        '[title]': {
          '@apply before:transition-opacity before:delay-tooltip': {},
        },
      });
    },
  ],
};