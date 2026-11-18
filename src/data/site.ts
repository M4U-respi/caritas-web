/**
 * サイト共通データ(ナビゲーション・CMSコレクション定義)
 * ページの追加・URL変更はここを編集する
 */

export const SITE = {
	/**
	 * 本番ドメイン。canonical・OGP・構造化データ・sitemap.xml・llms.txt は
	 * すべてこの値を基準に絶対 URL を作る(確認用サイトで開いても本番 URL を出す)。
	 * 確認用サイト(caritas-web.respiration.workers.dev)は合言葉ゲート+noindex で
	 * 閉じているため、検索結果に出ることはない。公開先が変わるときはここを直す。
	 */
	origin: "https://www.caritas.jp",
	name: "カリタスジャパン",
	titleSuffix: "カリタスジャパン",
	defaultTitle: "カリタスジャパン｜世界と、つながる。",
	/** TOP の meta description(TOP に書いてあることだけから起こす) */
	description:
		"あなたの想いが、だれかにつながる。カリタスジャパンは、国内外で困難な状況にある人々に寄り添い続ける、カトリック教会の公式な援助機関です。世界160以上の国と地域のカリタスからなる国際カリタスの一員として、支える・参加する・分かち合う・祈る、4つの関わり方をご案内します。",
};

/** サイト内のパス → 本番ドメインの絶対 URL */
export function absUrl(path: string): string {
	return new URL(path, SITE.origin).href;
}

/**
 * canonical 用にパスをそろえる。
 * サイト内リンクは末尾スラッシュ付きで書いているため、`/about` で来たときも
 * `/about/` を正規 URL として示し、同じ内容が2つの URL で拾われないようにする。
 */
export function canonicalPath(pathname: string): string {
	if (pathname.endsWith("/")) return pathname;
	// 拡張子付き(/robots.txt など)はそのまま
	return pathname.split("/").pop()?.includes(".") ? pathname : `${pathname}/`;
}

/**
 * 団体情報(構造化データ・llms.txt 用)。
 * フッター・お問い合わせページ・団体概要の表と同じ内容。変えるときは両方を直す。
 */
export const ORG = {
	legalName: "宗教法人カトリック中央協議会 カリタスジャパン",
	alternateName: "Caritas Japan",
	postalCode: "135-8585",
	addressRegion: "東京都",
	addressLocality: "江東区",
	streetAddress: "潮見2-10-10 日本カトリック会館6F",
	address: "〒135-8585 東京都江東区潮見2-10-10 日本カトリック会館6F",
	telephone: "03-5632-4439",
	telephoneIntl: "+81-3-5632-4439",
	faxNumber: "03-5632-4464",
	faxNumberIntl: "+81-3-5632-4464",
	parent: { name: "宗教法人カトリック中央協議会", url: "https://www.cbcj.catholic.jp/" },
	member: { name: "国際カリタス(Caritas Internationalis)", url: "https://www.caritas.org/" },
} as const;

export const SNS = {
	facebook: "https://www.facebook.com/caritasjapan/",
	instagram: "https://www.instagram.com/caritas_japan/",
	youtube: "https://www.youtube.com/@caritasjapan9712",
};

interface NavLink {
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
		/** 一覧のヒーロー(ラベル英/和・リード)と 1 ページの件数 */
		hero: { en: "NEWS", ja: "新着情報", lead: "募金の受付や緊急支援、キャンペーン、事務局からのご連絡をお伝えします。" },
		/** 一覧トップの meta description(画面のリード文より長く書けるぶん、ページに書いてあることを足す) */
		metaDescription:
			"カリタスジャパンからのお知らせです。募金の受け付けや緊急支援の経過、啓発・キャンペーンのご案内、事務局からのご連絡を、支援・募金・献金・啓発・キャンペーン・事務局からの4つのカテゴリに分けてお伝えします。",
		perPage: 10,
		terms: [
			{ slug: "support", label: "支援", tag: "red", hero: { en: "SUPPORT", ja: "支援", lead: "災害や紛争に対する募金の受付と、その後の支援の経過をお伝えします。" } },
			{ slug: "donation", label: "募金・献金", tag: "yellow", hero: { en: "DONATION", ja: "募金", lead: "四旬節「愛の献金」やクリスマス募金など、募金の受付と御礼をお伝えします。" } },
			{ slug: "campaign", label: "啓発・キャンペーン", tag: "green", hero: { en: "CAMPAIGN", ja: "キャンペーン", lead: "国際カリタスのキャンペーンの国内展開や、セミナー・報告会のご案内です。" } },
			{ slug: "info", label: "事務局から", tag: "blue", hero: { en: "INFORMATION", ja: "事務局", lead: "事務局からの事務連絡や、行事のご案内です。" } },
		],
	},
	report: {
		label: "活動報告",
		en: "REPORT",
		base: "/report/",
		taxonomy: "report_category",
		// カテゴリページのヒーロー文言は一覧トップと同じ(了承済み)
		hero: { en: "REPORTS", ja: "報告", lead: "毎月の活動と、年度ごとの総括をご報告します。募金の受け入れと支出の状況もこちらでご確認いただけます。" },
		metaDescription:
			"毎月の活動と、年度ごとの総括をご報告します。募金の受け入れと支出の状況もこちらでご確認いただけます。年次報告と活動レポートの2つに分けて掲載し、公開年で絞り込んでご覧いただけます。",
		perPage: 10,
		terms: [
			{ slug: "annual", label: "年次報告", tag: "red" },
			{ slug: "monthly", label: "活動レポート", tag: "yellow" },
		],
	},
	publication: {
		label: "発行物",
		en: "PUBLICATION",
		base: "/publication/",
		taxonomy: "publication_category",
		// カテゴリページのヒーロー文言は一覧トップと同じ(了承済み)
		hero: { en: "PUBLICATIONS", ja: "刊行物", lead: "機関誌「We are Caritas」や、四旬節の小冊子、セミナーの講演録などを発行しています。いずれも無料でお送りしています。" },
		metaDescription:
			"機関誌「We are Caritas」や、四旬節の小冊子、セミナーの講演録などを発行しています。いずれも無料でお送りしています。ご希望の発行物名と部数、送り先を事務局までお知らせください。在庫のある号のみお送りできます。",
		perPage: 6,
		terms: [
			{ slug: "we-are-caritas", label: "We are Caritas", tag: "red" },
			{ slug: "booklet", label: "小冊子・資料", tag: "teal" },
		],
	},
} as const;

