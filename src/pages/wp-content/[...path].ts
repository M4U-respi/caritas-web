/**
 * 旧サイト(www.caritas.jp)から移行した記事内の画像・PDF などを配信する
 *   GET /wp-content/uploads/2024/01/example.jpg
 * - 実体は R2(MEDIA)の legacy/wp-content/uploads/… に格納(旧サイトと同じパス構成)
 * - 記事本文・アイキャッチの URL は「/wp-content/uploads/…」の相対パスで参照する
 * - ファイル配置が src/pages/wp-content/[...path].ts なのは、.gitignore の「uploads」除外を避けるため
 */
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
	const path = params.path;
	if (!path || !path.startsWith("uploads/") || path.includes("..")) return new Response("Not found", { status: 404 });
	const bucket = (env as { MEDIA: R2Bucket }).MEDIA;
	const obj = await bucket.get(`legacy/wp-content/${path}`, { onlyIf: request.headers });
	if (!obj) return new Response("Not found", { status: 404 });

	const headers = new Headers();
	obj.writeHttpMetadata(headers);
	headers.set("ETag", obj.httpEtag);
	headers.set("Cache-Control", "public, max-age=31536000, immutable");
	if (!("body" in obj)) return new Response(null, { status: 304, headers });
	return new Response(obj.body, { headers });
};
