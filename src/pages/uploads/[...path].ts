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

/**
 * Range ヘッダー(単一の bytes 範囲)を解釈する。
 * null = 解釈できない・複数範囲など → 無視して全体を返す / "416" = ファイルの範囲外
 */
function resolveRange(header: string | null, size: number): { offset: number; length: number } | null | "416" {
	const m = header ? /^bytes=(\d*)-(\d*)$/i.exec(header.trim()) : null;
	if (!m || (m[1] === "" && m[2] === "")) return null;
	if (m[1] === "") {
		// 末尾から n バイト(bytes=-n)。ファイルより大きければ全体
		const n = Math.min(Number(m[2]), size);
		return n > 0 ? { offset: size - n, length: n } : "416";
	}
	const start = Number(m[1]);
	if (!Number.isSafeInteger(start) || start >= size) return "416";
	const end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
	return end >= start ? { offset: start, length: end - start + 1 } : null;
}

export const GET: APIRoute = async ({ params, request }) => {
	const path = params.path;
	if (!path || !/^(news|report|publication)\//.test(path) || path.split("/").includes("..")) return new Response("Not found", { status: 404 });
	const bucket = (env as { MEDIA: R2Bucket }).MEDIA;
	const key = `uploads/${path}`;

	// 動画の途中再生・iPhone での再生のための Range(206)。範囲はサイズを確かめてから自前で決める
	let range: { offset: number; length: number } | null = null;
	if (request.headers.has("Range")) {
		const head = await bucket.head(key);
		if (!head) return new Response("Not found", { status: 404 });
		// If-Range が今のファイルと違う(差し替え後)なら範囲は無視して全体を返す
		const ifRange = request.headers.get("If-Range");
		if (!ifRange || ifRange === head.httpEtag) {
			const r = resolveRange(request.headers.get("Range"), head.size);
			if (r === "416") return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${head.size}`, "Accept-Ranges": "bytes" } });
			range = r;
		}
	}

	let obj: R2Object | R2ObjectBody | null;
	try {
		obj = await bucket.get(key, { onlyIf: request.headers, ...(range ? { range } : {}) });
	} catch {
		return new Response(null, { status: 416, headers: { "Accept-Ranges": "bytes" } });
	}
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
	if (!("body" in obj)) {
		// 条件付きリクエストで本文なし:If-Match / If-Unmodified-Since の不一致は 412、それ以外(If-None-Match など)は 304
		const precondition = request.headers.has("If-Match") || request.headers.has("If-Unmodified-Since");
		return new Response(null, { status: precondition ? 412 : 304, headers });
	}
	if (range) {
		headers.set("Content-Range", `bytes ${range.offset}-${range.offset + range.length - 1}/${obj.size}`);
		headers.set("Content-Length", String(range.length));
		return new Response(obj.body, { status: 206, headers });
	}
	headers.set("Content-Length", String(obj.size));
	return new Response(obj.body, { headers });
};
