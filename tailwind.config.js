// Tailwind build config for the site.
// The pages load the pre-built css/tailwind.css (instead of Tailwind's in-browser CDN script).
// After adding or changing Tailwind classes in any page, rebuild it with:   npm run build:css
// (or keep it rebuilding while you edit with:   npm run watch:css)
module.exports = {
    // Every file that uses Tailwind classes; js/main.js adds a few classes at runtime (e.g. text-red-500)
    content: ['./*.html', './js/**/*.js'],
    // darkMode stays at Tailwind's default ('media'), exactly as with the CDN script used before
    theme: {
        extend: {},
    },
    plugins: [],
};
