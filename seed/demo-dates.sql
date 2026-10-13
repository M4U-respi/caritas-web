-- デザインカンプ掲載の仮データ(seed/seed.json)の公開日を設定する。
-- seed は公開日を指定できず、適用時刻が公開日になるため、seed 適用後にこの SQL を実行する。
--   ローカル: npx wrangler d1 execute caritas-web --local --file=seed/demo-dates.sql
--   本番:     npx wrangler d1 execute caritas-web --remote --file=seed/demo-dates.sql
-- 時刻は日本時間 10:00(UTC 01:00)。仮データを削除したら、このファイルも削除してよい。

UPDATE ec_news SET published_at = '2026-09-04T01:00:00.000Z', created_at = '2026-09-04T01:00:00.000Z' WHERE slug = 'funds-accepting' AND deleted_at IS NULL;
UPDATE ec_news SET published_at = '2026-09-03T01:00:00.000Z', created_at = '2026-09-03T01:00:00.000Z' WHERE slug = 'nepal-debris-flow-2026' AND deleted_at IS NULL;
UPDATE ec_news SET published_at = '2026-07-31T01:00:00.000Z', created_at = '2026-07-31T01:00:00.000Z' WHERE slug = 'kumamoto-2026-appeal' AND deleted_at IS NULL;
UPDATE ec_news SET published_at = '2026-07-30T01:00:00.000Z', created_at = '2026-07-30T01:00:00.000Z' WHERE slug = 'kumamoto-2026-sympathy' AND deleted_at IS NULL;
UPDATE ec_news SET published_at = '2026-07-10T01:00:00.000Z', created_at = '2026-07-10T01:00:00.000Z' WHERE slug = 'venezuela-earthquake-2026' AND deleted_at IS NULL;
UPDATE ec_news SET published_at = '2026-05-21T01:00:00.000Z', created_at = '2026-05-21T01:00:00.000Z' WHERE slug = 'noto-report-2026-05' AND deleted_at IS NULL;
UPDATE ec_news SET published_at = '2026-04-15T01:00:00.000Z', created_at = '2026-04-15T01:00:00.000Z' WHERE slug = 'debt-to-hope-report' AND deleted_at IS NULL;
UPDATE ec_news SET published_at = '2026-03-27T01:00:00.000Z', created_at = '2026-03-27T01:00:00.000Z' WHERE slug = 'lent-thanks-2026' AND deleted_at IS NULL;
UPDATE ec_news SET published_at = '2026-02-18T01:00:00.000Z', created_at = '2026-02-18T01:00:00.000Z' WHERE slug = 'lent-campaign-2026' AND deleted_at IS NULL;
UPDATE ec_news SET published_at = '2025-12-15T01:00:00.000Z', created_at = '2025-12-15T01:00:00.000Z' WHERE slug = 'year-end-holidays-2025' AND deleted_at IS NULL;
UPDATE ec_report SET published_at = '2026-08-10T01:00:00.000Z', created_at = '2026-08-10T01:00:00.000Z' WHERE slug = '2026-08' AND deleted_at IS NULL;
UPDATE ec_report SET published_at = '2026-07-08T01:00:00.000Z', created_at = '2026-07-08T01:00:00.000Z' WHERE slug = '2026-07' AND deleted_at IS NULL;
UPDATE ec_report SET published_at = '2026-06-30T01:00:00.000Z', created_at = '2026-06-30T01:00:00.000Z' WHERE slug = 'annual-2025' AND deleted_at IS NULL;
UPDATE ec_report SET published_at = '2026-06-10T01:00:00.000Z', created_at = '2026-06-10T01:00:00.000Z' WHERE slug = '2026-06' AND deleted_at IS NULL;
UPDATE ec_report SET published_at = '2026-05-12T01:00:00.000Z', created_at = '2026-05-12T01:00:00.000Z' WHERE slug = '2026-05' AND deleted_at IS NULL;
UPDATE ec_report SET published_at = '2026-04-10T01:00:00.000Z', created_at = '2026-04-10T01:00:00.000Z' WHERE slug = '2026-04' AND deleted_at IS NULL;
UPDATE ec_report SET published_at = '2026-03-13T01:00:00.000Z', created_at = '2026-03-13T01:00:00.000Z' WHERE slug = '2026-03' AND deleted_at IS NULL;
UPDATE ec_report SET published_at = '2026-02-10T01:00:00.000Z', created_at = '2026-02-10T01:00:00.000Z' WHERE slug = '2026-02' AND deleted_at IS NULL;
UPDATE ec_report SET published_at = '2026-01-13T01:00:00.000Z', created_at = '2026-01-13T01:00:00.000Z' WHERE slug = '2026-01' AND deleted_at IS NULL;
UPDATE ec_report SET published_at = '2025-12-10T01:00:00.000Z', created_at = '2025-12-10T01:00:00.000Z' WHERE slug = '2025-12' AND deleted_at IS NULL;
UPDATE ec_publication SET published_at = '2026-03-27T01:00:00.000Z', created_at = '2026-03-27T01:00:00.000Z' WHERE slug = 'lent-booklet-1997-2013' AND deleted_at IS NULL;
UPDATE ec_publication SET published_at = '2025-11-26T01:00:00.000Z', created_at = '2025-11-26T01:00:00.000Z' WHERE slug = 'we-are-caritas-31' AND deleted_at IS NULL;
UPDATE ec_publication SET published_at = '2025-07-08T01:00:00.000Z', created_at = '2025-07-08T01:00:00.000Z' WHERE slug = 'we-are-caritas-30' AND deleted_at IS NULL;
UPDATE ec_publication SET published_at = '2025-04-02T01:00:00.000Z', created_at = '2025-04-02T01:00:00.000Z' WHERE slug = 'jishi-genjitsu' AND deleted_at IS NULL;
UPDATE ec_publication SET published_at = '2025-04-01T01:00:00.000Z', created_at = '2025-04-01T01:00:00.000Z' WHERE slug = 'boryoku-gyakutai-seminar' AND deleted_at IS NULL;
UPDATE ec_publication SET published_at = '2024-11-27T01:00:00.000Z', created_at = '2024-11-27T01:00:00.000Z' WHERE slug = 'we-are-caritas-29' AND deleted_at IS NULL;
