/**
 * リンクの開き方(全コンテンツ共通のルール)
 * - 書類(PDF・Word・Excel など)… 別タブ
 * - サイト内リンク(ページからページ)… 同じタブ
 * - 外部サイト … 別タブ
 * - メール・電話(mailto: / tel:)… そのまま
 */
const DOC = /\.(pdf|docx?|xlsx?|pptx?|zip|mp4)(?:[?#].*)?$/i;

export function linkTarget(href: string, _blank?: boolean): { target?: string; rel?: string } {
	if (DOC.test(href)) return { target: "_blank", rel: "noopener" };
	if (/^(https?:)?\/\//i.test(href)) return { target: "_blank", rel: "noopener noreferrer" };
	return {};
}
