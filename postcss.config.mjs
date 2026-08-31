// Tailwind v4 s'installe comme un simple plugin PostCSS : plus de
// tailwind.config.js, la configuration vit dans src/app/globals.css (@theme).
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
