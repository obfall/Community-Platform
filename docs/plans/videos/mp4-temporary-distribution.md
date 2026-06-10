# 動画配信を一旦 MP4 直配信に切替（撤去しやすい形）

## Context

ステージング環境（Railway 無料プラン）で 16 分動画をアップロードすると、`video-processor.service.ts` の ffmpeg + libx264 による HLS 変換が OOM Killer に SIGKILL され `streamStatus=error` で停止する（`docs/動画HLS変換のOOM障害と対策.md`）。長期的には Cloudflare Stream への移行が推奨だが、ユーザーは「**一旦** MP4 形式で実装したい」と希望。

本プランは「短期: 無料 Railway 上で動画機能の UI/UX 検証を可能にする」ことを目的に、再エンコードを伴わない MP4 直配信へ切り替える。**撤去しやすい形ルール**（`.claude/memory/feedback_temporary_code_removable.md`）に従い、既存 HLS 経路は削除せず env トグルで戻せる構成にする。

**次の移行先は Cloudflare Stream で確定**: 今回の MP4 直配信で「Buffer OOM 再発」「シーク・再生開始が体感悪い」「コーデック非対応動画でユーザー困窮」のいずれかが顕在化した場合、Cloudflare Stream（`docs/動画HLS変換のOOM障害と対策.md` 7 章）に移行する。本プランは **移行時に MP4 関連コードを丸ごと捨てやすい構造** で実装する（後述「Cloudflare Stream 移行親和性」）。

## 確定方針

- **ffmpeg**: `-c copy -movflags +faststart`（再エンコードなし、moov atom 先頭配置で再生開始高速化）
- **next の動画ライブラリ不使用**: 素の `<video controls>`（既存実装そのまま流用、依存追加なし）
- **切替方式**: `VIDEO_OUTPUT_FORMAT` env トグル、デフォルト `mp4`、`hls` に戻すと既存 HLS 経路復活
- **既存データ**: そのまま残す。フロントは playbackUrl 末尾の `.mp4`/`.m3u8` で再生方式を分岐
- **コーデック不適合**: ffprobe で事前判定し H.264/AAC でなければ `streamStatus=error` + 警告ログ
- **DB スキーマ**: `VideoProvider` enum は変更せず `r2_hls` 流用（マイグレーション回避）、コメントで実体を明示
- **R2 キー**: `videos/{id}/source.mp4`（HLS 側 `videos/{id}/hls/...` と完全分離）
- **撤去用マーカー**: `// TEMP: VIDEO_OUTPUT_FORMAT=mp4 (Cloudflare Stream 移行までの暫定)` を 4 箇所に統一配置

## 実装ステップ

### 1. `getVideoMetadata()` で ffprobe を 1 パス化

`apps/api/src/videos/video-processor.service.ts`

`getVideoDuration()` を廃止し `getVideoMetadata(): Promise<{ duration: number | null, videoCodec: string | null, audioCodec: string | null }>` に統合。fluent-ffmpeg の `metadata.streams[]` から `codec_type==='video'/'audio'` を 1 度の ffprobe で取得（I/O コストを半減）。型は `codec_name?: string` で narrow。

### 2. `convertToMp4()` 追加と `processVideo()` の env 分岐

```ts
private convertToMp4(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setFfmpegPath(this.ffmpegPath)
      .outputOptions(["-c", "copy", "-movflags", "+faststart"])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err))
      .run();
  });
}
```

`processVideo()` 冒頭で `const format = config.get('VIDEO_OUTPUT_FORMAT') ?? 'mp4'` を読み、`format === 'mp4'` 時:

1. `getVideoMetadata()` で duration + codec 取得
2. `videoCodec === 'h264' && audioCodec === 'aac'` でなければ `streamStatus=error` 確定 + 警告ログで return
3. `convertToMp4(inputPath, videos/{id}/source.mp4)` → R2 アップロード
4. サムネイル抽出（既存 `extractThumbnail` 流用、MP4 でも動作）
5. `playbackUrl = getPublicUrl('videos/{id}/source.mp4')`、`videoExternalId = 'videos/{id}'`、`streamStatus=ready`

