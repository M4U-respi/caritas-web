/**
 * サイト共通データ(ナビゲーション・CMSコレクション定義)
 * ページの追加・URL変更はここを編集する
 */

export const SITE = {
	name: "カリタスジャパン",
	titleSuffix: "カリタスジャパン",
	defaultTitle: "カリタスジャパン｜世界と、つながる。",
	description:
		"あなたの想いが、だれかにつながる。カリタスジャパンは、国内外で困難な状況にある人々に寄り添い続ける、カトリック教会の公式な援助機関です。",
};

export const SNS = {
	facebook: "https://www.facebook.com/caritasjapan/",
	instagram: "https://www.instagram.com/caritas_japan/",
	youtube: "https://www.youtube.com/@caritasjapan9712",
};

export interface NavLink {
	label: string;
	href: string;
}

/** CMS(EmDash)で管理するコレクション */
export const COLLECTIONS = {
	news: {
		label: "お知らせ",
		en: "NEWS",
		base: "/news/",
		taxonomy: "news_category",
		terms: [
			{ slug: "emergency", label: "緊急支援", tag: "red" },
			{ slug: "donation", label: "募金・献金", tag: "yellow" },
			{ slug: "campaign", label: "啓発・キャンペーン", tag: "yellow" },
			{ slug: "info", label: "事務局から", tag: "blue" },
		],
	},
	report: {
		label: "活動報告",
		en: "REPORT",
		base: "/report/",
		taxonomy: "report_category",
		terms: [
			{ slug: "annual", label: "年次報告", tag: "blue" },
			{ slug: "monthly", label: "活動レポート", tag: "yellow" },
		],
	},
	publication: {
		label: "発行物",
		en: "PUBLICATION",
		base: "/publication/",
		taxonomy: "publication_category",
		terms: [
			{ slug: "we-are-caritas", label: "We are Caritas", tag: "blue" },
			{ slug: "booklet", label: "小冊子・資料", tag: "yellow" },
		],
	},
} as const;

export type CollectionKey = keyof typeof COLLECTIONS;

const termLinks = (key: CollectionKey): NavLink[] =>
	COLLECTIONS[key].terms.map((t) => ({
		label: t.label,
		href: `${COLLECTIONS[key].base}category/${t.slug}/`,
	}));

/** グローバルナビ(ヘッダー) */
export const GNAV: (NavLink & { children?: NavLink[] })[] = [
	{ label: "わたしたちの想い", href: "/mission/" },
	{
		label: "カリタスジャパンとは",
		href: "/about/",
		children: [
			{ label: "カリタスジャパンとは", href: "/about/" },
			{ label: "成り立ちと歴史", href: "/about/history/" },
			{ label: "四旬節「愛の献金」", href: "/about/lent/" },
			{ label: "援助活動", href: "/about/aid/" },
			{ label: "啓発活動", href: "/about/social/" },
		],
	},
	{ label: "活動報告", href: "/report/" },
	{
		label: "発行物",
		href: "/publication/",
		children: [{ label: "発行物一覧", href: "/publication/" }, ...termLinks("publication")],
	},
	{
		label: "お知らせ",
		href: "/news/",
		children: [{ label: "お知らせ一覧", href: "/news/" }, ...termLinks("news")],
	},
];

/** フッターナビ */
export const FOOTER_NAV: { heading: string; links: NavLink[] }[] = [
	{
		heading: "カリタスジャパンについて",
		links: [
			{ label: "わたしたちの想い", href: "/mission/" },
			{ label: "カリタスジャパンとは", href: "/about/" },
			{ label: "成り立ちと歴史", href: "/about/history/" },
			{ label: "四旬節「愛の献金」", href: "/about/lent/" },
		],
	},
	{
		heading: "活動を知る",
		links: [
			{ label: "援助活動", href: "/about/aid/" },
			{ label: "啓発活動", href: "/about/social/" },
			{ label: "活動報告", href: "/report/" },
			{ label: "発行物", href: "/publication/" },
			{ label: "お知らせ", href: "/news/" },
		],
	},
	{
		heading: "ご支援・ご協力",
		links: [
			{ label: "寄付する", href: "/donate/" },
			{ label: "クレジットカードで寄付", href: "/donate/card/" },
			{ label: "マンスリーサポーター", href: "/donate/monthly/" },
			{ label: "受け付け中の募金", href: "/donate/#funds" },
		],
	},
];

export const FOOTER_SUB: NavLink[] = [
	{ label: "お問い合わせ", href: "/contact/" },
	{ label: "サイトポリシー", href: "/site-policy/" },
	{ label: "プライバシーポリシー", href: "/privacy-policy/" },
];

/** 日付 → "2026.09.01" */
export function formatDate(d: Date | string | null | undefined): string {
	if (!d) return "";
	const date = typeof d === "string" ? new Date(d) : d;
	const p = new Intl.DateTimeFormat("ja-JP", {
		timeZone: "Asia/Tokyo",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(date);
	const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
	return `${g("year")}.${g("month")}.${g("day")}`;
}

export function isoDate(d: Date | string | null | undefined): string {
	return formatDate(d).replaceAll(".", "-");
}
