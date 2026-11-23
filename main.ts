// World News in One Day — 23 November 2026
// Original newspaper front-page renderer. Node 22 stdlib only, no network.
// Own rasterizer, own 5x7 bitmap font, own PNG encoder. Deterministic output.
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const W = 1024, H = 1024;

// ---------- palette ----------
const PAPER = [247, 243, 232];
const INK = [24, 24, 28];
const NAVY = [18, 38, 66];
const RED = [178, 34, 34];
const GREY = [110, 108, 100];
const LIGHT = [232, 226, 210];
const BLUE = [42, 92, 140];
const GREEN = [46, 110, 62];

// ---------- framebuffer ----------
const px = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) {
  px[i * 3] = PAPER[0]; px[i * 3 + 1] = PAPER[1]; px[i * 3 + 2] = PAPER[2];
}
function setPix(x, y, c) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}
function rect(x, y, w, h, c) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) setPix(i, j, c);
}
function hline(x, y, w, c, t = 1) { rect(x, y, w, t, c); }
function vline(x, y, h, c, t = 1) { rect(x, y, t, h, c); }
function circle(cx, cy, r, c) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (x * x + y * y <= r * r) setPix(cx + x, cy + y, c);
  }
}
function circleOutline(cx, cy, r, c, t = 2) {
  for (let a = 0; a < 360; a++) {
    const rad = (a * Math.PI) / 180;
    for (let k = 0; k < t; k++) {
      setPix(Math.round(cx + (r - k) * Math.cos(rad)), Math.round(cy + (r - k) * Math.sin(rad)), c);
    }
  }
}
function ellipseArc(cx, cy, rx, ry, a0, a1, c) {
  for (let a = a0; a <= a1; a += 0.5) {
    const rad = (a * Math.PI) / 180;
    setPix(Math.round(cx + rx * Math.cos(rad)), Math.round(cy + ry * Math.sin(rad)), c);
    setPix(Math.round(cx + rx * Math.cos(rad)), Math.round(cy + ry * Math.sin(rad)) + 1, c);
  }
}

// ---------- 5x7 bitmap font (own design) ----------
const GLYPHS = {
  A: ["01110","10001","10001","11111","10001","10001","10001"],
  B: ["11110","10001","10001","11110","10001","10001","11110"],
  C: ["01110","10001","10000","10000","10000","10001","01110"],
  D: ["11110","10001","10001","10001","10001","10001","11110"],
  E: ["11111","10000","10000","11110","10000","10000","11111"],
  F: ["11111","10000","10000","11110","10000","10000","10000"],
  G: ["01110","10001","10000","10111","10001","10001","01111"],
  H: ["10001","10001","10001","11111","10001","10001","10001"],
  I: ["01110","00100","00100","00100","00100","00100","01110"],
  J: ["00111","00010","00010","00010","00010","10010","01100"],
  K: ["10001","10010","10100","11000","10100","10010","10001"],
  L: ["10000","10000","10000","10000","10000","10000","11111"],
  M: ["10001","11011","10101","10101","10001","10001","10001"],
  N: ["10001","11001","10101","10011","10001","10001","10001"],
  O: ["01110","10001","10001","10001","10001","10001","01110"],
  P: ["11110","10001","10001","11110","10000","10000","10000"],
  Q: ["01110","10001","10001","10001","10101","10010","01101"],
  R: ["11110","10001","10001","11110","10100","10010","10001"],
  S: ["01111","10000","10000","01110","00001","00001","11110"],
  T: ["11111","00100","00100","00100","00100","00100","00100"],
  U: ["10001","10001","10001","10001","10001","10001","01110"],
  V: ["10001","10001","10001","10001","10001","01010","00100"],
  W: ["10001","10001","10001","10101","10101","10101","01010"],
  X: ["10001","10001","01010","00100","01010","10001","10001"],
  Y: ["10001","10001","01010","00100","00100","00100","00100"],
  Z: ["11111","00001","00010","00100","01000","10000","11111"],
  "0": ["01110","10001","10011","10101","11001","10001","01110"],
  "1": ["00100","01100","00100","00100","00100","00100","01110"],
  "2": ["01110","10001","00001","00110","01000","10000","11111"],
  "3": ["11111","00010","00100","00010","00001","10001","01110"],
  "4": ["00010","00110","01010","10010","11111","00010","00010"],
  "5": ["11111","10000","11110","00001","00001","10001","01110"],
  "6": ["00110","01000","10000","11110","10001","10001","01110"],
  "7": ["11111","00001","00010","00100","01000","01000","01000"],
  "8": ["01110","10001","10001","01110","10001","10001","01110"],
  "9": ["01110","10001","10001","01111","00001","00010","01100"],
  " ": ["00000","00000","00000","00000","00000","00000","00000"],
  "-": ["00000","00000","00000","01110","00000","00000","00000"],
  "\u2014": ["00000","00000","00000","11111","00000","00000","00000"],
  ".": ["00000","00000","00000","00000","00000","01100","01100"],
  ",": ["00000","00000","00000","00000","01100","00100","01000"],
  ":": ["00000","01100","01100","00000","01100","01100","00000"],
  ";": ["00000","01100","01100","00000","01100","00100","01000"],
  "'": ["00100","00100","01000","00000","00000","00000","00000"],
  "(": ["00010","00100","01000","01000","01000","00100","00010"],
  ")": ["01000","00100","00010","00010","00010","00100","01000"],
  "/": ["00001","00010","00010","00100","01000","01000","10000"],
  "%": ["11001","11010","00010","00100","01000","01011","10011"],
  "&": ["01100","10010","10100","01000","10101","10010","01101"],
  "+": ["00000","00100","00100","01110","00100","00100","00000"],
  "=": ["00000","00000","11111","00000","11111","00000","00000"],
  "?": ["01110","10001","00001","00110","00100","00000","00100"],
  "!": ["00100","00100","00100","00100","00100","00000","00100"],
  '"': ["01010","01010","00000","00000","00000","00000","00000"],
  "*": ["00000","10101","01110","10101","00000","00000","00000"],
  "\u2022": ["00000","00000","01100","01100","01100","00000","00000"],
  "\u00B7": ["00000","00000","00000","01100","01100","00000","00000"],
};
const BLANK = ["00000","00000","00000","00000","00000","00000","00000"];

