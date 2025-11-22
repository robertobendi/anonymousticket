/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#000000', // Black background
        surface: '#1a1a1a',   // Dark gray surface
        accent: '#EB0000',    // SBB red - primary color
        text: '#ffffff',      // White text
        muted: '#999999',     // Light muted gray
        card: '#1a1a1a',      // Dark card background
        border: '#333333',    // Dark border
        success: '#00a651',   // green for success states
        'sbb-red': '#EB0000',
        'sbb-red-dark': '#d10000',
        'sbb-red-darker': '#b80000',
        'sbb-gray': '#666666',
        'sbb-gray-light': '#2a2a2a',
      },
      borderRadius: {
        'none': '0',
        'sm': '2px',
        'DEFAULT': '2px',
        'md': '2px',
        'lg': '2px',
        'xl': '2px',
      },
      boxShadow: {
        card: '0 2px 8px 0 rgba(0, 0, 0, 0.1)',
        sbb: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      fontFamily: {
        sans: [
          'Helvetica Neue',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        'xs': ['11px', '16px'],
        'sm': ['13px', '18px'],
        'base': ['15px', '22px'],
        'lg': ['17px', '24px'],
        'xl': ['19px', '28px'],
        '2xl': ['23px', '32px'],
        '3xl': ['28px', '36px'],
        '4xl': ['34px', '42px'],
        '5xl': ['40px', '48px'],
      },
    },
  },
  plugins: [],
}