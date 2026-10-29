/**
 * 構造化データ(JSON-LD)を <script type="application/ld+json"> に安全に埋め込む文字列にする。
 * 値に「</script>」などが含まれても script タグを抜けないよう、山かっこ・アンパサンド・行区切り文字をエスケープする
 */
export function toJsonLd(data: unknown): string {
	return JSON.stringify(data)
		.replace(/</g, "\\u003c")
		.replace(/>/g, "\\u003e")
		.replace(/&/g, "\\u0026")
		.replace(/\u2028/g, "\\u2028")
		.replace(/\u2029/g, "\\u2029");
}
