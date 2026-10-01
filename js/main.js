// Shared behaviour for every page of the site.
// Each page sets <body data-page="..."> (and data-course="..." on course pages)
// so the header can highlight where the visitor currently is.

// Folder the site is served from (this file lives in js/). Search fetches pages and builds links
// from here, so it also works on 404.html, which GitHub Pages shows at any missing address.
const SITE_ROOT = new URL('..', document.currentScript?.src || location.href);

document.addEventListener('DOMContentLoaded', () => {
    const currentPage = document.body.dataset.page || '';
    const currentCourse = document.body.dataset.course || '';

    // --- Theme Switcher ---
    // The 'dark' class itself is applied by a small inline script in <head>
    // (before first paint), so here we only sync the icons and handle clicks.
    const themeToggle = document.getElementById('theme-toggle');
    const darkIcon = document.getElementById('theme-icon-dark');
    const lightIcon = document.getElementById('theme-icon-light');

    const syncThemeIcons = () => {
        const isDark = document.documentElement.classList.contains('dark');
        darkIcon.style.display = isDark ? 'none' : 'inline-block';
        lightIcon.style.display = isDark ? 'inline-block' : 'none';
        // hover tooltip (data-tip, styled in style.css) + screen-reader name saying what a click will do
        const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
        themeToggle.dataset.tip = label;
        themeToggle.setAttribute('aria-label', label);
    };

    syncThemeIcons();

    let themeSwitchTimer = null;

    themeToggle.addEventListener('click', () => {
        // Let colours fade over for a moment instead of snapping (see .theme-switching in style.css)
        document.documentElement.classList.add('theme-switching');
        clearTimeout(themeSwitchTimer);
        themeSwitchTimer = setTimeout(() => document.documentElement.classList.remove('theme-switching'), 450);

        document.documentElement.classList.toggle('dark');
        if (document.documentElement.classList.contains('dark')) {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.setItem('theme', 'light');
        }
        syncThemeIcons();

        // Spin the new sun/moon icon in (restart the animation on every click)
        themeToggle.classList.remove('is-spinning');
        void themeToggle.offsetWidth;
        themeToggle.classList.add('is-spinning');
    });

    // --- Background curves on portrait screens ---
    // Split the background artwork into its two curve fans (top-right and bottom-left),
    // each in its own SVG so CSS can pin it to its corner on phones (see style.css).
    const bgDecorSvg = document.querySelector('.bg-decor svg');
    if (bgDecorSvg) {
        const corners = [
            { className: 'bg-decor-corner bg-decor-top-right', viewBox: '740 -10 710 440', align: 'xMaxYMin', startsAt: 'M1450' },
            { className: 'bg-decor-corner bg-decor-bottom-left', viewBox: '-10 470 710 440', align: 'xMinYMax', startsAt: 'M-10' },
        ];

        corners.forEach(({ className, viewBox, align, startsAt }) => {
            const cornerSvg = bgDecorSvg.cloneNode(false); // keeps stroke/fill attributes, no children
            cornerSvg.setAttribute('class', className);
            cornerSvg.setAttribute('viewBox', viewBox);
            cornerSvg.setAttribute('preserveAspectRatio', `${align} slice`);
            bgDecorSvg.querySelectorAll('path').forEach((path) => {
                if (path.getAttribute('d').startsWith(startsAt)) {
                    cornerSvg.appendChild(path.cloneNode());
                }
            });
            bgDecorSvg.parentNode.appendChild(cornerSvg);
        });
    }

    // --- Background curves: gentle ripple while scrolling ---
    // Each curve drifts a few SVG units along a slow wave driven by the scroll position.
    // Neighbouring curves are slightly out of phase, so the fan ripples instead of sliding
    // as one block, and the motion eases toward the scroll target so it stays smooth.
    // At the top of the page every curve sits exactly where it is drawn.
    const bgCurves = [];
    document.querySelectorAll('.bg-decor svg').forEach((svg) => {
        const indexInFan = { top: 0, bottom: 0 };
        svg.querySelectorAll('path').forEach((path) => {
            const fan = path.getAttribute('d').startsWith('M1450') ? 'top' : 'bottom';
            bgCurves.push({ path, direction: fan === 'top' ? 1 : -1, lag: indexInFan[fan]++ * 0.45 });
        });
    });

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (bgCurves.length && !prefersReducedMotion) {
        const AMPLITUDE = 8;      // SVG units; a curve moves at most 2x this from its drawn position
        const WAVELENGTH = 900;   // px of scrolling for one full wave
        const EASE = 0.08;        // fraction of the remaining distance covered per frame

        let targetScroll = window.scrollY;
        let currentScroll = targetScroll;
        let frame = null;

        const renderCurves = () => {
            currentScroll += (targetScroll - currentScroll) * EASE;
            const phase = (currentScroll / WAVELENGTH) * Math.PI * 2;

            bgCurves.forEach(({ path, direction, lag }) => {
                const dx = direction * AMPLITUDE * (Math.sin(phase + lag) - Math.sin(lag));
                const dy = direction * AMPLITUDE * 0.6 * (Math.cos(phase + lag) - Math.cos(lag));
                path.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
            });

            frame = Math.abs(targetScroll - currentScroll) > 0.5 ? requestAnimationFrame(renderCurves) : null;
        };

        window.addEventListener('scroll', () => {
            targetScroll = window.scrollY;
            if (!frame) {
                frame = requestAnimationFrame(renderCurves);
            }
        }, { passive: true });

        renderCurves();
    }

    // --- Mobile Menu ---
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    const openIcon = document.getElementById('mobile-menu-open-icon');
    const closeIcon = document.getElementById('mobile-menu-close-icon');
    const mobileTaToggle = document.getElementById('mobile-ta-toggle');
    const mobileTaSubmenu = document.getElementById('mobile-ta-submenu');

    const closeMobileTaSubmenu = () => {
        if (!mobileTaToggle || !mobileTaSubmenu) {
            return;
        }

        mobileTaSubmenu.classList.remove('is-open');
        mobileTaToggle.setAttribute('aria-expanded', 'false');
    };

    const toggleMobileTaSubmenu = () => {
        if (!mobileTaToggle || !mobileTaSubmenu) {
            return;
        }

        const isOpen = mobileTaSubmenu.classList.toggle('is-open');
        mobileTaToggle.setAttribute('aria-expanded', String(isOpen));
    };

    mobileMenuButton.addEventListener('click', () => {
        const isMenuHidden = mobileMenu.classList.toggle('hidden');
        openIcon.style.display = isMenuHidden ? 'block' : 'none';
        closeIcon.style.display = isMenuHidden ? 'none' : 'block';
        if (isMenuHidden) {
            closeMobileTaSubmenu();
        }
    });

    if (mobileTaToggle) {
        mobileTaToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleMobileTaSubmenu();
        });
    }

    // Close mobile menu when a link is clicked
    document.querySelectorAll('#mobile-menu a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
            openIcon.style.display = 'block';
            closeIcon.style.display = 'none';
            closeMobileTaSubmenu();
        });
    });

    // Background timeline: entries whose date runs to "Present" get a filled dot and a "Current" tag
    // (styles: .timeline-item.is-current / .timeline-current in style.css). Change the date and it goes away.
    document.querySelectorAll('.timeline-item').forEach((item) => {
        const date = item.querySelector('.timeline-date');
        const title = item.querySelector('.timeline-content h3');
        if (date && title && /present/i.test(date.textContent)) {
            item.classList.add('is-current');
            const tag = document.createElement('span');
            tag.className = 'timeline-current';
            tag.textContent = 'Current';
            title.appendChild(tag);
        }
    });

    // Staggered reveal: items inside an animated section fade up one after another
    // (the animation itself is .reveal-child in style.css; it starts when the section gets .visible)
    const REVEAL_GROUPS = [
        '#research .grid > div',          // Research Interests cards
        '#TA .grid > .course-card',       // TA course cards
        '#news-container > .news-item',   // Recent News lines
        '.timeline-item',                 // Background: education & experience
        '.pub-card',                      // Publications page cards
    ];
    REVEAL_GROUPS.forEach((selector) => {
        document.querySelectorAll(selector).forEach((item, index) => {
            item.classList.add('reveal-child');
            item.style.setProperty('--reveal-delay', `${Math.min(index, 6) * 90}ms`);
        });
    });

    // Scroll animation logic
    const scrollAnimateElements = document.querySelectorAll('.scroll-animate');
    const scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });
    scrollAnimateElements.forEach(el => scrollObserver.observe(el));

    // --- TA Dropdown (desktop header) ---
    const taDropdown = document.querySelector('.ta-dropdown');
    const taDropdownButton = document.getElementById('ta-dropdown-button');
    const taDropdownLinks = taDropdown ? Array.from(taDropdown.querySelectorAll('.ta-dropdown-menu a')) : [];

    // Highlight the course we're on inside the dropdown
    taDropdownLinks.forEach((link) => {
        link.classList.toggle('is-active', Boolean(currentCourse) && link.dataset.courseLink === currentCourse);
    });

    const closeTaDropdown = () => {
        if (!taDropdown) {
            return;
        }

        taDropdown.classList.remove('is-open');
        if (taDropdownButton) {
            taDropdownButton.setAttribute('aria-expanded', 'false');
        }
    };

    const toggleTaDropdown = () => {
        if (!taDropdown) {
            return;
        }

        const isOpen = taDropdown.classList.toggle('is-open');
        if (taDropdownButton) {
            taDropdownButton.setAttribute('aria-expanded', String(isOpen));
        }
    };

    if (taDropdownButton) {
        taDropdownButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleTaDropdown();
        });
    }

    taDropdownLinks.forEach((link) => {
        link.addEventListener('click', closeTaDropdown);
    });

    document.addEventListener('click', (e) => {
        if (taDropdown && !taDropdown.contains(e.target)) {
            closeTaDropdown();
        }
    });

    // --- Active nav link (header + mobile menu) ---
    const allNavLinks = document.querySelectorAll('header nav a[data-nav], .mobile-nav a[data-nav]');
    const setActiveNavLink = (key) => {
        allNavLinks.forEach((link) => link.classList.toggle('active', Boolean(key) && link.dataset.nav === key));
    };

    setActiveNavLink(currentPage);

    // --- Scrollspy for Header (home page only: Home / News / Publications / TA) ---
    if (currentPage === 'home') {
        const sections = document.querySelectorAll('#main-content section[id]');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Section ids match the nav keys, except the TA section's id is "TA"
                    setActiveNavLink(entry.target.getAttribute('id').toLowerCase());
                }
            });
        }, { rootMargin: '-80px 0px -60% 0px' });

        sections.forEach(section => observer.observe(section));
    }

    // --- Course Modal (TA page) ---
    const courseData = {
        'amfai': {
            id: 'AI60211',
            title: 'Algorithmic and Mathematical Foundations for AI',
            shortname: 'AMFAI',
            topics: [
                'Linear Algebra, Matrix Theory',
                'Probability Theory, Statistics',
                'Optimization Theory and Algorithms',
                'Searching and Sorting Algorithms',
                'Graph Algorithms, BFS, DFS',
            ],
            link: 'amfai.html'
        },
        'aicps': {
            id: 'AI61006',
            title: 'AI for Cyber Physical Systems',
            shortname: 'AICPS',
            topics: [
                'Introduction',
                'Acting: RL, Q-Learning, SARSA, Gymnasium',
                'Planning: A*, RRT, PRM',
                'Sensing: Kalman Filter, Sensor Fusion, CNN, YOLO',
            ],
            tutorialUrl: 'aicps.html',
            link: 'https://rhpilab.in/cps.html'
        },
        'rl': {
            id: 'AI31201',
            title: 'Reinforcement Learning',
            shortname: 'RL',
            topics: [
                'Will be updated soon!'
                // 'Introduction',
                // 'Policy Based Methods: REINFORCE, Actor-Critic',
                // 'Value Based Methods: Q-Learning, DQN, Double DQN',
            ],
            // tutorialUrl: 'rl.html',
            link: 'rl.html'
        },
        'robot': {
            id: 'AI60209',
            title: 'AI for Robot Autonomy',
            shortname: 'Robot',
            topics: [
                'Module 1: Foundation of robotics',
                'Module 2: Introduction to RL',
                'Module 3: Autonomy with RL',
                'Module 4: Autonomy with dynamical systems',
                'Module 5: Introduction to Model Predictive Control',
                'Module 6: Autonomy under constraints'
            ],
            tutorialUrl: 'robot.html',
            link: 'https://rhpilab.in/robot_autonomy.html'
        }
    };

    // Popups grow out of the spot that was clicked: the click point becomes the box's transform-origin
    // (--modal-origin, see .modal-content in style.css). Keyboard clicks have no point, so they grow
    // from the centre.
    const setModalOrigin = (overlay, event) => {
        const box = overlay.querySelector('.modal-content');
        if (!event || (!event.clientX && !event.clientY)) {
            box.style.removeProperty('--modal-origin');
            return;
        }
        const x = event.clientX - box.offsetLeft;
        const y = event.clientY + overlay.scrollTop - box.offsetTop;
        box.style.setProperty('--modal-origin', `${x}px ${y}px`);
    };

    // While a popup is open the page behind it cannot scroll (html.modal-open in style.css)
    const lockPageScroll = (locked) => document.documentElement.classList.toggle('modal-open', locked);

    const modal = document.getElementById('course-modal');
    const closeModal = () => {
        if (modal) {
            modal.classList.remove('show');
            lockPageScroll(false);
        }
    };

    if (modal) {
        const closeModalBtn = document.getElementById('close-modal');
        const modalId = document.getElementById('modal-id');
        const modalTitle = document.getElementById('modal-title');
        const modalTopics = document.getElementById('modal-topics');
        const modalTutorialBtn = document.getElementById('modal-tutorial-btn');
        const modalTutorialContainer = document.getElementById('modal-tutorial-container');
        const modalFullscreenLink = document.getElementById('modal-fullscreen-link');

        document.querySelectorAll('.course-card').forEach(card => {
            card.addEventListener('click', (event) => {
                const data = courseData[card.dataset.course];

                modalId.textContent = data.id;
                modalTitle.textContent = data.title;
                // --i staggers the topics as they fade in (.modal.show #modal-topics li in style.css)
                modalTopics.innerHTML = data.topics.map((topic, i) => `<li style="--i: ${Math.min(i, 8)}">${topic}</li>`).join('');

                // Handle Tutorial Button
                if (data.tutorialUrl) {
                    modalTutorialBtn.href = data.tutorialUrl;
                    modalTutorialContainer.classList.remove('hidden');
                } else {
                    modalTutorialContainer.classList.add('hidden');
                }

                // Our own course pages open in the same tab, official course sites in a new one
                modalFullscreenLink.href = data.link;
                modalFullscreenLink.target = /^https?:/.test(data.link) ? '_blank' : '_self';
                setModalOrigin(modal, event);
                lockPageScroll(true);
                modal.classList.add('show');
            });
        });

        closeModalBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    // --- Course search (TA page) ---
    // Filters the course cards as you type. A card is matched on its semester and year, code, name,
    // short name (RL, AICPS...), instructor and, from courseData, its topics; every word typed must
    // match somewhere. The semester chips narrow the list further. Matching words are highlighted,
    // a card found only through a topic shows that topic, and the remaining cards glide into place.
    // Enter opens the card when only one is left; Esc clears. The search is kept in the address bar
    // (?course=...&semester=...) so a filtered list can be shared.
    const courseFilterInput = document.getElementById('course-filter-input');
    if (courseFilterInput) {
        const filterBox = courseFilterInput.closest('.course-filter');
        const clearButton = filterBox.querySelector('.course-filter-clear');
        const chipsBox = filterBox.querySelector('.course-filter-chips');
        const filterStatus = document.getElementById('course-filter-status');
        const courseGrid = document.getElementById('course-grid');
        const emptyState = document.querySelector('.course-filter-empty');
        const emptyTitle = emptyState.querySelector('.course-filter-empty-title');

        // lower case, no accents, punctuation as spaces ("AI31201 • Reinforcement" -> "ai31201 reinforcement")
        const fold = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
        const words = (text) => ` ${fold(text).replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;
        const escapeText = (text) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
        const IGNORED = new Set(['prof', 'professor', 'dr', 'course', 'courses']);
        const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

        const courses = [...courseGrid.querySelectorAll('.course-card')].map((card) => {
            const info = courseData[card.dataset.course] || {};
            // the card's parts (see the .ta-card markup in ta.html); each is searched and highlighted
            const fields = ['.ta-card-term', '.ta-card-code', '.ta-card-title', '.ta-card-instructor a']
                .map((selector) => card.querySelector(selector))
                .map((el) => ({ el, text: el.textContent.replace(/\s+/g, ' ').trim() }));
            const term = fields[0].text;
            const topics = (info.topics || []).filter((topic) => !/updated soon/i.test(topic))
                .map((text) => ({ text, search: words(text) }));
            // the line that names the topic when that is what matched (hidden otherwise), under the instructor
            const topicLine = document.createElement('p');
            topicLine.className = 'course-match';
            topicLine.hidden = true;
            card.querySelector('.ta-card-body').appendChild(topicLine);
            return {
                card, fields, term, topics, topicLine,
                shortname: info.shortname || '',
                // what the card shows; "fall" finds autumn courses too
                search: words([...fields.map((f) => f.text), /autumn/i.test(term) ? 'fall' : ''].join(' ')),
                alias: words(info.shortname || ''),
            };
        });

        // Wrap the searched words in <mark> (the card text is plain, so folding keeps the positions)
        const markTerms = (text, terms) => {
            if (!terms.length) {
                return escapeText(text);
            }
            const pattern = new RegExp(terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
            let html = '';
            let last = 0;
            for (const match of fold(text).matchAll(pattern)) {
                html += escapeText(text.slice(last, match.index))
                    + `<mark class="course-hit">${escapeText(text.slice(match.index, match.index + match[0].length))}</mark>`;
                last = match.index + match[0].length;
            }
            return html + escapeText(text.slice(last));
        };

        // One chip per semester, in the order the cards list them, plus "All"
        let activeTerm = '';
        const terms = [...new Set(courses.map((c) => c.term))];
        chipsBox.innerHTML = ['', ...terms].map((term) => `
            <button type="button" class="course-chip" data-term="${escapeText(term)}" aria-pressed="false">
                ${term ? escapeText(term) : 'All'}<span class="course-chip-count"></span>
            </button>`).join('');
        const chips = [...chipsBox.querySelectorAll('.course-chip')];

        const queryTermsOf = (query) => words(query).trim().split(' ').filter((t) => t && !IGNORED.has(t));
        const matchesText = (course, queryTerms) => queryTerms.every((t) => course.search.includes(t)
            || course.alias.includes(t) || course.topics.some((topic) => topic.search.includes(t)));

        const applyFilter = (animate = true) => {
            const query = courseFilterInput.value;
            const queryTerms = queryTermsOf(query);

            // where each card is on screen now (mid-animation too), so the move starts from there
            const before = new Map(courses.filter((c) => !c.card.hidden).map((c) => [c.card, c.card.getBoundingClientRect()]));
            courses.forEach((c) => c.animation?.cancel());

            let shown = 0;
            courses.forEach((course) => {
                const visible = matchesText(course, queryTerms) && (!activeTerm || course.term === activeTerm);
                course.card.hidden = !visible;
                course.fields.forEach(({ el, text }) => { el.innerHTML = markTerms(text, visible ? queryTerms : []); });
                // a word that is not on the card itself was found in a topic (or is the short name):
                // say so on the card, preferring a topic that has all of those words
                const offCard = visible ? queryTerms.filter((t) => !course.search.includes(t)) : [];
                const topicTerms = offCard.filter((t) => !course.alias.includes(t));
                const topic = topicTerms.length
                    ? course.topics.find((tp) => topicTerms.every((t) => tp.search.includes(t)))
                        || course.topics.find((tp) => topicTerms.some((t) => tp.search.includes(t)))
                    : null;
                if (topic) {
                    course.topicLine.innerHTML = `<i class="fa-solid fa-list-ul" aria-hidden="true"></i>`
                        + `<span>Topic: ${markTerms(topic.text, queryTerms)}</span>`;
                } else if (offCard.length) {
                    course.topicLine.innerHTML = `<i class="fa-solid fa-tag" aria-hidden="true"></i>`
                        + `<span>Also known as ${markTerms(course.shortname, queryTerms)}</span>`;
                } else {
                    course.topicLine.textContent = '';
                }
                course.topicLine.hidden = !topic && !offCard.length;
                shown += visible;
            });

            // chips: pressed state, and how many courses each would show with the words typed
            chips.forEach((chip) => {
                const term = chip.dataset.term;
                const count = courses.filter((c) => (!term || c.term === term) && matchesText(c, queryTerms)).length;
                chip.setAttribute('aria-pressed', String(term === activeTerm));
                chip.classList.toggle('is-empty', count === 0);
                chip.querySelector('.course-chip-count').textContent = count;
            });

            const filtered = Boolean(queryTerms.length || activeTerm);
            clearButton.hidden = !query;
            filterStatus.textContent = filtered
                ? `Showing ${shown} of ${courses.length} courses${shown === 1 ? ' · press Enter to open' : ''}`
                : `${courses.length} courses`;
            emptyState.hidden = shown > 0;
            if (!shown) {
                const inTerm = activeTerm ? ` in ${activeTerm}` : '';
                emptyTitle.textContent = queryTerms.length ? `No courses match “${query.trim()}”${inTerm}` : `No courses${inTerm}`;
            }

            // keep the search in the address bar
            const params = new URLSearchParams(location.search);
            query.trim() ? params.set('course', query.trim()) : params.delete('course');
            activeTerm ? params.set('semester', activeTerm) : params.delete('semester');
            const search = params.toString();
            history.replaceState(null, '', location.pathname + (search ? `?${search}` : '') + location.hash);

            if (!animate || prefersReducedMotion) {
                return;
            }
            // cards that stay slide from their old spot; cards that come back fade up one by one
            let entering = 0;
            courses.forEach((course) => {
                if (course.card.hidden) {
                    return;
                }
                const from = before.get(course.card);
                if (from) {
                    const to = course.card.getBoundingClientRect();
                    const dx = from.left - to.left;
                    const dy = from.top - to.top;
                    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
                        course.animation = course.card.animate(
                            [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
                            { duration: 450, easing: EASE });
                    }
                } else {
                    course.animation = course.card.animate(
                        [{ opacity: 0, transform: 'translateY(14px) scale(0.97)' }, { opacity: 1, transform: 'none' }],
                        { duration: 420, delay: Math.min(entering++, 4) * 50, easing: EASE, fill: 'backwards' });
                }
            });
            if (!shown) {
                emptyState.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
                    { duration: 350, easing: EASE });
            }
        };

        courseFilterInput.addEventListener('input', () => applyFilter());
        courseFilterInput.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && courseFilterInput.value) {
                event.preventDefault();
                courseFilterInput.value = '';
                applyFilter();
            } else if (event.key === 'Enter') {
                const visible = courses.filter((c) => !c.card.hidden);
                if (visible.length === 1) {
                    event.preventDefault();
                    visible[0].card.click();
                }
            }
        });
        clearButton.addEventListener('click', () => {
            courseFilterInput.value = '';
            applyFilter();
            courseFilterInput.focus();
        });
        chipsBox.addEventListener('click', (event) => {
            const chip = event.target.closest('.course-chip');
            if (chip) {
                // pressing the active semester again goes back to all
                activeTerm = chip.dataset.term === activeTerm ? '' : chip.dataset.term;
                applyFilter();
            }
        });
        emptyState.querySelector('.course-filter-reset').addEventListener('click', () => {
            courseFilterInput.value = '';
            activeTerm = '';
            applyFilter();
            courseFilterInput.focus();
        });

        // a shared link (ta.html?course=...&semester=...) opens with that search
        const initial = new URLSearchParams(location.search);
        courseFilterInput.value = initial.get('course') || '';
        activeTerm = terms.includes(initial.get('semester')) ? initial.get('semester') : '';
        applyFilter(false);
    }

    // --- Citation Modal (Publications page) ---
    const citeModal = document.getElementById('cite-modal');
    const citeCopyStatus = document.getElementById('cite-copy-status');
    let citeStatusTimer = null;

    const closeCiteModal = () => {
        if (citeModal) {
            citeModal.classList.remove('show');
            citeModal.setAttribute('aria-hidden', 'true');
            lockPageScroll(false);
            if (citeCopyStatus) {
                clearTimeout(citeStatusTimer);
                citeCopyStatus.classList.remove('is-visible', 'toast-pop');
                citeCopyStatus.innerHTML = '';
            }
        }
    };

    if (citeModal) {
        const citeTriggers = document.querySelectorAll('.cite-trigger');
        const closeCiteModalBtn = document.getElementById('close-cite-modal');
        const copyCiteBtn = document.getElementById('copy-cite-btn');
        const citeBibtexText = document.getElementById('cite-bibtex-text');
        const citeModalTitle = document.getElementById('cite-modal-title');

        const setCitationStatus = (message, state = 'success') => {
            if (!citeCopyStatus) return;
            clearTimeout(citeStatusTimer);

            let iconHtml = '';
            if (state === 'success') {
                iconHtml = '<svg class="shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" style="width: 1rem; height: 1rem;"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>';
            } else if (state === 'error') {
                iconHtml = '<svg class="shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" style="width: 1rem; height: 1rem;"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>';
            } else if (state === 'pending') {
                iconHtml = '<svg class="shrink-0 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true" style="width: 1rem; height: 1rem;"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
            }

            citeCopyStatus.innerHTML = `${iconHtml}<span>${message}</span>`;
            citeCopyStatus.className = 'text-sm';
            citeCopyStatus.classList.add('is-visible', `is-${state}`);

            // Trigger animation pop on each update
            citeCopyStatus.classList.remove('toast-pop');
            void citeCopyStatus.offsetWidth;
            citeCopyStatus.classList.add('toast-pop');

            if (state === 'success') {
                citeStatusTimer = setTimeout(() => {
                    citeCopyStatus.classList.remove('is-visible');
                }, 3200);
            }
        };

        const copyCitationToClipboard = () => {
            if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
                setCitationStatus('Clipboard access unavailable. Please copy manually.', 'error');
                return;
            }

            navigator.clipboard.writeText(citeBibtexText.textContent)
                .then(() => {
                    setCitationStatus('BibTeX copied to clipboard!', 'success');
                })
                .catch(() => {
                    setCitationStatus('Auto-copy failed. Please copy manually.', 'error');
                });
        };

        citeTriggers.forEach((trigger) => {
            trigger.addEventListener('click', (event) => {
                const bibtex = trigger.dataset.bibtex;
                citeModalTitle.textContent = trigger.dataset.citeTitle || 'BibTeX Citation';
                setModalOrigin(citeModal, event);
                lockPageScroll(true);
                citeModal.classList.add('show');
                citeModal.setAttribute('aria-hidden', 'false');

                if (!bibtex) {
                    citeBibtexText.textContent = '';
                    setCitationStatus('No BibTeX found for this paper.', 'error');
                    return;
                }

                citeBibtexText.textContent = bibtex;
                setCitationStatus('Copying citation...', 'pending');
                copyCitationToClipboard();
            });
        });

        copyCiteBtn.addEventListener('click', copyCitationToClipboard);
        closeCiteModalBtn.addEventListener('click', closeCiteModal);
        citeModal.addEventListener('click', (e) => {
            if (e.target === citeModal) {
                closeCiteModal();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeCiteModal();
            closeTaDropdown();
        }
    });

    // --- Deep links (e.g. talks.html#talk-self-study-2025, index.html#news) ---
    // Tailwind styles are generated at runtime, so the browser's own jump can land
    // in the wrong place; re-scroll once the page has fully laid out.
    const scrollToHashTarget = () => {
        const hash = decodeURIComponent(window.location.hash.substring(1));
        const target = hash && document.getElementById(hash);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };
    window.addEventListener('load', () => requestAnimationFrame(scrollToHashTarget));

    // --- RECENT NEWS: EXPAND OLDER (home page) ---
    const newsContainer = document.getElementById('news-container');
    const loadMoreBtn = document.getElementById('load-more-news');

    // Only the first 4 items show at first; the toggle under the list ("Older news" / "Show less")
    // opens and closes the rest. The list's height glides to its new size, and the older items fade
    // up one after another when they appear (they fade out as it closes).
    let expandOlderNews = () => {};   // also used by the site search, to open the list for a hit in it
    if (newsContainer && loadMoreBtn) {
        const NEWS_SHOWN = 4;
        const older = [...newsContainer.querySelectorAll('.news-item')].slice(NEWS_SHOWN);
        const toggleRow = loadMoreBtn.closest('.news-more');
        const label = loadMoreBtn.querySelector('.news-more-label');
        const count = loadMoreBtn.querySelector('.news-more-count');
        const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
        let expanded = false;
        let resize = null;

        const setOlderHidden = (hide) => older.forEach((item) => item.classList.toggle('hidden-news-item', hide));

        // change what is shown, letting the list's height glide from the old size to the new one
        const glide = (change, duration) => {
            const from = newsContainer.offsetHeight;
            resize?.cancel();
            change();
            const to = newsContainer.offsetHeight;
            if (prefersReducedMotion || from === to) {
                return null;
            }
            newsContainer.style.overflow = 'hidden';
            resize = newsContainer.animate([{ height: `${from}px` }, { height: `${to}px` }], { duration, easing: EASE });
            resize.onfinish = resize.oncancel = () => { newsContainer.style.overflow = ''; };
            return resize;
        };

        const render = () => {
            loadMoreBtn.setAttribute('aria-expanded', String(expanded));
            label.textContent = expanded ? 'Show less' : 'Older news';
            count.textContent = expanded ? '' : older.length;
            count.hidden = expanded;
        };

        const setExpanded = (open) => {
            if (open === expanded) {
                return;
            }
            expanded = open;
            render();
            if (open) {
                glide(() => setOlderHidden(false), 500);
                if (!prefersReducedMotion) {
                    older.forEach((item, i) => item.animate(
                        [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
                        { duration: 450, delay: 80 + i * 60, easing: EASE, fill: 'backwards' }));
                }
            } else {
                // the list closes over the older items while they fade; they are taken out at the end
                const animation = glide(() => setOlderHidden(true), 400);
                if (animation) {
                    setOlderHidden(false);   // keep them in place (clipped) during the glide
                    const fades = older.map((item) => item.animate([{ opacity: 1 }, { opacity: 0 }],
                        { duration: 200, fill: 'forwards' }));
                    const done = () => {
                        fades.forEach((fade) => fade.cancel());
                        newsContainer.style.overflow = '';
                    };
                    animation.onfinish = () => { setOlderHidden(true); done(); };
                    animation.oncancel = done;   // opened again before it finished
                }
            }
        };

        if (older.length) {
            // the section's scroll-in animation (.reveal-child) would restart each time an older item
            // is shown again and run on top of the fade below, so they skip it (they start hidden anyway)
            older.forEach((item) => { item.style.animation = 'none'; });
            setOlderHidden(true);
            toggleRow.hidden = false;
            render();
            loadMoreBtn.addEventListener('click', () => setExpanded(!expanded));
            expandOlderNews = () => {
                if (!expanded) {
                    expanded = true;
                    render();
                    setOlderHidden(false);
                }
            };
        }
    }

    // --- "New" tags on recent news (home page) ---
    // An item counts as new for 30 days. Its date comes from data-date="YYYY-MM-DD" on the .news-item
    // when present, otherwise from its "Mon YYYY" label, read as the 1st of that month.
    // This runs on every visit, so tags disappear by themselves once an item is older than that.
    const NEWS_NEW_DAYS = 60;
    const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    const newsItemDate = (item, label) => {
        if (item.dataset.date) {
            const exact = new Date(`${item.dataset.date}T00:00:00`);
            if (!Number.isNaN(exact.getTime())) {
                return exact;
            }
        }
        const match = label.trim().match(/^([A-Za-z]{3})[a-z]*\.?\s+(\d{4})$/);
        const month = match ? MONTHS.indexOf(match[1].toLowerCase()) : -1;
        return month >= 0 ? new Date(Number(match[2]), month, 1) : null;
    };

    document.querySelectorAll('.news-item').forEach((item) => {
        const dateCell = item.firstElementChild;
        const date = dateCell && newsItemDate(item, dateCell.textContent);
        const ageInDays = date ? (Date.now() - date.getTime()) / 86400000 : Infinity;

        if (ageInDays >= 0 && ageInDays <= NEWS_NEW_DAYS) {
            const tag = document.createElement('span');
            tag.className = 'news-new-tag';
            tag.textContent = 'New';
            // at the end of the news text, so every row keeps the same height
            const textCell = item.lastElementChild;
            (textCell.querySelector('p') || textCell).appendChild(tag);
            item.classList.add('is-new');
        }
    });

    // --- Site search ---
    // A search button is added to the header on every page. On first use it fetches the pages
    // listed below and indexes the text inside their <main>, so new content is searchable as soon
    // as it is published. Add any new page to SEARCH_PAGES.
    // The footer is the same on every page, so it is indexed once (from the first page) and its
    // results scroll to the footer of the page the visitor is on.
    // Clicking a result opens page.html?q=...&hit=N (plus &in=footer for footer results); the target
    // page then highlights the words and scrolls to the N-th matching block (see highlightSearchHits).
    // The tutorial notebooks are searched through a small pre-built index (SEARCH_NOTEBOOKS, made by
    // `npm run build:search`); their results open the notebook on GitHub in a new tab.
    const SEARCH_PAGES = [
        'index.html', 'publications.html', 'talks.html', 'background.html', 'ta.html',
        'rl.html', 'robot.html', 'aicps.html', 'amfai.html',
    ];
    const SEARCH_NOTEBOOKS = 'js/search-notebooks.json';
    const NOTEBOOK_RESULTS = 5; // at most this many hits per notebook, so they don't crowd out the pages
    const SEARCH_BLOCKS = 'h1, h2, h3, h4, h5, h6, p, li, td, th, dt, dd, figcaption, blockquote, div, section, article';
    const SEARCH_HEADINGS = /^H[1-4]$/;
    const MAX_RESULTS = 40;
    // the page being viewed ("/" is index.html; also copes with extension-less URLs like /talks)
    const currentFile = (() => {
        const file = decodeURIComponent(location.pathname.split('/').pop()) || 'index.html';
        return file.endsWith('.html') ? file : `${file}.html`;
    })();

    const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const queryTerms = (query) => normalize(query).split(/\s+/).filter(Boolean);
    const escapeHtml = (text) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
    const siteUrl = (path) => new URL(path, SITE_ROOT).href;

    // Split the text inside <main> into blocks: each text node belongs to its nearest block element.
    // Runs identically on fetched pages and on the live page, so block numbers match on both.
    const extractBlocks = (root) => {
        const blocks = new Map();
        let heading = '';
        // Words must stay apart across line breaks, icons, blocks and whitespace-only text
        // ("2026<br>Dept." or "<svg>…</svg>Dept." -> "2026 Dept."), so these set a pending space.
        let space = false;
        const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (node.nodeType === 1) {
                space ||= node.matches(`br, svg, img, ${SEARCH_BLOCKS}`);
                // icon-only links (e.g. the footer's LinkedIn / GitHub icons) are found by their label
                const label = node.getAttribute('aria-label');
                if (label && !node.textContent.trim() && !node.closest('.search-skip')) {
                    blocks.set(node, { element: node, heading, nodes: [], text: label });
                    space = true;
                }
                continue;
            }
            if (!node.nodeValue.trim() || node.parentElement.closest('script, style, noscript, svg, .search-skip')) {
                space = true;
                continue;
            }
            const element = node.parentElement.closest(SEARCH_BLOCKS) || root;
            if (!blocks.has(element)) {
                if (SEARCH_HEADINGS.test(element.tagName)) {
                    heading = '';
                }
                blocks.set(element, { element, heading, nodes: [], text: '' });
            }
            const block = blocks.get(element);
            block.nodes.push(node);
            block.text += (space ? ' ' : '') + node.nodeValue;
            space = false;
            if (SEARCH_HEADINGS.test(element.tagName)) {
                heading = block.text.replace(/\s+/g, ' ').trim();
            }
        }
        return [...blocks.values()].map((block) => {
            block.text = block.text.replace(/\s+/g, ' ').trim();
            block.search = normalize(block.text);
            return block;
        });
    };

    const blockMatches = (block, terms) => terms.every((term) => block.search.includes(term));

    let searchIndexPromise = null;
    const loadSearchIndex = () => {
        const pages = Promise.all(SEARCH_PAGES.map(async (url) => {
            const response = await fetch(siteUrl(url));
            if (!response.ok) {
                throw new Error(`${url}: ${response.status}`);
            }
            const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
            const title = doc.title.replace(/\s*\|\s*Ranjan Sarkar\s*$/, '').trim();
            const main = doc.querySelector('main') || doc.body;
            const footer = doc.querySelector('footer');
            return {
                url,
                title: url === 'index.html' ? 'Home' : title,
                blocks: extractBlocks(main),
                footerBlocks: footer ? extractBlocks(footer) : [],
            };
        }));
        const notebooks = fetch(siteUrl(SEARCH_NOTEBOOKS))
            .then((response) => (response.ok ? response.json() : []))
            .catch(() => []) // the pages stay searchable without the notebook index
            .then((list) => list.map((notebook) => ({
                url: notebook.url,
                title: notebook.title,
                scope: 'notebook',
                coursePage: notebook.page,
                blocks: notebook.blocks.map((block) => ({ ...block, search: normalize(block.text) })),
            })));
        searchIndexPromise ??= Promise.all([pages, notebooks]).then(([sitePages, notebookPages]) => {
            // footer hits scroll to the footer of this page (of the home page when on the 404 page)
            const footerUrl = SEARCH_PAGES.includes(currentFile) ? currentFile : 'index.html';
            const footerPage = { url: footerUrl, title: 'Footer', scope: 'footer', blocks: sitePages[0].footerBlocks };
            return [...sitePages, footerPage, ...notebookPages];
        }).catch((error) => {
            searchIndexPromise = null; // allow a retry next time
            throw error;
        });
        return searchIndexPromise;
    };

    // Escape text for HTML and wrap the searched words in <mark>
    const markHtml = (text, terms) => {
        const pattern = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
        // split() with a capture group puts the matched words at the odd positions
        return text.split(pattern).map((piece, i) => (i % 2 ? `<mark>${escapeHtml(piece)}</mark>` : escapeHtml(piece))).join('');
    };

    const snippetHtml = (text, terms) => {
        const lower = normalize(text);
        const first = Math.min(...terms.map((term) => lower.indexOf(term)).filter((i) => i >= 0));
        let start = Math.max(0, first - 60);
        let end = Math.min(text.length, first + 160);
        if (start > 0) start = text.indexOf(' ', start) + 1 || start;
        if (end < text.length) end = text.lastIndexOf(' ', end) > first ? text.lastIndexOf(' ', end) : end;
        return (start > 0 ? '… ' : '') + markHtml(text.slice(start, end), terms) + (end < text.length ? ' …' : '');
    };

    const runSearch = (pages, query) => {
        const terms = queryTerms(query);
        if (!terms.length) {
            return [];
        }
        const results = [];
        pages.forEach((page, pageOrder) => {
            const isNotebook = page.scope === 'notebook';
            if (page.scope !== 'footer' && terms.every((term) => normalize(page.title).includes(term))) {
                results.push({
                    page,
                    kind: isNotebook ? 'notebook' : 'page',
                    score: 100,
                    order: -1,
                    href: isNotebook ? page.url : siteUrl(page.url),
                    title: markHtml(page.title, terms),
                    snippet: isNotebook ? 'Open notebook on GitHub' : 'Open page',
                });
            }
            let hit = 0;
            page.blocks.forEach((block, order) => {
                if (!blockMatches(block, terms)) {
                    return;
                }
                // notebook blocks come from the pre-built index and say whether they are headings
                const { element } = block;
                const isHeading = block.isHeading ?? SEARCH_HEADINGS.test(element.tagName);
                const isLink = Boolean(element) && (element.matches('a') || (element.children.length === 1 && element.firstElementChild.matches('a')));
                const wholeWords = terms.filter((term) => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(block.search)).length;
                results.push({
                    page,
                    kind: isNotebook ? 'notebook' : isHeading ? 'heading' : isLink ? 'link' : 'text',
                    score: (isHeading ? 20 : 0) + wholeWords * 5 - (isNotebook ? 2 : 0) - pageOrder * 0.01,
                    order,
                    href: isNotebook
                        ? page.url
                        : siteUrl(`${page.url}?q=${encodeURIComponent(query.trim())}${page.scope ? `&in=${page.scope}` : ''}&hit=${hit}`),
                    // headings are their own title; other text sits under its section heading
                    title: isHeading ? snippetHtml(block.text, terms) : markHtml(block.heading || page.title, terms),
                    snippet: isHeading ? '' : snippetHtml(block.text, terms),
                });
                hit += 1;
            });
        });
        // results from the page being viewed come first, then that course's notebooks,
        // then the best matches from everywhere else
        const isHere = ({ page }) => ((!page.scope && page.url === currentFile) ? 2 : page.coursePage === currentFile ? 1 : 0);
        const perNotebook = new Map();
        return results
            .sort((a, b) => isHere(b) - isHere(a) || b.score - a.score || a.order - b.order)
            .filter(({ page }) => {
                if (page.scope !== 'notebook') {
                    return true;
                }
                perNotebook.set(page, (perNotebook.get(page) || 0) + 1);
                return perNotebook.get(page) <= NOTEBOOK_RESULTS;
            })
            .slice(0, MAX_RESULTS);
    };

    // Header button (placed before the theme toggle) and the search dialog
    const searchButton = document.createElement('button');
    searchButton.type = 'button';
    searchButton.id = 'search-button';
    searchButton.className = 'p-2 rounded-full themed-text-secondary focus:outline-none';
    searchButton.setAttribute('aria-label', 'Search this website');
    // hover tooltip (data-tip, styled in style.css); Macs show the ⌘ key
    searchButton.dataset.tip = /Mac|iPhone|iPad/.test(navigator.platform) ? 'Search (⌘K)' : 'Search (Ctrl+K)';
    searchButton.innerHTML = `<svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
        stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"/></svg>`;
    themeToggle.parentNode.insertBefore(searchButton, themeToggle);

    const searchDialog = document.createElement('div');
    searchDialog.className = 'search-overlay search-skip';
    searchDialog.hidden = true;
    searchDialog.innerHTML = `
        <div class="search-panel" role="dialog" aria-modal="true" aria-label="Search this website">
            <div class="search-field">
                <svg class="search-field-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round"
                    stroke-width="2" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"/></svg>
                <input type="search" id="search-input" placeholder="Type to search all pages of this website"
                    autocomplete="off" spellcheck="false" role="combobox" aria-expanded="false"
                    aria-controls="search-results" aria-autocomplete="list">
                <kbd class="search-esc">Esc</kbd>
            </div>
            <div class="search-body">
                <div id="search-results" class="search-results" role="listbox" aria-label="Search results"></div>
                <div class="search-footer">
                    <span class="search-status" aria-live="polite"></span>
                    <span class="search-keys" aria-hidden="true">
                        <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
                        <span><kbd>↵</kbd> open</span>
                    </span>
                </div>
            </div>
        </div>`;
    document.body.appendChild(searchDialog);

    const searchPanel = searchDialog.querySelector('.search-panel');
    const searchInput = searchDialog.querySelector('#search-input');
    const searchStatus = searchDialog.querySelector('.search-status');
    const searchResults = searchDialog.querySelector('#search-results');
    let activeResult = -1;
    let searchIsOpen = false;
    let closeTimer = null;
    let panelResize = null;
    let shownResults = new Set(); // page + block of each result on screen (hrefs change with the query)
    const resultKey = (result) => `${result.page.title}|${result.order}`;

    const icon = (path) => `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
        aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${path}"/></svg>`;
    const RESULT_ICONS = {
        page: icon('M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'),
        heading: icon('M7 20l4-16m2 16l4-16M6 9h14M4 15h14'),
        link: icon('M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1'),
        text: icon('M4 6h16M4 12h16M4 18h10'),
        notebook: icon('M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4'),
        recent: icon('M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'),
    };
    const ENTER_ICON = icon('M9 10l-5 5 5 5M20 4v7a4 4 0 01-4 4H4');
    const EXTERNAL_ICON = icon('M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14');

    // Recent searches: kept in this browser only (localStorage) and listed when the box opens empty.
    // A search is remembered when one of its results is opened.
    const RECENT_KEY = 'recent-searches';
    const RECENT_MAX = 5;
    const loadRecent = () => {
        try {
            const list = JSON.parse(localStorage.getItem(RECENT_KEY));
            return Array.isArray(list) ? list.filter((item) => typeof item === 'string').slice(0, RECENT_MAX) : [];
        } catch (e) {
            return [];
        }
    };
    const saveRecent = (list) => {
        try {
            if (list.length) {
                localStorage.setItem(RECENT_KEY, JSON.stringify(list));
            } else {
                localStorage.removeItem(RECENT_KEY);
            }
        } catch (e) {
            // storage blocked (private mode etc.): recent searches are simply not kept
        }
    };
    const rememberSearch = (query) => {
        const clean = query.trim().replace(/\s+/g, ' ');
        if (clean) {
            saveRecent([clean, ...loadRecent().filter((item) => normalize(item) !== normalize(clean))].slice(0, RECENT_MAX));
        }
    };
    const EMPTY_ICON = icon('M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0zM8.5 8.5l4 4m0-4l-4 4');

    // Change the panel's contents and let its height glide to the new size instead of jumping
    const updatePanel = (change) => {
        const from = searchPanel.offsetHeight;
        panelResize?.cancel();
        change();
        const to = searchPanel.offsetHeight;
        if (from !== to && searchIsOpen && !prefersReducedMotion) {
            panelResize = searchPanel.animate([{ height: `${from}px` }, { height: `${to}px` }],
                { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
        }
    };

    const setActiveResult = (index, scroll = true) => {
        const items = searchResults.querySelectorAll('a');
        items.forEach((item, i) => item.setAttribute('aria-selected', String(i === index)));
        activeResult = index;
        if (items[index]) {
            if (scroll) {
                items[index].scrollIntoView({ block: 'nearest' });
            }
            searchInput.setAttribute('aria-activedescendant', items[index].id);
        } else {
            searchInput.removeAttribute('aria-activedescendant');
        }
    };

    const renderResults = async () => {
        const query = searchInput.value;
        if (queryTerms(query).length === 0) {
            // an empty box is just the input (plus recent searches, if there are any)
            updatePanel(() => showIdle());
            return;
        }
        let pages;
        try {
            pages = await loadSearchIndex();
        } catch (error) {
            updatePanel(() => showMessage(location.protocol === 'file:'
                ? 'Search needs the site to be served over http (GitHub Pages or a local server), not opened as a file.'
                : 'Search is unavailable right now. Please try again.'));
            return;
        }
        if (query !== searchInput.value) {
            return; // a newer keystroke has already rendered
        }
        const results = runSearch(pages, query);
        if (!results.length) {
            updatePanel(() => showMessage(`No results for “${query.trim()}”`, 'Try another word, or check the spelling.'));
            return;
        }

        // Group the results under their page; pages are ordered by their best result
        const groups = new Map();
        results.forEach((result) => {
            if (!groups.has(result.page)) {
                groups.set(result.page, []);
            }
            groups.get(result.page).push(result);
        });

        // only results that were not already on screen fade in, one after another,
        // so typing another letter does not make the whole list flicker
        let entering = 0;
        let index = 0;
        const enterAttrs = (isNew) => (isNew ? ` is-entering" style="--enter-delay: ${Math.min(entering++, 10) * 28}ms` : '');
        const html = [...groups].map(([page, pageResults]) => {
            const isNotebook = page.scope === 'notebook';
            const groupIsNew = pageResults.some((result) => !shownResults.has(resultKey(result)));
            const items = pageResults.map((result) => `
                <a id="search-result-${index++}" role="option" aria-selected="false" href="${result.href}"
                    ${isNotebook ? 'target="_blank" rel="noopener"' : ''}
                    class="search-result is-${result.kind}${enterAttrs(!shownResults.has(resultKey(result)))}">
                    <span class="search-result-icon">${RESULT_ICONS[result.kind]}</span>
                    <span class="search-result-body">
                        <span class="search-result-title">${result.title}</span>
                        ${result.snippet ? `<span class="search-result-text">${result.snippet}</span>` : ''}
                    </span>
                    <span class="search-result-enter">${isNotebook ? EXTERNAL_ICON : ENTER_ICON}</span>
                </a>`).join('');
            return `
            <div class="search-group" role="group" aria-label="${escapeHtml(page.title)}${isNotebook ? ' (notebook)' : ''}">
                <div class="search-group-label${enterAttrs(groupIsNew)}" aria-hidden="true">${escapeHtml(page.title)}${isNotebook ? '<span class="search-group-badge">Notebook</span>' : ''}</div>
                ${items}
            </div>`;
        }).join('');
        shownResults = new Set(results.map(resultKey));

        updatePanel(() => {
            searchPanel.classList.remove('is-empty', 'is-message', 'is-recent');
            searchStatus.textContent = `${results.length}${results.length === MAX_RESULTS ? '+' : ''} result${results.length === 1 ? '' : 's'}`
                + (groups.size > 1 ? ` on ${groups.size} pages` : '');
            searchResults.innerHTML = html;
            searchResults.scrollTop = 0; // a new list starts at its first result
        });
        searchInput.setAttribute('aria-expanded', 'true');
        // no scrollIntoView here: the first result is already at the top, and scrolling while the
        // panel's height is still animating open would shift it
        setActiveResult(0, false);
    };

    // A centred message in place of the results ("No results", errors)
    function showMessage(title, hint = '') {
        searchPanel.classList.remove('is-empty', 'is-recent');
        searchPanel.classList.add('is-message');
        searchResults.innerHTML = `
            <div class="search-message">
                <span class="search-message-icon">${EMPTY_ICON}</span>
                <p class="search-message-title">${escapeHtml(title)}</p>
                ${hint ? `<p class="search-message-hint">${escapeHtml(hint)}</p>` : ''}
            </div>`;
        searchStatus.textContent = title;
        shownResults = new Set();
        searchInput.setAttribute('aria-expanded', 'false');
        setActiveResult(-1);
    }

    // Back to just the input box
    function clearResults() {
        searchPanel.classList.remove('is-message', 'is-recent');
        searchPanel.classList.add('is-empty');
        searchResults.innerHTML = '';
        searchStatus.textContent = '';
        shownResults = new Set();
        searchInput.setAttribute('aria-expanded', 'false');
        setActiveResult(-1);
    }

    // Empty box: the recent searches, or nothing but the input when there are none
    function showIdle() {
        const recent = loadRecent();
        if (!recent.length) {
            clearResults();
            return;
        }
        searchPanel.classList.remove('is-empty', 'is-message');
        searchPanel.classList.add('is-recent');
        searchResults.innerHTML = `
            <div class="search-group" role="group" aria-label="Recent searches">
                <div class="search-group-label search-recent-label">
                    <span>Recent searches</span>
                    <button type="button" class="search-recent-clear">Clear</button>
                </div>
                ${recent.map((query, i) => `
                <a id="search-result-${i}" role="option" aria-selected="false" href="#" data-recent="${escapeHtml(query)}"
                    class="search-result is-recent">
                    <span class="search-result-icon">${RESULT_ICONS.recent}</span>
                    <span class="search-result-body"><span class="search-result-title">${escapeHtml(query)}</span></span>
                    <span class="search-result-enter">${ENTER_ICON}</span>
                </a>`).join('')}
            </div>`;
        searchStatus.textContent = '';
        shownResults = new Set();
        searchInput.setAttribute('aria-expanded', 'true');
        setActiveResult(-1); // nothing preselected: Enter in the empty box does nothing
    }

    // Opening and closing fade the backdrop and let the panel rise in / sink away (see .is-open in style.css)
    const openSearch = () => {
        clearTimeout(closeTimer);
        searchIsOpen = true;
        searchDialog.hidden = false;
        void searchDialog.offsetWidth; // start the transition from the closed state
        searchDialog.classList.add('is-open');
        document.documentElement.classList.add('search-open');
        searchInput.value = '';
        showIdle();
        searchInput.focus();
        loadSearchIndex().catch(() => {}); // start fetching while the visitor types
    };

    const closeSearch = () => {
        searchIsOpen = false;
        searchDialog.classList.remove('is-open');
        document.documentElement.classList.remove('search-open');
        // hand focus back to the header button without leaving its glow on (see .focus-quiet in style.css)
        searchButton.classList.add('focus-quiet');
        searchButton.focus({ focusVisible: false });
        // clear the query and results once the closing animation has finished
        closeTimer = setTimeout(() => {
            searchDialog.hidden = true;
            searchInput.value = '';
            clearResults();
        }, prefersReducedMotion ? 0 : 220);
    };

    searchButton.addEventListener('click', openSearch);
    // any other element can open the search too, e.g. the button on the 404 page
    document.querySelectorAll('[data-open-search]').forEach((element) => element.addEventListener('click', openSearch));
    searchButton.addEventListener('blur', () => searchButton.classList.remove('focus-quiet'));
    searchInput.addEventListener('input', renderResults);
    // the mouse moves the same selection as the arrow keys, so only one row is ever highlighted
    searchResults.addEventListener('mousemove', (event) => {
        const item = event.target.closest('a');
        const index = item ? [...searchResults.querySelectorAll('a')].indexOf(item) : -1;
        if (index >= 0 && index !== activeResult) {
            setActiveResult(index, false);
        }
    });
    searchResults.addEventListener('click', (event) => {
        if (event.target.closest('.search-recent-clear')) {
            saveRecent([]);
            updatePanel(() => showIdle());
            searchInput.focus();
            return;
        }
        const item = event.target.closest('a');
        if (!item) {
            return;
        }
        if (item.dataset.recent !== undefined) {
            // a recent search: run it again
            event.preventDefault();
            searchInput.value = item.dataset.recent;
            searchInput.focus();
            renderResults();
        } else {
            rememberSearch(searchInput.value);
        }
    });
    searchDialog.addEventListener('click', (event) => {
        if (event.target === searchDialog) {
            closeSearch();
        }
    });
    searchDialog.addEventListener('keydown', (event) => {
        const count = searchResults.querySelectorAll('a').length;
        if (event.key === 'Escape') {
            event.preventDefault();
            closeSearch();
        } else if (event.key === 'ArrowDown' && count) {
            event.preventDefault();
            setActiveResult((activeResult + 1) % count);
        } else if (event.key === 'ArrowUp' && count) {
            event.preventDefault();
            setActiveResult((activeResult - 1 + count) % count);
        } else if (event.key === 'Enter' && event.target === searchInput && activeResult >= 0) {
            event.preventDefault();
            searchResults.querySelectorAll('a')[activeResult].click();
        } else if (event.key === 'Tab') {
            // keep focus inside the dialog
            const focusable = [searchInput, ...searchResults.querySelectorAll('a, button')];
            const index = focusable.indexOf(document.activeElement);
            const next = event.shiftKey ? index - 1 : index + 1;
            if (next < 0 || next >= focusable.length) {
                event.preventDefault();
                focusable[next < 0 ? focusable.length - 1 : 0].focus();
            }
        }
    });
    document.addEventListener('keydown', (event) => {
        const typing = event.target.closest('input, textarea, select, [contenteditable="true"]');
        if (!searchIsOpen && (((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') || (event.key === '/' && !typing))) {
            event.preventDefault();
            openSearch();
        }
    });

    // Arriving from a search result: highlight the words and scroll to the chosen block
    const highlightSearchHits = () => {
        const params = new URLSearchParams(location.search);
        const query = params.get('q');
        const scope = document.querySelector(params.get('in') === 'footer' ? 'footer' : 'main');
        if (!query || !scope) {
            return;
        }
        const terms = queryTerms(query);
        const matches = extractBlocks(scope).filter((block) => blockMatches(block, terms));
        const pattern = new RegExp(terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi');

        matches.forEach((block) => {
            block.nodes.forEach((node) => {
                const text = node.nodeValue;
                const lower = normalize(text);
                const fragment = document.createDocumentFragment();
                let last = 0;
                for (const match of lower.matchAll(pattern)) {
                    fragment.append(text.slice(last, match.index));
                    const mark = document.createElement('mark');
                    mark.className = 'search-hit';
                    mark.textContent = text.slice(match.index, match.index + match[0].length);
                    fragment.append(mark);
                    last = match.index + match[0].length;
                }
                if (last > 0) {
                    fragment.append(text.slice(last));
                    node.replaceWith(fragment);
                }
            });
        });

        const target = matches[Number(params.get('hit')) || 0] || matches[0];
        if (target) {
            if (target.element.closest('.hidden-news-item')) {
                expandOlderNews();   // the hit is in the collapsed older news: open it first
            }
            target.element.classList.add('search-target');
            // wait a frame so layout (fonts, scroll animations) has settled
            requestAnimationFrame(() => target.element.scrollIntoView({ block: 'center', behavior: 'smooth' }));
        }
        // tidy the address bar; the highlights stay until the page is reloaded
        params.delete('q');
        params.delete('in');
        params.delete('hit');
        const rest = params.toString();
        history.replaceState(null, '', location.pathname + (rest ? `?${rest}` : '') + location.hash);
    };
    highlightSearchHits();

    // --- SCROLL TO TOP BUTTON + header depth once the page is scrolled ---
    const scrollToTopBtn = document.getElementById('scroll-to-top');
    const siteHeader = document.querySelector('header');
    const onScroll = () => {
        if (window.scrollY > 600) {
            scrollToTopBtn.classList.add('show');
        } else {
            scrollToTopBtn.classList.remove('show');
        }
        siteHeader.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    scrollToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});