export type CollectionKey = keyof typeof COLLECTIONS;

/**
 * お知らせの一覧(「全て」と下記カテゴリ)に、活動報告・発行物の記事も日付順に混ぜて表示する。
 * 記事の登録は管理画面のそれぞれ(活動報告・発行物)で行い、お知らせには登録しない。
 * 混ぜた記事のリンク先は各コレクションの URL(/report/{id}/ ・ /publication/{id}/)、タグはこのカテゴリのもの。
 */
export const NEWS_MERGE = { term: "info", collections: ["report", "publication"] } as const;

/**
 * お知らせの「災害・紛争」分類(災害・紛争ごとのページ /news/{slug}/)
 * - 中カテゴリ(news_category)とは独立した分類。項目は管理画面の「災害・紛争」で追加・編集する
 * - スラッグは小文字(URL の大文字は小文字へリダイレクト)。中カテゴリのスラッグと重複させないこと
 */
export const NEWS_AID = {
	taxonomy: "news_aid",
	// 災害・紛争ページのヒーロー文言(了承済み)
	hero: (label: string) => ({ en: "PROGRESS", ja: "経過", lead: `${label}に関するお知らせと、支援の経過をお伝えします。` }),
} as const;

const termLinks = (key: CollectionKey): NavLink[] =>
	COLLECTIONS[key].terms.map((t) => ({
		label: t.label,
		href: `${COLLECTIONS[key].base}${t.slug}/`,
	}));

/** グローバルナビ(ヘッダー)。spFlat: スマホのメニューでは子項目を出さない(デザインどおり) */
export const GNAV: (NavLink & { children?: NavLink[]; spFlat?: boolean })[] = [
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
	{
		label: "活動報告",
		href: "/report/",
		children: [{ label: "活動報告", href: "/report/" }, ...termLinks("report")],
	},
	{
		label: "発行物",
		href: "/publication/",
		children: [{ label: "発行物", href: "/publication/" }, ...termLinks("publication")],
	},
	{
		label: "お知らせ",
		href: "/news/",
		children: [{ label: "お知らせ", href: "/news/" }, ...termLinks("news")],
	},
];

/** 「カリタスジャパンとは」配下のページ(関連ページナビ・パンくず) */
const ABOUT_PAGES: NavLink[] = [
	{ label: "カリタスジャパンとは", href: "/about/" },
	{ label: "成り立ちと歴史", href: "/about/history/" },
	{ label: "四旬節「愛の献金」", href: "/about/lent/" },
	{ label: "援助活動", href: "/about/aid/" },
	{ label: "啓発活動", href: "/about/social/" },
];

/** 関連ページナビ(RelatedNav)のプリセット */
export const RELATED_NAV = {
	about: { en: "ABOUT", ja: "カリタスジャパンとは", title: "カリタスジャパンとは各ページ", items: ABOUT_PAGES },
	news: {
		en: "NEWS",
		ja: "お知らせ",
		title: "お知らせ各ページ",
		items: [{ label: "お知らせ", href: "/news/" }, ...termLinks("news")],
	},
	report: { en: "REPORTS", ja: "活動報告", title: "全ての活動報告", items: termLinks("report") },
	publication: { en: "PUBLICATIONS", ja: "刊行物", title: "全ての発行物", items: termLinks("publication") },
	donate: {
		en: "PAGE LINKS",
		ja: undefined,
		title: "寄付するの各ページ",
		items: [
			{ label: "寄付する", href: "/donate/" },
			{ label: "クレジットカード", href: "/donate/card/" },
			{ label: "マンスリーサポーター", href: "/donate/monthly/" },
		],
	},
} as const;

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
			{ label: "受付中の募金", href: "/donate/#funds" },
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
