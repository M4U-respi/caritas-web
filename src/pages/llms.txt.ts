/**
 * llms.txt(生成AI向けのサイト案内)
 *   GET /llms.txt
 *
 * 「どういう団体で、どこに何が書いてあるか」を短く示す案内。
 * 内容はすべてサイト内に書かれていることから起こす(ここだけで新しい事実を作らない)。
 *
 * 元データ:
 *   - 固定ページ … src/data/pages.ts(title と description)
 *   - 一覧・カテゴリ … src/data/site.ts の COLLECTIONS
 *   - よくある質問 … src/data/faq.ts(本文に表示しているものだけ)
 *   - 団体情報 … src/data/site.ts の ORG
 *
 * robots.txt と同じく、確認用サイト(SITE_PASSWORD あり)では配信しない。
 * 記事そのものは /sitemap.xml から一覧できるため、ここには個別記事を並べない。
 */
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { FAQ } from "../data/faq";
import { PAGES } from "../data/pages";
import { COLLECTIONS, ORG, SITE, SNS, absUrl } from "../data/site";

export const prerender = false;

function body(): string {
	const lines: string[] = [
		`# ${SITE.name}(${ORG.alternateName})`,
		"",
		`> ${SITE.description}`,
		"",
		`正式名称は「${ORG.legalName}」。${ORG.parent.name}の部門で、教皇庁に本部を置く国際カリタス(加盟組織160以上)の一員です。`,
		"カリタスジャパン委員会と、全国15教区の担当者からなる教区担当者会で運営しています。",
		"四旬節「愛の献金」などの募金活動、国内外への援助活動、国内での啓発活動を行っています。",
		"",
		`- 所在地: ${ORG.address}`,
		`- 電話: ${ORG.telephone} ／ FAX: ${ORG.faxNumber}`,
		`- 上部団体: ${ORG.parent.name}(${ORG.parent.url})`,
		`- 加盟: ${ORG.member.name}(${ORG.member.url})`,
		`- SNS: Facebook ${SNS.facebook} ／ Instagram ${SNS.instagram} ／ YouTube ${SNS.youtube}`,
		"",
		"## ページ",
		"",
	];

	for (const [path, meta] of Object.entries(PAGES)) {
		lines.push(`- [${meta.title ?? SITE.defaultTitle}](${absUrl(path)}): ${meta.description}`);
	}

	lines.push("", "## 記事の一覧(CMS で更新)", "");
	for (const c of Object.values(COLLECTIONS)) {
		lines.push(`- [${c.label}](${absUrl(c.base)}): ${c.metaDescription}`);
		for (const t of c.terms) lines.push(`  - [${t.label}](${absUrl(`${c.base}${t.slug}/`)})`);
	}
	lines.push(
		"",
		"個別の記事は sitemap から一覧できます。",
		`- サイトマップ: ${absUrl("/sitemap.xml")}`,
		"- 個別の災害・紛争名はカテゴリにせず、記事タイトルの先頭に【】で入れています。",
	);

	lines.push("", "## よくある質問のあるページ", "");
	for (const [path, { label, items }] of Object.entries(FAQ)) {
		const n = items.filter((i) => i.a).length;
		lines.push(`- [${label}](${absUrl(path)}): ${n}問`);
	}

	lines.push(
		"",
		"## 補足",
		"",
		"- カリタスジャパンへの募金は寄付金控除の対象外です。",
		"- 受け付け中の募金にはそれぞれ番号があり、郵便振替の通信欄やゆうちょダイレクトの通信欄・メッセージ欄で支援先を指定できます。",
		"- 発行物はいずれも無料です。ご希望の発行物名と部数、送り先を事務局までお知らせください。",
		"",
	);
	return lines.join("\n");
}

export const GET: APIRoute = () => {
	// 確認用サイト(合言葉ゲート中)は配信しない
	if ((env as { SITE_PASSWORD?: string }).SITE_PASSWORD) {
		return new Response("Not Found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
	}
	return new Response(body(), {
		headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
	});
};
