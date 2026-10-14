// Render each slide HTML in Chromium (Arial / Courier New metrics) and dump boxes + text runs as JSON.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SRC = process.argv[2];
const deck = JSON.parse(fs.readFileSync(path.join(SRC, 'deck.json'), 'utf8'));

const CSS = `
*{margin:0;box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff}
section{position:relative;width:1920px;height:1080px;overflow:hidden;line-height:1.4}
h1,h2,h3{font-weight:600}
p,h1,h2,h3{white-space:normal;overflow-wrap:normal}
ul,ol{padding-left:40px}
table{border-collapse:collapse;width:100%}
td,th{padding:0.35em 0.6em;border-bottom:1px solid #CDD7D0;text-align:left;vertical-align:top;font-weight:inherit}
th{font-weight:600}
aside{display:none}
x-connector{display:block;height:0;border-top:2px solid currentColor;align-self:center}
x-icon{display:block}
`;

function fontMap(html) {
  return html
    .replace(/'Unbounded',\s*Arial,\s*sans-serif/g, "Arial")
    .replace(/'Onest',\s*Arial,\s*sans-serif/g, "Arial")
    .replace(/'JetBrains Mono',\s*'Courier New',\s*monospace/g, "'Courier New'");
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const out = [];
  for (const id of deck.order) {
    const html = fontMap(fs.readFileSync(path.join(SRC, 'slides', id + '.html'), 'utf8'));
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${html}</body></html>`);
    const data = await page.evaluate(() => {
      const sec = document.querySelector('section');
      const base = sec.getBoundingClientRect();
      const items = [];
      const rgb = c => {
        const m = c && c.match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const p = m[1].split(',').map(s => parseFloat(s));
        if (p.length === 4 && p[3] === 0) return null;
        return p.slice(0, 3).map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
      };
      const box = el => { const r = el.getBoundingClientRect(); return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height }; };
      const TEXT = new Set(['P', 'H1', 'H2', 'H3', 'TD', 'TH', 'LI']);
      const walk = el => {
        if (el.tagName === 'ASIDE') return;
        const cs = getComputedStyle(el);
        const b = box(el);
        if (el.tagName === 'X-CONNECTOR') { items.push({ t: 'line', ...b, color: rgb(cs.borderTopColor) || '5A6860', wpx: parseFloat(cs.borderTopWidth) || 2, arrow: true }); return; }
        if (el.tagName === 'X-ICON') { items.push({ t: 'icon', ...b, color: rgb(cs.color) || 'A63326' }); return; }
        if (el !== sec) {
          const bg = rgb(cs.backgroundColor);
          const sides = ['Top', 'Right', 'Bottom', 'Left'].map(s => ({ s, w: parseFloat(cs['border' + s + 'Width']) || 0, c: rgb(cs['border' + s + 'Color']), st: cs['border' + s + 'Style'] }));
          const all = sides.every(s => s.w > 0 && s.st !== 'none' && s.c && s.w === sides[0].w && s.c === sides[0].c);
          const radius = parseFloat(cs.borderTopLeftRadius) || 0;
          if (bg || all) items.push({ t: 'rect', ...b, fill: bg, line: all ? sides[0].c : null, lw: all ? sides[0].w : 0, r: radius });
          if (!all) for (const s of sides) {
            if (s.w > 0 && s.st !== 'none' && s.c) {
              const L = { t: 'line', color: s.c, wpx: s.w };
              if (s.s === 'Top') Object.assign(L, { x: b.x, y: b.y, w: b.w, h: 0 });
              if (s.s === 'Bottom') Object.assign(L, { x: b.x, y: b.y + b.h, w: b.w, h: 0 });
              if (s.s === 'Left') Object.assign(L, { x: b.x, y: b.y, w: 0, h: b.h });
              if (s.s === 'Right') Object.assign(L, { x: b.x + b.w, y: b.y, w: 0, h: b.h });
              items.push(L);
            }
          }
        }
        if (TEXT.has(el.tagName)) {
          const runs = [];
          const collect = (node, inherit) => {
            for (const n of node.childNodes) {
              if (n.nodeType === 3) {
                const ps = getComputedStyle(n.parentElement);
                let txt = n.textContent.replace(/\s+/g, ' ');
                if (ps.textTransform === 'uppercase') txt = txt.toUpperCase();
                if (txt) runs.push({ text: txt, color: rgb(ps.color), bold: parseInt(ps.fontWeight) >= 600, mono: /Courier/.test(ps.fontFamily), href: n.parentElement.closest('a') ? n.parentElement.closest('a').href : null });
              } else if (n.nodeType === 1 && n.tagName !== 'BR') collect(n);
            }
          };
          collect(el);
          if (runs.length) {
            runs[0].text = runs[0].text.replace(/^\s+/, '');
            runs[runs.length - 1].text = runs[runs.length - 1].text.replace(/\s+$/, '');
            const pl = parseFloat(cs.paddingLeft), pr = parseFloat(cs.paddingRight), pt = parseFloat(cs.paddingTop), pb = parseFloat(cs.paddingBottom);
            const fs = parseFloat(cs.fontSize);
            const lh = cs.lineHeight === 'normal' ? fs * 1.2 : parseFloat(cs.lineHeight);
            items.push({ t: 'text', x: b.x + pl, y: b.y + pt, w: b.w - pl - pr, h: b.h - pt - pb, size: fs, lh: lh / fs, align: cs.textAlign === 'right' || cs.textAlign === 'end' ? 'right' : (cs.textAlign === 'center' ? 'center' : 'left'), ls: parseFloat(cs.letterSpacing) || 0, runs });
          }
          return;
        }
        for (const c of el.children) walk(c);
      };
      walk(sec);
      const aside = sec.querySelector('aside');
      return { bg: rgb(getComputedStyle(sec).backgroundColor), items, notes: aside ? aside.textContent.trim() : '' };
    });
    data.id = id;
    out.push(data);
  }
  await browser.close();
  fs.writeFileSync(process.argv[3], JSON.stringify(out));
  console.log('slides', out.length);
})();
