/**
 * 固定ページ・一覧ページのサイトマップ
 *   GET /sitemap-pages.xml
 * - 記事(お知らせ・活動報告・発行物)は EmDash の /sitemap-{collection}.xml が出す。ここではそれ以外を出す
 * - /sitemap.xml(EmDash のサイトマップ索引)には src/middleware.ts でこのファイルを追加している
 * - 固定ページを増やしたら STATIC_PAGES に追加する
 */
import type { APIRoute } from "astro";
import { COLLECTIONS, NEWS_AID } from "../data/site";
import { listTerms } from "../lib/cms";

export const prerender = false;

/** src/pages の固定ページ(404・API を除く) */
const STATIC_PAGES = [
	"/",
	"/mission/",
	"/about/",
	"/about/history/",
	"/about/lent/",
	"/about/aid/",
	"/about/social/",
	"/donate/",
	"/donate/card/",
	"/donate/monthly/",
	"/contact/",
	"/site-policy/",
	"/privacy-policy/",
];

const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const GET: APIRoute = async ({ url }) => {
	const paths = [...STATIC_PAGES];
	// 一覧とカテゴリ
	for (const c of Object.values(COLLECTIONS)) {
		paths.push(c.base);
		for (const t of c.terms) paths.push(`${c.base}${t.slug}/`);
	}
	// 災害・紛争ごとのページ(管理画面の「支援・災害」)
	for (const t of await listTerms(NEWS_AID.taxonomy)) paths.push(`${COLLECTIONS.news.base}${t.slug}/`);

	const body = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...[...new Set(paths)].map((p) => `  <url><loc>${escapeXml(new URL(p, url.origin).href)}</loc></url>`),
		"</urlset>",
	].join("\n");
	return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
};
