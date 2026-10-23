/**
 * EmDash(CMS)取得ヘルパー
 */
import { getEmDashCollection, getTermsForEntries } from "emdash";
import { getDb } from "emdash/runtime";
import { COLLECTIONS, NEWS_MERGE, type CollectionKey } from "../data/site";

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
	/** term を絞り込む分類(省略時はコレクションのカテゴリ分類) */
	taxonomy?: string;
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
	if (opts.term) where[opts.taxonomy ?? conf.taxonomy] = opts.term;
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
export async function getPublishedDates(key: CollectionKey, term?: string, taxonomy?: string): Promise<{ dates: string[]; error?: unknown }> {
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
						db.selectFrom("taxonomies").select("translation_group").where("name", "=", taxonomy ?? conf.taxonomy).where("slug", "=", term),
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
	opts: { term?: string; taxonomy?: string; cache?: { enabled?: boolean; set(hint: any): void } } = {},
): Promise<ArchiveData | null> {
	const perPage = COLLECTIONS[key].perPage;
	const pageParam = url.searchParams.get("page");
	const yearParam = url.searchParams.get("year");
	if (pageParam !== null && !/^[1-9]\d*$/.test(pageParam)) return null;
	if (yearParam !== null && yearParam !== "" && !/^\d{4}$/.test(yearParam)) return null;
	const page = pageParam ? Number(pageParam) : 1;
	const year = yearParam ? Number(yearParam) : undefined;
	if (isMergedNews(key, opts)) return loadMergedNews(opts.term, page, year);

	const { dates, error: datesError } = await getPublishedDates(key, opts.term, opts.taxonomy);
	const years = [...new Set(dates.map(jstYear))].sort((a, b) => b - a);
	const total = year ? dates.filter((d) => jstYear(d) === year).length : dates.length;
	const totalPages = Math.max(1, Math.ceil(total / perPage));
	if (page > totalPages && !datesError) return null;

	const res = await listEntries(key, { term: opts.term, taxonomy: opts.taxonomy, year, limit: perPage, offset: (page - 1) * perPage });
	if (opts.cache?.enabled && res.cacheHint) opts.cache.set(res.cacheHint);
	return { items: res.items, page, totalPages, total, years, year, error: res.error ?? datesError };
}

/** 公開中の記事の一覧行(スラッグ・タイトル・公開日。新しい順)。term を指定するとその分類の記事のみ */
async function publishedRows(collection: CollectionKey, terms?: string[], taxonomy?: string) {
	const db: any = await getDb();
	let q = db
		.selectFrom(`ec_${collection} as e`)
		.select(["e.id", "e.slug", "e.title", "e.published_at"])
		.where("e.deleted_at", "is", null)
		.where("e.status", "=", "published")
		.where("e.published_at", "is not", null);
	if (terms) {
		q = q.where(
			"e.translation_group",
			"in",
			db
				.selectFrom("content_taxonomies as ct")
				.select("ct.entry_id")
				.where("ct.collection", "=", collection)
				.where(
					"ct.taxonomy_id",
					"in",
					db.selectFrom("taxonomies").select("translation_group").where("name", "=", taxonomy ?? COLLECTIONS[collection].taxonomy).where("slug", "in", terms),
				),
		);
	}
	const rows: { id: string; slug: string; title: string; published_at: string }[] = await q.orderBy("e.published_at", "desc").execute();
	return rows.map((r) => ({ ...r, collection }));
}

/** お知らせの一覧に活動報告・発行物を混ぜるか(「全て」と NEWS_MERGE.term のカテゴリ) */
export function isMergedNews(key: CollectionKey, opts: { term?: string; taxonomy?: string }) {
	return key === "news" && !opts.taxonomy && (!opts.term || opts.term === NEWS_MERGE.term);
}

