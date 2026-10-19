/**
 * お問い合わせフォームの受付(POST /api/contact)— Cloudflare だけで完結
 *
 * 1. Cloudflare Turnstile で人による送信かを確認(シークレット TURNSTILE_SECRET_KEY)
 * 2. 内容を D1(テーブル contact_messages)に保存、添付ファイルは R2(contact/ 以下)に保存
 * 3. メール通知:send_email バインディング CONTACT_MAIL があるときだけ CONTACT_TO 宛てに送る
 *    (Cloudflare のメール送信には Cloudflare DNS のドメインが必要。未設定の間は保存のみ)
 * 送信者への自動返信(ありがとうメール)は送らない。
 */
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

const MAX_FILE = 5 * 1024 * 1024;

interface Env {
	DB: D1Database;
	MEDIA: R2Bucket;
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

	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return json({ ok: false, error: "bad_request" }, 400);
	}

	// 迷惑送信対策 1:人には見えない入力欄に値があれば送ったことにして破棄
	if (str(form.get("website"), 200)) return json({ ok: true });

	// 迷惑送信対策 2:Cloudflare Turnstile
	if (!cfg.TURNSTILE_SECRET_KEY) return json({ ok: false, error: "not_configured" }, 503);
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
	if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !form.get("agree")) return json({ ok: false, error: "invalid" }, 400);

	const file = form.get("file");
	const hasFile = file instanceof File && file.size > 0;
	if (hasFile && file.size > MAX_FILE) return json({ ok: false, error: "file_too_large" }, 400);

	const id = crypto.randomUUID();
	const createdAt = new Date().toISOString();
	const fileKey = hasFile ? `contact/${id}/${file.name.replace(/[\\/]/g, "_") || "attachment"}` : null;
	const fileBuf = hasFile ? await file.arrayBuffer() : null;

	// 保存(D1 + R2)
	if (fileKey && fileBuf) await cfg.MEDIA.put(fileKey, fileBuf, { httpMetadata: { contentType: (file as File).type || "application/octet-stream" } });
	await cfg.DB.prepare(
		`CREATE TABLE IF NOT EXISTS contact_messages (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL, subject TEXT, message TEXT, file_key TEXT, user_agent TEXT)`,
	).run();
	await cfg.DB.prepare(`INSERT INTO contact_messages (id, created_at, name, email, subject, message, file_key, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
		.bind(id, createdAt, name, email, subject, message, fileKey, (request.headers.get("User-Agent") ?? "").slice(0, 300))
		.run();

	// メール通知(設定済みのときだけ)
	if (cfg.CONTACT_MAIL && cfg.CONTACT_TO && cfg.CONTACT_FROM) {
		const text = [
			"ウェブサイトのお問い合わせフォームから送信がありました。",
			"",
			`お名前　　　：${name}`,
			`メール　　　：${email}`,
			`ご用件　　　：${subject || "(未記入)"}`,
			`添付ファイル：${hasFile ? (file as File).name : "なし"}`,
			"",
			"■ メッセージ本文",
			message || "(未記入)",
			"",
			"――",
			`受付日時：${new Date(createdAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
			`受付番号：${id}`,
		].join("\n");
		try {
			await cfg.CONTACT_MAIL.send({
				from: cfg.CONTACT_FROM,
				to: cfg.CONTACT_TO.split(",").map((s) => s.trim()).filter(Boolean),
				replyTo: email,
				subject: `【お問い合わせ】${subject || "ウェブサイトより"}(${name} 様)`,
				text,
				attachments: hasFile && fileBuf ? [{ filename: (file as File).name, content: fileBuf, type: (file as File).type || "application/octet-stream", disposition: "attachment" }] : undefined,
			});
		} catch (e) {
			// 保存は済んでいるので、送信者にはエラーにしない
			console.error("[contact] mail send failed", e);
		}
	}

	return json({ ok: true });
};
