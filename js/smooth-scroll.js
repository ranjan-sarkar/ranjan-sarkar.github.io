// Smooth, eased page scrolling for every page (Lenis, loaded from the CDN just before this file).
// The mouse wheel / trackpad glides to its target instead of jumping in steps; touch screens keep
// their own native scrolling. Same-page links (#contact, index.html#news on the home page) and the
// site's own programmatic scrolls (scroll-to-top, deep links, search hits) glide the same way
// through window.siteScrollTo, defined below and used by main.js.
//
// Left native (Lenis not started) when the visitor asks for reduced motion, or if the CDN fails.
// Scrollable boxes inside the page (popups, menus, search results, the photo list) scroll on their
// own (allowNestedScroll), and sideways trackpad swipes are left to the photo carousels.
// While a popup, the search panel or the photo viewer holds the page still (html.modal-open,
// html.search-open, html.photo-lightbox-open in style.css), Lenis is paused too.
(() => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const lenis = typeof window.Lenis === 'function' && !reduceMotion.matches
        ? new window.Lenis({
            lerp: 0.1,                // how quickly the page catches up with the wheel (0..1)
            wheelMultiplier: 1,
            smoothWheel: true,
            allowNestedScroll: true,
            autoRaf: true,
            // a mostly sideways swipe belongs to the horizontal strip under the pointer
            virtualScroll: ({ deltaX, deltaY }) => Math.abs(deltaX) <= Math.abs(deltaY),
        })
        : null;

    // Scroll the page to a number (px from the top) or an element. block 'start' honours the
    // element's scroll-margin-top (so the sticky header never covers it); 'center' centres it.
    window.siteScrollTo = (target, { block = 'start' } = {}) => {
        const isElement = target instanceof Element;
        if (!lenis) {
            const behavior = reduceMotion.matches ? 'auto' : 'smooth';
            if (isElement) target.scrollIntoView({ behavior, block });
            else window.scrollTo({ top: target, behavior });
            return;
        }
        let offset = 0;
        if (isElement) {
            offset = block === 'center'
                ? -(window.innerHeight - target.getBoundingClientRect().height) / 2
                : -(parseFloat(getComputedStyle(target).scrollMarginTop) || 0);
        }
        lenis.scrollTo(target, { offset, duration: 1.2 });
    };

    if (!lenis) return;
    window.siteLenis = lenis;

    // Pause while something holds the page still; resume when it lets go.
    const LOCK_CLASSES = ['modal-open', 'search-open', 'photo-lightbox-open'];
    let locked = false;
    const syncLock = () => {
        const now = LOCK_CLASSES.some((name) => root.classList.contains(name));
        if (now === locked) return;
        locked = now;
        if (now) lenis.stop();
        else lenis.start();
    };
    new MutationObserver(syncLock).observe(root, { attributes: true, attributeFilter: ['class'] });
    syncLock();

    // Links to a spot on this same page glide there and still update the address bar.
    const samePage = (url) => {
        const path = (p) => p.replace(/\/index\.html$/, '/');
        return url.origin === location.origin && path(url.pathname) === path(location.pathname)
            && url.search === location.search;
    };
    document.addEventListener('click', (event) => {
        if (event.defaultPrevented || event.button !== 0
            || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = event.target.closest('a[href*="#"]');
        // the skip link keeps its native jump, which also moves keyboard focus
        if (!link || link.classList.contains('skip-link') || (link.target && link.target !== '_self')) return;
        const url = new URL(link.href, location.href);
        if (!samePage(url) || url.hash.length < 2) return;
        const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
        if (!target) return;
        event.preventDefault();
        window.siteScrollTo(target);
        if (url.hash !== location.hash) {
            const oldURL = location.href;
            history.pushState(null, '', url.hash);
            window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL, newURL: location.href }));
        }
    });
})();
