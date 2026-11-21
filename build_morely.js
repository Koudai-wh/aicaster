#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const SITE = "https://aicaster.pages.dev";
const REQUIRED_HEADINGS = ["はじめに", "背景", "仕組みの解説", "検証・考察", "今後の展望とまとめ"];

function esc(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

function isIndexable(post) {
  const length = String(post.body || "").trim().length;
  return post.morely === true && length >= 1500 && length <= 2500 &&
    Array.isArray(post.sources) && post.sources.filter((source) => /^https:\/\//i.test(source.url || "")).length >= 2 &&
    REQUIRED_HEADINGS.every((heading) => new RegExp(`(?:^|\\n)##\\s+${heading}(?:\\s|$)`).test(post.body || ""));
}

function renderBody(value) {
  return String(value || "").split(/\n\s*\n/).map((block) => {
    const text = block.trim();
    if (!text) return "";
    if (/^##\s+/.test(text)) return `<h2>${esc(text.replace(/^##\s+/, ""))}</h2>`;
    return `<p>${esc(text).replace(/\n/g, "<br>")}</p>`;
  }).join("\n");
}

function renderDiagram(post, imageName) {
  const steps = (post.figureSteps || ["出典を確認", "条件を整理", "判断材料にする"]).slice(0, 3);
  while (steps.length < 3) steps.push("次の確認へ");
  const boxes = steps.map((step, i) => {
    const x = 34 + i * 246;
    return `<g><rect x="${x}" y="112" width="204" height="88" rx="14" fill="${i === 1 ? "#e8f1f8" : "#ffffff"}" stroke="#b7c8d8" stroke-width="2"/><circle cx="${x + 24}" cy="136" r="14" fill="#1769aa"/><text x="${x + 24}" y="141" text-anchor="middle" class="n">${i + 1}</text><text x="${x + 102}" y="163" text-anchor="middle" class="step">${esc(step)}</text></g>${i < 2 ? `<path d="M${x + 208} 156h30m-8-8 8 8-8 8" fill="none" stroke="#1769aa" stroke-width="3"/>` : ""}`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="250" viewBox="0 0 800 250" role="img" aria-labelledby="title desc"><title id="title">${esc(post.imageAlt || post.title)}</title><desc id="desc">${esc(post.imageCaption || "記事の要点を三段階で示す解説図")}</desc><rect width="800" height="250" rx="18" fill="#f5f8fb"/><text x="34" y="53" class="eyebrow">MORELY / ${esc(post.category)}</text><text x="34" y="84" class="title">${esc(post.title).slice(0, 32)}</text>${boxes}<style>text{font-family:Arial,'Hiragino Sans','Yu Gothic',sans-serif;fill:#202124}.eyebrow{font-size:13px;letter-spacing:2px;fill:#1769aa;font-weight:700}.title{font-size:20px;font-weight:700}.step{font-size:16px;font-weight:700}.n{font-size:13px;fill:white;font-weight:700}</style></svg>`;
  fs.writeFileSync(imageName, svg);
}

function articleHtml(post) {
  const slug = encodeURIComponent(post.slug);
  const canonical = `${SITE}/morely/${slug}/`;
  const folder = path.join(ROOT, "morely", post.slug);
  fs.mkdirSync(folder, { recursive: true });
  renderDiagram(post, path.join(folder, "diagram.svg"));
  const srcs = (post.sources || []).filter((s) => /^https:\/\//i.test(s.url || ""));
  const sourceHtml = srcs.length ? `<section class="sources"><h2>出典・参照資料</h2><ol>${srcs.map((s) => `<li><a href="${esc(s.url)}" rel="noopener noreferrer">${esc(s.title)}</a>${s.accessed ? `<small>（確認日：${esc(s.accessed)}）</small>` : ""}</li>`).join("")}</ol></section>` : "";
  const length = String(post.body || "").trim().length;
  const noindex = isIndexable(post) ? "" : '<meta name="robots" content="noindex,follow">';
  const jsonLd = isIndexable(post) ? `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "Article", headline: post.title,
    description: post.excerpt, datePublished: post.date, dateModified: post.updated || post.date,
    mainEntityOfPage: canonical, image: `${canonical}diagram.svg`,
    publisher: { "@type": "Organization", name: "AI Caster", url: `${SITE}/` },
  }).replace(/</g, "\\u003c")}</script>` : "";
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(post.title)}｜Morely</title><meta name="description" content="${esc(post.excerpt)}">${noindex}
<link rel="canonical" href="${canonical}"><link rel="icon" type="image/png" href="/morely/favicon.png"><meta property="og:type" content="article"><meta property="og:title" content="${esc(post.title)}"><meta property="og:description" content="${esc(post.excerpt)}"><meta property="og:image" content="${canonical}diagram.svg">
<!-- Google AdSense --><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9836978328238476" crossorigin="anonymous"></script>
${jsonLd}<style>
:root{--ink:#202124;--muted:#5f6368;--line:#dadce0;--blue:#1769aa;--pale:#f5f8fb;--sans:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic","Noto Sans JP",Meiryo,sans-serif}*{box-sizing:border-box}body{margin:0;color:var(--ink);font:17px/1.9 var(--sans);-webkit-font-smoothing:antialiased}a{color:var(--blue)}.wrap{width:min(100% - 36px,820px);margin:auto}.top{padding:20px 0;border-bottom:1px solid var(--line)}.brand{display:inline-flex;align-items:center;text-decoration:none}.brand img{display:block;width:164px;height:auto}.top nav{float:right;display:flex;gap:18px;font-size:.9rem}.top nav a{color:var(--muted);text-decoration:none}.crumb{margin:28px 0 10px;font-size:.85rem;color:var(--muted)}.crumb a{color:var(--blue)}.meta{font-size:.85rem;color:var(--muted)}h1{font-size:clamp(2rem,6vw,3rem);line-height:1.45;letter-spacing:-.02em;margin:10px 0 18px}.excerpt{font-size:1.1rem;color:#444;background:var(--pale);padding:18px 20px;border-left:4px solid var(--blue);margin:22px 0}.cover{margin:24px 0 40px}.cover img{width:100%;height:auto;display:block}.cover figcaption{font-size:.8rem;color:var(--muted);margin-top:6px}.article-body h2{font-size:1.45rem;line-height:1.55;margin:2.2em 0 .7em;padding-bottom:8px;border-bottom:1px solid var(--line)}.article-body p{margin:0 0 1.2em}.sources{margin:50px 0;padding:22px;background:var(--pale)}.sources h2{font-size:1.2rem;margin:0 0 10px}.sources ol{padding-left:24px}.sources li{margin:10px 0;font-size:.92rem;overflow-wrap:anywhere}.sources small{display:block;color:var(--muted)}.notice{margin:24px 0;padding:14px 16px;border:1px solid var(--line);font-size:.88rem;color:var(--muted)}footer{margin-top:60px;padding:24px 0 40px;border-top:1px solid var(--line);font-size:.83rem;color:var(--muted)}footer a{margin-right:14px}@media(max-width:600px){body{font-size:16px}.top nav{float:none;margin-top:8px}.top{display:flex;flex-direction:column}}
</style></head><body><div class="wrap"><header class="top"><a class="brand" href="/morely/"><img src="/morely/logo.png" alt="Morely — More Clearly"></a><nav><a href="/morely/">記事一覧</a><a href="/aicaster/">三行要約</a></nav></header>
<div class="crumb"><a href="/morely/">Morely</a> ／ ${esc(post.category)}</div><main><article><div class="meta">${esc(post.date)} ・ ${length.toLocaleString("ja-JP")}文字 ・ 編集資料の確認</div><h1>${esc(post.title)}</h1><p class="excerpt">${esc(post.excerpt)}</p><figure class="cover"><img src="diagram.svg" alt="${esc(post.imageAlt || post.title)}"><figcaption>${esc(post.imageCaption || "Morelyの解説図")}</figcaption></figure><div class="article-body">${renderBody(post.body)}</div><div class="notice">検証欄は、本文に明記した公開資料の照合に基づきます。実機を操作した試験や運営者本人の体験は、実施した場合に限り別途記載します。</div>${sourceHtml}</article></main><footer><a href="/about.html">運営者情報・編集方針</a><a href="/contact.html">お問い合わせ</a><a href="/privacy.html">プライバシー</a><a href="/disclaimer.html">免責事項</a><p>記事は出典資料をもとに編集しています。更新時には日付と参照資料を確認してください。</p></footer></div></body></html>`;
}

function renderHome(posts) {
  const groups = ["AI・テック", "経済・社会", "その他"];
  const valid = posts.filter(isIndexable).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const sections = groups.map((group, index) => {
    const items = valid.filter((post) => post.category === group);
    if (!items.length) return "";
    const id = ["ai-tech", "economy-society", "other"][index];
    return `<section id="${id}"><h2>${group}</h2><div class="cards">${items.map((post) => `<article class="card"><div class="meta">${esc(post.date)} ・ ${String(post.body).trim().length.toLocaleString("ja-JP")}文字</div><h3><a href="/morely/${encodeURIComponent(post.slug)}/">${esc(post.title)}</a></h3><p>${esc(post.excerpt)}</p></article>`).join("")}</div></section>`;
  }).join("");
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Morely — More Clearly｜ニュースを背景から解説</title><meta name="description" content="Morely（More Clearly）は、AI・テックと経済・社会のニュースを、背景・仕組み・公開資料の確認を通じてわかりやすく解説します。"><link rel="canonical" href="${SITE}/morely/"><link rel="icon" type="image/png" href="/morely/favicon.png"><style>
:root{--ink:#202124;--muted:#5f6368;--line:#dadce0;--blue:#1769aa;--pale:#f5f8fb;--sans:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic","Noto Sans JP",Meiryo,sans-serif}*{box-sizing:border-box}body{margin:0;color:var(--ink);font:16px/1.8 var(--sans);-webkit-font-smoothing:antialiased}a{color:var(--blue)}.wrap{width:min(100% - 36px,1040px);margin:auto}.top{padding:22px 0;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center}.brand{display:inline-flex;align-items:center;text-decoration:none}.brand img{display:block;width:188px;height:auto}.top nav{display:flex;gap:20px}.top nav a{font-size:.9rem;text-decoration:none}.hero{padding:54px 0 42px;border-bottom:1px solid var(--line)}.eyebrow{font-size:.75rem;letter-spacing:.22em;color:var(--blue);font-weight:700}.hero h1{font-size:clamp(2.5rem,7vw,4rem);line-height:1.2;margin:8px 0 14px}.hero p{max-width:720px;color:#444;font-size:1.1rem;margin:0}.scope{margin-top:18px;color:var(--muted);font-size:.9rem}.jump{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}.jump a{border:1px solid var(--line);border-radius:4px;padding:8px 14px;text-decoration:none;font-size:.9rem}.jump a:hover{border-color:var(--blue);background:var(--pale)}main{padding:22px 0 60px}section{padding:25px 0 8px;scroll-margin-top:16px}section h2{font-size:1.4rem;padding-bottom:9px;border-bottom:2px solid var(--blue)}.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 30px}.card{padding:20px 0;border-bottom:1px solid var(--line)}.meta{font-size:.78rem;color:var(--muted)}.card h3{font-size:1.2rem;line-height:1.55;margin:6px 0}.card h3 a{color:var(--ink);text-decoration:none}.card h3 a:hover{color:var(--blue);text-decoration:underline}.card p{color:#4c5054;margin:0;font-size:.92rem}.empty{padding:24px;background:var(--pale);color:var(--muted)}.news-link{margin:30px 0;padding:20px;background:var(--pale)}footer{padding:24px 0 38px;border-top:1px solid var(--line);font-size:.84rem;color:var(--muted)}footer a{margin-right:14px}@media(max-width:640px){.cards{grid-template-columns:1fr}.hero{padding:36px 0 28px}.hero p{font-size:1rem}.top{align-items:flex-start;flex-direction:column;gap:8px}}
</style><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9836978328238476" crossorigin="anonymous"></script></head><body><div class="wrap"><header class="top"><a class="brand" href="/morely/"><img src="/morely/logo.png" alt="Morely — More Clearly"></a><nav><a href="/about.html">編集方針</a><a href="/aicaster/">三行要約</a></nav></header><section class="hero"><div class="eyebrow">MORE CLEARLY</div><h1>ニュースを、<br>背景からもう少しはっきり。</h1><p>AI・テック、経済・社会のニュースを、見出しの言い換えで終わらせず、何が発表されたのか、どんな仕組みなのか、読者が次に何を確認できるかまで解説します。</p><p class="scope">記事は公開資料をもとに作成し、出典と確認日を掲載します。実機で試していない内容を体験談として書きません。</p><nav class="jump"><a href="#ai-tech">AI・テック</a><a href="#economy-society">経済・社会</a><a href="#other">その他</a></nav></section><main>${sections || '<div class="empty">記事を準備しています。</div>'}<div class="news-link"><strong>今日のニュースを短く読む</strong><br><a href="/aicaster/">AIの三行要約一覧へ</a>（検索エンジンには登録しないページです）</div></main><footer><a href="/about.html">運営者情報・編集方針</a><a href="/contact.html">お問い合わせ</a><a href="/privacy.html">プライバシー</a><a href="/disclaimer.html">免責事項</a><p>Morely は More Clearly から名付けた解説記事欄です。</p></footer></div></body></html>`;
}

function main() {
  const file = path.join(ROOT, "blog.json");
  const posts = JSON.parse(fs.readFileSync(file, "utf8"));
  const morelyRoot = path.join(ROOT, "morely");
  fs.mkdirSync(morelyRoot, { recursive: true });
  if (!fs.existsSync(path.join(ROOT, "news.html"))) {
    let news = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    news = news.replace('<title>AI Caster — AIが三行でまとめるニュース</title>', '<title>AI Caster — 三行要約ニュース</title>');
    news = news.replace('<meta name="description" content="AI Casterは、むずかしいニュースをAIが三行でまとめて届けるニュースサイトです。">', '<meta name="description" content="AIがニュースの要点を三行でまとめます。">\n<meta name="robots" content="noindex,follow">');
    news = news.replace('<link rel="canonical" href="https://aicaster.pages.dev/">', '<link rel="canonical" href="https://aicaster.pages.dev/news.html">');
    fs.writeFileSync(path.join(ROOT, "news.html"), news);
  }
  let aicaster = fs.readFileSync(path.join(ROOT, "news.html"), "utf8");
  aicaster = aicaster.replace("https://aicaster.pages.dev/news.html", "https://aicaster.pages.dev/aicaster/");
  aicaster = aicaster.replace(/href="index\.html"/g, 'href="/aicaster/"');
  for (const page of ["ai-room.html", "blog.html", "about.html", "contact.html", "privacy.html", "disclaimer.html"]) {
    aicaster = aicaster.replaceAll(`href="${page}"`, `href="/${page}"`);
  }
  aicaster = aicaster.replaceAll('href="#/"', 'href="/aicaster/#/"');
  aicaster = aicaster.replaceAll('"ai-room.html"', '"/ai-room.html"').replaceAll('"blog.html"', '"/blog.html"');
  aicaster = aicaster.replace('h: "/blog.html", t: "Morely"', 'h: "/morely/", t: "Morely"');
  aicaster = aicaster.replaceAll('fetch("news.json"', 'fetch("/news.json"').replaceAll('fetch("ai_room.json"', 'fetch("/ai_room.json"');
  const aicasterDir = path.join(ROOT, "aicaster");
  fs.mkdirSync(aicasterDir, { recursive: true });
  fs.writeFileSync(path.join(aicasterDir, "index.html"), aicaster);

  const keep = new Set(posts.filter((item) => item.morely).map((item) => item.slug));
  for (const entry of fs.readdirSync(morelyRoot, { withFileTypes: true })) {
    if (entry.isDirectory() && !keep.has(entry.name)) fs.rmSync(path.join(morelyRoot, entry.name), { recursive: true, force: true });
  }
  for (const post of posts.filter((item) => item.morely)) fs.writeFileSync(path.join(morelyRoot, post.slug, "index.html"), articleHtml(post));
  fs.writeFileSync(path.join(morelyRoot, "index.html"), renderHome(posts));
  fs.copyFileSync(path.join(ROOT, ".github", "templates", "overview.html"), path.join(ROOT, "index.html"));
  const urls = ["/", "/morely/", ...posts.filter(isIndexable).map((post) => `/morely/${encodeURIComponent(post.slug)}/`), "/about.html", "/contact.html", "/privacy.html", "/disclaimer.html"];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${SITE}${url}</loc></url>`).join("\n")}\n</urlset>\n`;
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemap);
  console.log(`Generated overview, AICaster, Morely homepage, and ${posts.filter(isIndexable).length} indexable articles.`);
}

main();
