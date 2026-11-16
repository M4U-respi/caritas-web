/**
 * 固定ページ・一覧ページのサイトマップ
 *   GET /sitemap-pages.xml
 * - 記事(お知らせ・活動報告・発行物)は EmDash の /sitemap-{collection}.xml が出す。ここではそれ以外を出す
 * - /sitemap.xml(EmDash のサイトマップ索引)には src/middleware.ts でこのファイルを追加している
 * - 固定ページを増やしたら STATIC_PAGES に追加する
 */
import type { APIRoute } from "astro";
import { PAGE_PATHS } from "../data/pages";
import { COLLECTIONS, NEWS_AID, absUrl } from "../data/site";
import { listTerms } from "../lib/cms";

export const prerender = false;

const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const GET: APIRoute = async () => {
	/** 固定ページは src/data/pages.ts(404・API は含めない) */
	const paths = [...PAGE_PATHS];
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
		// URL は本番ドメイン基準(canonical と同じ。src/data/site.ts の SITE.origin)
		...[...new Set(paths)].map((p) => `  <url><loc>${escapeXml(absUrl(p))}</loc></url>`),
		"</urlset>",
	].join("\n");
	return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
};
