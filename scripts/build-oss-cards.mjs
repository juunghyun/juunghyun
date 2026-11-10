// 기여 카드(유리판 머리 · 별 수 · 설명 · 머지 PR 수)를 SVG 한 장으로 굽는다. 의존성 없음.
// README 는 CSS 와 글꼴을 쓸 수 없어서 카드를 통째로 이미지로 만들고, 글꼴(scripts/build-fonts.sh 산출물)은 SVG 안에 심는다.
// 실행: node scripts/build-oss-cards.mjs  →  assets/oss/<slug>-card-{light,dark}.svg
// 별 수와 머지 PR 수는 GitHub API 에서 읽는다. Action 이 매일 다시 굽는다.
import assert from "node:assert";
import { readFileSync, writeFileSync } from "node:fs";

const DIR = "assets/oss";
const LOGIN = "juunghyun";

// tint: 유리에 비치는 색 두 개. 아이콘의 주색에서 고른다. desc 의 ==…== 는 형광펜.
const projects = [
  {
    slug: "deeptutor",
    repo: "HKUDS/DeepTutor",
    icon: "deeptutor.png",
    tint: ["#5fa8dd", "#f8a868"],
    desc: "Lifelong personalized AI tutor. ==Multi-agent system== with ==RAG knowledge bases==.",
    focus: "Web i18n · Knowledge Base API error handling",
  },
  {
    slug: "billion-context",
    repo: "ranxianglei/billion-context",
    icon: "billion-context.svg",
    tint: ["#22d3ee", "#6366f1"],
    desc: "==Context-compression== plugin for AI coding agents. Month-long sessions in a ==100K window==.",
    focus: "Upstream circuit breaker recovery",
  },
];

const themes = {
  light: { name: "#1f2328", org: "#59636e", body: "#424a53", card: "#f6f8fa", chip: "#ffffff", star: "#d99e00", merged: "#8250df", mark: 0.22, base: 0.72, tint: 0.3, sheen: 0.75, rim: [1, 0.35, 0.85], edge: "#1f2328", edgeO: 0.1, shadow: "#1f2328", shadowO: 0.16, shade: 0.05 },
  dark: { name: "#f0f6fc", org: "#9198a1", body: "#c5ccd3", card: "#151b23", chip: "#212830", star: "#e3b341", merged: "#8957e5", mark: 0.3, base: 0.07, tint: 0.34, sheen: 0.16, rim: [0.55, 0.06, 0.3], edge: "#ffffff", edgeO: 0.05, shadow: "#000000", shadowO: 0.55, shade: 0.2 },
};

// octicons 16px
const STAR = "M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z";
const MERGE = "M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 7.123v3.505a2.25 2.25 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.95-.218ZM4.25 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm8.5-4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM5 3.25a.75.75 0 1 0 0 .005V3.25Z";

const W = 400; // 카드 폭(이미지는 사방 4px 여백을 더해 408px). 두 장이 프로필 본문 폭(846px)에 나란히 들어간다
const P = 16; // 카드 안쪽 여백
const DESC_LINES = 2; // 카드 높이를 맞추려고 설명 줄 수를 고정한다

// 글자 폭은 심은 글꼴의 실제 값이다(em 단위). 부분집합에 없는 글자는 다른 글꼴로 그려져 자리가 틀어지므로 막는다.
const ADV = JSON.parse(readFileSync("assets/fonts/wanted-sans-widths.json", "utf8"));
const width = (s, px, weight = 400) =>
  [...s].reduce((sum, c) => {
    assert(c in ADV[weight], `글꼴 부분집합에 없는 글자 "${c}": scripts/build-fonts.sh 의 UNICODES 에 넣고 다시 돌린다`);
    return sum + ADV[weight][c];
  }, 0) * px;

const face = (weight) =>
  `@font-face{font-family:ws;font-weight:${weight};src:url(data:font/woff2;base64,${readFileSync(`assets/fonts/wanted-sans-${weight}.woff2`).toString("base64")})format("woff2")}`;
const STYLE = `<style>${face(400)}${face(600)}text{font-family:ws,-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif}</style>`;

