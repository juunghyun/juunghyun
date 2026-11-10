// 기여 카드(유리판 머리 · 별 수 · 설명 · 머지 PR 수)를 SVG 한 장으로 굽는다. 의존성 없음.
// README 는 CSS 와 글꼴을 쓸 수 없어서 카드를 통째로 이미지로 만들고, 글꼴(scripts/build-fonts.sh 산출물)은 SVG 안에 심는다.
// 실행: node scripts/build-oss-cards.mjs  →  assets/oss/<slug>-card-{light,dark}.svg, assets/links/<slug>-{light,dark}.svg
// 별 수와 머지 PR 수는 GitHub API 에서 읽는다. Action 이 매일 다시 굽는다.
// 맨 위 링크 칩(assets/links), Motto 문장(assets/motto), Tech Stack 묶음(assets/stack)도 같은 글꼴 · 알약 꼴이라 여기서 함께 굽는다.
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
  light: { name: "#1f2328", org: "#59636e", body: "#424a53", card: "#f6f8fa", chip: "#ffffff", star: "#d99e00", merged: "#8250df", link: "#2563eb", inkMin: 1.8, mark: 0.22, base: 0.72, tint: 0.3, sheen: 0.75, rim: [1, 0.35, 0.85], edge: "#1f2328", edgeO: 0.1, shadow: "#1f2328", shadowO: 0.16, shade: 0.05 },
  dark: { name: "#f0f6fc", org: "#9198a1", body: "#c5ccd3", card: "#151b23", chip: "#212830", star: "#e3b341", merged: "#8957e5", link: "#4493f8", inkMin: 2.5, mark: 0.3, base: 0.07, tint: 0.34, sheen: 0.16, rim: [0.55, 0.06, 0.3], edge: "#ffffff", edgeO: 0.05, shadow: "#000000", shadowO: 0.55, shade: 0.2 },
};

// octicons 16px
const STAR = "M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z";
const MERGE = "M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 7.123v3.505a2.25 2.25 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.95-.218ZM4.25 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm8.5-4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM5 3.25a.75.75 0 1 0 0 .005V3.25Z";
const PENCIL = "M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z";
const MAIL = "M1.75 2h12.5c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0 1 14.25 14H1.75A1.75 1.75 0 0 1 0 12.25v-8.5C0 2.784.784 2 1.75 2ZM1.5 12.251c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V5.809L8.38 9.397a.75.75 0 0 1-.76 0L1.5 5.809v6.442Zm13-8.181v-.32a.25.25 0 0 0-.25-.25H1.75a.25.25 0 0 0-.25.25v.32L8 7.88Z";
const FILE = "M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z";

// 맨 위 링크 칩. README 의 <a> 가 slug 로 이미지를 참조한다. sub 는 label 뒤에 흐린 색으로 붙는 글자.
const links = [
  { slug: "blog", icon: PENCIL, label: "Blog", sub: "juunghyun.github.io" },
  { slug: "email", icon: MAIL, label: "forcomfe81@gmail.com" },
  { slug: "resume", icon: FILE, label: "Resume" },
];

// Motto: 문장마다 SVG 한 장. ==…== 는 형광펜. 한글은 scripts/build-fonts.sh 의 TEXT 에 있는 글자만 쓸 수 있다.
const mottos = ["==기록==해야 뒤돌아본다.", "==관성==을 깨야 변화한다.", "==꾸준함==도 재능이다."];

// Tech Stack: 묶음마다 SVG 한 장(이름표 + 납작한 꼬리표). 폭이 카드와 같아 두 묶음씩 나란히 놓인다.
// 꼬리표는 [이름, 아이콘, 브랜드 색]. 아이콘은 assets/stack/icons/<아이콘>.svg (Simple Icons, CC0)이고, 로고가 없는 기술은 이름만 쓴다.
// AWS 계열 아이콘은 Simple Icons 최신판에서 빠져서 13.21.0 것을 쓴다.
const stack = [
  { slug: "backend", label: "Backend", items: [["Kotlin", "kotlin", "#7F52FF"], ["Java", "openjdk", "#000000"], ["Spring Boot", "springboot", "#6DB33F"], ["JPA"], ["QueryDSL"]] },
  { slug: "data", label: "Data", items: [["MariaDB", "mariadb", "#003545"], ["MongoDB", "mongodb", "#47A248"], ["Redis", "redis", "#FF4438"], ["Kafka", "apachekafka", "#231F20"]] },
  { slug: "infra", label: "Infra", items: [["AWS", "amazonwebservices", "#232F3E"], ["EKS", "amazoneks", "#FF9900"], ["Docker", "docker", "#2496ED"], ["AWS Batch"]] },
  { slug: "observability", label: "Observability", items: [["Datadog", "datadog", "#632CA6"], ["CloudWatch", "amazoncloudwatch", "#FF4F8B"]] },
];

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
const style = (...weights) => `<style>${weights.map(face).join("")}text{font-family:ws,-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif}</style>`;

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

// 한 줄을 그린다: 형광펜 면 + 글자. y 는 기준선.
const marked = (line, y, px, tint, t) =>
  line.map((r) => (r.hl ? `<rect x="${n(r.x - 3)}" y="${y - px}" width="${n(r.w + 6)}" height="${Math.round(px * 1.36)}" rx="5" fill="${tint}" fill-opacity="${t.mark}"/>` : "") + text(r.s, r.x, y, px, r.hl ? 600 : 400, r.hl ? t.name : t.body));

