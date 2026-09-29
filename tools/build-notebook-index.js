// Builds js/search-notebooks.json: the text of the tutorial notebooks, for the site search.
// The notebooks themselves are several MB each (saved outputs and plots), far too big to fetch while
// searching, so this keeps only the headings and text of their markdown cells.
//
// Only notebooks linked from a page ("View" buttons on the course pages) are indexed, and each is
// named after the tutorial card that links it.  Re-run after adding or editing a tutorial:
//     npm run build:search
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUTPUT = path.join(ROOT, 'js', 'search-notebooks.json');

const decodeEntities = (text) => text
    .replace(/&nbsp;|&ensp;|&emsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&plus;/g, '+')
    .replace(/&times;/g, '×')
    .replace(/&bull;/g, '•')
    .replace(/&rarr;/g, '→')
    .replace(/&larr;/g, '←')
    .replace(/&#(\d+);/g, (entity, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (entity, code) => String.fromCodePoint(parseInt(code, 16)));

const stripTags = (html) => decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

// LaTeX math -> readable text for snippets: "\gamma V_{k+1}(s)" -> "γ V k+1(s)"
const LATEX_SYMBOLS = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', theta: 'θ', lambda: 'λ',
    mu: 'μ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ', omega: 'ω', Delta: 'Δ', Sigma: 'Σ', Pi: 'Π',
    sum: 'Σ', prod: 'Π', int: '∫', infty: '∞', in: '∈', notin: '∉', forall: '∀', exists: '∃', mid: '∣',
    ast: '∗', star: '∗', prime: '′', dots: '…', ldots: '…', cdots: '…',
    cdot: '·', times: '×', le: '≤', leq: '≤', ge: '≥', geq: '≥', neq: '≠', approx: '≈', sim: '~',
    leftarrow: '←', rightarrow: '→', to: '→', gets: '←', Rightarrow: '⇒', nabla: '∇', partial: '∂',
    max: 'max', min: 'min', arg: 'arg', log: 'log', exp: 'exp', mathbb: '', mathcal: '', mathbf: '',
    text: '', textbf: '', operatorname: '', left: '', right: '', big: '', Big: '', quad: ' ', qquad: ' ',
};
// (applied to the whole cell, since math also appears in \begin{equation} blocks without $ signs)
const latexText = (text) => text
    .replace(/\\(begin|end)\{[^}]*\}/g, ' ')           // \begin{equation} ... \end{equation}
    .replace(/\\\{/g, '\u0001').replace(/\\\}/g, '\u0002') // escaped set braces \{0, 1\} are kept
    .replace(/\\([a-zA-Z]+)/g, (command, name) => (name in LATEX_SYMBOLS ? ` ${LATEX_SYMBOLS[name]} ` : ` ${name} `))
    .replace(/\\[,;:! ]|\\\\|[{}^]/g, ' ')
    .replace(/\u0001/g, '{').replace(/\u0002/g, '}');

// Markdown -> plain text, good enough for searching and for result snippets
const plainText = (markdown) => stripTags(latexText(markdown)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')         // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')        // links -> their text
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '') // heading marks, quotes, list bullets
    .replace(/[*_~`|$]/g, ' ')                      // emphasis, code, table pipes, stray math delimiters
    .replace(/\s+([,.;:)])/g, '$1')                 // no space before punctuation left by the above
    .replace(/\(\s+/g, '('));

// Split one markdown cell into blocks: every heading line is its own block,
// other lines are grouped into paragraphs by blank lines.
const markdownBlocks = (source) => {
    const blocks = [];
    let paragraph = [];
    const flush = () => {
        const text = plainText(paragraph.join('\n'));
        if (text) {
            blocks.push({ text, isHeading: false });
        }
        paragraph = [];
    };
    source.split('\n').forEach((line) => {
        if (/^\s{0,3}#{1,6}\s+/.test(line)) {
            flush();
            const text = plainText(line);
            if (text) {
                blocks.push({ text, isHeading: true });
            }
        } else if (!line.trim()) {
            flush();
        } else {
            paragraph.push(line);
        }
    });
    flush();
    return blocks;
};

// Find the notebooks linked from each page, named after the nearest <h3> before the link
const linkedNotebooks = new Map();
fs.readdirSync(ROOT).filter((file) => file.endsWith('.html')).sort().forEach((page) => {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    const course = stripTags((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '').split(/\s[•|]\s/)[0];
    const pattern = /<h3[^>]*>([\s\S]*?)<\/h3>|href="([^"]*\/blob\/[^/]+\/(Tutorial\/[^"]+\.ipynb))"/g;
    let heading = '';
    for (const match of html.matchAll(pattern)) {
        if (match[1] !== undefined) {
            heading = stripTags(match[1]);
        } else if (!linkedNotebooks.has(match[3])) {
            linkedNotebooks.set(match[3], { url: match[2], title: `${course} · ${heading}`, page });
        }
    }
});

const notebooks = [...linkedNotebooks].map(([file, info]) => {
    const notebook = JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
    let heading = '';
    const blocks = [];
    notebook.cells
        .filter((cell) => cell.cell_type === 'markdown')
        .forEach((cell) => {
            const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
            markdownBlocks(source).forEach((block) => {
                blocks.push({ ...block, heading: block.isHeading ? '' : heading });
                if (block.isHeading) {
                    heading = block.text;
                }
            });
        });
    return { ...info, blocks };
});

fs.writeFileSync(OUTPUT, `${JSON.stringify(notebooks)}\n`);
console.log(`Indexed ${notebooks.length} notebooks (${notebooks.reduce((n, nb) => n + nb.blocks.length, 0)} text blocks) -> ${path.relative(ROOT, OUTPUT)} (${Math.round(fs.statSync(OUTPUT).size / 1024)} KB)`);