const n = (v) => +v.toFixed(2);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
// textLength: 심은 글꼴이 안 뜨는 환경에서도 계산한 자리에 맞춘다
const text = (s, x, y, px, weight, fill) =>
  `<text x="${n(x)}" y="${n(y)}" font-size="${px}" font-weight="${weight}" fill="${fill}" textLength="${n(width(s, px, weight))}">${esc(s)}</text>`;

// "a ==b c==. d" → 줄마다 [{ s, x, w, hl }]. ==…== 안은 형광펜(굵게)이고, 줄은 낱말 사이에서만 바꾼다.
function layout(str, px, maxW) {
  const lines = [[]];
  let hl = false;
  let gap = false;
  let x = 0;
  for (const tok of str.match(/==|\s+|(?:(?!==)\S)+/g)) {
    if (tok === "==") hl = !hl;
    else if (!tok.trim()) gap = true;
    else {
      const weight = hl ? 600 : 400;
      const w = width(tok, px, weight);
      let sp = gap && x ? width(" ", px, weight) : 0;
      if (sp && x + sp + w > maxW) {
        lines.push([]);
        x = sp = 0;
      }
      const last = lines.at(-1).at(-1);
      if (last?.hl === hl) {
        last.s += (sp ? " " : "") + tok;
        last.w += sp + w;
      } else lines.at(-1).push({ s: tok, x: x + sp, w, hl });
      x += sp + w;
      gap = false;
    }
  }
  return lines;
}
{
  const [first, second] = layout("ab ==cd==. ef", 10, width("ab cd.", 10) + 4);
  assert.deepEqual([first.map((r) => r.s), second.map((r) => r.s)], [["ab", "cd", "."], ["ef"]], "줄바꿈 · 형광펜 나누기가 틀렸다");
  assert.equal(first[2].x, first[1].x + first[1].w, "형광펜 뒤 구두점이 붙지 않았다");
}

// 납작한 알약: 아이콘 + 글자. 유리는 카드 머리 한 곳에만 쓰고 나머지는 면과 글자로만 그린다.
const CHIP = { h: 26, px: 12.5 };
const chipW = (label) => Math.ceil(9 + 14 + 5 + width(label, CHIP.px, 600) + 11);
const chip = (x, y, icon, label, c) =>
  `<rect x="${x + 0.5}" y="${y + 0.5}" width="${chipW(label) - 1}" height="${CHIP.h - 1}" rx="${(CHIP.h - 1) / 2}" fill="${c.bg}" ${c.stroke}/>
  <path transform="translate(${x + 9} ${y + 6}) scale(0.875)" fill="${c.icon}" d="${icon}"/>
  ${text(label, x + 28, y + 17.5, CHIP.px, 600, c.fg)}`;

