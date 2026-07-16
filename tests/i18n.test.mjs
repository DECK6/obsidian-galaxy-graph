import assert from "node:assert/strict";
import test from "node:test";
import { resolveLocale, translationsFor } from "../src/i18n.ts";

test("English is the default locale", () => {
  assert.equal(resolveLocale(""), "en");
  assert.equal(resolveLocale("en"), "en");
  assert.equal(resolveLocale("ja"), "en");
  assert.equal(resolveLocale("unknown"), "en");
});

test("Korean locales select Korean translations", () => {
  assert.equal(resolveLocale("ko"), "ko");
  assert.equal(resolveLocale("ko-KR"), "ko");
  assert.equal(resolveLocale("KO_kr"), "ko");
});

test("English translations include dynamic graph counts", () => {
  const t = translationsFor("en-US");

  assert.equal(t.searchPlaceholder, "Search notes…");
  assert.equal(t.nodeConnections(1, "Inbox"), "1 connection · Inbox");
  assert.equal(t.nodeConnections(12, "Projects"), "12 connections · Projects");
  assert.equal(t.searchResults(1, 1), "1 result · 1 star including neighbors");
  assert.equal(t.searchResults(2, 7), "2 results · 7 stars including neighbors");
  assert.equal(t.graphStatus(1, t.linkCount(1)), "1 star · 1 link");
  assert.equal(t.graphStatus(18, t.linkCount(24, 30)), "18 stars · 24 / 30 links");
});

test("Korean translations include dynamic graph counts", () => {
  const t = translationsFor("ko-KR");

  assert.equal(t.searchPlaceholder, "노트 검색…");
  assert.equal(t.nodeConnections(12, "프로젝트"), "연결 12개 · 프로젝트");
  assert.equal(t.searchResults(2, 7), "검색 결과 2개 · 이웃 포함 별 7개");
  assert.equal(t.graphStatus(1, t.linkCount(1)), "별 1개 · 연결 1개");
  assert.equal(t.graphStatus(18, t.linkCount(24, 30)), "별 18개 · 연결 24 / 30개");
});
