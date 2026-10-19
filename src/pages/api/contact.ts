/**
 * お問い合わせフォームの受付(POST /api/contact)— Cloudflare だけで完結
 *
 * 1. Cloudflare Turnstile で人による送信かを確認(シークレット TURNSTILE_SECRET_KEY)
 * 2. Cloudflare Email Service の send_email バインディング CONTACT_MAIL で CONTACT_TO 宛てにメール通知
 *    (送信元 CONTACT_FROM は Cloudflare DNS で管理するドメインのアドレスが必要)
 * 内容はどこにも保存しない。送信者への自動返信(ありがとうメール)も送らない。
 */
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

interface Env {
	TURNSTILE_SECRET_KEY?: string;
	CONTACT_TO?: string;
	CONTACT_FROM?: string;
	CONTACT_MAIL?: { send(message: Record<string, unknown>): Promise<unknown> };
}

const json = (body: Record<string, unknown>, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

const str = (v: FormDataEntryValue | null, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export const POST: APIRoute = async ({ request }) => {
	const cfg = env as unknown as Env;
	if (!cfg.TURNSTILE_SECRET_KEY || !cfg.CONTACT_MAIL || !cfg.CONTACT_TO || !cfg.CONTACT_FROM) return json({ ok: false, error: "not_configured" }, 503);

	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return json({ ok: false, error: "bad_request" }, 400);
	}

	// 迷惑送信対策 1:人には見えない入力欄に値があれば送ったことにして破棄
	if (str(form.get("website"), 200)) return json({ ok: true });

	// 迷惑送信対策 2:Cloudflare Turnstile
	const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
		method: "POST",
		body: new URLSearchParams({
			secret: cfg.TURNSTILE_SECRET_KEY,
			response: str(form.get("cf-turnstile-response"), 2048),
			remoteip: request.headers.get("CF-Connecting-IP") ?? "",
		}),
	}).then((r) => r.json() as Promise<{ success?: boolean }>).catch(() => ({ success: false }));
	if (!verify.success) return json({ ok: false, error: "turnstile" }, 403);

	const name = str(form.get("name"), 100);
	const email = str(form.get("email"), 254);
	const subject = str(form.get("subject"), 200);
	const message = str(form.get("message"), 10000);
	if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !message || !form.get("agree")) return json({ ok: false, error: "invalid" }, 400);

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
			subject: `【お問い合わせ】${subject || "ウェブサイトより"}(${name} 様)`,
			text,
		});
	} catch (e) {
		console.error("[contact] mail send failed", e);
		return json({ ok: false, error: "send_failed" }, 502);
	}
	return json({ ok: true });
};
