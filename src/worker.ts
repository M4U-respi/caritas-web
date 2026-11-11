import handler, { createScheduledHandler, PluginBridge } from "@emdash-cms/cloudflare/worker";

export { PluginBridge };

const emdashScheduled = createScheduledHandler();

/**
 * 一時的な移し替え:旧サイトのファイルを R2(MEDIA)の uploads/ に複製する(We are Caritas No.32)。
 * 定期処理のたびに、R2 にまだ無いものだけをコピーする。確認後にこのブロックを削除する。
 */
const COPY_TO_R2: [string, string][] = [
	["https://www.caritas.jp/wp-content/uploads/2025/11/wearecaritas_no32_%E8%A1%A8%E7%B4%99%E3%81%AE%E3%81%BF-768x1059.jpg", "uploads/publication/2026/07/wac32-cover.jpg"],
	["https://www.caritas.jp/wp-content/uploads/2025/11/%E5%80%99%E8%A3%9C%EF%BC%93-%E6%97%A5%E6%9C%AC%E8%AA%9E%E5%AD%A6%E7%BF%92%E3%82%92%E9%80%9A%E3%81%98%E3%81%9F%E9%81%BF%E9%9B%A3%E8%A8%93%E7%B7%B4%E3%81%AE%E6%A7%98%E5%AD%90-1024x768.jpeg", "uploads/publication/2026/07/wac32-01.jpg"],
	["https://www.caritas.jp/wp-content/uploads/2025/11/04318cb1-f77a-4db1-8a71-b6564d49b5c0-1024x768.jpg", "uploads/publication/2026/07/wac32-02.jpg"],
	["https://www.caritas.jp/wp-content/uploads/2025/11/%E2%91%A1%E5%9C%B0%E5%9F%9F%E3%82%B3%E3%83%9F%E3%83%A5%E3%83%8B%E3%83%86%E3%82%A3%E3%81%A7%E3%81%AE%E3%82%A2%E3%83%BC%E3%83%88%E3%83%AF%E3%83%BC%E3%82%AF%E3%82%B7%E3%83%A7%E3%83%83%E3%83%97-1024x536.jpg", "uploads/publication/2026/07/wac32-03.jpg"],
	["https://www.caritas.jp/wp-content/uploads/2025/11/%E6%8E%B2%E8%BC%89%E8%A8%B1%E5%8F%AF%E3%81%82%E3%82%8A-%E3%81%AF%E3%81%90%E3%81%A7%E3%81%AE%E3%81%B2%E3%81%A8%E6%99%82%E3%82%92%E6%A5%BD%E3%81%97%E3%82%80%E8%A6%AA%E5%AD%90-1024x768.jpg", "uploads/publication/2026/07/wac32-04.jpg"],
	["https://www.caritas.jp/wp-content/uploads/2026/10/843161939_1421777860084317_6622136965106458858_n-1024x768.jpg", "uploads/publication/2026/07/wac32-05.jpg"],
	["https://www.caritas.jp/wp-content/uploads/2026/10/710813097_1333780115394087_2896959025829156146_n.jpg", "uploads/publication/2026/07/wac32-06.jpg"],
	["https://www.caritas.jp/wp-content/uploads/2025/11/%E3%81%BF%E3%81%AA%E3%81%9A%E3%81%8D%E5%86%99%E7%9C%9F-1024x725.jpg", "uploads/publication/2026/07/wac32-07.jpg"],
	["https://www.caritas.jp/wp-content/uploads/2025/11/IMG_20190407_121713_%E6%8E%92%E9%99%A4%E3%82%BC%E3%83%AD-1024x579.jpg", "uploads/publication/2026/07/wac32-08.jpg"],
	["https://www.caritas.jp/wp-content/uploads/2025/11/S__12886042_0_togetherwe-1024x768.jpg", "uploads/publication/2026/07/wac32-09.jpg"],
	["https://www.caritas.jp/wp-content/uploads/2025/11/We-are-Caritas_32.pdf", "uploads/publication/2026/07/We-are-Caritas_32.pdf"],
];
const TYPES: Record<string, string> = { jpg: "image/jpeg", pdf: "application/pdf" };

async function copyToR2(env: { MEDIA: R2Bucket }) {
	for (const [url, key] of COPY_TO_R2) {
		if (await env.MEDIA.head(key)) continue;
		const res = await fetch(url);
		if (!res.ok) {
			console.error("copy-to-r2: fetch failed", url, res.status);
			continue;
		}
		const ext = key.split(".").pop() ?? "";
		await env.MEDIA.put(key, await res.arrayBuffer(), { httpMetadata: { contentType: TYPES[ext] } });
		console.log("copy-to-r2: copied", key);
	}
}

export default {
	...handler,
	async scheduled(controller, env, ctx) {
		ctx.waitUntil(copyToR2(env as unknown as { MEDIA: R2Bucket }).catch((e) => console.error("copy-to-r2", e)));
		return emdashScheduled(controller, env, ctx);
	},
} satisfies ExportedHandler;
