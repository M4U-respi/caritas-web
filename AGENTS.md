# caritas-web — 開発メモ(AI エージェント・開発者向け)

カリタスジャパン公式サイト。Astro + EmDash(CMS)+ Cloudflare Workers(D1 / R2)。
全体像・公開手順・移設手順は README.md を参照。

## コマンド

```bash
npm run dev        # 開発サーバー(http://localhost:4321、管理画面 /_emdash/admin)
npm run build      # ビルド
npm run deploy     # ビルド + Cloudflare へ公開
npx emdash types   # 起動中サイトから型を再生成
```

## 構成

- `src/data/site.ts` … ナビ・フッター・CMS コレクション定義(URL やカテゴリを変えるときはここ)
- `src/layouts/Layout.astro` … 共通レイアウト(EmDashHead / BodyStart / BodyEnd を含む)
- `src/components/` … Header / Footer / NewsSection / ArchivePage / DetailPage / StaticPage / PageHeader / EntryList
- `src/lib/cms.ts` … EmDash 取得ヘルパー(listEntries)
- `src/middleware.ts` … 開発サイトの合言葉ゲート(`vars.SITE_PASSWORD` があるときだけ有効。`/_emdash/` は対象外)
- `public/assets/` … CSS・JS・画像(TOP デザインの静的コーディングから移植)
- `seed/seed.json` … CMS スキーマ(news / report / publication と各カテゴリ)

## ルール

- CMS コンテンツのページはすべてサーバーレンダリング。CMS コンテンツに `getStaticPaths()` は使わない。
- 画像フィールドはオブジェクト。`<Image image={...} />`(`emdash/ui`)で表示する。
- `entry.id` はスラッグ(URL 用)、`entry.data.id` は DB の ULID(`getEntryTerms` などに使う)。
- タクソノミー名は seed の `name` と完全一致(`news_category` / `report_category` / `publication_category`)。
- 404 判定(`Astro.rewrite("/404/")`)はページ(`src/pages/`)の frontmatter で行う。コンポーネント内ではレスポンス開始後になるため不可。
- Astro の frontmatter で `/* … */` コメントに `*/` を含むパス(例 `src/pages/*/x`)を書かない。
- `trailingSlash` は `"ignore"`(`"always"` にすると EmDash の API が 404 になる)。サイト内リンクは末尾スラッシュ付きで書く。
- CSS は `style.css`(TOP デザイン)を極力触らず、下層ページ用は `pages.css` に追加する。
- カテゴリ一覧は `/{collection}/{term}/`(記事詳細と同じ `[slug].astro` で判定)。記事スラッグとカテゴリslugを重複させない。
- URL・電話番号・文言を推測で作らない。未支給のリンクは `href="#" data-todo="url"`。

## EmDash ドキュメント

`.agents/skills/` に EmDash 公式のエージェント向けスキル、`.mcp.json` にドキュメント MCP(https://docs.emdashcms.com/mcp)の設定があります。
