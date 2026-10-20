import { tr } from '../core/lang';

/**
 * Cartes à partager : une image de 1080 × 1350 (format portrait des messageries) dessinée
 * sur l'appareil, avec le compagnon du joueur. Rien n'est envoyé nulle part sans son geste.
 */

export type CardSpec =
  | {
      kind: 'result';
      game: string;
      level: number;
      score: number;
      stars: number;
      /** Couleur du domaine (valeur CSS). */
      color: string;
      line?: string;
      mascot?: SVGSVGElement | null;
    }
  | { kind: 'age'; age: number; verdict: string; mascot?: SVGSVGElement | null }
  | {
      kind: 'month';
      /** « octobre 2026 ». */
      month: string;
      /** Quatre chiffres clés : valeur et libellé. */
      figures: [string, string][];
      line?: string;
      mascot?: SVGSVGElement | null;
    };

const W = 1080;
const H = 1350;
const INK = '#1d1838';
const SOFT = '#6b6680';
const SITE = 'alexxxx-droid.github.io/esprit-vif';

/** Copie dans le dessin les couleurs que la feuille de style lui donne (une image n'a pas de CSS). */
async function mascotImage(svg: SVGSVGElement, size: number): Promise<HTMLImageElement | null> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const source = [svg, ...svg.querySelectorAll('*')];
  const target = [clone, ...clone.querySelectorAll('*')];
  const props = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'font-family', 'font-size', 'font-weight'];
  source.forEach((element, i) => {
    const style = getComputedStyle(element);
    for (const prop of props) target[i].setAttribute(prop, style.getPropertyValue(prop));
    target[i].removeAttribute('class');
  });
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(size));
  clone.setAttribute('height', String(size));
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
  try {
    await image.decode();
    return image;
  } catch {
    return null;
  }
}

/** Mélange une couleur « #rrggbb » avec une autre (0 = la première, 1 = la seconde). */
function mix(hex: string, other: string, amount: number): string {
  const parse = (h: string) => (/^#[0-9a-f]{6}$/i.test(h) ? [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) : null);
  const a = parse(hex);
  const b = parse(other);
  if (!a || !b) return other;
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * amount)).join(' ')})`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, filled: boolean) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
  }
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = '#f5b800';
    ctx.fill();
  } else {
    ctx.strokeStyle = '#c9c4d6';
    ctx.lineWidth = 8;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

/** Coupe un texte en lignes qui tiennent dans la largeur donnée. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export async function renderCard(spec: CardSpec, day: string): Promise<Blob> {
  await document.fonts.ready;
  const font = getComputedStyle(document.body).fontFamily;
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4b39ef';
  const color = spec.kind === 'result' ? spec.color : accent;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Dessin impossible sur cet appareil.');

  // Fond : la couleur du domaine, qui s'assombrit vers le bas.
  const bg = ctx.createLinearGradient(0, 0, W * 0.4, H);
  bg.addColorStop(0, color);
  bg.addColorStop(1, mix(color, '#120e2a', 0.45));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgb(255 255 255 / 10%)';
  ctx.beginPath();
  ctx.arc(W - 120, 140, 260, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `800 58px ${font}`;
  ctx.fillText('Esprit Vif', 84, 150);
  ctx.font = `600 34px ${font}`;
  ctx.fillText(day, 84, 202);

  // La carte blanche.
  ctx.shadowColor = 'rgb(0 0 0 / 25%)';
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 72, 270, W - 144, 800, 64);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.textAlign = 'center';

  if (spec.kind === 'result') {
    ctx.fillStyle = INK;
    ctx.font = `800 58px ${font}`;
    ctx.fillText(spec.game, W / 2, 390);
    ctx.fillStyle = SOFT;
    ctx.font = `600 36px ${font}`;
    ctx.fillText(tr(`niveau ${spec.level}`, `level ${spec.level}`), W / 2, 445);
    ctx.fillStyle = INK;
    ctx.font = `800 300px ${font}`;
    const scoreWidth = ctx.measureText(String(spec.score)).width;
    ctx.fillText(String(spec.score), W / 2 - 40, 760);
    ctx.textAlign = 'left';
    ctx.fillStyle = SOFT;
    ctx.font = `700 64px ${font}`;
    ctx.fillText('/100', W / 2 - 40 + scoreWidth / 2 + 8, 760);
    ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) star(ctx, W / 2 + (i - 1) * 110, 860, 44, i < spec.stars);
    if (spec.line) {
      ctx.fillStyle = SOFT;
      ctx.font = `600 38px ${font}`;
      wrap(ctx, spec.line, 760).forEach((l, i) => ctx.fillText(l, W / 2, 955 + i * 48));
    }
  } else if (spec.kind === 'month') {
    ctx.fillStyle = SOFT;
    ctx.font = `700 42px ${font}`;
    ctx.fillText(tr('Mon mois', 'My month'), W / 2, 380);
    ctx.fillStyle = INK;
    ctx.font = `800 76px ${font}`;
    ctx.fillText(spec.month, W / 2, 470);
    spec.figures.slice(0, 4).forEach(([value, label], i) => {
      const x = W / 2 + (i % 2 === 0 ? -200 : 200);
      const y = 640 + Math.floor(i / 2) * 210;
      ctx.fillStyle = INK;
      ctx.font = `800 120px ${font}`;
      ctx.fillText(value, x, y);
      ctx.fillStyle = SOFT;
      ctx.font = `600 36px ${font}`;
      ctx.fillText(label, x, y + 52);
    });
    if (spec.line) {
      ctx.fillStyle = INK;
      ctx.font = `600 36px ${font}`;
      wrap(ctx, spec.line, 820).forEach((l, i) => ctx.fillText(l, W / 2, 1000 + i * 46));
    }
  } else {
    ctx.fillStyle = SOFT;
    ctx.font = `700 46px ${font}`;
    ctx.fillText(tr('Mon âge cérébral', 'My brain age'), W / 2, 400);
    ctx.fillStyle = INK;
    ctx.font = `800 300px ${font}`;
    const ageWidth = ctx.measureText(String(spec.age)).width;
    ctx.fillText(String(spec.age), W / 2 - 60, 700);
    ctx.textAlign = 'left';
    ctx.font = `700 80px ${font}`;
    ctx.fillText(tr('ans', 'years'), W / 2 - 60 + ageWidth / 2 + 12, 700);
    ctx.textAlign = 'center';
    ctx.fillStyle = INK;
    ctx.font = `600 40px ${font}`;
    wrap(ctx, spec.verdict, 780).forEach((l, i) => ctx.fillText(l, W / 2, 820 + i * 54));
    ctx.fillStyle = SOFT;
    ctx.font = `500 30px ${font}`;
    ctx.fillText(tr('Indicateur ludique, pas une mesure médicale.', 'A playful indicator, not a medical measure.'), W / 2, 1020);
  }

  if (spec.mascot) {
    const image = await mascotImage(spec.mascot, 300);
    if (image) ctx.drawImage(image, W - 360, 1000, 300, 300);
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 44px ${font}`;
  ctx.fillText(tr('À ton tour ?', 'Your turn?'), 84, 1200);
  ctx.font = `600 32px ${font}`;
  ctx.fillText(SITE, 84, 1252);

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Image impossible.'))), 'image/png'));
}
