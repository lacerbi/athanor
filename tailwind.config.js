/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Add custom tooltip delay
      transitionDelay: {
        'tooltip': '100ms', // Default is 500ms, we're making it much faster
      },
      // Add icon button sizing
      spacing: {
        '10': '2.5rem', // For icon button width/height
      },
      borderRadius: {
        'lg': '0.5rem', // Consistent radius for icon buttons
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