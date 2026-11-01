#!/usr/bin/env node
"use strict";
/*
  ニュース自動収集 + AI要約スクリプト
  1. feeds.json のRSSを取得
  2. 未処理の記事だけをGemini APIで「3行要約 + タグ」に変換
  3. news.json に書き出す(既存の要約は再利用するのでAPI費用を抑えられます)

  必要: Node.js 18以上 / 環境変数 GEMINI_API_KEY
  任意: GEMINI_MODEL(既定 gemini-3.5-flash-lite), MAX_NEW_PER_RUN(既定 20),
        MAX_KEEP(既定 200), KEEP_DAYS(既定 7)
*/
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const FEEDS_PATH = path.join(ROOT, "feeds.json");
const OUT_PATH = path.join(ROOT, "news.json");
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const MAX_NEW = Number(process.env.MAX_NEW_PER_RUN || 20);
const MAX_KEEP = Number(process.env.MAX_KEEP || 200);
const KEEP_DAYS = Number(process.env.KEEP_DAYS || 7);

/* ---------- RSS解析(依存ライブラリなし) ---------- */
function decodeEntities(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}
function stripTags(s) { return decodeEntities(s).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(); }
function pick(block, tag) {
  const m = block.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag + ">", "i"));
  return m ? m[1] : "";
}
function parseRss(xml, feed) {
  const out = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const b of blocks) {
    const title = stripTags(pick(b, "title"));
    let link = stripTags(pick(b, "link"));
    if (!link) { const m = b.match(/<link[^>]*href="([^"]+)"/i); link = m ? decodeEntities(m[1]) : ""; }
    const desc = stripTags(pick(b, "description") || pick(b, "summary") || pick(b, "content:encoded"));
    const dateRaw = stripTags(pick(b, "pubDate") || pick(b, "dc:date") || pick(b, "published") || pick(b, "updated"));
    let d = new Date(dateRaw);
    if (isNaN(d)) d = new Date();
    if (!title || !/^https?:\/\//.test(link)) continue;
    out.push({
      id: crypto.createHash("sha1").update(link).digest("hex").slice(0, 12),
      category: feed.category, source: feed.name, title, url: link, description: desc, date: d.toISOString(),
    });
  }
  return out;
}

async function fetchText(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "sangyo-news-bot/1.0" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.text();
  } finally { clearTimeout(timer); }
}

/* ---------- Gemini APIで要約 ---------- */
function buildPrompt(it) {
  return [
    "次のニュースの見出しと概要だけを根拠に、読者向けの短い要約を作ってください。",
    "",
    "【ルール】",
    "- 3行の要約。1行は45文字以内、常体(だ・である調)。",
    "- 1行目は何が起きたか、2行目は背景や理由、3行目は影響や今後の注目点。",
    "- 見出しや概要に書かれていない事実・数字・固有名詞は絶対に追加しない。",
    "- 見出しの言い換えだけの行は作らない。難しい用語は平易な言葉にする。",
    "- tagsは話題を表す名詞を3〜4個(#は付けない、1語〜6文字程度)。",
    "- 情報が少なく3行にできない場合は {\"skip\":true} だけを返す。",
    "- 出力はJSONのみ。例: {\"summary\":[\"…\",\"…\",\"…\"],\"tags\":[\"…\",\"…\",\"…\"]}",
    "",
    "カテゴリ: " + it.category,
    "見出し: " + it.title,
    "概要: " + (it.description || "(なし)").slice(0, 1200),
  ].join("\n");
}

async function callGemini(prompt, attempt = 0) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 500, responseMimeType: "application/json" },
    }),
  });
  if ((res.status === 429 || res.status >= 500) && attempt < 2) {
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    return callGemini(prompt, attempt + 1);
  }
  if (!res.ok) throw new Error("API " + res.status + " " + (await res.text()).slice(0, 200));
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const text = parts.map((part) => part.text || "").join("");
  if (!text) throw new Error("Gemini APIから要約テキストが返りませんでした。");
  return text;
}

function parseSummary(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  let j;
  try { j = JSON.parse(m[0]); } catch { return null; }
  if (j.skip) return null;
  const summary = Array.isArray(j.summary) ? j.summary.map((s) => String(s).trim()).filter(Boolean) : [];
  if (summary.length !== 3 || summary.some((s) => s.length > 70)) return null;
  const tags = (Array.isArray(j.tags) ? j.tags : []).map((t) => String(t).replace(/^#/, "").trim()).filter(Boolean).slice(0, 4);
  return { summary, tags };
}

/* ---------- メイン ---------- */
function interleave(groups) {
  const out = [];
  for (let i = 0; groups.some((g) => i < g.length); i++) groups.forEach((g) => { if (i < g.length) out.push(g[i]); });
  return out;
}

async function main() {
  if (!process.env.GEMINI_API_KEY) { console.error("GEMINI_API_KEY が設定されていません。"); process.exit(1); }
  const feeds = JSON.parse(fs.readFileSync(FEEDS_PATH, "utf8"));
  let existing = [];
  try { existing = JSON.parse(fs.readFileSync(OUT_PATH, "utf8")).items || []; } catch {}
  const known = new Set(existing.map((x) => x.id));
  const cutoff = Date.now() - KEEP_DAYS * 86400e3;

  let okFeeds = 0;
  const groups = [];
  for (const feed of feeds) {
    try {
      const items = parseRss(await fetchText(feed.url), feed)
        .filter((i) => !known.has(i.id) && new Date(i.date).getTime() >= cutoff)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      groups.push(items); okFeeds++;
      console.log(`取得 ${feed.name}: 新規候補 ${items.length}件`);
    } catch (e) { console.warn(`取得失敗 ${feed.name}: ${e.message}`); }
  }
  if (!okFeeds) { console.error("すべてのフィードの取得に失敗しました。"); process.exit(1); }

  const candidates = interleave(groups).slice(0, MAX_NEW);
  const added = [];
  for (const it of candidates) {
    try {
      const r = parseSummary(await callGemini(buildPrompt(it)));
      if (!r) { console.log("スキップ: " + it.title); continue; }
      added.push({ id: it.id, category: it.category, title: it.title, summary: r.summary, tags: r.tags, source: it.source, url: it.url, date: it.date });
      console.log("要約OK: " + it.title);
    } catch (e) { console.warn("要約失敗: " + it.title + " / " + e.message); }
  }

  let all = existing.concat(added);
  if (added.length) all = all.filter((x) => !String(x.id).startsWith("sample-")); // 初期サンプルは実記事が入ったら削除
  all = all.filter((x) => new Date(x.date).getTime() >= cutoff || String(x.id).startsWith("sample-"))
    .sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, MAX_KEEP);

  fs.writeFileSync(OUT_PATH, JSON.stringify({ updated: new Date().toISOString(), items: all }, null, 1) + "\n");
  console.log(`完了: 追加 ${added.length}件 / 合計 ${all.length}件`);
}

module.exports = { parseRss, parseSummary };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
