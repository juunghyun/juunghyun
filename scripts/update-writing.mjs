// 블로그 RSS 를 읽어 README 의 Writing 절을 최근 글 5개로 갈아 끼운다. 의존성 없음.
import { readFileSync, writeFileSync } from "node:fs";

const FEED = "https://juunghyun.github.io/rss.xml";
const README = "README.md";
const LIMIT = 5;

const decode = s =>
  s
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

const xml = await (await fetch(FEED)).text();
const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
  .map(([, body]) => {
    const pick = tag => decode(body.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1] ?? "");
    return { title: pick("title"), link: pick("link"), date: new Date(pick("pubDate")) };
  })
  .filter(i => i.title && i.link)
  .sort((a, b) => b.date - a.date)
  .slice(0, LIMIT);

const fmt = d =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(d)
    .replaceAll("-", ".");

const lines = items.map(i => `- [${i.title}](${i.link}) · ${fmt(i.date)}`).join("\n");
const readme = readFileSync(README, "utf8");
const next = readme.replace(
  /<!-- writing starts -->[\s\S]*?<!-- writing ends -->/,
  `<!-- writing starts -->\n${lines}\n<!-- writing ends -->`
);
if (next !== readme) {
  writeFileSync(README, next);
  console.log(`updated: ${items.length} posts`);
} else {
  console.log("no change");
}
