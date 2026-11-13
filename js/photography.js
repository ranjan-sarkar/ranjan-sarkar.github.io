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

    // --- Hero prints on phones ---
    // Phones have no hover, so there the fanned prints spread apart as the page scrolls instead:
    // --spread goes from 0 (resting) to 1 (fully spread) while the stack moves up the screen.
    // The transforms that use it are in style.css (max-width: 767px).
    const fan = document.querySelector('.photo-fan');
    const phone = window.matchMedia('(max-width: 767px)');
    if (fan) {
        let fanFrame = 0;
        const updateFan = () => {
            fanFrame = 0;
            if (!phone.matches || reduceMotion.matches) {
                fan.style.removeProperty('--spread');
                return;
            }
            const rect = fan.getBoundingClientRect();
            const vh = window.innerHeight;
            const centre = rect.top + rect.height / 2;
            const spread = Math.min(1, Math.max(0, (vh * 0.9 - centre) / (vh * 0.45)));
            fan.style.setProperty('--spread', spread.toFixed(3));
        };
        const queueFan = () => { if (!fanFrame) fanFrame = requestAnimationFrame(updateFan); };
        window.addEventListener('scroll', queueFan, { passive: true });
        window.addEventListener('resize', queueFan);
        updateFan();
    }

    // --- Viewer ---
    // Prev / next walk through the gallery photos currently shown by the filter. Beside the photo
    // (under it on phones) a list of all those photos shows where you are and jumps to any of them;
    // it can be hidden, and that choice is remembered. A slideshow button plays the photos one after
    // another; a bar along the bottom of the photo counts down to the next one, and pausing freezes
    // the bar so playing again carries on from there.
    const img = dialog.querySelector('.photo-lb-img');
    const count = dialog.querySelector('.photo-lb-count');
    const title = dialog.querySelector('.photo-lb-title');
    const text = dialog.querySelector('.photo-lb-text');
    const meta = dialog.querySelector('.photo-lb-meta');
    const thumbsList = dialog.querySelector('.photo-lb-thumbs');
    const sidebar = dialog.querySelector('.photo-lb-sidebar');
    const sidebarCount = dialog.querySelector('.photo-lb-sidebar-count');
    const sidebarBtn = dialog.querySelector('[data-lb="sidebar"]');
    const playBtn = dialog.querySelector('[data-lb="play"]');
    const progress = dialog.querySelector('.photo-lb-progress');
    let list = [];
    let thumbs = [];
    let index = 0;
    let opener = null;

    const escapeHtml = (value) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

    // slideshow clock: SLIDE_MS per photo, paused / resumed without losing the time already run
    const SLIDE_MS = 4000;
    dialog.style.setProperty('--slide-ms', `${SLIDE_MS}ms`);
    let playing = false;
    let slideTimer = null;
    let slideLeft = SLIDE_MS;
    let slideStarted = 0;
    const startSlideClock = () => {
        slideStarted = performance.now();
        slideTimer = setTimeout(() => show(index + 1), slideLeft);
    };
    const stopSlideClock = () => {
        if (!slideTimer) return;
        clearTimeout(slideTimer);
        slideTimer = null;
        slideLeft = Math.max(0, slideLeft - (performance.now() - slideStarted));
    };
    const setPlaying = (on) => {
        playing = on;
        dialog.classList.toggle('is-playing', on);
        playBtn.setAttribute('aria-pressed', String(on));
        const label = on ? 'Pause slideshow' : 'Play slideshow';
        playBtn.setAttribute('aria-label', label);
        playBtn.dataset.tip = `${label} (Space)`;
        playBtn.querySelector('i').className = `fa-solid ${on ? 'fa-pause' : 'fa-play'}`;
        if (on) {
            dialog.classList.add('has-slideshow');
            if (!progress.classList.contains('is-counting')) progress.classList.add('is-counting');
            startSlideClock();
        } else {
            stopSlideClock();
        }
    };

    // the photo list: shown by default on tablets and desktops, hidden on phones, until the visitor chooses
    let sidebarShown = window.innerWidth >= 768;
    try {
        const saved = localStorage.getItem('photoViewerSidebar');
        if (saved === 'shown' || saved === 'hidden') sidebarShown = saved === 'shown';
    } catch (e) { }
    const applySidebar = () => {
        dialog.classList.toggle('is-sidebar-hidden', !sidebarShown);
        sidebar.inert = !sidebarShown;   // a hidden list is out of the tab order
        sidebarBtn.setAttribute('aria-pressed', String(sidebarShown));
        const label = sidebarShown ? 'Hide photo list' : 'Show photo list';
        sidebarBtn.setAttribute('aria-label', label);
        sidebarBtn.dataset.tip = label;
    };
    applySidebar();

    const buildThumbs = () => {
        thumbsList.textContent = '';
        thumbs = list.map((frame, n) => {
            const figure = frame.closest('.photo-item');
            const small = frame.querySelector('img');
            const li = document.createElement('li');
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'photo-lb-thumb';
            btn.setAttribute('aria-label', `Photo ${n + 1}: ${figure.querySelector('.photo-title').textContent}`);
            const pic = document.createElement('img');
            pic.src = small.currentSrc || small.src;
            pic.alt = '';
            pic.loading = 'lazy';
            pic.decoding = 'async';
            btn.appendChild(pic);
            btn.addEventListener('click', () => show(n));
            li.appendChild(btn);
            thumbsList.appendChild(li);
            return btn;
        });
        sidebarCount.textContent = String(list.length);
    };

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

        // highlight it in the list and keep it in view there
        thumbs.forEach((btn, n) => {
            btn.classList.toggle('is-current', n === index);
            if (n === index) btn.setAttribute('aria-current', 'true');
            else btn.removeAttribute('aria-current');
        });
        if (sidebarShown && thumbs[index] && dialog.open) {
            thumbs[index].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
        }

        // a new photo gets the full slideshow time, and its countdown bar starts from empty
        clearTimeout(slideTimer);
        slideTimer = null;
        slideLeft = SLIDE_MS;
        progress.classList.remove('is-counting');
        void progress.offsetWidth;
        progress.classList.add('is-counting');
        if (playing) startSlideClock();

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
        buildThumbs();
        show(list.indexOf(frame));
        dialog.showModal();
        // focus the viewer itself, not its first button: no stray focus ring or label on "play",
        // and Space plays / pauses straight away
        dialog.focus();
        dialog.dispatchEvent(new Event('photo-viewer-open'));   // the carousel holds its countdown
        document.documentElement.classList.add('photo-lightbox-open');
        // bring the current photo into view in the list once the viewer has its size
        requestAnimationFrame(() => {
            if (sidebarShown && thumbs[index]) thumbs[index].scrollIntoView({ block: 'center', inline: 'center' });
        });
    };

    grid.querySelectorAll('.photo-frame').forEach((frame) => {
        frame.addEventListener('click', () => open(frame));
    });

    dialog.addEventListener('close', () => {
        setPlaying(false);
        dialog.classList.remove('has-slideshow');
        progress.classList.remove('is-counting');
        document.documentElement.classList.remove('photo-lightbox-open');
        if (opener) opener.focus({ preventScroll: true });
    });

    dialog.addEventListener('click', (event) => {
        const action = event.target.closest('[data-lb]')?.dataset.lb;
        if (action === 'close') dialog.close();
        else if (action === 'prev') show(index - 1);
        else if (action === 'next') show(index + 1);
        else if (action === 'play') setPlaying(!playing);
        else if (action === 'sidebar') {
            sidebarShown = !sidebarShown;
            try { localStorage.setItem('photoViewerSidebar', sidebarShown ? 'shown' : 'hidden'); } catch (e) { }
            applySidebar();
            if (sidebarShown && thumbs[index]) {
                setTimeout(() => thumbs[index].scrollIntoView({ block: 'center', inline: 'center' }), 360);
            }
        }
        // a click on the dark background around the photo (not on it or its caption) closes the viewer
        else if (event.target === dialog || event.target.matches('.photo-lightbox-inner, .photo-lb-stage')) dialog.close();
    });

    dialog.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight') { event.preventDefault(); show(index + 1); }
        if (event.key === 'ArrowLeft') { event.preventDefault(); show(index - 1); }
        // Space plays / pauses the slideshow (on a focused button it presses that button instead)
        if (event.key === ' ' && !event.target.closest('button, a')) { event.preventDefault(); setPlaying(!playing); }
    });

    // swipe left / right on the photo (touch screens); swipes on the photo list just scroll the list
    let touchX = null;
    dialog.addEventListener('touchstart', (event) => {
        touchX = event.target.closest('.photo-lb-sidebar') ? null : event.touches[0].clientX;
    }, { passive: true });
    dialog.addEventListener('touchend', (event) => {
        if (touchX === null) return;
        const dx = event.changedTouches[0].clientX - touchX;
        touchX = null;
        if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    }, { passive: true });

    // --- Photo story ("Frame by Frame") ---
    // The section is tall and its .story-sticky part stays pinned under the header while that height
    // scrolls past; the scroll position inside it drives the story. pos runs from 0 (first photo) to
    // count - 1 (last photo). Each photo's --r (0 to 1) wipes it in over the one before, which gets
    // --out (dims and shrinks behind it); the caption, counter and glow switch once a photo is mostly
    // in; the progress bar fills one segment per photo. Styles: "Photo story" in style.css.
    const story = document.getElementById('photo-story');
    if (story) {
        const sticky = story.querySelector('.story-sticky');
        const storySlides = Array.from(story.querySelectorAll('.story-slide'));
        const captions = Array.from(story.querySelectorAll('.story-caption'));
        const fills = Array.from(story.querySelectorAll('.story-seg > span'));
        const counter = story.querySelector('.story-now');
        const glow = story.querySelector('.story-glow');
        const frames = story.querySelector('.story-frames');
        const header = document.querySelector('header');
        const count = storySlides.length;
        const clamp01 = (v) => Math.min(1, Math.max(0, v));
        const ease = (t) => t * t * (3 - 2 * t);
        let shown = -1;
        let storyFrame = 0;

        // the caption, counter and glow for photo n
        const showCaption = (n) => {
            captions.forEach((caption, i) => {
                caption.classList.toggle('is-active', i === n);
                caption.classList.toggle('is-before', i < n);
                caption.setAttribute('aria-hidden', String(i !== n));
            });
            counter.textContent = String(n + 1).padStart(2, '0');
            counter.classList.remove('is-flipping');
            void counter.offsetWidth;
            counter.classList.add('is-flipping');
            const pic = storySlides[n].querySelector('img');
            glow.style.backgroundImage = `url("${pic.currentSrc || pic.src}")`;
            story.classList.toggle('is-end', n === count - 1);
            shown = n;
        };

        const updateStory = () => {
            storyFrame = 0;
            // pin just under the header (its height changes when it turns compact)
            const top = Math.round(header ? header.getBoundingClientRect().bottom : 0);
            if (Math.abs(parseFloat(story.style.getPropertyValue('--story-top') || '0') - top) > 1) {
                story.style.setProperty('--story-top', `${Math.max(0, top)}px`);
            }
            const travel = story.offsetHeight - sticky.offsetHeight;
            const progress = travel > 0 ? clamp01((top - story.getBoundingClientRect().top) / travel) : 0;
            const pos = progress * (count - 1);

            // how far each photo is in: its wipe runs over the middle of its step, with a short
            // hold on each photo before the next one starts
            const r = storySlides.map((_, i) => {
                if (i === 0) return 1;
                if (reduceMotion.matches) return pos >= i - 0.5 ? 1 : 0;
                return ease(clamp01((pos - (i - 1) - 0.15) / 0.7));
            });
            storySlides.forEach((slide, i) => {
                slide.style.setProperty('--r', r[i].toFixed(4));
                slide.style.setProperty('--out', (r[i + 1] || 0).toFixed(4));
            });
            fills.forEach((fill, i) => fill.style.setProperty('--fill', r[i].toFixed(4)));

            const current = r.reduce((n, value, i) => (value >= 0.5 ? i : n), 0);
            if (current !== shown) showCaption(current);
        };
        const queueStory = () => { if (!storyFrame) storyFrame = requestAnimationFrame(updateStory); };
        window.addEventListener('scroll', queueStory, { passive: true });
        window.addEventListener('resize', queueStory);
        updateStory();

        // the stage opens the current photo in the viewer (click, or Enter / Space when focused)
        const openCurrent = () => {
            const figure = document.getElementById(storySlides[shown].dataset.open);
            if (!figure) return;
            if (figure.hidden) applyFilter('all');
            open(figure.querySelector('.photo-frame'), frames);
        };
        frames.addEventListener('click', openCurrent);
        frames.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openCurrent();
            }
        });
    }

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
        const changed = i !== current;
        current = i;
        slides.forEach((slide, n) => slide.classList.toggle('is-current', n === i));
        dots.forEach((dot, n) => {
            dot.classList.toggle('is-active', n === i);
            dot.setAttribute('aria-current', n === i ? 'true' : 'false');
        });
        // a newly shown slide always gets a full countdown (its bar starts from empty in style.css)
        if (changed) restartCountdown();
    };

    // scroll so the slide sits in the middle of the strip
    const goTo = (i) => {
        const n = (i + slides.length) % slides.length;
        const slide = slides[n];
        const left = slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2;
        programmatic = Math.abs(track.scrollLeft - left) > 1;
        track.scrollTo({ left, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
        markCurrent(n);
    };

    // while the strip moves (arrows, swipe, trackpad), the slide nearest the middle is highlighted
    // live, once per frame, so the highlight and dots follow the finger during a swipe
    let scrollFrame = 0;
    let programmatic = false;   // an arrow / dot / auto move is under way: it already set the target
    let programmaticTimer = null;
    const nearestSlide = () => {
        const middle = track.scrollLeft + track.clientWidth / 2;
        let best = 0;
        let bestDistance = Infinity;
        slides.forEach((slide, n) => {
            const distance = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - middle);
            if (distance < bestDistance) { bestDistance = distance; best = n; }
        });
        return best;
    };
    track.addEventListener('scroll', () => {
        if (scrollFrame) return;
        scrollFrame = requestAnimationFrame(() => {
            scrollFrame = 0;
            const best = nearestSlide();
            // during a smooth scroll started by a button, don't flicker through the slides passed on the way
            if (!programmatic && best !== current) markCurrent(best);
        });
        // a scroll that has gone quiet ends any button-driven move
        clearTimeout(programmaticTimer);
        programmaticTimer = setTimeout(() => {
            programmatic = false;
            const best = nearestSlide();
            if (best !== current) markCurrent(best);
        }, 150);
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

    // Auto-advance: each slide gets AUTO_MS, then the next one comes in. A bar along the bottom edge
    // of the current slide fills up to show the countdown (.photo-slide-progress in style.css).
    // The countdown pauses where it is, and later carries on from there (it does not restart), while
    // any "hold" applies: the mouse is over the slides, keyboard focus is in it, a finger is on the
    // strip, the photo viewer is open, the tab is hidden, or the carousel is off screen. Never runs
    // with reduced motion.
    const AUTO_MS = 4000;
    let remaining = AUTO_MS;   // time left on the current slide
    let startedAt = 0;         // when the clock last (re)started
    let advanceTimer = null;   // set while the clock runs
    const holds = new Set(['offscreen']);
    carousel.style.setProperty('--auto-ms', `${AUTO_MS}ms`);
    slides.forEach((slide) => {
        const bar = document.createElement('span');
        bar.className = 'photo-slide-progress';
        bar.setAttribute('aria-hidden', 'true');
        slide.querySelector('.photo-slide-btn').appendChild(bar);
    });

    const startClock = () => {
        startedAt = performance.now();
        // the timer stays set while goTo runs, so the new slide's countdown starts straight away
        advanceTimer = setTimeout(() => goTo(current + 1), remaining);
    };
    const stopClock = () => {
        clearTimeout(advanceTimer);
        advanceTimer = null;
        remaining = Math.max(0, remaining - (performance.now() - startedAt));
    };
    // run or hold, whichever applies now; .is-held freezes the bar where it is
    const sync = () => {
        const run = !reduceMotion.matches && holds.size === 0;
        if (run && !advanceTimer) {
            carousel.classList.add('is-playing');
            carousel.classList.remove('is-held');
            startClock();
        } else if (!run && advanceTimer) {
            stopClock();
            carousel.classList.add('is-held');
        }
    };
    const hold = (reason) => { holds.add(reason); sync(); };
    const release = (reason) => { holds.delete(reason); sync(); };
    // a new slide: full time again (keeps running if it was running, stays held if held)
    function restartCountdown() {
        const running = advanceTimer !== null;
        clearTimeout(advanceTimer);
        advanceTimer = null;
        remaining = AUTO_MS;
        if (running) startClock();
    }

    // only a real mouse pauses on hover (a tap on a phone also fires mouse events, with no "leave"),
    // and only over the slides themselves: hovering the arrows / dots below keeps it running
    track.addEventListener('pointerenter', (event) => { if (event.pointerType === 'mouse') hold('hover'); });
    track.addEventListener('pointerleave', (event) => { if (event.pointerType === 'mouse') release('hover'); });
    // keyboard focus holds it; the focus a click or tap leaves on a button does not (no focus ring)
    carousel.addEventListener('focusin', (event) => {
        if (event.target.matches(':focus-visible')) hold('focus');
        else release('focus');
    });
    carousel.addEventListener('focusout', (event) => { if (!carousel.contains(event.relatedTarget)) release('focus'); });
    // a finger on the strip takes over from any button-driven move and holds the countdown;
    // it carries on shortly after the finger lifts
    let touchReleaseTimer = null;
    track.addEventListener('touchstart', () => {
        programmatic = false;
        clearTimeout(touchReleaseTimer);
        hold('touch');
    }, { passive: true });
    track.addEventListener('touchend', () => {
        clearTimeout(touchReleaseTimer);
        touchReleaseTimer = setTimeout(() => release('touch'), 1500);
    }, { passive: true });
    document.addEventListener('visibilitychange', () => (document.hidden ? hold('hidden') : release('hidden')));
    dialog.addEventListener('photo-viewer-open', () => hold('viewer'));
    dialog.addEventListener('close', () => release('viewer'));

    // only run while the carousel is on screen
    new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) release('offscreen');
        else hold('offscreen');
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
