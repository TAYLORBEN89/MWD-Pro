/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#09090b',
        surface: '#18181b',
        elevated: '#27272a',
        accent: {
          DEFAULT: '#10b981',
          dim: 'rgba(16, 185, 129, 0.12)',
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"],
      },
      borderRadius: {
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },
      maxWidth: {
        app: '28rem',
      },
      boxShadow: {
        glow: '0 0 40px rgba(16, 185, 129, 0.12)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