function drawChar(ch, x, y, s, c) {
  const g = GLYPHS[ch] || BLANK;
  for (let r = 0; r < 7; r++) for (let col = 0; col < 5; col++) {
    if (g[r][col] === "1") rect(x + col * s, y + r * s, s, s, c);
  }
}
function textWidth(str, s) { return str.length * 6 * s - s; }
function drawText(str, x, y, s, c) {
  const up = str.toUpperCase();
  for (let i = 0; i < up.length; i++) drawChar(up[i], x + i * 6 * s, y, s, c);
}
function drawTextCentered(str, cx, y, s, c) {
  drawText(str, cx - Math.floor(textWidth(str, s) / 2), y, s, c);
}
// word-wrap into lines of at most maxChars characters
function wrap(str, maxChars) {
  const words = str.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur ? cur.length + 1 : 0) + w.length > maxChars) {
      if (cur) lines.push(cur);
      cur = w;
    } else cur = cur ? cur + " " + w : w;
  }
  if (cur) lines.push(cur);
  return lines;
}
function drawPara(str, x, y, s, c, maxChars, lh) {
  const lines = wrap(str, maxChars);
  lines.forEach((ln, i) => drawText(ln, x, y + i * lh, s, c));
  return lines.length;
}

// ---------- PNG encoder (own, zlib from stdlib) ----------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function encodePNG() {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

// ---------- layout ----------
// masthead
rect(0, 0, W, 148, NAVY);
drawTextCentered("THE WORLD IN ONE DAY", W / 2, 22, 6, [250, 246, 236]);
drawTextCentered("MONDAY 23 NOVEMBER 2026", W / 2, 92, 4, [255, 214, 90]);
hline(0, 148, W, RED, 6);
hline(32, 164, W - 64, INK, 2);

// lead story
const LX = 32, LY = 180;
drawText("COP31 COLLAPSES", LX, LY, 6, RED);
drawText("NO DEAL IN ANTALYA", LX, LY + 48, 6, INK);
drawText("FIRST COP TO ADMIT 1.5C IS BREACHED", LX, LY + 96, 2, GREY);
hline(LX, LY + 128, 620, INK, 2);
drawPara(
  "UN CLIMATE TALKS END WITH NO DEAL AS THE EU, UK AND ABOUT 130 PARTIES REJECT A FINAL DRAFT THAT OMITS THE WORDS FOSSIL FUELS ENTIRELY. THE BLAME GAME BEGINS AS PACIFIC NATIONS VOICE DESPAIR AND AUSTRALIA WARNS OF DIFFICULT GEOPOLITICAL TIMES.",
  LX, LY + 146, 2, INK, 52, 18);
drawPara(
  "SAUDI INFLUENCE LOOMED LARGE OVER THE FAILED DEAL.",
  LX, LY + 146 + 5 * 18, 2, RED, 52, 18);

// globe motif, right of lead
const GX = 830, GY = 300, GR = 105;
circle(GX, GY, GR, BLUE);
circleOutline(GX, GY, GR, NAVY, 4);
circleOutline(GX, GY, GR - 34, [120, 170, 210], 2);
ellipseArc(GX, GY, GR - 2, 42, 0, 360, [200, 225, 240]);
ellipseArc(GX, GY, 42, GR - 2, 0, 360, [200, 225, 240]);
hline(GX - GR, GY, GR * 2, [200, 225, 240], 2);
ellipseArc(GX, GY, GR - 2, 78, 0, 360, [160, 200, 225]);
circle(GX - 48, GY - 38, 14, GREEN);
circle(GX + 30, GY + 22, 18, GREEN);
circle(GX + 52, GY - 52, 10, GREEN);
drawTextCentered("THE WORLD", GX, GY + GR + 14, 2, NAVY);
drawTextCentered("IN ONE DAY", GX, GY + GR + 32, 2, NAVY);

