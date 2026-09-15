// placardText.js
// Renders a station's words to a canvas texture for its in-world placard
// (decision D3, revised: text lives on the placard, not in a screen HUD).
// It receives already-structured content (segments + optional secondary
// lines) and knows nothing about which station it is. Unlit + baked dark
// background so scene lighting never reduces contrast (legibility, criterio 1).

import * as THREE from 'three';

const W = 1400;              // canvas resolution (panel is ~1.75:1)
const H = 800;
const PAD = 110;
const FAMILY = 'Helvetica, Arial, sans-serif';
const INK = '#f4efe2';
const AMBER = '#f2b705';
const JADE = '#7fd6c4';
const DIM = '#9a927e';

// Split segments into styled words, keeping whitespace runs so wrapping can
// rebuild natural spacing. Each token: { text, em, space }.
function tokenize(segments) {
  const tokens = [];
  for (const seg of segments) {
    const parts = seg.t.split(/(\s+)/);
    for (const p of parts) {
      if (p === '') continue;
      if (/^\s+$/.test(p)) tokens.push({ text: ' ', em: seg.em, space: true });
      else tokens.push({ text: p, em: seg.em, space: false });
    }
  }
  return tokens;
}

function wrap(ctx, tokens, maxWidth, fontPx) {
  const lines = [];
  let line = [];
  let width = 0;
  const measure = (tok) => {
    ctx.font = `${tok.em ? '700' : '300'} ${fontPx}px ${FAMILY}`;
    return ctx.measureText(tok.text).width;
  };
  for (const tok of tokens) {
    const w = measure(tok);
    if (!tok.space && width + w > maxWidth && line.length) {
      // drop trailing space token from the finished line
      while (line.length && line[line.length - 1].space) { width -= measure(line[line.length - 1]); line.pop(); }
      lines.push({ tokens: line, width });
      line = [];
      width = 0;
    }
    if (tok.space && line.length === 0) continue; // no leading spaces
    line.push(tok);
    width += w;
  }
  if (line.length) lines.push({ tokens: line, width });
  return lines;
}

function drawLine(ctx, line, cx, y, fontPx) {
  let x = cx - line.width / 2;
  for (const tok of line.tokens) {
    ctx.font = `${tok.em ? '700' : '300'} ${fontPx}px ${FAMILY}`;
    ctx.fillStyle = tok.em ? AMBER : INK;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(tok.text, x, y);
    x += ctx.measureText(tok.text).width;
  }
}

// content = { text: segments, handle?, photo?, photoCaption?, closing? }
export function makePlacardTexture(content) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Panel background: subtle vertical gradient + inner hairline.
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#161b22');
  grad.addColorStop(1, '#0d1116');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(242,183,5,0.28)';
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 28, W - 56, H - 56);

  const maxWidth = W - PAD * 2;

  // Main text. Closing station: each segment is its own centered line (short
  // labels, no wrapping). Otherwise: shrink font until it fits the panel.
  let fontPx = content.closing ? 58 : 82;
  let lines;
  if (content.closing) {
    lines = content.text.map((seg) => {
      const toks = tokenize([seg]);
      let width = 0;
      for (const t of toks) {
        ctx.font = `${t.em ? '700' : '300'} ${fontPx}px ${FAMILY}`;
        width += ctx.measureText(t.text).width;
      }
      return { tokens: toks, width };
    });
  } else {
    for (; fontPx >= 34; fontPx -= 4) {
      lines = wrap(ctx, tokenize(content.text), maxWidth, fontPx);
      if (lines.length * fontPx * 1.2 <= H - PAD * 2 - 70) break;
    }
  }
  const lh = fontPx * 1.2;

  // Secondary lines (handle / photo callout), smaller and dim.
  const secondary = [];
  if (content.handle) secondary.push({ text: content.handle, color: JADE });
  if (content.photo) secondary.push({ text: `FOTO ${content.photo}`, color: DIM, small: true });

  const secFont = 40;
  const secGap = secondary.length ? 40 + secondary.length * (secFont * 1.4) : 0;
  const blockH = lines.length * lh + secGap;
  let y = (H - blockH) / 2 + fontPx; // first baseline

  for (const line of lines) {
    drawLine(ctx, line, W / 2, y, fontPx);
    y += lh;
  }

  y += 24;
  for (const s of secondary) {
    ctx.font = `${s.small ? '600' : '400'} ${s.small ? 34 : secFont}px ${FAMILY}`;
    ctx.fillStyle = s.color;
    ctx.textAlign = 'center';
    ctx.fillText(s.text, W / 2, y + secFont);
    ctx.textAlign = 'left';
    y += secFont * 1.4;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

export const PLACARD_ASPECT = W / H;
