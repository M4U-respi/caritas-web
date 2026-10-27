/**
 * 寄付ページ(/donate/ 配下)のデータ
 * 募金の追加・終了、口座情報の変更はここを編集する
 */

/** 事務局の連絡先 */
export const CONTACT = {
	tel: "03-5632-4439",
	fax: "03-5632-4464",
	/** tel: リンク用 */
	telHref: "tel:0356324439",
};

interface Fund {
	/** 募金名 */
	name: string;
	/** 説明 */
	desc: string;
	/** 番号(ゆうちょダイレクトの通信欄に入力するもの) */
	code: string;
}

/** 受付中の募金(/donate/#funds) */
export const FUNDS: { title: string; items: Fund[] }[] = [
	{
		title: "一般募金（通年）",
		items: [
			{ name: "海外援助", desc: "海外の人道支援、災害援助、開発プログラムの実施", code: "6230" },
			{ name: "国内援助", desc: "国内の草の根団体への支援（人間の尊厳を大切にする活動）", code: "6220" },
			{ name: "四旬節献金", desc: "四旬節期間中の愛の献金。国内外の自立支援やいのちを守る活動", code: "6210" },
			{ name: "クリスマス募金", desc: "世界の子どもたちへの支援活動", code: "6240" },
			{ name: "カリタスジャパン事務局運営支援", desc: "支援を届けるための事務局の運営", code: "6100" },
		],
	},
	{
		title: "緊急災害など期間限定の募金",
		items: [
			{ name: "ネパール土石流救援", desc: "ネパール土石流被害への救援", code: "6247" },
			{ name: "令和8年熊本地震", desc: "熊本地震災害への救援", code: "6227" },
			{ name: "ベネズエラ地震救援募金", desc: "ベネズエラ地震への救援", code: "6246" },
			{ name: "ミャンマー地震救援募金", desc: "ミャンマー地震への救援", code: "6262" },
			{ name: "能登地震災害緊急支援募金", desc: "能登地震への緊急支援", code: "6258" },
			{ name: "ガザ人道支援募金", desc: "ガザへの人道支援", code: "6275" },
			{ name: "ウクライナ危機人道支援", desc: "ウクライナ危機への人道支援", code: "6273" },
			{ name: "スーダン支援", desc: "スーダン西部ダルフール地方の国内避難民への人道支援", code: "6261" },
		],
	},
];

/** クレジットカード決済(アナザーレーン payment.alij.ne.jp)。現行サイトと同じく金額ごとのリンクで決済ページへ移動する */
const CARD_PAYMENT_URL = "https://payment.alij.ne.jp/service/credit";
const CARD_PAYMENT_SITE = { siteId: "20288901", sitePass: "8901pahw" };

/** クレジットカード寄付の金額と決済ページの URL */
export const CARD_AMOUNTS: { amount: number; href: string }[] = [1000, 2000, 3000, 5000, 10000, 30000, 50000].map((amount) => ({
	amount,
	href: `${CARD_PAYMENT_URL}?${new URLSearchParams({ ...CARD_PAYMENT_SITE, amount: String(amount) })}`,
}));
