/**
 * お問い合わせフォームの送信先(POST /api/contact)
 *
 * - メール送信は Resend の API を使う(Cloudflare に独自ドメインが無くても送れるため)。
 * - 設定値(Cloudflare の変数・シークレット):
 *     RESEND_API_KEY … Resend の API キー(シークレット。リポジトリには置かない)
 *     CONTACT_TO     … 受信アドレス(wrangler.jsonc の vars)
 *     CONTACT_FROM   … 送信元(省略時は Resend のテスト用アドレス。正式運用時は認証済みドメインのアドレスに変更)
 * - 返信先(Reply-To)はフォームに入力されたメールアドレス。
 */
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

const MAX_FILE = 5 * 1024 * 1024;
const DEFAULT_FROM = "カリタスジャパン お問い合わせ <onboarding@resend.dev>";

const json = (body: Record<string, unknown>, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

const str = (v: FormDataEntryValue | null, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

const toBase64 = (buf: ArrayBuffer) => {
	const bytes = new Uint8Array(buf);
	let bin = "";
	for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	return btoa(bin);
};

export const POST: APIRoute = async ({ request }) => {
	const cfg = env as { RESEND_API_KEY?: string; CONTACT_TO?: string; CONTACT_FROM?: string };
	if (!cfg.RESEND_API_KEY || !cfg.CONTACT_TO) return json({ ok: false, error: "not_configured" }, 503);

	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return json({ ok: false, error: "bad_request" }, 400);
	}

	// 迷惑送信対策:人には見えない入力欄に値があれば送ったことにして破棄
	if (str(form.get("website"), 200)) return json({ ok: true });

	const name = str(form.get("name"), 100);
	const email = str(form.get("email"), 254);
	const subject = str(form.get("subject"), 200);
	const message = str(form.get("message"), 10000);
	const agree = form.get("agree");
	if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !agree) return json({ ok: false, error: "invalid" }, 400);

	const attachments: { filename: string; content: string }[] = [];
	const file = form.get("file");
	if (file instanceof File && file.size > 0) {
		if (file.size > MAX_FILE) return json({ ok: false, error: "file_too_large" }, 400);
		attachments.push({ filename: file.name || "attachment", content: toBase64(await file.arrayBuffer()) });
	}

	const text = [
		"ウェブサイトのお問い合わせフォームから送信がありました。",
		"",
		`お名前　　　：${name}`,
		`メール　　　：${email}`,
		`ご用件　　　：${subject || "(未記入)"}`,
		`添付ファイル：${attachments[0]?.filename ?? "なし"}`,
		"",
		"■ メッセージ本文",
		message || "(未記入)",
		"",
		"――",
		`送信日時：${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
	].join("\n");

	const res = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: { Authorization: `Bearer ${cfg.RESEND_API_KEY}`, "Content-Type": "application/json" },
		body: JSON.stringify({
			from: cfg.CONTACT_FROM || DEFAULT_FROM,
			to: cfg.CONTACT_TO.split(",").map((s) => s.trim()).filter(Boolean),
			reply_to: email,
			subject: `【お問い合わせ】${subject || "ウェブサイトより"}(${name} 様)`,
			text,
			attachments: attachments.length ? attachments : undefined,
		}),
	});
	if (!res.ok) {
		console.error("[contact] Resend error", res.status, await res.text());
		return json({ ok: false, error: "send_failed" }, 502);
	}
	return json({ ok: true });
};
