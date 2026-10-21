/**
 * リンクの開き方(全コンテンツ共通のルール)
 * - 書類(PDF・Word・Excel・動画など)… 別タブ
 * - 外部サイト … 別タブ
 * - サイト内リンク(ページからページ)… 同じタブ
 */
const DOC = /\.(pdf|docx?|xlsx?|pptx?|zip|mp4)(?:[?#].*)?$/i;

export function linkTarget(href: string): { target?: string; rel?: string } {
	if (DOC.test(href)) return { target: "_blank", rel: "noopener" };
	if (href.startsWith("#") || (href.startsWith("/") && !href.startsWith("//"))) return {};
	if (/^(mailto|tel):/i.test(href)) return {};
	return { target: "_blank", rel: "noopener noreferrer" };
}
