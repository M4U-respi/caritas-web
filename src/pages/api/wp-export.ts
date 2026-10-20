/**
 * 【一時的】旧サイト(WordPress / www.caritas.jp)の記事を EmDash の WordPress インポート用 WXR に変換して返す
 *   GET /api/wp-export?target=news|report&key=…
 * - key はシークレット WP_EXPORT_KEY と一致したときだけ応答(移行作業専用)
 * - 移行が終わったらこのファイルと WP_EXPORT_KEY を削除する
 */
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

const WP = "https://www.caritas.jp/wp-json/wp/v2";
const UPLOADS = /https?:\/\/(?:www\.)?caritas\.jp\/wp-content\/uploads\/[^"'\s<>)]+/g;
const FILE_EXT = /\.(jpe?g|png|gif|webp|pdf|docx?|xlsx?|pptx?|zip)$/i;

type Post = {
	id: number; date: string; date_gmt: string; status: string; title: { rendered: string };
	content: { rendered: string }; excerpt: { rendered: string }; categories: number[]; featured_media: number;
};

const wp = async <T>(path: string): Promise<{ data: T; totalPages: number }> => {
	const r = await fetch(`${WP}${path}`, { headers: { "User-Agent": "caritas-web-migration" } });
	if (!r.ok) throw new Error(`WP ${r.status} ${path}`);
	return { data: (await r.json()) as T, totalPages: Number(r.headers.get("x-wp-totalpages") || "1") };
};

const decode = (s: string) =>
	s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
		.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
		.replace(/&nbsp;/g, " ").replace(/&hellip;/g, "…").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
const toFull = (url: string) => url.replace(/-\d+x\d+(?=\.[a-z0-9]+$)/i, "");

/** 旧サイト内リンク → 新サイトのパス(対応先が無いものは旧 URL のまま) */
const PAGE_MAP: Record<string, string> = {
	"/donate/": "/donate/",
	"/contact/": "/contact/",
	"/supporter/": "/donate/monthly/",
	"/site_policy/": "/site-policy/",
	"/category/publication/": "/publication/",
	"/category/news/secretariat/lent/": "/about/lent/",
};
const rewriteLinks = (html: string, postPath: Map<number, string>) =>
	html.replace(/href="https?:\/\/(?:www\.)?caritas\.jp(\/[^"]*)?"/g, (m, path = "/") => {
		if (/^\/wp-content\//.test(path)) return m;
		const [, hash = ""] = path.match(/(#[^"]*)$/) ?? [];
		const post = path.match(/^\/\d{4}\/\d{2}\/\d{2}\/(\d+)\/?/) ?? path.match(/[?&]p=(\d+)/);
		const to = post ? postPath.get(Number(post[1])) : PAGE_MAP[path.replace(/[?#].*$/, "")];
		return to ? `href="${to}${hash}"` : m;
	});

/** 本文の整形:サイズ違いの画像を原寸に、画像を包む同一画像リンクを外す、空段落・余計な属性を削除 */
function cleanHtml(html: string) {
	return html
		.replace(/<a [^>]*href="([^"]+)"[^>]*>\s*(<img [^>]*>)\s*<\/a>/g, (m, href, img) => (FILE_EXT.test(href) && /\.(jpe?g|png|gif|webp)$/i.test(href) ? img.replace(/src="[^"]+"/, `src="${href}"`) : m))
		.replace(/<img ([^>]*)>/g, (_m, attrs: string) => {
			const src = attrs.match(/src="([^"]+)"/)?.[1] ?? "";
			const alt = attrs.match(/alt="([^"]*)"/)?.[1] ?? "";
			return `<img src="${toFull(src)}" alt="${alt}" />`;
		})
		.replace(/\s(?:data-[\w-]+|class|id|dir|aria-[\w-]+|style)="[^"]*"/g, "")
		.replace(/<p>(?:\s|&nbsp;|<br\s*\/?>|<strong>\s*<\/strong>)*<\/p>/g, "")
		.replace(/<\/?div>/g, "")
		// 旧サイトは <pre> を見出し風ラベルに使っている(取り込むと直後の見出し・段落を巻き込むため変換)
		// 1 行の短いものは h2、それ以外は段落に
		.replace(/<pre>([\s\S]*?)<\/pre>/g, (_m, inner: string) => {
			const text = inner.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
			if (!text) return "";
			return text.length <= 40 && !/<a\s/.test(inner) ? `<h2>${text}</h2>` : `<p>${inner.trim().replace(/\n/g, "<br />")}</p>`;
		})
		.replace(/<(\/?)h1>/g, "<$1h2>")
		.replace(/<(\/?)h[4-6]>/g, "<$1h3>")
		.replace(/[ 　]{4,}/g, "　")
		.trim();
}

