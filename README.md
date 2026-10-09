# カリタスジャパン 公式サイト(caritas-web)

Astro + EmDash(CMS)+ Cloudflare Workers で構築したカリタスジャパン公式サイトです。

| 項目 | 内容 |
|---|---|
| フレームワーク | Astro 7(`output: "server"`) |
| CMS | EmDash(管理画面 `/_emdash/admin`) |
| ホスティング | Cloudflare Workers |
| データベース | Cloudflare D1(`caritas-web`) |
| メディア保存 | Cloudflare R2(`caritas-web-media`) |
| ソース管理 | GitHub `M4U-respi/caritas-web` |

---

## サイト構成

⭐️ = EmDash(CMS)で記事を管理するページ。それ以外は Astro の固定ページです(`src/pages/`)。

| ページ | URL | ファイル |
|---|---|---|
| TOP | `/` | `src/pages/index.astro` |
| わたしたちの想い | `/mission/` | `src/pages/mission.astro` |
| カリタスジャパンとは | `/about/` | `src/pages/about/index.astro` |
| 成り立ちと歴史 | `/about/history/` | `src/pages/about/history.astro` |
| 四旬節「愛の献金」 | `/about/lent/` | `src/pages/about/lent.astro` |
| 援助活動 | `/about/aid/` | `src/pages/about/aid.astro` |
| 啓発活動 | `/about/social/` | `src/pages/about/social.astro` |
| ⭐️ 活動報告 | `/report/` | `src/pages/report/` |
| ⭐️ 発行物 | `/publication/` | `src/pages/publication/` |
| ⭐️ お知らせ | `/news/` | `src/pages/news/` |
| 寄付する | `/donate/` | `src/pages/donate/index.astro` |
| クレジットカードで寄付 | `/donate/card/` | `src/pages/donate/card.astro` |
| マンスリーサポーター | `/donate/monthly/` | `src/pages/donate/monthly.astro` |
| 受け付け中の募金 | `/donate/#funds` | お知らせ「緊急支援」の記事を自動表示 |
| お問い合わせ | `/contact/` | `src/pages/contact.astro` |
| サイトポリシー | `/site-policy/` | `src/pages/site-policy.astro` |
| プライバシーポリシー | `/privacy-policy/` | `src/pages/privacy-policy.astro` |

固定ページは本文が未支給のため「準備中」表示です。本文は各ファイルの `<StaticPage>` の中に HTML で書くと表示されます。

```astro
<StaticPage title="わたしたちの想い" en="OUR MISSION">
	<h2>見出し</h2>
	<p>本文…</p>
</StaticPage>
```

### CMS のコレクションとカテゴリ

| コレクション | URL | カテゴリ(スラッグ) | 項目 |
|---|---|---|---|
| お知らせ `news` | 一覧 `/news/`・記事 `/news/{slug}/`・カテゴリ `/news/category/{term}/` | 緊急支援 `emergency` / 募金・献金 `donation` / 啓発・キャンペーン `campaign` / 事務局から `office` | タイトル・アイキャッチ画像・概要・本文 |
| 活動報告 `report` | `/report/` ほか同様 | 年次報告 `annual` / 活動レポート `activity` | タイトル・アイキャッチ画像・概要・本文 |
| 発行物 `publication` | `/publication/` ほか同様 | We are Caritas `we-are-caritas` / 小冊子・資料 `booklet` | タイトル・表紙画像・PDFファイル・概要・本文 |

- TOP の「お知らせ」は、緊急支援の最新2件と、それ以外のカテゴリの最新3件を自動表示します。
- カテゴリを追加・変更する場合は、管理画面で項目を追加したうえで `src/data/site.ts` の `COLLECTIONS` にも同じスラッグを追加してください(タブ表示とタグの色に使用)。
- 初期データ(`seed/seed.json`)のお知らせ5件は**デザインカンプ掲載の仮データ**です。公開前に削除または差し替えてください。

### 主なファイル

| ファイル | 内容 |
|---|---|
| `src/data/site.ts` | ナビ・フッターのリンク、CMS コレクション定義、SNS URL |
| `src/layouts/Layout.astro` | 全ページ共通の `<head>`・ヘッダー・フッター |
| `src/components/Header.astro` | グローバルナビ(ドロップダウン)・**緊急バナーの文言とリンク** |
| `src/components/Footer.astro` | フッター |
| `src/components/NewsSection.astro` | TOP のお知らせ |
| `src/components/ArchivePage.astro` / `DetailPage.astro` | CMS の一覧・記事ページ |
| `src/lib/cms.ts` | EmDash からの取得処理 |
| `public/assets/css/style.css` | TOP デザインの CSS |
| `public/assets/css/pages.css` | 下層ページ・ドロップダウン・記事の CSS |
| `public/assets/js/main.js` | ハンバーガー・FV カルーセル・スクロール演出・Facebook 埋め込み |
| `seed/seed.json` | CMS の初期スキーマ(コレクション・カテゴリ)と初期記事 |
| `wrangler.jsonc` | Cloudflare Workers / D1 / R2 の設定 |

