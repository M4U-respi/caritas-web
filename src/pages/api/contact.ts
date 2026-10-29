/**
 * お問い合わせフォームの受付(POST /api/contact)— Cloudflare だけで完結
 *
 * 1. Cloudflare Turnstile で人による送信かを確認(シークレット TURNSTILE_SECRET_KEY)
 * 2. Cloudflare Email Service の send_email バインディング CONTACT_MAIL で CONTACT_TO 宛てにメール通知
 *    (送信元 CONTACT_FROM は Cloudflare DNS で管理するドメインのアドレスが必要)
 * 内容はどこにも保存しない。送信者への自動返信(ありがとうメール)も送らない。
 *
 * 迷惑送信対策:送信サイズの上限 → 同じ IP からの送信回数の制限(Rate Limiting バインディング CONTACT_RL)
 *   → 人には見えない入力欄 → Turnstile(成功・ホスト名・action を確認)→ 入力値の検証(改行の除去など)
 *   → 本文に URL が多いものは件名に「要確認」を付ける
 */
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

interface Env {
	TURNSTILE_SECRET_KEY?: string;
	CONTACT_TO?: string;
	CONTACT_FROM?: string;
	CONTACT_MAIL?: { send(message: Record<string, unknown>): Promise<unknown> };
	/** Turnstile を許可するホスト名(カンマ区切り。正式ドメインを追加すること) */
	CONTACT_HOSTS?: string;
	CONTACT_RL?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}

/** 受け付けるリクエストの最大サイズ(バイト)。本文 1 万字(UTF-8 で約 30KB)+他の欄に余裕を持たせる */
const MAX_BYTES = 64_000;
/** 本文の URL がこれより多い送信は、件名に「要確認」を付ける(破棄はしない) */
const MAX_URLS = 3;

const json = (body: Record<string, unknown>, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

const str = (v: FormDataEntryValue | null, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
/** 1 行の値(件名に入るお名前・ご用件)。改行などの制御文字を空白に置き換え、メールのヘッダーに別の行を差し込めないようにする */
const line = (v: FormDataEntryValue | null, max: number) => str(v, max).replace(/[\u0000-\u001F\u007F\u2028\u2029]+/g, " ").trim();
/** メールアドレスの形式(返信先に使うため、区切り文字や記号の混入を許さない) */
const EMAIL_RE = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export const POST: APIRoute = async ({ request }) => {
	const cfg = env as unknown as Env;
	if (!cfg.TURNSTILE_SECRET_KEY || !cfg.CONTACT_MAIL || !cfg.CONTACT_TO || !cfg.CONTACT_FROM) return json({ ok: false, error: "not_configured" }, 503);

	// 迷惑送信対策 0:形式・サイズの確認(大きすぎる送信で処理時間を使わされないよう、読み込む前に確認)
	const type = request.headers.get("content-type") ?? "";
	const size = Number(request.headers.get("content-length"));
	if (!/^(multipart\/form-data|application\/x-www-form-urlencoded)/i.test(type)) return json({ ok: false, error: "bad_request" }, 400);
	// Content-Length が無い(chunked)・数値でない送信も受け付けない
	if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) return json({ ok: false, error: "too_large" }, 413);

	// 迷惑送信対策 1:同じ IP からの送信回数を制限(1 分に 3 回まで。各拠点ごとのおおよその制限)
	const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
	if (cfg.CONTACT_RL && !(await cfg.CONTACT_RL.limit({ key: `contact:${ip}` })).success) return json({ ok: false, error: "rate_limited" }, 429);

	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return json({ ok: false, error: "bad_request" }, 400);
	}

	// 迷惑送信対策 2:人には見えない入力欄に値があれば送ったことにして破棄
	if (str(form.get("hp_note"), 200)) return json({ ok: true });

	// 迷惑送信対策 3:Cloudflare Turnstile(成功に加え、このサイトのフォームで発行されたものかを確認)
	const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
		method: "POST",
		body: new URLSearchParams({
			secret: cfg.TURNSTILE_SECRET_KEY,
			response: str(form.get("cf-turnstile-response"), 2048),
			remoteip: ip === "unknown" ? "" : ip,
		}),
	})
		.then((r) => r.json() as Promise<{ success?: boolean; hostname?: string; action?: string }>)
		.catch(() => ({ success: false }) as { success?: boolean; hostname?: string; action?: string });
	const hosts = (cfg.CONTACT_HOSTS ?? "").split(",").map((h) => h.trim()).filter(Boolean);
	if (!verify.success || verify.action !== "contact" || (hosts.length > 0 && !hosts.includes(verify.hostname ?? ""))) {
		return json({ ok: false, error: "turnstile" }, 403);
	}

	// 入力値の検証(上限を超えるものは切り詰めずにエラーにする)
	const raw = (k: string) => (typeof form.get(k) === "string" ? (form.get(k) as string).trim() : "");
	if (raw("name").length > 100 || raw("email").length > 254 || raw("subject").length > 200 || raw("message").length > 10000) {
		return json({ ok: false, error: "invalid" }, 400);
	}
	const name = line(form.get("name"), 100);
	const email = str(form.get("email"), 254);
	const subject = line(form.get("subject"), 200);
	const message = str(form.get("message"), 10000);
	if (!name || !EMAIL_RE.test(email) || !message || !form.get("agree")) return json({ ok: false, error: "invalid" }, 400);

	// 迷惑送信対策 4:本文に URL が多いものは件名に「要確認」を付ける(正規のお問い合わせを捨てないよう破棄はしない)
	const urls = (message.match(/https?:\/\//gi) ?? []).length;
	const flag = urls > MAX_URLS ? "[要確認] " : "";

	const text = [
		"ウェブサイトのお問い合わせフォームから送信がありました。",
		"",
		`お名前：${name}`,
		`メール：${email}`,
		`ご用件：${subject || "(未記入)"}`,
		"",
		"■ メッセージ本文",
		message,
		"",
		"――",
		`受付日時：${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
	].join("\n");

	try {
		await cfg.CONTACT_MAIL.send({
			from: cfg.CONTACT_FROM,
			to: cfg.CONTACT_TO.split(",").map((s) => s.trim()).filter(Boolean),
			replyTo: email,
			subject: `${flag}【お問い合わせ】${subject || "ウェブサイトより"}(${name} 様)`,
			text,
		});
	} catch (e) {
		console.error("[contact] mail send failed", e);
		return json({ ok: false, error: "send_failed" }, 502);
	}
	return json({ ok: true });
};
