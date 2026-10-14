// Build editable PPTX from extracted slide boxes.
const pptxgen = require('pptxgenjs');
const fs = require('fs');
const slides = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const OUT = process.argv[3];

const SECTIONS = {
  'cover': 'Вступление', 'map-rsbu-msfo': 'Карта отчётности', 'bonds': 'Облигация',
  'romashka': 'Практика: Ромашка', 'stocks': 'Акция', 'vasilek': 'Практика: Василёк', 'monitor-sources': 'Мониторинг и итог',
};

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5 in = 1920 x 1080 px at 144 px/in
pres.title = 'Анализ финансовой отчётности: акция или облигация';
pres.theme = { headFontFace: 'Arial', bodyFontFace: 'Arial' };
const IN = px => px / 144;
const PT = px => px * 0.5;

let section = null;
for (const s of slides) {
  if (SECTIONS[s.id]) { section = SECTIONS[s.id]; pres.addSection({ title: section }); }
  const slide = pres.addSlide({ sectionTitle: section });
  slide.background = { color: s.bg || 'ECF0EB' };
  let n = 0;
  for (const it of s.items) {
    n++;
    if (it.t === 'rect') {
      if (it.w < 1 || it.h < 1) continue;
      const o = { x: IN(it.x), y: IN(it.y), w: IN(it.w), h: IN(it.h), objectName: `${s.id}-box-${n}` };
      o.fill = it.fill ? { color: it.fill } : { type: 'none' };
      o.line = it.line ? { color: it.line, width: Math.max(0.5, PT(it.lw)) } : { type: 'none' };
      if (it.r > 0) {
        o.rectRadius = Math.min(0.5, it.r / Math.min(it.w, it.h));
        slide.addShape(pres.ShapeType.roundRect, o);
      } else slide.addShape(pres.ShapeType.rect, o);
    } else if (it.t === 'line') {
      const o = { x: IN(it.x), y: IN(it.y), w: IN(it.w), h: IN(it.h), line: { color: it.color, width: Math.max(0.5, PT(it.wpx)) }, objectName: `${s.id}-line-${n}` };
      if (it.arrow) { o.line.endArrowType = 'triangle'; o.y = IN(it.y + it.h / 2); o.h = 0; }
      slide.addShape(pres.ShapeType.line, o);
    } else if (it.t === 'icon') {
      slide.addShape(pres.ShapeType.triangle, { x: IN(it.x), y: IN(it.y + it.h * 0.08), w: IN(it.w), h: IN(it.h * 0.84), fill: { color: it.color }, line: { type: 'none' }, objectName: `${s.id}-warning-${n}` });
      slide.addText('!', { x: IN(it.x), y: IN(it.y + it.h * 0.3), w: IN(it.w), h: IN(it.h * 0.6), fontSize: PT(it.h * 0.5), bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', margin: 0, isTextBox: true });
    } else if (it.t === 'text') {
      const runs = it.runs.map((r, i) => ({
        text: r.text,
        options: { color: r.color || '16201B', bold: r.bold, fontFace: r.mono ? 'Courier New' : 'Arial', ...(r.href ? { hyperlink: { url: r.href } } : {}) },
      }));
      // 6% slack in width so PowerPoint does not wrap earlier than Chromium did
      const slack = it.align === 'right' ? 0 : it.w * 0.03;
      slide.addText(runs, {
        x: IN(it.align === 'right' ? it.x - it.w * 0.03 : it.x), y: IN(it.y), w: IN(it.w + Math.abs(slack) + (it.align === 'right' ? it.w * 0.03 : 0)), h: IN(Math.max(it.h, it.size * it.lh)),
        fontSize: PT(it.size), lineSpacing: PT(it.size * it.lh), align: it.align, valign: 'top', margin: 0,
        charSpacing: it.ls ? PT(it.ls) : undefined, fit: 'none', isTextBox: true, objectName: `${s.id}-text-${n}`,
      });
    }
  }
  if (s.notes && !process.env.NO_NOTES) slide.addNotes(s.notes);
}
pres.writeFile({ fileName: OUT }).then(f => console.log('written', f));
