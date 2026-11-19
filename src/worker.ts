import handler, { createScheduledHandler, PluginBridge } from "@emdash-cms/cloudflare/worker";

export { PluginBridge };

const emdashScheduled = createScheduledHandler();

export default {
	...handler,
	async scheduled(controller, env, ctx) {
		// 一時処理:管理画面のお知らせ一覧の日付を「公開日時」に(並べ替え・日付列)。確認後に削除する
		const db = (env as unknown as { DB: D1Database }).DB;
		ctx.waitUntil(
			db
				.prepare("UPDATE _emdash_collections SET date_field = 'publishedAt' WHERE slug = 'news' AND (date_field IS NULL OR date_field <> 'publishedAt')")
				.run()
				.catch((e) => console.error("date-field", e)),
		);
		return emdashScheduled(controller, env, ctx);
	},
} satisfies ExportedHandler;
