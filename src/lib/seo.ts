/**
 * 構造化データ(JSON-LD)の組み立て。
 *
 * 方式: 1ページにつき1つの `@graph` にまとめる(ワイヤーフレーム版と同じ考え方)。
 *   - NGO(Organization) … 全ページ共通。`@id` で他のノードから参照する本体
 *   - WebSite           … 全ページ共通
 *   - WebPage / CollectionPage / ContactPage / Article … ページ種別に応じて1つ
 *   - FAQPage           … **本文に Q&A を表示しているページだけ**
 *     (表示していない内容を構造化データだけで申告するのは Google のガイドライン違反)
 *   - BreadcrumbList は表示しているパンくず(src/components/Breadcrumb.astro)が
 *     同じ `@id` で出す。WebPage からは `breadcrumb` で参照する。
 *
 * URL はすべて本番ドメイン(src/data/site.ts の SITE.origin)を基準にした絶対 URL。
 */
import { ORG, SITE, SNS, absUrl } from "../data/site";

const ORG_ID = `${SITE.origin}/#organization`;
const SITE_ID = `${SITE.origin}/#website`;

/** パンくずの `@id`(Breadcrumb.astro と Layout.astro で共有) */
export function breadcrumbId(url: string): string {
	return `${url}#breadcrumb`;
}

/** 団体情報(schema.org/NGO)。内容は /about/ の団体概要・フッター・お問い合わせページと同じ */
const organization = {
	"@type": ["NGO", "Organization"],
	"@id": ORG_ID,
	name: SITE.name,
	legalName: ORG.legalName,
	alternateName: ORG.alternateName,
	url: `${SITE.origin}/`,
	logo: { "@type": "ImageObject", url: absUrl("/assets/img/logo.png") },
	description:
		"カリタスジャパンは、日本のカトリック教会として、国際カリタスその他の国際機関と密接な連携を保ちながら、四旬節「愛の献金」その他の救援金などの募金活動、国内外への援助活動、また国内で弱い立場に置かれた人々が人間らしい生き方を獲得するための啓発活動を行います。",
	parentOrganization: { "@type": "Organization", name: ORG.parent.name, url: ORG.parent.url },
	memberOf: { "@type": "Organization", name: ORG.member.name, url: ORG.member.url },
	address: {
		"@type": "PostalAddress",
		postalCode: ORG.postalCode,
		addressCountry: "JP",
		addressRegion: ORG.addressRegion,
		addressLocality: ORG.addressLocality,
		streetAddress: ORG.streetAddress,
	},
	telephone: ORG.telephoneIntl,
	faxNumber: ORG.faxNumberIntl,
	contactPoint: {
		"@type": "ContactPoint",
		contactType: "お問い合わせ",
		telephone: ORG.telephoneIntl,
		faxNumber: ORG.faxNumberIntl,
		areaServed: "JP",
		availableLanguage: ["ja"],
		url: absUrl("/contact/"),
	},
	sameAs: [SNS.facebook, SNS.instagram, SNS.youtube],
};

const webSite = {
	"@type": "WebSite",
	"@id": SITE_ID,
	url: `${SITE.origin}/`,
	name: SITE.name,
	inLanguage: "ja",
	publisher: { "@id": ORG_ID },
};

export type PageType = "WebPage" | "CollectionPage" | "ContactPage" | "Article";

export interface FaqItem {
	q: string;
	a?: string;
}

export interface GraphInput {
	/** 正規 URL(絶対。一覧のページ送りではクエリを含む) */
	url: string;
	/**
	 * パンくずの `@id` を作るための URL(クエリを除いたページの URL)。
	 * Breadcrumb.astro が同じ値から `@id` を作るので、ここも一致させる
	 */
	pageUrl: string;
	/** <title> と同じ全文 */
	title: string;
	/** Article の headline に使うページ自身の見出し(省略時は title) */
	headline?: string;
	description: string;
	image?: string | null;
	type: PageType;
	/** 表示しているパンくずがあるか(TOP は無い) */
	hasBreadcrumb: boolean;
	/** Article のとき。記事ごとの実データを入れる */
	article?: { datePublished?: string | null; dateModified?: string | null };
	/** 本文に表示している FAQ。a が空の項目は表示されないので除く */
	faq?: FaqItem[];
}

export function buildGraph(input: GraphInput): Record<string, unknown> {
	const { url, title, description, image, type, hasBreadcrumb } = input;
	const graph: Record<string, unknown>[] = [organization, webSite];

	const page: Record<string, unknown> = {
		"@type": type,
		"@id": `${url}#webpage`,
		url,
		name: title,
		description,
		inLanguage: "ja",
		isPartOf: { "@id": SITE_ID },
		about: { "@id": ORG_ID },
	};
	if (image) page.primaryImageOfPage = { "@type": "ImageObject", url: image };
	if (hasBreadcrumb) page.breadcrumb = { "@id": breadcrumbId(input.pageUrl) };
	if (type === "Article") {
		page.headline = input.headline ?? title;
		page.author = { "@id": ORG_ID };
		page.publisher = { "@id": ORG_ID };
		if (image) page.image = image;
		// 日付は記事ごとの実データ(公開日・更新日)。無い記事には入れない
		if (input.article?.datePublished) page.datePublished = input.article.datePublished;
		if (input.article?.dateModified) page.dateModified = input.article.dateModified;
	}
	graph.push(page);

	const faq = (input.faq ?? []).filter((i) => i.a);
	if (faq.length > 0) {
		graph.push({
			"@type": "FAQPage",
			"@id": `${url}#faq`,
			mainEntity: faq.map((i) => ({
				"@type": "Question",
				name: i.q,
				acceptedAnswer: { "@type": "Answer", text: i.a },
			})),
		});
	}

	return { "@context": "https://schema.org", "@graph": graph };
}
