/**
 * 記事(お知らせ・活動報告)で使う画像・書類(PDF など)を配信する
 *   GET /uploads/news/2026/09/example.jpg    … お知らせ用
 *   GET /uploads/report/2026/10/example.pdf  … 活動報告用
 *   GET /uploads/publication/2025/11/WAC31.pdf … 発行物用
 * - 実体は R2(MEDIA)の uploads/news/… ・uploads/report/… ・uploads/publication/… に格納(旧サイトから移行したファイル)
 */
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
	const path = params.path;
	if (!path || !/^(news|report|publication)\//.test(path) || path.split("/").includes("..")) return new Response("Not found", { status: 404 });
	const bucket = (env as { MEDIA: R2Bucket }).MEDIA;
	const obj = await bucket.get(`uploads/${path}`, { onlyIf: request.headers });
	if (!obj) return new Response("Not found", { status: 404 });

	const headers = new Headers();
	obj.writeHttpMetadata(headers);
	headers.set("ETag", obj.httpEtag);
	headers.set("Cache-Control", "public, max-age=31536000, immutable");
	if (!("body" in obj)) return new Response(null, { status: 304, headers });
	return new Response(obj.body, { headers });
};
