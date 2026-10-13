/**
 * EmDash(CMS)取得ヘルパー
 */
import { getEmDashCollection, getTermsForEntries } from "emdash";
import { getDb } from "emdash/runtime";
import { COLLECTIONS, type CollectionKey } from "../data/site";

export interface ListItem {
	slug: string;
	title: string;
	href: string;
	date: Date | null;
	terms: { slug: string; label: string; tag: string }[];
	data: Record<string, any>;
}

export interface ListOptions {
	term?: string | string[];
	limit?: number;
	cursor?: string;
	/** ページ番号方式の一覧用(cursor とは併用不可) */
	offset?: number;
	/** 公開日(日本時間)の年で絞り込む */
	year?: number;
}

/** 日本時間の年 → 公開日の範囲(UTC の ISO 文字列) */
function yearRange(year: number) {
	return { gte: `${year - 1}-12-31T15:00:00.000Z`, lt: `${year}-12-31T15:00:00.000Z` };
}

/** Date | ISO 文字列 → 日本時間の年 */
export function jstYear(d: Date | string): number {
	const t = typeof d === "string" ? Date.parse(d) : d.getTime();
	return new Date(t + 9 * 3600 * 1000).getUTCFullYear();
}

function toItem(key: CollectionKey, e: any, termsByEntry: Map<string, any[]>): ListItem {
	const conf = COLLECTIONS[key];
	return {
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
	};
}

/** コレクションの記事一覧をカテゴリ付きで取得(新しい順) */
export async function listEntries(key: CollectionKey, opts: ListOptions = {}) {
	const conf = COLLECTIONS[key];
	const where: Record<string, any> = {};
	if (opts.term) where[conf.taxonomy] = opts.term;
	if (opts.year) where.published_at = yearRange(opts.year);
	const res = await getEmDashCollection(key, {
		orderBy: { published_at: "desc" },
		limit: opts.limit ?? 20,
		...(opts.cursor ? { cursor: opts.cursor } : opts.offset ? { offset: opts.offset } : {}),
		...(Object.keys(where).length ? { where } : {}),
	} as any);
	const entries = res.entries ?? [];
	const termsByEntry = entries.length
		? await getTermsForEntries(key, entries.map((e: any) => e.data.id), conf.taxonomy)
		: new Map();
	const items: ListItem[] = entries.map((e: any) => toItem(key, e, termsByEntry as Map<string, any[]>));
	return { items, error: res.error, cacheHint: res.cacheHint, nextCursor: res.nextCursor, hasMore: res.hasMore };
}

/**
 * 公開中の記事の公開日一覧(新しい順)。件数(ページ数)と「年で絞り込む」の選択肢に使う。
 * EmDash のクエリ API には件数取得が無いため、公開日の列だけを直接読む
 * (公開中 = status 'published' かつ削除されていない。EmDash の公開判定と同じ条件)。
 */
export async function getPublishedDates(key: CollectionKey, term?: string): Promise<{ dates: string[]; error?: unknown }> {
	const conf = COLLECTIONS[key];
	try {
		const db: any = await getDb();
		let q = db
			.selectFrom(`ec_${key} as e`)
			.select("e.published_at")
			.where("e.deleted_at", "is", null)
			.where("e.status", "=", "published");
		if (term) {
			q = q.where(
				"e.translation_group",
				"in",
				db
					.selectFrom("content_taxonomies as ct")
					.select("ct.entry_id")
					.where("ct.collection", "=", key)
					.where(
						"ct.taxonomy_id",
						"in",
						db.selectFrom("taxonomies").select("translation_group").where("name", "=", conf.taxonomy).where("slug", "=", term),
					),
			);
		}
		const rows: { published_at: string | null }[] = await q.orderBy("e.published_at", "desc").execute();
		return { dates: rows.map((r) => r.published_at).filter((d): d is string => !!d) };
	} catch (error) {
		return { dates: [], error };
	}
}

/** 一覧ページ(カテゴリ・年・ページ番号)のデータ */
export interface ArchiveData {
	items: ListItem[];
	page: number;
	totalPages: number;
	total: number;
	years: number[];
	year?: number;
	error?: unknown;
}

/**
 * 一覧ページのデータを取得する。存在しないページ番号なら null(ページ側で 404 にする)。
 * ?page=n(1 始まり)・?year=YYYY を解釈する。
 */
export async function loadArchive(
	key: CollectionKey,
	url: URL,
	opts: { term?: string; cache?: { enabled?: boolean; set(hint: any): void } } = {},
): Promise<ArchiveData | null> {
	const perPage = COLLECTIONS[key].perPage;
	const pageParam = url.searchParams.get("page");
	const yearParam = url.searchParams.get("year");
	if (pageParam !== null && !/^[1-9]\d*$/.test(pageParam)) return null;
	if (yearParam !== null && yearParam !== "" && !/^\d{4}$/.test(yearParam)) return null;
	const page = pageParam ? Number(pageParam) : 1;
	const year = yearParam ? Number(yearParam) : undefined;

	const { dates, error: datesError } = await getPublishedDates(key, opts.term);
	const years = [...new Set(dates.map(jstYear))].sort((a, b) => b - a);
	const total = year ? dates.filter((d) => jstYear(d) === year).length : dates.length;
	const totalPages = Math.max(1, Math.ceil(total / perPage));
	if (page > totalPages && !datesError) return null;

	const res = await listEntries(key, { term: opts.term, year, limit: perPage, offset: (page - 1) * perPage });
	if (opts.cache?.enabled && res.cacheHint) opts.cache.set(res.cacheHint);
	return { items: res.items, page, totalPages, total, years, year, error: res.error ?? datesError };
}

/** 記事詳細の前後記事(前=1 つ古い記事、次=1 つ新しい記事) */
export async function getAdjacentEntries(key: CollectionKey, entry: any) {
	const conf = COLLECTIONS[key];
	const at: Date | null = entry.data.publishedAt ?? null;
	if (!at) return { prev: null, next: null };
	const iso = new Date(at).toISOString();
	const [older, newer] = await Promise.all([
		getEmDashCollection(key, { orderBy: { published_at: "desc" }, limit: 1, where: { published_at: { lt: iso } } } as any),
		getEmDashCollection(key, { orderBy: { published_at: "asc" }, limit: 1, where: { published_at: { gt: iso } } } as any),
	]);
	const pick = (r: any) => (r.entries ?? [])[0];
	const link = (e: any) => (e ? { href: `${conf.base}${e.id}/`, title: e.data.title as string } : null);
	return { prev: link(pick(older)), next: link(pick(newer)) };
}
