#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const ROOT = __dirname;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const API = "https://generativelanguage.googleapis.com/v1beta/interactions";
const REQUIRED = ["はじめに", "背景", "仕組みの解説", "検証・考察", "今後の展望とまとめ"];
const CATEGORY = ["AI・テック", "経済・社会", "その他"];
function tokyoDate() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
function slugify(s) {
  const ascii = String(s).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 56);
  return `${tokyoDate()}-${ascii || "news-analysis"}`;
}
function extractText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  const out = [];
  for (const step of data.steps || []) if (step.type === "model_output") {
    for (const c of step.content || []) if (typeof c.text === "string") out.push(c.text);
  }
  return out.join("\n");
}
function collectCitations(value, found = new Map()) {
  if (!value || typeof value !== "object") return found;
  if (Array.isArray(value)) { for (const item of value) collectCitations(item, found); return found; }
  const url = value.url || value.uri;
  if (typeof url === "string" && /^https:\/\//i.test(url) && (value.type === "url_citation" || value.url_citation || value.title)) {
    const title = value.title || value.url_citation?.title || new URL(url).hostname;
    found.set(url, { title: String(title).slice(0, 180), url, accessed: new Date().toISOString().slice(0,10) });
  }
  for (const [key, child] of Object.entries(value)) if (key !== "thought") collectCitations(child, found);
  return found;
}
async function main() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const newsData = JSON.parse(fs.readFileSync(path.join(ROOT, "news.json"), "utf8"));
  const items = (newsData.items || []).filter((x) => x.title && Array.isArray(x.summary) && /^https:\/\//i.test(x.url || "")).slice(0, 12);
  if (!items.length) throw new Error("No recent news items");
  const posts = JSON.parse(fs.readFileSync(path.join(ROOT, "blog.json"), "utf8"));
  const priorTitles = new Set(posts.filter((p) => p.morely).map((p) => p.title.trim()));
  const input = [
    "あなたは日本語ニュース解説サイトMorelyの編集者です。入力されたニュースから、公開資料で確認可能で読者に実用的な論点を1つ選び、出典を調べて独自記事を作ります。",
    "必ずGoogle Searchを使って一次資料を優先して確認してください。記事の各事実は検索で確認した資料に沿わせること。入力ニュースの文章を転載しない。",
    "出力はJSONオブジェクトのみ。形式: {\"title\":\"\",\"category\":\"AI・テック|経済・社会|その他\",\"excerpt\":\"一覧用説明（120字以内）\",\"body\":\"本文\",\"figureSteps\":[\"短い語句\",\"短い語句\",\"短い語句\"],\"imageCaption\":\"図の説明\"}",
    "本文は日本語で1500〜2500文字（空白込みのJavaScript文字数）。以下の見出しを順に、見出し文言を正確に含めてください: ## はじめに：ニュースの要点と今回の注目ポイント / ## 背景：なぜ今これが重要なのか / ## 仕組みの解説：初心者にもわかる技術的ポイント / ## 検証・考察：公開資料から確認できること / ## 今後の展望とまとめ。",
    "検証・考察は公開資料の比較・数値・条件・制約に基づき、運営者が実機を試したような一人称の体験談を捏造しない。『編集部が確認した公開資料の範囲では』と明記し、具体的に何を確認し何が未確認かを書く。抽象的な美辞麗句、根拠のない予測、一般論の水増しは禁止。",
    "少なくとも2つの独立したHTTPS公開資料で裏付けできる話題を選ぶ。可能なら政府、企業の公式発表、論文、規格文書を使う。記事に画像を前提とした説明は不要（記事ページには自動生成の独自解説図を付ける）。",
    "カテゴリは3択から最も近いものを選ぶ。AI関連はAI・テック、経済や公共政策・社会課題は経済・社会、それ以外はその他。",
    "既存のMorely記事タイトル（重複を避ける）: " + [...priorTitles].slice(0, 20).join(" / "),
    "候補ニュース（事実として使う前に検索で確認）:\n" + items.slice(0, 8).map((x) => `- ID:${x.id} / ${x.category} / ${x.title} / ${x.summary.join(" ")} / ${x.url}`).join("\n"),
  ].join("\n\n");
  const res = await fetch(API, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    signal: AbortSignal.timeout(180000),
    body: JSON.stringify({ model: MODEL, input, tools: [{ type: "google_search" }], generation_config: { thinking_level: "low", max_output_tokens: 4600 } }),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 500);
    if (res.status === 429) throw new Error(`Gemini API quota/rate limit (429). Check the Google AI Studio project quota and billing settings: ${detail}`);
    throw new Error(`Gemini API ${res.status}: ${detail}`);
  }
  const data = await res.json();
  if (data.status === "incomplete") throw new Error("Gemini returned an incomplete article");
  const raw = extractText(data);
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Could not parse article JSON");
  const article = JSON.parse(match[0]);
  const body = String(article.body || "").trim();
  const len = body.length;
  if (len < 1500 || len > 2500) throw new Error(`Article length ${len} is outside 1500-2500; skipped`);
  if (!REQUIRED.every((h) => body.includes("## " + h))) throw new Error("Required headings are missing; skipped");
  if (!CATEGORY.includes(article.category)) throw new Error("Invalid category; skipped");
  const sources = [...collectCitations(data).values()];
  if (sources.length < 2) throw new Error(`Only ${sources.length} grounded HTTPS sources found; skipped`);
  const title = String(article.title || "").trim();
  if (!title || priorTitles.has(title)) throw new Error("Missing or duplicate title; skipped");
  const slug = slugify(title);
  if (posts.some((p) => p.slug === slug)) throw new Error("Duplicate slug; skipped");
  const now = tokyoDate();
  posts.unshift({ slug, date: now, category: article.category, title, excerpt: String(article.excerpt || "").trim().slice(0, 300), sources: sources.slice(0, 8), body, morely: true, figureSteps: Array.isArray(article.figureSteps) ? article.figureSteps.slice(0,3).map(String) : ["公開資料を照合", "条件と仕組みを整理", "読者の判断材料へ"], imageCaption: String(article.imageCaption || "記事の論点を公開資料から整理した解説図") });
  fs.writeFileSync(path.join(ROOT, "blog.json"), JSON.stringify(posts, null, 2) + "\n");
  console.log(`Added Morely article: ${title} (${len} chars, ${sources.length} grounded sources)`);
}
main().catch((error) => { console.error(error.message); process.exit(1); });
