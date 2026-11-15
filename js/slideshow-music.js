// Piano music for the photography page's full-screen slideshow (js/photography.js turns it on and
// off): a small playlist of real recordings in Content/audio, played in a shuffled order with a
// gentle crossfade from one piece to the next. Turning the music off fades it out and remembers the
// place, so turning it on again carries on from there.
//   window.SlideshowMusic.start()   fades the music in (call it from a click or key press: browsers
//                                   only allow sound to start after the visitor does something)
//   window.SlideshowMusic.stop()    fades it out
//   window.SlideshowMusic.current   the piece playing now ({ title, artist, credit }), for the "now playing" label
//   'slideshow-music-track' event   fired on window when a new piece starts
//
// The recordings, and what their licences ask for (the credits are also on the page, under the gallery):
//   Scott Buckley: "In This Moment", "Wildflowers", "With These Hands", CC BY 4.0, www.scottbuckley.com.au
//   Erik Satie, Gymnopédie No. 1, played by Robin Alciatore: public domain (Wikimedia Commons)
//   Claude Debussy, Clair de lune, played by Laurens Goedhart: public domain (Wikimedia Commons)
// All five were re-encoded to 128 kbps MP3 at an even loudness, so no piece is louder than the others.
(() => {
    // credit: shown after the title in the full-screen view's "now playing" label
    const TRACKS = [
        { src: 'Content/audio/in-this-moment.mp3', title: 'In This Moment', artist: 'Scott Buckley', credit: 'Scott Buckley · CC BY 4.0' },
        { src: 'Content/audio/wildflowers.mp3', title: 'Wildflowers', artist: 'Scott Buckley', credit: 'Scott Buckley · CC BY 4.0' },
        { src: 'Content/audio/gymnopedie-no-1.mp3', title: 'Gymnopédie No. 1', artist: 'Erik Satie', credit: 'Erik Satie · played by Robin Alciatore' },
        { src: 'Content/audio/with-these-hands.mp3', title: 'With These Hands', artist: 'Scott Buckley', credit: 'Scott Buckley · CC BY 4.0' },
        { src: 'Content/audio/clair-de-lune.mp3', title: 'Clair de lune', artist: 'Claude Debussy', credit: 'Claude Debussy · played by Laurens Goedhart' },
    ];
    const VOLUME = 0.7;
    const FADE_IN_MS = 2500;
    const FADE_OUT_MS = 1200;
    const CROSSFADE_S = 4;        // the next piece starts this many seconds before the current one ends

    // a shuffled order, reshuffled each time round (never starting with the piece that just ended)
    let order = [];
    let position = -1;
    const shuffle = () => {
        const last = order[order.length - 1];
        order = TRACKS.map((_, i) => i);
        for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [order[i], order[j]] = [order[j], order[i]];
        }
        if (order.length > 1 && order[0] === last) [order[0], order[1]] = [order[1], order[0]];
    };

    // volume fades, a few steps a frame; each audio element has at most one fade running
    const fades = new WeakMap();
    const fade = (audio, to, ms, done) => {
        cancelAnimationFrame(fades.get(audio));
        const from = audio.volume;
        const started = performance.now();
        const step = (now) => {
            const t = Math.min(1, (now - started) / ms);
            audio.volume = Math.max(0, Math.min(1, from + (to - from) * t));
            if (t < 1) fades.set(audio, requestAnimationFrame(step));
            else if (done) done();
        };
        fades.set(audio, requestAnimationFrame(step));
    };

    let audio = null;       // the piece playing (or paused) now
    let playing = false;
    let current = null;

    const quietly = (result) => { if (result && result.catch) result.catch(() => { }); };

    const load = () => {
        position += 1;
        if (position >= order.length || order.length === 0) {
            shuffle();
            position = 0;
        }
        const track = TRACKS[order[position]];
        const element = new Audio();
        element.preload = 'auto';
        element.src = track.src;
        element.volume = 0;
        // a little before the end, the next piece starts and the two cross-fade
        element.addEventListener('timeupdate', () => {
            if (element !== audio || !playing || !element.duration) return;
            if (element.duration - element.currentTime <= CROSSFADE_S) next();
        });
        // a piece that fails to load is skipped
        element.addEventListener('error', () => { if (element === audio && playing) next(); });
        current = track;
        return element;
    };

    const announce = () => window.dispatchEvent(new CustomEvent('slideshow-music-track', { detail: current }));

    const next = () => {
        const old = audio;
        fade(old, 0, CROSSFADE_S * 1000, () => old.pause());
        audio = load();
        quietly(audio.play());
        fade(audio, VOLUME, CROSSFADE_S * 1000);
        announce();
    };

    const start = () => {
        if (playing) return;
        playing = true;
        if (!audio) {
            audio = load();
            announce();
        }
        quietly(audio.play());
        fade(audio, VOLUME, FADE_IN_MS);
    };

    const stop = () => {
        if (!playing) return;
        playing = false;
        const element = audio;
        fade(element, 0, FADE_OUT_MS, () => { if (!playing) element.pause(); });
    };

    window.SlideshowMusic = {
        start,
        stop,
        get playing() { return playing; },
        get current() { return current; },
    };
})();