---

## ローカル開発

必要なもの:Node.js 22.16 以上、npm 10 以上、パスキー対応ブラウザ

```bash
npm install
npx emdash secrets generate --write .dev.vars   # 暗号鍵(初回のみ。Git には含めない)
npm run dev
```

- サイト:http://localhost:4321/
- 管理画面:http://localhost:4321/_emdash/admin
- 初回の管理者作成を省略してログインする(開発時のみ):
  http://localhost:4321/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin

ローカルの D1 / R2 は `.wrangler/` に作られます(Git には含めません)。

---

## Cloudflare への公開(初回)

Cloudflare アカウントで以下を一度だけ行います。

```bash
npx wrangler login

# 1. データベース(D1)を作成 → 表示された database_id を wrangler.jsonc の d1_databases に追記
npx wrangler d1 create caritas-web

# 2. メディア保存先(R2)を作成
npx wrangler r2 bucket create caritas-web-media

# 3. 暗号鍵を本番用に登録(ローカルとは別の値を生成して貼り付ける)
npx emdash secrets generate
npx wrangler secret put EMDASH_ENCRYPTION_KEY

# 4. ビルドして公開
npm run deploy
```

`wrangler.jsonc` の D1 設定は次のようになります。

```jsonc
"d1_databases": [
	{ "binding": "DB", "database_name": "caritas-web", "database_id": "(手順1で表示されたID)" }
],
```

※ `wrangler.jsonc` に `database_id` を書かずに `npm run deploy` すると、Wrangler が D1・R2 を自動作成する場合があります(Wrangler のバージョンによる)。その場合は手順1・2は不要です。

公開後、`https://(公開URL)/_emdash/admin` を開くと初期設定ウィザードが始まり、最初に登録したユーザーが管理者になります。
**パスキーはドメインごと**のため、ローカルで作ったパスキーは本番では使えません。本番ドメインで改めて登録してください。

### GitHub からの自動公開(推奨)

Cloudflare ダッシュボード → Workers & Pages → `caritas-web` → Settings → Builds で GitHub リポジトリを接続すると、`main` ブランチへの push で自動的にビルド・公開されます。

- ビルドコマンド:`npm run build`
- デプロイコマンド:`npx wrangler deploy`

### 独自ドメイン

Workers の Settings → Domains & Routes で独自ドメインを追加します。追加後、環境変数 `EMDASH_SITE_URL` に本番 URL を設定してください。

---

## クライアント環境への移設手順

最終的にクライアント(カリタスジャパン)の GitHub / Cloudflare に移す際の手順です。

1. **GitHub**
   - 推奨:GitHub の Settings → Transfer ownership で、このリポジトリをクライアントの Organization へ移管(履歴・Issue ごと移ります)。
   - または:クライアント側で空のリポジトリを作り、`git remote set-url origin <新URL>` → `git push -u origin main`。
2. **Cloudflare**(クライアントのアカウントで)
   - 上の「Cloudflare への公開(初回)」の 1〜4 を実施。
   - Workers Builds でクライアントのリポジトリを接続。
3. **CMS のデータ移行**(制作側の環境で記事を入力済みの場合)
   - D1:`npx wrangler d1 export caritas-web --remote --output=backup.sql`(移行元)→ `npx wrangler d1 execute caritas-web --remote --file=backup.sql`(移行先)
   - R2:メディアファイルを移行元バケットから移行先バケットへコピー(rclone など)。
   - 暗号鍵 `EMDASH_ENCRYPTION_KEY` も移行元と**同じ値**を移行先に登録してください。
4. **DNS**:独自ドメインをクライアントの Cloudflare に向け、`EMDASH_SITE_URL` を更新。
5. 管理画面で管理者ユーザーを作り直し(パスキーはドメイン単位のため)、制作側のユーザーを削除。

### バックアップの対象

D1 データベース、R2 バケット、`EMDASH_ENCRYPTION_KEY` の3点を必ずまとめて保管してください。

---

## 公開前の確認事項

- 固定ページの本文(未支給)
- 「WAY TO HELP」の「参加する」「祈る」のリンク先(`src/pages/index.astro` の `data-todo="url"`)
- 言語切替の方式(ヘッダーの「日本語」ボタン)
- お知らせの仮データ5件の削除
- 写真・ロゴの元データへの差し替え(現在はデザインカンプからの切り出し)
