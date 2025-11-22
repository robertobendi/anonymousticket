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
        'sm': '4px',
        'DEFAULT': '8px', // SBB standard rounded corners
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        'full': '9999px',
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
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      spacing: {
        // SBB spacing system (4px base unit)
        '0.5': '2px',
        '1': '4px',
        '1.5': '6px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
      },
      fontSize: {
        'xs': ['12px', { lineHeight: '18px', letterSpacing: '0.01em' }], // SBB small text
        'sm': ['14px', { lineHeight: '20px', letterSpacing: '0.01em' }], // SBB body small
        'base': ['16px', { lineHeight: '24px', letterSpacing: '0' }], // SBB body
        'lg': ['18px', { lineHeight: '26px', letterSpacing: '0' }], // SBB body large
        'xl': ['20px', { lineHeight: '28px', letterSpacing: '-0.01em' }], // SBB heading small
        '2xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em' }], // SBB heading
        '3xl': ['28px', { lineHeight: '36px', letterSpacing: '-0.02em' }], // SBB heading large
        '4xl': ['32px', { lineHeight: '40px', letterSpacing: '-0.02em' }], // SBB display small
        '5xl': ['40px', { lineHeight: '48px', letterSpacing: '-0.02em' }], // SBB display
      },
    },
  },
  plugins: [],
}