hline(32, 468, W - 64, INK, 3);

// panels: 2 cols x 5 rows
const panels = [
  { tag: "INDONESIA", label: "CIKANDE FIRE — 50 STILL MISSING", body: "FIRE AT A CANDY FACTORY IN CIKANDE, BANTEN: AT LEAST 3 DEAD, 50 WORKERS MISSING. RESCUERS RECOVERED 7 BODY BAGS AND KEEP SEARCHING.", color: RED },
  { tag: "MIDDLE EAST", label: "GULF WAR WIDENS — BAHRAIN HIT", body: "IRAN STRIKES AN INDUSTRIAL SITE IN BAHRAIN AND CLAIMS A HIT ON US PATRIOT SYSTEMS. SAUDI ARABIA CONDEMNS THE ATTACKS; OIL HOLDS NEAR $90.", color: RED },
  { tag: "UKRAINE", label: "DYMER STRIKE — 15 DEAD, BOY RESCUED", body: "A RUSSIAN STRIKE ON FLATS IN DYMER, NORTH OF KYIV, KILLS 15. RESCUERS PULL A 7-YEAR-OLD BOY ALIVE FROM THE RUBBLE.", color: INK },
  { tag: "MEXICO", label: "EL CHAPO ISIDRO CAPTURED", body: "SPECIAL FORCES CAPTURE FBI TEN MOST WANTED CARTEL BOSS FAUSTO ISIDRO MEZA FLORES IN GUASAVE, SINALOA, AFTER FIREFIGHTS LEAVE 11 DEAD.", color: INK },
  { tag: "MARKETS", label: "NIKKEI -5.06% — AI SELL-OFF", body: "JAPAN'S NIKKEI TUMBLES 5.06% AS AN AI STOCK SELL-OFF SPREADS ACROSS ASIA ON FEARS AI SHARES ARE OVERPRICED.", color: RED },
  { tag: "USA", label: "DEMOCRATS TAKE HOUSE — 258 SEATS", body: "DEMOCRATS CLINCH A HISTORIC HOUSE MAJORITY OF AT LEAST 258 SEATS, THE LARGEST SINCE 1992, AFTER A NORTH CAROLINA RECOUNT.", color: BLUE },
  { tag: "SPORT", label: "INDIA 720/9 — RECORD IN WELLINGTON", body: "INDIA POST A RECORD 720/9 DECLARED IN THE WELLINGTON TEST, THE HIGHEST TEST TOTAL EVER BY ANY TEAM IN NEW ZEALAND.", color: GREEN },
  { tag: "SOUTH KOREA", label: "SEOUL MINISTER QUITS OVER AI CHEATING", body: "THE EDUCATION MINISTER RESIGNS OVER AN AI-DRIVEN EXAM CHEATING SCANDAL AROUND THE CSAT ENTRANCE EXAM: 111 DEVICE CASES.", color: INK },
  { tag: "SUDAN", label: "SUDAN — DRONE STRIKES KILL CHILDREN", body: "DRONE ATTACKS KILL FIVE CHILDREN IN KHARTOUM AND OMDURMAN AND DAMAGE A UN BUILDING; 24 CIVILIANS DIE IN SOUTH SUDAN.", color: RED },
  { tag: "WORLD IN BRIEF", label: "ISTANBUL RALLY • BOLSONARO IN ICU", body: "THOUSANDS RALLY IN ISTANBUL; BOLSONARO IN INTENSIVE CARE; EU AND INDONESIA SIGN A TRADE DEAL; GERMANY PASSES BIG INTELLIGENCE REFORMS.", color: GREY },
];
const PX0 = 32, PY0 = 486, CW = 468, CH = 96, CGAP = 24, RGAP = 8;
panels.forEach((p, i) => {
  const col = i % 2, row = Math.floor(i / 2);
  const x = PX0 + col * (CW + CGAP), y = PY0 + row * (CH + RGAP);
  rect(x, y, CW, CH, [255, 255, 255]);
  rect(x, y, 6, CH, p.color);
  drawText(p.tag, x + 16, y + 8, 1, p.color);
  drawText(p.label, x + 16, y + 24, 2, INK);
  drawPara(p.body, x + 16, y + 46, 1, [60, 58, 52], 74, 12);
});

// footer
hline(32, 992, W - 64, INK, 2);
drawTextCentered("WORLD NEWS IN ONE DAY  •  23 NOVEMBER 2026  •  MAKE.FUN", W / 2, 1002, 1, GREY);

mkdirSync("/output", { recursive: true });
writeFileSync("/output/entry.png", encodePNG());
console.log("wrote /output/entry.png");