export const GET: APIRoute = async ({ url }) => {
	const key = (env as { WP_EXPORT_KEY?: string }).WP_EXPORT_KEY;
	if (!key || url.searchParams.get("key") !== key) return new Response("Not found", { status: 404 });
	const target = url.searchParams.get("target") === "report" ? "report" : "news";

	// カテゴリ:親子関係から「お知らせ(2)」「活動報告(8)」配下を判定
	const { data: cats } = await wp<{ id: number; slug: string; parent: number }[]>("/categories?per_page=100&_fields=id,slug,parent");
	const parent = new Map(cats.map((c) => [c.id, c.parent]));
	const ancestors = (id: number) => { const out = [id]; let p = parent.get(id); while (p) { out.push(p); p = parent.get(p); } return out; };
	const under = (ids: number[], root: number) => ids.some((id) => ancestors(id).includes(root));

	// 記事 ID → 新サイトのパス(本文中の記事リンクの書き換え用。お知らせ・活動報告の両方)
	const postPath = new Map<number, string>();
	for (let page = 1, total = 1; page <= total; page++) {
		const r = await wp<{ id: number; categories: number[] }[]>(`/posts?categories=${cats.filter((c) => ancestors(c.id).some((a) => a === 2 || a === 8)).map((c) => c.id).join(",")}&per_page=100&page=${page}&status=publish&_fields=id,categories`);
		for (const p of r.data) postPath.set(p.id, under(p.categories, 8) ? `/report/${p.id}/` : `/news/${p.id}/`);
		total = r.totalPages;
	}

	// 記事(お知らせ配下 + 活動報告配下を取得し、活動報告に属するものは活動報告側へ)
	const root = target === "report" ? 8 : 2;
	const posts: Post[] = [];
	for (let page = 1, total = 1; page <= total; page++) {
		const r = await wp<Post[]>(`/posts?categories=${cats.filter((c) => ancestors(c.id).includes(root)).map((c) => c.id).join(",")}&per_page=100&page=${page}&status=publish&_fields=id,date,date_gmt,status,title,content,excerpt,categories,featured_media`);
		posts.push(...r.data);
		total = r.totalPages;
	}
	// 年で絞り込み(from/to)し、古い順に size 件ずつ分割して part 番目を出力(管理画面から少しずつ取り込む用)
	const from = Number(url.searchParams.get("from")) || 0;
	const to = Number(url.searchParams.get("to")) || 9999;
	const size = Number(url.searchParams.get("size")) || 0;
	const part = Number(url.searchParams.get("part")) || 1;
	const all = posts
		.filter((p) => (target === "report" ? under(p.categories, 8) : !under(p.categories, 8)))
		.filter((p) => { const y = Number(p.date.slice(0, 4)); return y >= from && y <= to; })
		.sort((a, b) => a.date.localeCompare(b.date));
	const parts = size ? Math.max(1, Math.ceil(all.length / size)) : 1;
	const items = size ? all.slice((part - 1) * size, part * size) : all;

	// 分類の割り当て(1 記事 1 カテゴリ。優先:緊急支援 > 募金・献金 > 啓発・キャンペーン > 事務局から)
	const term = (p: Post): [string, string] => {
		if (target === "report") return under(p.categories, 9) ? ["annual", "年次報告"] : ["monthly", "活動レポート"];
		if (under(p.categories, 13)) return ["emergency", "緊急支援"];
		if (under(p.categories, 20) || under(p.categories, 21)) return ["donation", "募金・献金"];
		if (under(p.categories, 26) || under(p.categories, 7)) return ["campaign", "啓発・キャンペーン"];
		return ["info", "事務局から"];
	};

	// アイキャッチ
	const featuredIds = [...new Set(items.map((p) => p.featured_media).filter(Boolean))];
	const media = new Map<number, string>();
	for (let i = 0; i < featuredIds.length; i += 100) {
		const { data } = await wp<{ id: number; source_url: string }[]>(`/media?include=${featuredIds.slice(i, i + 100).join(",")}&per_page=100&_fields=id,source_url`);
		for (const m of data) media.set(m.id, m.source_url);
	}

	// 添付(本文中のアップロードファイル + アイキャッチ)を WXR の attachment として列挙
	const attachments = new Map<string, number>();
	let nextId = 9_000_000;
	const attach = (u: string) => { if (!attachments.has(u)) attachments.set(u, nextId++); return attachments.get(u)!; };
	const rows = items.map((p) => {
		const html = rewriteLinks(cleanHtml(p.content.rendered), postPath);
		for (const u of html.match(UPLOADS) ?? []) if (FILE_EXT.test(u)) attach(u);
		const firstImg = html.match(/<img src="([^"]+)"/)?.[1];
		const featuredUrl = media.get(p.featured_media) ?? (firstImg && UPLOADS.test(firstImg) ? firstImg : undefined);
		UPLOADS.lastIndex = 0;
		return { p, html, thumb: featuredUrl ? attach(featuredUrl) : undefined };
	});

	const xmlItems = rows.map(({ p, html, thumb }) => {
		const [slug, label] = term(p);
		const excerpt = decode(p.excerpt.rendered.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").replace(/\s*…\s*$/, "…").trim();
		return `<item>
<title>${cdata(decode(p.title.rendered))}</title>
<dc:creator>${cdata("caritas")}</dc:creator>
<content:encoded>${cdata(html)}</content:encoded>
<excerpt:encoded>${cdata(excerpt)}</excerpt:encoded>
<wp:post_id>${p.id}</wp:post_id>
<wp:post_date>${cdata(p.date.replace("T", " "))}</wp:post_date>
<wp:post_date_gmt>${cdata(p.date_gmt.replace("T", " "))}</wp:post_date_gmt>
<wp:post_name>${cdata(String(p.id))}</wp:post_name>
<wp:status>${cdata("publish")}</wp:status>
<wp:post_type>${cdata("post")}</wp:post_type>
<category domain="${target}_category" nicename="${slug}">${cdata(label)}</category>
${thumb ? `<wp:postmeta><wp:meta_key>${cdata("_thumbnail_id")}</wp:meta_key><wp:meta_value>${cdata(String(thumb))}</wp:meta_value></wp:postmeta>` : ""}
</item>`;
	});
	const xmlAttachments = [...attachments].map(([u, id]) => `<item>
<title>${cdata(decodeURIComponent(u.split("/").pop() ?? ""))}</title>
<wp:post_id>${id}</wp:post_id>
<wp:post_name>${cdata(`att-${id}`)}</wp:post_name>
<wp:status>${cdata("inherit")}</wp:status>
<wp:post_type>${cdata("attachment")}</wp:post_type>
<wp:attachment_url>${cdata(u)}</wp:attachment_url>
</item>`);

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:wfw="http://wellformedweb.org/CommentAPI/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:wp="http://wordpress.org/export/1.2/">
<channel>
<title>Caritas Japan</title>
<link>https://www.caritas.jp</link>
<wp:wxr_version>1.2</wp:wxr_version>
<wp:base_site_url>https://www.caritas.jp</wp:base_site_url>
<wp:base_blog_url>https://www.caritas.jp</wp:base_blog_url>
<wp:author><wp:author_login>${cdata("caritas")}</wp:author_login><wp:author_display_name>${cdata("カリタスジャパン")}</wp:author_display_name></wp:author>
${xmlAttachments.join("\n")}
${xmlItems.join("\n")}
</channel>
</rss>`;
	const filename = `caritas-${target}${from || to !== 9999 ? `-${from || "all"}-${to === 9999 ? "now" : to}` : ""}${size ? `-part${part}of${parts}` : ""}.xml`;
	return new Response(xml, {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": "no-store",
			"X-Post-Count": String(items.length),
			"X-Attachment-Count": String(attachments.size),
			"X-Part-Count": String(parts),
			...(url.searchParams.get("download") ? { "Content-Disposition": `attachment; filename="${filename}"` } : {}),
		},
	});
};
