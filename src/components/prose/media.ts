/** 本文(Portable Text)の画像ブロックの URL を求める(public 内の画像・EmDash のメディア両対応) */
export function proseImageSrc(image: any): string {
	const asset = image?.asset ?? {};
	const storageKey = asset.meta?.storageKey;
	if (typeof asset.url === "string" && asset.url) return asset.url;
	if (typeof asset.src === "string" && asset.src) return asset.src;
	if (typeof storageKey === "string" && storageKey) return `/_emdash/api/media/file/${storageKey}`;
	const id = asset._ref || asset.id;
	return id ? `/_emdash/api/media/file/${id}` : "";
}