既存 HLS 経路（`convertToHls` + セグメント走査）は `else` ブロック内に丸ごと残す。**削除しない**。

### 3. Controller の Swagger 文言更新（実コード変更なし）

`apps/api/src/videos/videos.controller.ts:104` `@ApiOperation({ summary: "動画アップロード（ファイル → HLS 変換）" })` → `"動画アップロード（ファイル → MP4 or HLS 変換、env で切替）"`。`replaceFile` も同様。実コードは `processor.processVideo()` を呼ぶだけなので env 分岐が自動で効く。

### 4. フロント `HlsPlayer` 内部で早期 return 分岐

`apps/web/app/(dashboard)/videos/[id]/_components/hls-player.tsx`

useEffect の HLS 初期化ブロック先頭で:

```ts
if (playbackUrl.endsWith(".mp4")) {
  video.src = playbackUrl; // TEMP: VIDEO_OUTPUT_FORMAT=mp4
  return;
}
// 既存 hls.js 初期化（変更なし）
```

**コンポーネント名は `HlsPlayer` のまま据え置き**（リネームすると撤去時のノイズになる）。冒頭ファイル先頭に TEMP コメントで意図を明示。

### 5. ドキュメント更新

`docs/動画HLS変換のOOM障害と対策.md` の 5 章「推奨方針」末尾に、本プランで実施した「短期対応の実装版」セクションを追加。**Buffer メモリ問題の残課題**（`fs.writeFileSync(inputBuffer)` で動画全体保持、500MB 動画なら 500MB Buffer 必須、`-c copy` 化しても完全には消えない）を残課題として明記。Multer の `diskStorage` 化は別 Issue。

### 6. テスト確認

- `video-processor.service.spec.ts` は不存在 → 新規不要
- `videos.service.spec.ts` の `videoProvider: "r2_hls"` 期待値は enum 据え置きで変更不要
- `videos.controller.spec.ts` の `processor` モックに `ConfigService` モック追加が必要な場合のみ修正

### 7. 手動検証（Verification）

すべて localhost / staging 環境で実施:

1. **H.264/AAC MP4 アップロード**: `VIDEO_OUTPUT_FORMAT=mp4` で 16 分の H.264 動画をアップロードし、`streamStatus=ready` + `<video>` 再生開始が 1〜2 秒以内（faststart 効果確認）
2. **コーデック不適合**: H.265 動画をアップロードし、`streamStatus=error` + ログに警告
3. **既存 HLS 動画の再生**: 過去にアップロードした m3u8 動画が hls.js 経路でそのまま再生できる
4. **env 戻し回帰**: `VIDEO_OUTPUT_FORMAT=hls` に切り替えてアップロード、HLS 経路が問題なく走る
5. **シーク・再生位置**: MP4 動画でシークバー操作・再生終了時の進捗保存が動く（既存 `useEffect` の handleEnded）
6. **再生回数カウント**: MP4 動画再生時に `POST /videos/:id/view` が呼ばれる

## 変更ファイル

- `apps/api/src/videos/video-processor.service.ts` — `getVideoMetadata()` 統合 + `convertToMp4()` 追加 + `processVideo()` env 分岐
- `apps/api/src/videos/videos.controller.ts` — `@ApiOperation` 文言のみ
- `apps/web/app/(dashboard)/videos/[id]/_components/hls-player.tsx` — `.mp4` 早期 return 分岐
- `docs/動画HLS変換のOOM障害と対策.md` — 短期実装結果と Buffer 残課題を追記
- `apps/api/.env` / Railway env / Vercel env — `VIDEO_OUTPUT_FORMAT=mp4` 設定（実装後に環境側で設定）

## スコープ外（将来別件）

- **Multer Buffer 問題**: `file.buffer` + `fs.writeFileSync` の 2 重メモリ保持を `diskStorage` 化。MP4 でも 16 分動画で OOM 再発の可能性あり。**再発したら即 Cloudflare Stream 移行のトリガ**
- **R2 孤児削除**: HLS→MP4 差し替え時の旧 `hls/` 配下削除。Cloudflare Stream 移行時は R2 から動画関連プレフィックスを一括削除するため、今やる意義は薄い
- **Cloudflare Stream 移行本体**: パフォーマンス最優先要件を満たす本番対応（`docs/動画HLS変換のOOM障害と対策.md` 7 章）

