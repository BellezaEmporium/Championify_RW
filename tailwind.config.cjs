/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/**/*.{html,js,svelte,ts}", // scan Svelte pages + components
  ],
  theme: {
    extend: {
      colors: {
        background: "#0f0f0f",
        text: "#e0e0e0",
      },
    },
  },
  plugins: [],
}
