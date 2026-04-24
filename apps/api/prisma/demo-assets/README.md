# Demo Assets

デモシード（`pnpm db:seed:demo`）で参照するプレースホルダ素材。

## ディレクトリ構成

- `avatars/default-1.svg` 〜 `default-20.svg` — 色違い・頭文字入りのユーザーアバター（20 個）
- `generic/placeholder-image.svg` — 汎用画像プレースホルダ
- `generic/placeholder-doc.svg` — PDF 風ドキュメントアイコン
- `generic/placeholder-banner.svg` — バナー用ワイド画像
- `generic/placeholder-thumbnail.svg` — 動画サムネイル（16:9）
- `generic/placeholder-product.svg` — 商品画像

## ライセンス

このディレクトリ内の全 SVG ファイルは **自動生成されたプレースホルダ**（著作権なし）です。

## 使い方

`prisma/demo/helpers/file-factory.ts` の `createFileRecord()` に `localPath` として相対パスを渡すと、

- R2 が有効（`.env` に `R2_ACCESS_KEY_ID` + `R2_BUCKET` あり）: 実アップロードを試行（TODO: 実装）
- R2 無効: SVG を `data:image/svg+xml;base64,...` のインライン URL に変換し、`files.public_url` に記録

外部素材が必要な場合は `fallbackUrl` に [Lorem Picsum](https://picsum.photos/) の URL（例: `https://picsum.photos/seed/event-1/800/400`）を渡す。
