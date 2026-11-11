import handler, { createScheduledHandler, PluginBridge } from "@emdash-cms/cloudflare/worker";

export { PluginBridge };

const emdashScheduled = createScheduledHandler();

/**
 * 一時的な移し替え:静的ファイルとして置いた記事用ファイルを R2(MEDIA)の uploads/ に複製する。
 * 定期処理のたびに、R2 にまだ無いものだけをコピーする。移し替え確認後にこのブロックと静的ファイルを削除する。
 */
const COPY_TO_R2 = [
	"report/2026/11/mr2611_1.jpg",
	"report/2026/11/mr2611_2.jpg",
	"report/2026/11/mr2611_3.jpg",
	"report/2026/11/mr2611_4.jpg",
	"report/2026/11/mr2611fin-1.pdf",
];
const TYPES: Record<string, string> = { jpg: "image/jpeg", pdf: "application/pdf" };

async function copyStaticUploadsToR2(env: { ASSETS: Fetcher; MEDIA: R2Bucket }) {
	for (const path of COPY_TO_R2) {
		const key = `uploads/${path}`;
		if (await env.MEDIA.head(key)) continue;
		const res = await env.ASSETS.fetch(new Request(`https://assets.local/uploads/${path}`));
		if (!res.ok) {
			console.error("copy-to-r2: asset not found", path, res.status);
			continue;
		}
		const ext = path.split(".").pop() ?? "";
		await env.MEDIA.put(key, await res.arrayBuffer(), { httpMetadata: { contentType: TYPES[ext] } });
		console.log("copy-to-r2: copied", key);
	}
}

export default {
	...handler,
	async scheduled(controller, env, ctx) {
		ctx.waitUntil(copyStaticUploadsToR2(env as unknown as { ASSETS: Fetcher; MEDIA: R2Bucket }).catch((e) => console.error("copy-to-r2", e)));
		return emdashScheduled(controller, env, ctx);
	},
} satisfies ExportedHandler;
