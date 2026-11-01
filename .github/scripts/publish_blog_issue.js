#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const OWNER_ID = 350409943;
const CATEGORIES = new Set(["はじめまして", "AIニュース", "AIの使い方", "AIと学校", "AIと暮らし", "その他"]);
const LABELS = ["記事タイトル", "カテゴリ", "一覧用の紹介文", "本文"];
const ROOT = path.resolve(__dirname, "../..");

function field(body, label, nextLabels) {
  const marker = "### " + label;
  const start = body.indexOf(marker);
  if (start < 0) throw new Error("フォーム項目が見つかりません: " + label);
  const valueStart = body.indexOf("\n", start) + 1;
  let end = body.length;
  for (const nextLabel of nextLabels) {
    const next = body.indexOf("\n### " + nextLabel, valueStart);
    if (next >= 0 && next < end) end = next;
  }
  return body.slice(valueStart, end).trim();
}

function dateInTokyo(iso) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(iso));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) throw new Error("GitHub event payload is unavailable.");
  const event = JSON.parse(fs.readFileSync(eventPath, "utf8"));
  const issue = event.issue;
  if (issue?.user?.id !== OWNER_ID || event.sender?.id !== OWNER_ID) {
    throw new Error("このフォームを公開できるのは運営者アカウントだけです。");
  }

  const body = String(issue.body || "");
  const title = field(body, LABELS[0], LABELS.slice(1));
  const category = field(body, LABELS[1], LABELS.slice(2));
  const excerpt = field(body, LABELS[2], LABELS.slice(3));
  const articleBody = field(body, LABELS[3], []);
  if (!title || title.length > 120) throw new Error("タイトルは1〜120文字で入力してください。");
  if (!CATEGORIES.has(category)) throw new Error("カテゴリが選択肢にありません。");
  if (!excerpt || excerpt.length > 300) throw new Error("紹介文は1〜300文字で入力してください。");
  if (!articleBody || articleBody.length > 12000) throw new Error("本文は1〜12,000文字で入力してください。");

  const file = path.join(ROOT, "blog.json");
  const posts = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(posts)) throw new Error("blog.json の形式が配列ではありません。");
  const slug = `blog-${issue.number}`;
  const existingIndex = posts.findIndex((post) => post.slug === slug);
  const post = {
    slug,
    date: existingIndex >= 0 ? posts[existingIndex].date : dateInTokyo(issue.created_at),
    category,
    title,
    excerpt,
    body: articleBody,
  };
  if (existingIndex >= 0) posts[existingIndex] = post;
  else posts.push(post);
  posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  fs.writeFileSync(file, JSON.stringify(posts, null, 2) + "\n");
  console.log(`${existingIndex >= 0 ? "更新" : "追加"}: ${title} (${slug})`);
}

main();
