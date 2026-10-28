/**
 * 記事(お知らせ・活動報告)で使う画像・書類(PDF など)を配信する
 *   GET /uploads/news/2026/09/example.jpg    … お知らせ用
 *   GET /uploads/report/2026/10/example.pdf  … 活動報告用
 *   GET /uploads/publication/2025/11/WAC31.pdf … 発行物用
 * - 実体は R2(MEDIA)の uploads/news/… ・uploads/report/… ・uploads/publication/… に格納(旧サイトから移行したファイル)
 * - 動画の途中再生・iPhone での再生のため Range リクエスト(206)に対応する
 * - 種類は拡張子で決め、画像・PDF・動画・音声だけをブラウザ内で表示する。それ以外(HTML・SVG・Office 文書など)は
 *   ダウンロードさせ、サイト上でスクリプトとして動かないようにする(保存時の Content-Type は信用しない)
 */
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

/** ブラウザ内で表示してよい種類(拡張子 → Content-Type) */
const INLINE: Record<string, string> = {
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	png: "image/png",
	gif: "image/gif",
	webp: "image/webp",
	avif: "image/avif",
	pdf: "application/pdf",
	mp4: "video/mp4",
	mp3: "audio/mpeg",
};

export const GET: APIRoute = async ({ params, request }) => {
	const path = params.path;
	if (!path || !/^(news|report|publication)\//.test(path) || path.split("/").includes("..")) return new Response("Not found", { status: 404 });
	const bucket = (env as { MEDIA: R2Bucket }).MEDIA;
	const wantsRange = request.headers.has("Range");
	const obj = await bucket.get(`uploads/${path}`, { onlyIf: request.headers, ...(wantsRange ? { range: request.headers } : {}) });
	if (!obj) return new Response("Not found", { status: 404 });

	const headers = new Headers();
	obj.writeHttpMetadata(headers);
	const ext = path.split(".").pop()?.toLowerCase() ?? "";
	const inline = INLINE[ext];
	if (inline) {
		headers.set("Content-Type", inline);
		headers.delete("Content-Disposition");
	} else {
		headers.set("Content-Type", "application/octet-stream");
		headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(path.split("/").pop() ?? "file")}`);
		headers.set("Content-Security-Policy", "sandbox; default-src 'none'");
	}
	headers.set("X-Content-Type-Options", "nosniff");
	headers.set("ETag", obj.httpEtag);
	// 同じ名前で差し替えたときに反映されるよう 1 日(immutable にしない)
	headers.set("Cache-Control", "public, max-age=86400");
	headers.set("Accept-Ranges", "bytes");
	if (!("body" in obj)) return new Response(null, { status: 304, headers });
	const r = obj.range as { offset?: number; length?: number; suffix?: number } | undefined;
	if (wantsRange && r) {
		const offset = r.suffix !== undefined ? obj.size - r.suffix : (r.offset ?? 0);
		const length = r.suffix !== undefined ? r.suffix : (r.length ?? obj.size - offset);
		headers.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${obj.size}`);
		headers.set("Content-Length", String(length));
		return new Response(obj.body, { status: 206, headers });
	}
	headers.set("Content-Length", String(obj.size));
	return new Response(obj.body, { headers });
};