function card(p, t, stats) {
  const [org, name] = p.repo.split("/");
  const H = P + 60 + 14 + 21 * DESC_LINES + 14 + CHIP.h + P;
  const pillW = Math.ceil(64 + Math.max(width(name, 16, 600), width(org, 12)) + 22);
  const pill = `width="${pillW}" height="60" rx="20"`;
  const mime = p.icon.endsWith(".svg") ? "image/svg+xml" : "image/png";
  const icon = `data:${mime};base64,${readFileSync(`${DIR}/${p.icon}`).toString("base64")}`;

  const desc = layout(p.desc, 14, W - 2 * P);
  assert(desc.length <= DESC_LINES, `${p.slug}: 설명이 ${DESC_LINES}줄을 넘는다`);
  const descY = P + 60 + 14 + 15; // 첫 줄 기준선

  const stars = stats.stars < 1000 ? String(stats.stars) : stats.stars < 10000 ? `${(stats.stars / 1000).toFixed(1).replace(".0", "")}k` : `${Math.round(stats.stars / 1000)}k`;
  const merged = `${stats.merged} merged`;
  const footY = H - P - CHIP.h;
  const focusX = P + chipW(merged) + 10;
  const focus = layout(p.focus, 12, W - P - focusX);
  assert(focus.length <= 2, `${p.slug}: focus 가 2줄을 넘는다`);
  const focusY = focus.length === 1 ? [footY + 17.5] : [footY + 10.5, footY + 25.5];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W + 8}" height="${H + 8}" viewBox="-4 -4 ${W + 8} ${H + 8}" role="img" aria-label="${esc(`${name} by ${org}`)}">
  ${STYLE}
  <defs>
    <clipPath id="pill"><rect ${pill}/></clipPath>
    <mask id="outside"><rect x="-4" y="-3" width="${pillW + 8}" height="68" fill="#fff"/><rect ${pill} fill="#000"/></mask>
    <filter id="shadow" x="-10%" y="-20%" width="120%" height="150%"><feDropShadow dx="0" dy="2" stdDeviation="2.2" flood-color="${t.shadow}" flood-opacity="${t.shadowO}"/></filter>
    <filter id="blur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="14"/></filter>
    <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="${t.sheen}"/><stop offset="0.55" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0.65" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${t.shade}"/></linearGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="${t.rim[0]}"/><stop offset="0.5" stop-color="#fff" stop-opacity="${t.rim[1]}"/><stop offset="1" stop-color="#fff" stop-opacity="${t.rim[2]}"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="18" fill="${t.card}"/>
  <g transform="translate(${P} ${P})">
    <rect ${pill} fill="#000" filter="url(#shadow)" mask="url(#outside)"/>
    <rect ${pill} fill="#fff" fill-opacity="${t.base}"/>
    <g clip-path="url(#pill)">
      <g filter="url(#blur)" opacity="${t.tint}">
        <circle cx="26" cy="24" r="26" fill="${p.tint[0]}"/>
        <circle cx="${Math.round(pillW * 0.66)}" cy="46" r="30" fill="${p.tint[1]}"/>
      </g>
      <rect ${pill} fill="url(#sheen)"/>
      <rect ${pill} fill="url(#shade)"/>
    </g>
    <rect x="0.5" y="0.5" width="${pillW - 1}" height="59" rx="19.5" fill="none" stroke="${t.edge}" stroke-opacity="${t.edgeO}"/>
    <rect x="1.25" y="1.25" width="${pillW - 2.5}" height="57.5" rx="18.75" fill="none" stroke="url(#rim)" stroke-width="1.5"/>
    <image href="${icon}" x="8" y="8" width="44" height="44"/>
    ${text(name, 64, 27, 16, 600, t.name)}
    ${text(org, 64, 46, 12, 400, t.org)}
  </g>
  ${chip(W - P - chipW(stars), P + 17, STAR, stars, { bg: t.chip, fg: t.name, icon: t.star, stroke: `stroke="${t.edge}" stroke-opacity="0.12"` })}
  <g transform="translate(${P} 0)">
    ${desc.flatMap((line, i) => line.map((r) => (r.hl ? `<rect x="${n(r.x - 3)}" y="${descY + 21 * i - 14}" width="${n(r.w + 6)}" height="19" rx="5" fill="${p.tint[0]}" fill-opacity="${t.mark}"/>` : "") + text(r.s, r.x, descY + 21 * i, 14, r.hl ? 600 : 400, r.hl ? t.name : t.body))).join("\n    ")}
  </g>
  ${chip(P, footY, MERGE, merged, { bg: t.merged, fg: "#fff", icon: "#fff", stroke: "" })}
  ${focus.flatMap((line, i) => line.map((r) => text(r.s, focusX + r.x, focusY[i], 12, 400, t.org))).join("\n  ")}
</svg>
`;
}

async function gh(path) {
  const res = await fetch(`https://api.github.com/${path}`, {
    headers: process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {},
  });
  assert(res.ok, `GitHub API ${res.status}: ${path}`);
  return res.json();
}

for (const p of projects) {
  const stats = {
    stars: (await gh(`repos/${p.repo}`)).stargazers_count,
    merged: (await gh(`search/issues?q=${encodeURIComponent(`repo:${p.repo} is:pr is:merged author:${LOGIN}`)}`)).total_count,
  };
  // 응답이 이상하면 기존 카드를 덮어쓰지 않는다
  assert(Number.isInteger(stats.stars) && stats.merged > 0, `${p.repo}: 값이 이상하다 ${JSON.stringify(stats)}`);
  for (const [theme, t] of Object.entries(themes)) {
    const out = `${DIR}/${p.slug}-card-${theme}.svg`;
    writeFileSync(out, card(p, t, stats));
    console.log("wrote", out, JSON.stringify(stats));
  }
}
