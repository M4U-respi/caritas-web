/**
 * 開発サイト用の合言葉ゲート
 *
 * - wrangler.jsonc の vars.SITE_PASSWORD が設定されているときだけ有効。
 *   正式公開時は SITE_PASSWORD を削除(または空に)すればゲートは外れる。
 * - 正しい合言葉を入れると Cookie(30日)を発行し、以後は入力不要。
 * - CMS(/_emdash/)は独自のログインがあるため対象外。
 * - 画像・CSS・JS などの静的ファイルは Cloudflare が直接配信するため、このゲートを通らない。
 */
import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";

const COOKIE = "caritas_gate";
const GATE_PATH = "/__gate";
const MAX_AGE = 60 * 60 * 24 * 30;

async function sha256(text: string): Promise<string> {
	const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
	return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeNext(value: FormDataEntryValue | string | null): string {
	const v = typeof value === "string" ? value : "/";
	return v.startsWith("/") && !v.startsWith("//") ? v : "/";
}

function escapeHtml(s: string): string {
	return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function gatePage(next: string, error: boolean): Response {
	const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>開発サイト｜カリタスジャパン</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#F7F1E3;color:#222;
    font-family:"Noto Sans JP","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif}
  .box{width:min(400px,100%);padding:40px 32px;background:#fff;border-radius:12px;box-shadow:0 0 36px rgba(0,0,0,.12);text-align:center}
  img{width:191px;height:auto}
  h1{margin:24px 0 8px;font-size:18px}
  p{margin:0 0 24px;font-size:14px;color:#666;line-height:1.7}
  input{width:100%;height:48px;padding:0 14px;border:1px solid #ccc;border-radius:8px;font-size:16px}
  input:focus{outline:2px solid #008982;outline-offset:1px;border-color:#008982}
  button{width:100%;height:48px;margin-top:12px;border:0;border-radius:8px;background:#D80011;color:#fff;font-size:16px;font-weight:700;cursor:pointer}
  button:hover{background:#B8000E}
  .err{margin:12px 0 0;color:#D80011;font-size:14px}
</style>
</head>
<body>
<form class="box" method="post" action="${GATE_PATH}">
  <img src="/assets/img/logo.png" alt="Caritas Japan カリタスジャパン" width="191" height="48">
  <h1>開発サイト</h1>
  <p>閲覧には合言葉が必要です。</p>
  <input type="hidden" name="next" value="${escapeHtml(next)}">
  <label for="pw" style="position:absolute;left:-9999px">合言葉</label>
  <input id="pw" type="password" name="password" placeholder="合言葉" autocomplete="current-password" autofocus required>
  <button type="submit">表示する</button>
  ${error ? '<p class="err" role="alert">合言葉が違います。</p>' : ""}
</form>
</body>
</html>`;
	return new Response(html, {
		status: error ? 401 : 200,
		headers: {
			"Content-Type": "text/html; charset=utf-8",
			"Cache-Control": "no-store",
			"X-Robots-Tag": "noindex, nofollow",
		},
	});
}

export const onRequest = defineMiddleware(async (context, next) => {
	const password = (env as { SITE_PASSWORD?: string }).SITE_PASSWORD;
	if (!password) return next();

	const { pathname } = context.url;
	if (pathname.startsWith("/_emdash/") || pathname === "/_emdash") return next();

	const token = await sha256(`caritas-gate:${password}`);

	if (pathname === GATE_PATH) {
		if (context.request.method === "POST") {
			const form = await context.request.formData();
			const dest = safeNext(form.get("next"));
			if (form.get("password") === password) {
				context.cookies.set(COOKIE, token, {
					path: "/",
					httpOnly: true,
					secure: context.url.protocol === "https:",
					sameSite: "lax",
					maxAge: MAX_AGE,
				});
				return context.redirect(dest, 303);
			}
			return gatePage(dest, true);
		}
		return gatePage(safeNext(context.url.searchParams.get("next")), false);
	}

	if (context.cookies.get(COOKIE)?.value === token) {
		const res = await next();
		res.headers.set("X-Robots-Tag", "noindex, nofollow");
		return res;
	}

	return gatePage(pathname + context.url.search, false);
});