// 납작한 알약: 아이콘 + 글자. 유리는 카드 머리 한 곳에만 쓰고 나머지는 면과 글자로만 그린다.
const CHIP = { h: 26, px: 12.5 };
const chipW = (label, sub) => Math.ceil(9 + 14 + 5 + width(label, CHIP.px, 600) + (sub ? 6 + width(sub, CHIP.px, 600) : 0) + 11);
const chip = (x, y, icon, label, c, sub) =>
  `<rect x="${x + 0.5}" y="${y + 0.5}" width="${chipW(label, sub) - 1}" height="${CHIP.h - 1}" rx="${(CHIP.h - 1) / 2}" fill="${c.bg}" ${c.stroke}/>
  <path transform="translate(${x + 9} ${y + 6}) scale(0.875)" fill="${c.icon}" d="${icon}"/>
  ${text(label, x + 28, y + 17.5, CHIP.px, 600, c.fg)}${sub ? text(sub, x + 34 + width(label, CHIP.px, 600), y + 17.5, CHIP.px, 600, c.sub) : ""}`;

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
  ${style(400, 600)}
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
    ${desc.flatMap((line, i) => marked(line, descY + 21 * i, 14, p.tint[0], t)).join("\n    ")}
  </g>
  ${chip(P, footY, MERGE, merged, { bg: t.merged, fg: "#fff", icon: "#fff", stroke: "" })}
  ${focus.flatMap((line, i) => line.map((r) => text(r.s, focusX + r.x, focusY[i], 12, 400, t.org))).join("\n  ")}
</svg>
`;
}

// 링크 칩 한 개 = SVG 한 장(좌우 2px 여백). 카드 밖 흰 바탕에 놓이므로 면은 카드 색을 쓴다.
const linkChip = (l, t) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${chipW(l.label, l.sub) + 4}" height="${CHIP.h}" viewBox="-2 0 ${chipW(l.label, l.sub) + 4} ${CHIP.h}" role="img" aria-label="${esc(l.label)}">
  ${style(600)}
  ${chip(0, 0, l.icon, l.label, { bg: t.card, fg: t.name, sub: t.org, icon: t.link, stroke: `stroke="${t.edge}" stroke-opacity="0.12"` }, l.sub)}
</svg>
`;

// Motto 한 문장. 오른쪽 여백 24px 이 문장 사이 간격이 된다.
function motto(str, t) {
  const [line] = layout(str, 16, Infinity);
  const w = Math.ceil(line.at(-1).x + line.at(-1).w);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w + 28}" height="28" viewBox="-4 0 ${w + 28} 28" role="img" aria-label="${esc(str.replaceAll("==", ""))}">
  ${style(400, 600)}
  ${marked(line, 20, 16, t.link, t).join("\n  ")}
</svg>
`;
}

// 브랜드 색이 바탕과 거의 구분되지 않으면(검은 로고 + 다크 테마 등) 글자색으로 그린다. 기준(inkMin)은 눈으로 맞춘 값이고, 어두운 바탕에서는 같은 대비도 더 흐려 보여서 높다.
const lum = (hex) =>
  [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
const ink = (hex, t) => {
  const [hi, lo] = [lum(hex), lum(t.card)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05) >= t.inkMin ? hex : t.name;
};
assert.deepEqual([ink("#000000", themes.dark), ink("#000000", themes.light), ink("#6DB33F", themes.light)], [themes.dark.name, "#000000", "#6DB33F"], "아이콘 색 고르기가 틀렸다");

// Tech Stack 한 묶음: 이름표 아래에 꼬리표를 한 줄로 놓는다.
function stackBlock(g, t) {
  let x = 4;
  const tags = g.items.map(([name, icon, color]) => {
    const pad = icon ? 28 : 11;
    const w = Math.ceil(pad + width(name, CHIP.px, 600) + 11);
    const mark = icon ? `<path transform="translate(${x + 9} 30) scale(${n(14 / 24)})" fill="${ink(color, t)}" d="${readFileSync(`assets/stack/icons/${icon}.svg`, "utf8").match(/ d="([^"]+)"/)[1]}"/>` : "";
    const tag = `<rect x="${x + 0.5}" y="24.5" width="${w - 1}" height="${CHIP.h - 1}" rx="${(CHIP.h - 1) / 2}" fill="${t.card}" stroke="${t.edge}" stroke-opacity="0.12"/>${mark}${text(name, x + pad, 41.5, CHIP.px, 600, t.name)}`;
    x += w + 6;
    return tag;
  });
  assert(x - 6 <= W + 8, `${g.label}: 꼬리표가 묶음 폭(${W + 8}px)을 넘는다`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W + 8}" height="58" viewBox="0 0 ${W + 8} 58" role="img" aria-label="${esc(g.label)}">
  ${style(600)}
  ${text(g.label, 4, 14, 12, 600, t.org)}
  ${tags.join("\n  ")}
</svg>
`;
}

const bake = (name, draw) => {
  for (const [theme, t] of Object.entries(themes)) writeFileSync(`assets/${name}-${theme}.svg`, draw(t));
};
for (const l of links) bake(`links/${l.slug}`, (t) => linkChip(l, t));
mottos.forEach((m, i) => bake(`motto/${i + 1}`, (t) => motto(m, t)));
for (const g of stack) bake(`stack/${g.slug}`, (t) => stackBlock(g, t));

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
