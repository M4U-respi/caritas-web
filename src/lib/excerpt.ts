/**
 * 本文(Portable Text)の書き出しから抜粋を作る(一覧の抜粋・検索結果や SNS の説明文に使う)
 * - 段落・見出しの文字を順につなげ、空白・改行をまとめて、max 文字を超える分は「…」で省略
 */
export function autoExcerpt(content: unknown, max = 60): string {
	if (!Array.isArray(content)) return "";
	const parts: string[] = [];
	let length = 0;
	for (const block of content as any[]) {
		if (block?._type !== "block" || !Array.isArray(block.children)) continue;
		const text = block.children.map((c: any) => (typeof c?.text === "string" ? c.text : "")).join("");
		const t = text.replace(/\s+/g, " ").trim();
		if (!t) continue;
		parts.push(t);
		length += t.length + 1;
		if (length > max) break;
	}
	const all = parts.join(" ");
	return all.length > max ? `${all.slice(0, max)}…` : all;
}
