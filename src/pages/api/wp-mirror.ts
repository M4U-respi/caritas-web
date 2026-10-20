/**
 * 【一時的】旧サイトの wp-content/uploads のファイルを R2 にコピーする(記事移行用)
 *   GET  /api/wp-mirror?key=…           … 記事(お知らせ・活動報告)が参照している旧サイトのファイル URL 一覧
 *   POST /api/wp-mirror?key=…  {urls}   … 最大 10 件を取得して R2(legacy/wp-content/uploads/…)に保存
 * - key はシークレット WP_EXPORT_KEY と一致したときだけ応答
 * - 移行が終わったらこのファイルを削除する
 */
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

const PREFIX = "https://www.caritas.jp/wp-content/uploads/";
const e = env as { WP_EXPORT_KEY?: string; MEDIA: R2Bucket; DB: D1Database };
const allowed = (url: URL) => !!e.WP_EXPORT_KEY && url.searchParams.get("key") === e.WP_EXPORT_KEY;
const toKey = (u: string) => `legacy/wp-content/uploads/${decodeURIComponent(u.slice(PREFIX.length))}`;

export const GET: APIRoute = async ({ url }) => {
	if (!allowed(url)) return new Response("Not found", { status: 404 });
	const sql = (table: string) => `
		SELECT t.value AS u FROM ${table} n, json_tree(n.content) t
		WHERE n.deleted_at IS NULL AND t.type = 'text' AND t.value LIKE '${PREFIX}%'
		UNION SELECT json_extract(featured_image, '$.src') FROM ${table}
		WHERE deleted_at IS NULL AND featured_image LIKE '%${PREFIX}%'`;
	const { results } = await e.DB.prepare(`SELECT DISTINCT u FROM (${sql("ec_news")} UNION ${sql("ec_report")}) ORDER BY u`).all<{ u: string }>();
	return Response.json(results.map((r) => r.u.trim()).filter((u) => u.startsWith(PREFIX)));
};

export const POST: APIRoute = async ({ url, request }) => {
	if (!allowed(url)) return new Response("Not found", { status: 404 });
	const { urls } = (await request.json()) as { urls: string[] };
	const out: { url: string; status: string; size?: number }[] = [];
	for (const u of (urls ?? []).slice(0, 10)) {
		if (!u.startsWith(PREFIX)) { out.push({ url: u, status: "skip:prefix" }); continue; }
		const key = toKey(u);
		const head = await e.MEDIA.head(key);
		if (head) { out.push({ url: u, status: "exists", size: head.size }); continue; }
		const res = await fetch(u, { headers: { "User-Agent": "caritas-web-migration" } });
		if (!res.ok) { out.push({ url: u, status: `http:${res.status}` }); continue; }
		const body = await res.arrayBuffer();
		await e.MEDIA.put(key, body, { httpMetadata: { contentType: res.headers.get("content-type") ?? "application/octet-stream" } });
		out.push({ url: u, status: "saved", size: body.byteLength });
	}
	return Response.json(out);
};
