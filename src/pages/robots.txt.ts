/**
 * robots.txt
 *   GET /robots.txt
 *
 * **公開前(合言葉ゲート中)と正式公開後で中身が切り替わる。**
 * 切り替えの条件は合言葉と同じ `vars.SITE_PASSWORD`(wrangler.jsonc)1 か所だけ:
 *
 *   - SITE_PASSWORD あり = 確認用サイト → 全面 Disallow(クロールさせない)
 *   - SITE_PASSWORD なし = 正式公開     → 通常の robots.txt(Sitemap 付き)
 *
 * 正式公開時に `vars.SITE_PASSWORD` を削除すれば、合言葉ゲート・ページの
 * noindex(src/middleware.ts)とあわせてここも自動で切り替わる。
 * 静的ファイル用の `X-Robots-Tag: noindex`(public/_headers)だけは手で外すこと。
 *
 * このルート(src/pages)は EmDash が用意する /robots.txt より優先される。
 * そのため管理画面(設定 → SEO)の robots.txt 欄は使われない。
 *
 * ページ送り(?page=)・年の絞り込み(?year=)は、あえて Disallow しない。
 * 止めると過去の記事までたどれなくなるため、canonical を自分自身に向けて
 * クロールは通す(src/components/ArchivePage.astro)。
 */
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { absUrl } from "../data/site";

export const prerender = false;

const BODY_PREVIEW = `# 確認用サイトです。公開前のため、すべてのクローラーの巡回をお断りしています。
User-agent: *
Disallow: /
`;

const BODY_PUBLIC = `User-agent: *
Allow: /

# 管理画面・API
Disallow: /_emdash/

Sitemap: ${absUrl("/sitemap.xml")}
`;

export const GET: APIRoute = () => {
	const gated = !!(env as { SITE_PASSWORD?: string }).SITE_PASSWORD;
	return new Response(gated ? BODY_PREVIEW : BODY_PUBLIC, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": gated ? "no-store" : "public, max-age=3600",
			// 確認用サイトのうちは、このファイル自体も検索結果に出さない
			...(gated ? { "X-Robots-Tag": "noindex, nofollow" } : {}),
		},
	});
};