## Cloudflare Stream 移行親和性（設計の活かし方）

今回の MP4 対応を「捨てやすい」状態に保ち、Cloudflare Stream 移行を低コストで実現するための設計判断:

| 設計判断                                                          | Cloudflare Stream 移行時のメリット                                                                                              |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **VideoProvider enum を据え置き**                                 | enum に既にある `cloudflare_stream` 値をそのまま使える。マイグレーション不要                                                    |
| **MP4 ロジックを `if (format === 'mp4')` ブロックに完全閉じ込め** | 移行時に if ブロックごと削除すれば MP4 関連が一掃される。env 変数も同時に削除                                                   |
| **既存 HLS 経路を else に残す（削除しない）**                     | Cloudflare Stream は HLS で配信するため、フロントの hls.js 経路は **そのまま流用**。フロント側は実質変更ゼロ                    |
| **`HlsPlayer` のコンポーネント名据え置き + 早期 return 分岐**     | MP4 早期 return ブロックだけ削除すれば hls.js 経路に自動復帰。Cloudflare Stream の m3u8 URL を `playbackUrl` に入れるだけで動く |
| **`videoExternalId` を `videos/{id}` 形式で記録**                 | Cloudflare Stream は Stream の uid を入れるだけ。文字列カラムなので形式変更だけで対応可能                                       |
| **TEMP コメント統一文言**                                         | `grep "TEMP: VIDEO_OUTPUT_FORMAT=mp4"` で MP4 関連コードを一括発見 → 一括削除                                                   |
| **ドキュメントに「ダメ判定基準」を明記**（次節）                  | 移行判断が属人化せず、判定基準に達したら自動的に Stream 移行フェーズへ                                                          |

### Cloudflare Stream 移行トリガ（ダメ判定基準）

以下のいずれかが顕在化したら Cloudflare Stream 移行を開始する:

1. **Buffer OOM 再発**: 16 分以上の動画で `streamStatus=error` がログから観測される
2. **コーデック非対応動画の頻発**: ステージング検証中、ffprobe で `videoCodec !== 'h264'` 判定の動画が **3 件以上** 発生
3. **再生体感の悪さ**: faststart 付きでも再生開始 5 秒以上 / シーク 3 秒以上のラグがユーザー検証で報告される
4. **本番リリース準備フェーズ移行**: Phase 12（本番デプロイ）着手時は MP4 直配信ではパフォーマンス要件を満たさないため、自動的に Stream 移行

### Cloudflare Stream 移行時の作業概略（参考）

1. Cloudflare Stream アカウント / API トークン準備、env 追加（`CLOUDFLARE_STREAM_ACCOUNT_ID`, `CLOUDFLARE_STREAM_API_TOKEN`）
2. `videos.controller.ts:upload` で Stream の direct upload URL を発行し、フロントから直接 Stream へ POST（NestJS Buffer 経由を完全排除 = Buffer OOM 問題が消える）
3. Stream の webhook で `streamStatus: ready` + `playbackUrl=https://{customer}.cloudflarestream.com/{uid}/manifest/video.m3u8` 更新
4. `videoProvider` を `cloudflare_stream` に変更（enum 値は既存）
5. **本プランで追加した MP4 ロジック削除**: `grep "TEMP: VIDEO_OUTPUT_FORMAT=mp4"` で 4 箇所をヒット → `convertToMp4`、processVideo 分岐、HlsPlayer 早期 return、env を削除
6. 既存 HLS 経路（自前 R2 配信）も削除可（フロントの hls.js は **Stream の m3u8 を読むのでそのまま残す**）
7. R2 から `videos/` プレフィックスを一括削除

## 撤去手順（短期: env を hls に戻すだけのロールバック）

1. `VIDEO_OUTPUT_FORMAT=hls` に env 変更 → 即座に既存 HLS 経路に復帰（Railway を Hobby プランに上げる前提）
2. コード削除は不要（env だけで完結）
3. 本格移行時は上記「Cloudflare Stream 移行作業概略」を実施
