const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');
const dateInput = document.getElementById('dateInput');
const textInput = document.getElementById('textInput');
const charCount = document.getElementById('charCount');
const downloadBtn = document.getElementById('downloadBtn');

// デフォルトは生成する日（今日）
function todayString() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + dd;
}
dateInput.value = todayString();
dateInput.addEventListener('input', render);

const TITLE = '#NEO郷さんぽ';
let photoImg = null;

const W = 1080, H = 1920;
const MARGIN_X = 100;
const CONTENT_W = W - MARGIN_X * 2; // 880

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') fileInput.click();
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      photoImg = img;
      dropzone.textContent = file.name;
      dropzone.classList.add('has-image');
      render();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

textInput.addEventListener('input', () => {
  charCount.textContent = textInput.value.length;
  render();
});

function wrapText(context, text, maxWidth) {
  // 日本語想定：文字単位で改行判定（既存の改行はそのまま尊重）
  const paragraphs = text.split('\n');
  const lines = [];
  paragraphs.forEach(paragraph => {
    if (paragraph === '') { lines.push(''); return; }
    let current = '';
    for (const ch of paragraph) {
      const test = current + ch;
      if (context.measureText(test).width > maxWidth && current !== '') {
        lines.push(current);
        current = ch;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
  });
  return lines;
}

function drawPhotoSquare(img, x, y, size) {
  const sw = img.width, sh = img.height;
  const side = Math.min(sw, sh);
  const sx = (sw - side) / 2;
  const sy = (sh - side) / 2;
  ctx.drawImage(img, sx, sy, side, side, x, y, size, size);
}

function formatDate() {
  const val = dateInput.value; // "YYYY-MM-DD"
  if (!val) return '';
  const [y, m, d] = val.split('-').map(Number);
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return y + '.' + mm + '.' + dd;
}

function drawRoundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function getAverageBrightness(x, y, w, h) {
  x = Math.max(0, Math.round(x));
  y = Math.max(0, Math.round(y));
  w = Math.max(1, Math.round(Math.min(w, W - x)));
  h = Math.max(1, Math.round(Math.min(h, H - y)));
  const data = ctx.getImageData(x, y, w, h).data;
  let total = 0, count = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    total += 0.299 * r + 0.587 * g + 0.114 * b; // 知覚輝度
    count++;
  }
  return total / count; // 0(暗い)〜255(明るい)
}

function drawBackground() {
  // ベースの下地色（画像読み込み前やはみ出し部分の保険）
  ctx.fillStyle = '#efefef';
  ctx.fillRect(0, 0, W, H);

  if (photoImg) {
    // 高さ基準で拡大し、横方向は中央配置（はみ出た分はクロップ）
    const scale = H / photoImg.height;
    const drawW = photoImg.width * scale;
    const drawH = H;
    const dx = (W - drawW) / 2;

    ctx.save();
    ctx.filter = 'blur(48px)';
    ctx.drawImage(photoImg, dx, 0, drawW, drawH);
    ctx.restore();

    // ボケた背景の上にごく薄い白を重ねて可読性を確保
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(0, 0, W, H);
  }
}

function render() {
  // 背景（添付写真を高さ基準で拡大配置し、ボカシを適用）
  drawBackground();
  ctx.fillStyle = '#111111';
  ctx.textBaseline = 'top';

  // ---- カード内の要素サイズ ----
  const TITLE_FONT = '700 50px "Noto Sans JP"';
  const TITLE_LINE_H = 60;
  const GAP_TITLE_CARD = 56;

  const CARD_PAD_SIDE = 100;
  const CARD_PAD_TOP = 110;
  const CARD_PAD_BOTTOM = 96;
  const CARD_RADIUS = 4;

  const PHOTO_SIZE = 760;
  const GAP_PHOTO_TEXT = 68;

  const TEXT_FONT = '400 42px "Noto Sans JP"';
  const TEXT_LINE_H = 60;
  const ASSUMED_LINES = 3;
  const GAP_TEXT_DATE = 56;

  const DATE_FONT = '400 34px "Noto Sans JP"';
  const DATE_LINE_H = 44;

  // 本文を先に折り返し計算
  ctx.font = TEXT_FONT;
  const text = textInput.value.trim();
  const textLines = text ? wrapText(ctx, text, PHOTO_SIZE) : [];
  const lineCount = Math.max(textLines.length, ASSUMED_LINES);
  const textBlockH = lineCount * TEXT_LINE_H;

  const CARD_W = PHOTO_SIZE + CARD_PAD_SIDE * 2;
  const CARD_H = CARD_PAD_TOP + PHOTO_SIZE + GAP_PHOTO_TEXT + textBlockH +
                 GAP_TEXT_DATE + DATE_LINE_H + CARD_PAD_BOTTOM;
  const CARD_X = (W - CARD_W) / 2;

  // ---- 全体を上下中央に配置してバランスを取る ----
  const totalH = TITLE_LINE_H + GAP_TITLE_CARD + CARD_H;
  const startY = Math.max(80, (H - totalH) / 2);

  let cursorY = startY;

  // タイトル（カード右端に合わせて右揃え）
  // 背後の背景の明るさを判定し、暗ければ白文字、明るければ黒文字にする
  ctx.font = TITLE_FONT;
  const titleWidth = ctx.measureText(TITLE).width;
  const titleX = CARD_X + CARD_W - titleWidth;
  const titleBrightness = getAverageBrightness(titleX, cursorY, titleWidth, TITLE_LINE_H);
  ctx.textAlign = 'right';
  ctx.fillStyle = titleBrightness < 140 ? '#ffffff' : '#111111';
  ctx.fillText(TITLE, CARD_X + CARD_W, cursorY);
  cursorY += TITLE_LINE_H + GAP_TITLE_CARD;

  // カード（白背景・角丸・ドロップシャドウ）
  const cardY = cursorY;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.18)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#ffffff';
  drawRoundedRect(CARD_X, cardY, CARD_W, CARD_H, CARD_RADIUS);
  ctx.fill();
  ctx.restore();

  // 写真（正方形トリミング）
  const photoX = CARD_X + CARD_PAD_SIDE;
  const photoY = cardY + CARD_PAD_TOP;
  if (photoImg) {
    drawPhotoSquare(photoImg, photoX, photoY, PHOTO_SIZE);
  } else {
    ctx.fillStyle = '#ececec';
    ctx.fillRect(photoX, photoY, PHOTO_SIZE, PHOTO_SIZE);
    ctx.fillStyle = '#bbbbbb';
    ctx.font = '400 30px "Noto Sans JP"';
    ctx.textAlign = 'center';
    ctx.fillText('写真を選択してください', photoX + PHOTO_SIZE / 2, photoY + PHOTO_SIZE / 2);
    ctx.fillStyle = '#111111';
  }

  // テキスト（なぜ）：カード内左揃え
  const textY = photoY + PHOTO_SIZE + GAP_PHOTO_TEXT;
  if (textLines.length) {
    ctx.font = TEXT_FONT;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#222222';
    let ty = textY;
    textLines.forEach(line => {
      ctx.fillText(line, photoX, ty);
      ty += TEXT_LINE_H;
    });
    ctx.fillStyle = '#111111';
  }

  // 日付（カード内右揃え・下寄せ）
  const dateY = cardY + CARD_H - CARD_PAD_BOTTOM - DATE_LINE_H;
  ctx.font = DATE_FONT;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#999999';
  ctx.fillText(formatDate(), photoX + PHOTO_SIZE, dateY);
  ctx.fillStyle = '#111111';

  downloadBtn.disabled = !photoImg;
}

downloadBtn.addEventListener('click', () => {
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'neo_gou_sanpo.png';
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
});

// フォント読み込み完了後に初期描画
document.fonts.load('700 56px "Noto Sans JP"').then(() => document.fonts.load('400 42px "Noto Sans JP"')).then(render);
window.addEventListener('load', () => {
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(render);
  } else {
    render();
  }
});
render();
