// Photography page: the "Selected Frames" carousel, place filters for the gallery and a full-screen
// photo viewer. Photos come from Unsplash or 500px (data-source on each .photo-frame). The page works without this script (every photo and caption is in the HTML; the
// carousel is a plain scrollable strip); this adds the controls. Styles: "Photography page" in style.css.
document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('photo-grid');
    const dialog = document.getElementById('photo-lightbox');
    if (!grid || !dialog) return;

    const items = Array.from(grid.querySelectorAll('.photo-item'));
    const chips = Array.from(document.querySelectorAll('.photo-chip'));
    const status = document.getElementById('photo-filter-status');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // --- Filters ---
    const applyFilter = (filter) => {
        chips.forEach((c) => {
            const on = c.dataset.filter === filter;
            c.classList.toggle('is-active', on);
            c.setAttribute('aria-pressed', String(on));
        });
        let shown = 0;
        items.forEach((item) => {
            const show = filter === 'all' || item.dataset.group === filter;
            item.hidden = !show;
            if (show) {
                item.style.setProperty('--i', String(shown++));
                // replay the fade-in for the photos that stay
                item.classList.remove('is-entering');
                void item.offsetWidth;
                item.classList.add('is-entering');
            }
        });
        if (status) status.textContent = `Showing ${shown} photo${shown === 1 ? '' : 's'}`;
    };

    chips.forEach((chip) => chip.addEventListener('click', () => applyFilter(chip.dataset.filter)));

    // --- Viewer ---
    // Prev / next walk through the gallery photos currently shown by the filter.
    const img = dialog.querySelector('.photo-lb-img');
    const count = dialog.querySelector('.photo-lb-count');
    const title = dialog.querySelector('.photo-lb-title');
    const text = dialog.querySelector('.photo-lb-text');
    const meta = dialog.querySelector('.photo-lb-meta');
    let list = [];
    let index = 0;
    let opener = null;

    const escapeHtml = (value) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

    const show = (i) => {
        index = (i + list.length) % list.length;
        const frame = list[index];
        const figure = frame.closest('.photo-item');
        const thumb = frame.querySelector('img');

        // show the already-loaded thumbnail at once, then swap in the large version
        img.classList.add('is-swapping');
        img.src = thumb.currentSrc || thumb.src;
        img.alt = thumb.alt;
        const full = new Image();
        full.onload = () => {
            if (list[index] === frame) {
                img.src = full.src;
                img.classList.remove('is-swapping');
            }
        };
        full.src = frame.dataset.full;
        requestAnimationFrame(() => img.classList.remove('is-swapping'));

        count.textContent = `${index + 1} / ${list.length}`;
        title.textContent = figure.querySelector('.photo-title').textContent;
        text.textContent = figure.querySelector('.photo-text').textContent;
        // place (some photos have none) and a link back to the photo's page on Unsplash or 500px
        const place = figure.querySelector('.photo-place');
        const source = frame.dataset.source || 'Unsplash';
        const icon = source === '500px' ? 'fa-500px' : 'fa-unsplash';
        meta.innerHTML =
            (place ? `<span><i class="fa-solid fa-location-dot" aria-hidden="true"></i>${escapeHtml(place.textContent.trim())}</span>` : '') +
            `<a href="${escapeHtml(frame.dataset.page)}" target="_blank" rel="noopener"><i class="fa-brands ${icon}" aria-hidden="true"></i>View on ${escapeHtml(source)}<i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a>`;

        // warm the neighbours so next / previous feel instant
        [index + 1, index - 1].forEach((n) => {
            const neighbour = list[(n + list.length) % list.length];
            if (neighbour) new Image().src = neighbour.dataset.full;
        });
    };

    // returnTo: the element that gets focus back when the viewer closes
    const open = (frame, returnTo = frame) => {
        list = items.filter((item) => !item.hidden).map((item) => item.querySelector('.photo-frame'));
        opener = returnTo;
        show(list.indexOf(frame));
        dialog.showModal();
        document.documentElement.classList.add('photo-lightbox-open');
    };

    grid.querySelectorAll('.photo-frame').forEach((frame) => {
        frame.addEventListener('click', () => open(frame));
    });

    dialog.addEventListener('close', () => {
        document.documentElement.classList.remove('photo-lightbox-open');
        if (opener) opener.focus({ preventScroll: true });
    });

    dialog.addEventListener('click', (event) => {
        const action = event.target.closest('[data-lb]')?.dataset.lb;
        if (action === 'close') dialog.close();
        else if (action === 'prev') show(index - 1);
        else if (action === 'next') show(index + 1);
        // a click on the dark backdrop (not on the photo or its caption) closes the viewer
        else if (event.target === dialog || event.target.classList.contains('photo-lightbox-inner')) dialog.close();
    });

    dialog.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight') { event.preventDefault(); show(index + 1); }
        if (event.key === 'ArrowLeft') { event.preventDefault(); show(index - 1); }
    });

    // swipe left / right on touch screens
    let touchX = null;
    dialog.addEventListener('touchstart', (event) => { touchX = event.touches[0].clientX; }, { passive: true });
    dialog.addEventListener('touchend', (event) => {
        if (touchX === null) return;
        const dx = event.changedTouches[0].clientX - touchX;
        touchX = null;
        if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    }, { passive: true });

    // --- Carousel ---
    // A scroll-snapping strip: arrows and dots scroll it, swiping / trackpad scrolling work natively,
    // and it advances on its own every few seconds (paused on hover, on focus, when the tab is hidden,
    // and never with reduced motion). A slide opens the same photo from the gallery in the viewer.
    const carousel = document.querySelector('.photo-carousel');
    const track = document.getElementById('photo-track');
    if (!carousel || !track) return;

    const slides = Array.from(track.querySelectorAll('.photo-slide'));
    const dotsBox = carousel.querySelector('.photo-dots');
    let current = 0;

    const dots = slides.map((slide, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'photo-dot';
        dot.setAttribute('aria-label', `Go to slide ${i + 1}: ${slide.querySelector('.photo-slide-title').textContent}`);
        dot.addEventListener('click', () => goTo(i));
        dotsBox.appendChild(dot);
        return dot;
    });

    const markCurrent = (i) => {
        current = i;
        slides.forEach((slide, n) => slide.classList.toggle('is-current', n === i));
        dots.forEach((dot, n) => {
            dot.classList.toggle('is-active', n === i);
            dot.setAttribute('aria-current', n === i ? 'true' : 'false');
        });
    };

    // scroll so the slide sits in the middle of the strip
    const goTo = (i) => {
        const n = (i + slides.length) % slides.length;
        const slide = slides[n];
        const left = slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2;
        track.scrollTo({ left, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
        markCurrent(n);
        // any move restarts the auto-advance countdown, so it never jumps right after a click
        if (autoTimer) startAuto();
    };

    // after any scroll (arrows, swipe, trackpad), the slide nearest the middle becomes current
    let scrollTimer = null;
    track.addEventListener('scroll', () => {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
            const middle = track.scrollLeft + track.clientWidth / 2;
            let best = 0;
            let bestDistance = Infinity;
            slides.forEach((slide, n) => {
                const distance = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - middle);
                if (distance < bestDistance) { bestDistance = distance; best = n; }
            });
            markCurrent(best);
        }, 120);
    }, { passive: true });

    carousel.querySelector('[data-carousel="prev"]').addEventListener('click', () => goTo(current - 1));
    carousel.querySelector('[data-carousel="next"]').addEventListener('click', () => goTo(current + 1));

    track.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight') { event.preventDefault(); goTo(current + 1); }
        if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(current - 1); }
    });

    slides.forEach((slide, n) => {
        slide.querySelector('.photo-slide-btn').addEventListener('click', (event) => {
            // a slide that isn't centred yet just moves to the middle first
            if (n !== current) { goTo(n); return; }
            const figure = document.getElementById(event.currentTarget.dataset.open);
            if (!figure) return;
            if (figure.hidden) applyFilter('all');
            open(figure.querySelector('.photo-frame'), event.currentTarget);
        });
    });

    // auto-advance
    const AUTO_MS = 5000;
    let autoTimer = null;
    let paused = false;
    let onScreen = false;
    const stopAuto = () => { clearInterval(autoTimer); autoTimer = null; };
    const startAuto = () => {
        stopAuto();
        if (reduceMotion.matches || paused || document.hidden || !onScreen || dialog.open) return;
        autoTimer = setInterval(() => { if (!dialog.open) goTo(current + 1); }, AUTO_MS);
    };
    const pause = () => { paused = true; stopAuto(); };
    const resume = () => { paused = false; startAuto(); };

    carousel.addEventListener('mouseenter', pause);
    carousel.addEventListener('mouseleave', resume);
    carousel.addEventListener('focusin', pause);
    carousel.addEventListener('focusout', (event) => { if (!carousel.contains(event.relatedTarget)) resume(); });
    track.addEventListener('touchstart', pause, { passive: true });
    document.addEventListener('visibilitychange', () => (document.hidden ? stopAuto() : startAuto()));
    dialog.addEventListener('close', startAuto);

    // only run while the carousel is on screen
    new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting;
        startAuto();
    }, { threshold: 0.4 }).observe(carousel);

    // pad both ends so the first and last slides can also sit in the middle (sizes change with the
    // screen, so this is redone on resize)
    const padEnds = () => {
        const first = slides[0];
        const last = slides[slides.length - 1];
        track.style.paddingLeft = `${Math.max(16, (track.clientWidth - first.offsetWidth) / 2)}px`;
        track.style.paddingRight = `${Math.max(16, (track.clientWidth - last.offsetWidth) / 2)}px`;
    };
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { padEnds(); goTo(current); }, 150);
    });

    // start centred on the first slide once the strip has its size
    requestAnimationFrame(() => {
        padEnds();
        const first = slides[0];
        track.scrollLeft = first.offsetLeft - (track.clientWidth - first.offsetWidth) / 2;
        markCurrent(0);
    });
});
