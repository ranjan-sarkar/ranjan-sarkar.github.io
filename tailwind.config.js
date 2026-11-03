// Tailwind build config for the site.
// The pages load the pre-built css/tailwind.css (instead of Tailwind's in-browser CDN script).
// After adding or changing Tailwind classes in any page, rebuild it with:   npm run build:css
// (or keep it rebuilding while you edit with:   npm run watch:css)
module.exports = {
    // Every file that uses Tailwind classes; js/main.js adds a few classes at runtime (e.g. text-red-500)
    content: ['./*.html', './js/**/*.js'],
    // dark: utilities follow the site's theme (the 'dark' class on <html>, set in each page's <head>
    // from the theme toggle or the visitor's local time), not the device's light/dark setting.
    // 'selector' wraps the check in :where(), so these add no weight and style.css still wins over them.
    darkMode: 'selector',
    theme: {
        extend: {},
    },
    plugins: [],
};
