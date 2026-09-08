/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          green: "#00A859", // Vert du drapeau camerounais
          red: "#CE1126", // Rouge du drapeau camerounais
          yellow: "#FCD116", // Jaune du drapeau camerounais
        },
      },
    },
  },
  plugins: [],
};