/** お知らせ(terms のカテゴリ。省略時は全て)+活動報告+発行物の一覧行を日付順に混ぜる */
async function mergedNewsRows(terms?: string[]) {
	const lists = await Promise.all([publishedRows("news", terms), ...NEWS_MERGE.collections.map((c) => publishedRows(c))]);
	return lists.flat().sort((a, b) => (a.published_at < b.published_at ? 1 : a.published_at > b.published_at ? -1 : 0));
}

/** 混ぜた一覧行 → 表示用の項目(お知らせはカテゴリのタグ、活動報告・発行物は NEWS_MERGE.term のタグ) */
async function mergedItems(rows: Awaited<ReturnType<typeof publishedRows>>): Promise<ListItem[]> {
	const conf = COLLECTIONS.news;
	const newsIds = rows.filter((r) => r.collection === "news").map((r) => r.id);
	const termsByEntry = (newsIds.length ? await getTermsForEntries("news", newsIds, conf.taxonomy) : new Map()) as Map<string, any[]>;
	const mergeTerm = conf.terms.find((t) => t.slug === NEWS_MERGE.term)!;
	return rows.map((r) => {
		const date = new Date(r.published_at);
		const terms =
			r.collection === "news"
				? (termsByEntry.get(r.id) ?? []).map((t: any) => ({ slug: t.slug, label: t.label, tag: conf.terms.find((x) => x.slug === t.slug)?.tag ?? "blue" }))
				: [{ slug: mergeTerm.slug, label: mergeTerm.label, tag: mergeTerm.tag }];
		return { slug: r.slug, title: r.title, href: `${COLLECTIONS[r.collection].base}${r.slug}/`, date, terms, data: { title: r.title, publishedAt: date } };
	});
}

/** お知らせ(terms のカテゴリ)+活動報告+発行物の最新 limit 件(TOP の「お知らせ」欄など) */
export async function listMergedNews(opts: { terms?: string[]; limit: number }): Promise<{ items: ListItem[]; error?: unknown }> {
	try {
		return { items: await mergedItems((await mergedNewsRows(opts.terms)).slice(0, opts.limit)) };
	} catch (error) {
		console.error("[cms] お知らせ一覧(活動報告・発行物を含む)の取得に失敗", error);
		return { items: [], error };
	}
}

/**
 * お知らせ+活動報告+発行物を日付順に混ぜた一覧ページのデータ(src/data/site.ts の NEWS_MERGE)。
 * 件数が少ない(数百件)ため、3 つの一覧行(スラッグ・タイトル・公開日)を読んで並べ替え、表示するページ分だけタグを取得する。
 */
async function loadMergedNews(term: string | undefined, page: number, year: number | undefined): Promise<ArchiveData | null> {
	const perPage = COLLECTIONS.news.perPage;
	let rows: Awaited<ReturnType<typeof publishedRows>> = [];
	let error: unknown;
	try {
		rows = await mergedNewsRows(term ? [term] : undefined);
	} catch (e) {
		error = e;
		console.error("[cms] お知らせ一覧(活動報告・発行物を含む)の取得に失敗", e);
	}
	const years = [...new Set(rows.map((r) => jstYear(r.published_at)))].sort((a, b) => b - a);
	const filtered = year ? rows.filter((r) => jstYear(r.published_at) === year) : rows;
	const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
	if (page > totalPages && !error) return null;
	const items = await mergedItems(filtered.slice((page - 1) * perPage, page * perPage));
	return { items, page, totalPages, total: filtered.length, years, year, error };
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

/** 分類の項目(スラッグ・名前)を取得。見つからなければ null */
export async function getTerm(taxonomy: string, slug: string): Promise<{ slug: string; label: string } | null> {
	try {
		const db: any = await getDb();
		const row = await db.selectFrom("taxonomies").select(["slug", "label"]).where("name", "=", taxonomy).where("slug", "=", slug).executeTakeFirst();
		return row ?? null;
	} catch (error) {
		console.error(`[cms] ${taxonomy} の取得に失敗`, error);
		return null;
	}
}
