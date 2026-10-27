/**
 * リンクの開き方(全コンテンツ共通のルール)
 * - ファイル(PDF・画像・Word・Excel・動画など)… 別タブ
 *   拡張子で判定するほか、ファイル置き場(/uploads/・/assets/・CMS のメディア)へのリンクはすべて別タブ
 * - 外部サイト … 別タブ
 * - サイト内リンク(ページからページ)… 同じタブ
 */
const FILE = /\.(pdf|docx?|xlsx?|pptx?|csv|txt|zip|mp4|mov|mp3|m4a|jpe?g|png|gif|webp|avif|svg)(?:[?#].*)?$/i;
const FILE_DIRS = /^\/(uploads|assets|_emdash\/api\/media)\//;

export function linkTarget(href: string): { target?: string; rel?: string } {
	if (FILE.test(href) || FILE_DIRS.test(href)) return { target: "_blank", rel: "noopener" };
	if (href.startsWith("#") || (href.startsWith("/") && !href.startsWith("//"))) return {};
	if (/^(mailto|tel):/i.test(href)) return {};
	return { target: "_blank", rel: "noopener noreferrer" };
}
