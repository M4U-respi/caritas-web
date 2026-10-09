/**
 * EmDash(CMS)取得ヘルパー
 */
import { getEmDashCollection, getTermsForEntries } from "emdash";
import { COLLECTIONS, type CollectionKey } from "../data/site";

export interface ListItem {
	slug: string;
	title: string;
	href: string;
	date: Date | null;
	terms: { slug: string; label: string; tag: string }[];
	data: Record<string, any>;
}

/** コレクションの記事一覧をカテゴリ付きで取得 */
export async function listEntries(
	key: CollectionKey,
	opts: { term?: string | string[]; limit?: number; cursor?: string } = {},
) {
	const conf = COLLECTIONS[key];
	const where = opts.term ? { [conf.taxonomy]: opts.term } : undefined;
	const res = await getEmDashCollection(key, {
		orderBy: { published_at: "desc" },
		limit: opts.limit ?? 20,
		cursor: opts.cursor,
		...(where ? { where } : {}),
	});
	const entries = res.entries ?? [];
	const termsByEntry = entries.length
		? await getTermsForEntries(key, entries.map((e: any) => e.data.id), conf.taxonomy)
		: new Map();

	const items: ListItem[] = entries.map((e: any) => ({
		slug: e.id,
		title: e.data.title,
		href: `${conf.base}${e.id}/`,
		date: e.data.publishedAt ?? e.data.createdAt ?? null,
		data: e.data,
		terms: ((termsByEntry.get(e.data.id) ?? []) as any[]).map((t) => ({
			slug: t.slug,
			label: t.label,
			tag: conf.terms.find((x) => x.slug === t.slug)?.tag ?? "blue",
		})),
	}));
	return { items, error: res.error, cacheHint: res.cacheHint, nextCursor: res.nextCursor };
}
