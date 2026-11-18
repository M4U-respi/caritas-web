import handler, { createScheduledHandler, PluginBridge } from "@emdash-cms/cloudflare/worker";

export { PluginBridge };

const emdashScheduled = createScheduledHandler();

/**
 * 一時的なデータ移行(お知らせカテゴリ「緊急支援」→「支援」、「緊急」チェックの追加)。
 * 定期処理のたびに実行し、済んでいる手順は飛ばす。確認後にこのブロックを削除する。
 */
async function migrateSupport(db: D1Database) {
	await db.batch([
		db.prepare(
			"UPDATE taxonomies SET slug = 'support', label = '支援' WHERE name = 'news_category' AND slug = 'emergency' AND NOT EXISTS (SELECT 1 FROM taxonomies WHERE name = 'news_category' AND slug = 'support')",
		),
		db.prepare("UPDATE _emdash_taxonomy_defs SET label = '災害・紛争', label_singular = '災害・紛争' WHERE name = 'news_aid'"),
	]);
	const col = await db.prepare("SELECT COUNT(*) AS n FROM pragma_table_info('ec_news') WHERE name = 'urgent'").first<{ n: number }>();
	if (!col?.n) {
		await db.prepare('ALTER TABLE ec_news ADD COLUMN "urgent" INTEGER').run();
		console.log("migrate-support: added column");
	}
	await db
		.prepare(
			"INSERT INTO _emdash_fields (id, collection_id, slug, label, type, column_type, required, \"unique\", sort_order, searchable, translatable, indexed) SELECT '01M7PVPQEX81MYCNT6EFJZWR14', c.id, 'urgent', '緊急（トップの緊急枠・全ページ上部の赤帯に表示）', 'boolean', 'INTEGER', 0, 0, (SELECT COALESCE(MAX(f.sort_order), 0) + 1 FROM _emdash_fields f WHERE f.collection_id = c.id), 0, 1, 0 FROM _emdash_collections c WHERE c.slug = 'news' AND NOT EXISTS (SELECT 1 FROM _emdash_fields f WHERE f.collection_id = c.id AND f.slug = 'urgent')",
		)
		.run();
	const set = await db.prepare("SELECT COUNT(*) AS n FROM ec_news WHERE urgent IS NOT NULL").first<{ n: number }>();
	if (set?.n) return;
	// 初期値:いま TOP に出ている 2 件(支援カテゴリの公開中の最新 2 件)を「緊急」にする
	const { results } = await db
		.prepare(
			"SELECT e.id, e.live_revision_id AS live, e.draft_revision_id AS draft FROM ec_news e WHERE e.status = 'published' AND e.deleted_at IS NULL AND e.translation_group IN (SELECT ct.entry_id FROM content_taxonomies ct JOIN taxonomies t ON t.translation_group = ct.taxonomy_id WHERE ct.collection = 'news' AND t.name = 'news_category' AND t.slug = 'support') ORDER BY e.published_at DESC LIMIT 2",
		)
		.all<{ id: string; live: string | null; draft: string | null }>();
	const stmts = results.map((r) => db.prepare("UPDATE ec_news SET urgent = 1 WHERE id = ?").bind(r.id));
	for (const r of results) {
		for (const rev of [r.live, r.draft]) {
			if (rev) stmts.push(db.prepare("UPDATE revisions SET data = json_set(data, '$.urgent', json('true')) WHERE id = ?").bind(rev));
		}
	}
	stmts.push(db.prepare("UPDATE ec_news SET urgent = 0 WHERE urgent IS NULL"));
	await db.batch(stmts);
	console.log("migrate-support: urgent set", results.map((r) => r.id).join(","));
}

export default {
	...handler,
	async scheduled(controller, env, ctx) {
		ctx.waitUntil(migrateSupport((env as unknown as { DB: D1Database }).DB).catch((e) => console.error("migrate-support", e)));
		return emdashScheduled(controller, env, ctx);
	},
} satisfies ExportedHandler;
