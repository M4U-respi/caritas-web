/**
 * リンクの開き方(全コンテンツ共通のルール)
 * - 書類(PDF・Word・Excel など)… 別タブ
 * - サイト内リンク(ページからページ)… 同じタブ
 * - 外部サイト … 記事で指定されたとおり(blank)
 */
const DOC = /\.(pdf|docx?|xlsx?|pptx?|zip|mp4)(?:[?#].*)?$/i;

export function linkTarget(href: string, blank?: boolean): { target?: string; rel?: string } {
	if (DOC.test(href)) return { target: "_blank", rel: "noopener" };
	if (href.startsWith("#") || (href.startsWith("/") && !href.startsWith("//"))) return {};
	return blank ? { target: "_blank", rel: "noopener noreferrer" } : {};
}
