// Shared behaviour for every page of the site.
// Each page sets <body data-page="..."> (and data-course="..." on course pages)
// so the header can highlight where the visitor currently is.
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
    };

    syncThemeIcons();

    themeToggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        if (document.documentElement.classList.contains('dark')) {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.setItem('theme', 'light');
        }
        syncThemeIcons();
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

    const modal = document.getElementById('course-modal');
    const closeModal = () => {
        if (modal) {
            modal.classList.remove('show');
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
            card.addEventListener('click', () => {
                const data = courseData[card.dataset.course];

                modalId.textContent = data.id;
                modalTitle.textContent = data.title;
                modalTopics.innerHTML = data.topics.map(topic => `<li>${topic}</li>`).join('');

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

    // --- Citation Modal (Publications page) ---
    const citeModal = document.getElementById('cite-modal');
    const closeCiteModal = () => {
        if (citeModal) {
            citeModal.classList.remove('show');
            citeModal.setAttribute('aria-hidden', 'true');
        }
    };

    if (citeModal) {
        const citeTriggers = document.querySelectorAll('.cite-trigger');
        const closeCiteModalBtn = document.getElementById('close-cite-modal');
        const copyCiteBtn = document.getElementById('copy-cite-btn');
        const citeBibtexText = document.getElementById('cite-bibtex-text');
        const citeCopyStatus = document.getElementById('cite-copy-status');
        const citeModalTitle = document.getElementById('cite-modal-title');

        const setCitationStatus = (message, isError = false) => {
            citeCopyStatus.textContent = message;
            citeCopyStatus.classList.remove('themed-accent', 'text-red-500');
            citeCopyStatus.classList.add(isError ? 'text-red-500' : 'themed-accent');
        };

        const copyCitationToClipboard = () => {
            if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
                setCitationStatus('Clipboard access is unavailable. Please copy the BibTeX text manually.', true);
                return;
            }

            navigator.clipboard.writeText(citeBibtexText.textContent)
                .then(() => {
                    setCitationStatus('BibTeX copied to clipboard!');
                })
                .catch(() => {
                    setCitationStatus('Auto-copy failed. Please use the copy button again or copy manually.', true);
                });
        };

        citeTriggers.forEach((trigger) => {
            trigger.addEventListener('click', () => {
                const bibtex = trigger.dataset.bibtex;
                citeModalTitle.textContent = trigger.dataset.citeTitle || 'BibTeX Citation';
                citeModal.classList.add('show');
                citeModal.setAttribute('aria-hidden', 'false');

                if (!bibtex) {
                    citeBibtexText.textContent = '';
                    setCitationStatus('No BibTeX found for this paper. Add data-bibtex on its Cite button.', true);
                    return;
                }

                citeBibtexText.textContent = bibtex;
                setCitationStatus('Copying citation...');
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

    if (newsContainer && loadMoreBtn) {
        const newsItems = newsContainer.querySelectorAll('.news-item');

        // Initially hide items beyond the first 4
        if (newsItems.length > 4) {
            loadMoreBtn.classList.remove('hidden');
            newsItems.forEach((item, index) => {
                if (index >= 4) {
                    item.classList.add('hidden-news-item');
                }
            });
        }

        loadMoreBtn.addEventListener('click', () => {
            newsItems.forEach(item => {
                item.classList.remove('hidden-news-item');
            });
            loadMoreBtn.style.display = 'none'; // Hide the button after expanding
        });
    }

    // --- "New" tags on recent news (home page) ---
    // An item counts as new for 30 days. Its date comes from data-date="YYYY-MM-DD" on the .news-item
    // when present, otherwise from its "Mon YYYY" label, read as the 1st of that month.
    // This runs on every visit, so tags disappear by themselves once an item is older than that.
    const NEWS_NEW_DAYS = 30;
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

    // --- SCROLL TO TOP BUTTON ---
    const scrollToTopBtn = document.getElementById('scroll-to-top');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 600) {
            scrollToTopBtn.classList.add('show');
        } else {
            scrollToTopBtn.classList.remove('show');
        }
    });
    scrollToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});
