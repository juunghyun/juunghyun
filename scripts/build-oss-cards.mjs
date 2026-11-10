// 기여 카드 머리(아이콘 · 프로젝트명 · org)를 유리판 모양 SVG 로 굽는다. 의존성 없음.
// README 는 CSS 를 쓸 수 없어서 유리 효과를 이미지로 만든다.
// 실행: node scripts/build-oss-cards.mjs  →  assets/oss/<slug>-glass-{light,dark}.svg
import assert from "node:assert";
import { readFileSync, writeFileSync } from "node:fs";

const DIR = "assets/oss";

// tint: 유리에 비치는 색 두 개. 아이콘의 주색에서 고른다.
const projects = [
  { slug: "deeptutor", icon: "deeptutor.png", name: "DeepTutor", org: "HKUDS", tint: ["#5fa8dd", "#f8a868"] },
  { slug: "billion-context", icon: "billion-context.svg", name: "billion-context", org: "ranxianglei", tint: ["#22d3ee", "#6366f1"] },
];

const themes = {
  light: { name: "#1f2328", org: "#59636e", base: 0.72, tint: 0.3, sheen: 0.75, rim: [1, 0.35, 0.85], edge: "#1f2328", edgeO: 0.1, shadow: "#1f2328", shadowO: 0.16, shade: 0.05 },
  dark: { name: "#f0f6fc", org: "#9198a1", base: 0.07, tint: 0.34, sheen: 0.16, rim: [0.55, 0.06, 0.3], edge: "#ffffff", edgeO: 0.05, shadow: "#000000", shadowO: 0.55, shade: 0.2 },
};

// shortcut: 글자 폭을 표로 어림한다(시스템 글꼴 기준 ±6%), 이름이 유리판 밖으로 나가면 프로젝트에 width 를 직접 준다
const em = (c) => (/[ijl.,:;'|!]/.test(c) ? 0.28 : /[ftrI\-()[\] ]/.test(c) ? 0.38 : /[mwMW@]/.test(c) ? 0.88 : /[A-Z0-9]/.test(c) ? 0.66 : 0.56);
const textWidth = (s, px) => [...s].reduce((sum, c) => sum + em(c), 0) * px;
assert(Math.abs(textWidth("billion-context", 16) - 109) < 6, "글자 폭 어림이 실측(109px)에서 벗어났다");

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";
const H = 60; // 유리판 높이 = 아이콘 44 + 위아래 여백 8
const R = 20; // 모서리

function glass(p, t) {
  const W = p.width ?? Math.ceil(64 + Math.max(textWidth(p.name, 16), textWidth(p.org, 12)) + 22);
  const mime = p.icon.endsWith(".svg") ? "image/svg+xml" : "image/png";
  const icon = `data:${mime};base64,${readFileSync(`${DIR}/${p.icon}`).toString("base64")}`;
  const pill = `width="${W}" height="${H}" rx="${R}"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W + 8}" height="${H + 8}" viewBox="-4 -3 ${W + 8} ${H + 8}" role="img" aria-label="${p.name} by ${p.org}">
  <defs>
    <clipPath id="pill"><rect ${pill}/></clipPath>
    <mask id="outside"><rect x="-4" y="-3" width="${W + 8}" height="${H + 8}" fill="#fff"/><rect ${pill} fill="#000"/></mask>
    <filter id="shadow" x="-10%" y="-20%" width="120%" height="150%"><feDropShadow dx="0" dy="2" stdDeviation="2.2" flood-color="${t.shadow}" flood-opacity="${t.shadowO}"/></filter>
    <filter id="blur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="14"/></filter>
    <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="${t.sheen}"/><stop offset="0.55" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0.65" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${t.shade}"/></linearGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="${t.rim[0]}"/><stop offset="0.5" stop-color="#fff" stop-opacity="${t.rim[1]}"/><stop offset="1" stop-color="#fff" stop-opacity="${t.rim[2]}"/></linearGradient>
  </defs>
  <rect ${pill} fill="#000" filter="url(#shadow)" mask="url(#outside)"/>
  <rect ${pill} fill="#fff" fill-opacity="${t.base}"/>
  <g clip-path="url(#pill)">
    <g filter="url(#blur)" opacity="${t.tint}">
      <circle cx="26" cy="24" r="26" fill="${p.tint[0]}"/>
      <circle cx="${Math.round(W * 0.66)}" cy="46" r="30" fill="${p.tint[1]}"/>
    </g>
    <rect ${pill} fill="url(#sheen)"/>
    <rect ${pill} fill="url(#shade)"/>
  </g>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="${R - 0.5}" fill="none" stroke="${t.edge}" stroke-opacity="${t.edgeO}"/>
  <rect x="1.25" y="1.25" width="${W - 2.5}" height="${H - 2.5}" rx="${R - 1.25}" fill="none" stroke="url(#rim)" stroke-width="1.5"/>
  <image href="${icon}" x="8" y="8" width="44" height="44"/>
  <text x="64" y="27" font-family="${FONT}" font-size="16" font-weight="600" fill="${t.name}">${p.name}</text>
  <text x="64" y="46" font-family="${FONT}" font-size="12" fill="${t.org}">${p.org}</text>
</svg>
`;
}

for (const p of projects) {
  for (const [theme, t] of Object.entries(themes)) {
    const out = `${DIR}/${p.slug}-glass-${theme}.svg`;
    writeFileSync(out, glass(p, t));
    console.log("wrote", out);
  }
}
