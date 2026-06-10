# 動画 HLS 変換の OOM 障害と対策

最終更新: 2026-05-30
対象環境: Railway (staging, 無料プラン)
関連コミット: `60ba76e` (ffmpeg 同梱), PR #109 (エラーログ可視化)

## 1. 障害の概要

ステージング環境でユーザーが動画をアップロードすると、DB レコードは作成されるが HLS 変換が完了せず `streamStatus` が `uploading` → `error` で停止する。

### 観測事象

- アップロード API (`POST /videos/upload`) は 201 を返す
- DB レコードは `streamStatus: "uploading"`, `videoExternalId: "pending"` で作成される
- バックグラウンドの `VideoProcessorService.processVideo` が走り、`streamStatus: "processing"` への更新までは到達する
- HLS 変換中に ffmpeg プロセスが異常終了し、catch ブロックで `streamStatus: "error"` に遷移

### Railway ログ（抜粋）

```
Video 56116974-b55c-4c45-9f64-253bd209b694 processing failed: ffmpeg was killed with signal SIGKILL
Error: ffmpeg was killed with signal SIGKILL
    at ChildProcess.<anonymous> (/app/node_modules/.pnpm/fluent-ffmpeg@2.1.3/node_modules/fluent-ffmpeg/lib/processor.js:178:22)
```

## 2. 原因

**Railway 無料プランのメモリ上限を ffmpeg(libx264) が超過し、コンテナホストの OOM Killer によって SIGKILL された。**

### 根拠

- `SIGKILL` は外部から強制終了されたシグナル。アプリ自身は送出していない
- libx264 は CPU/メモリを大量に使うエンコーダ
- Railway 無料プランのメモリ枠は 512MB〜1GB（プラン詳細による）
- アップロード対象は **16 分の動画**。フレーム数・解像度次第で ffmpeg が GB 級のメモリを使用する
- コンテナ環境で長時間動画を libx264 で変換する典型的な失敗パターン

### メモリを食っている本体は「HLS 形式」ではなく「libx264 による再エンコード」

「HLS」自体は単に `.ts` セグメント + `.m3u8` プレイリストという出力形式の話であって、それ自体は軽い。重いのはその手前の **再エンコード処理**。

ffmpeg の処理は3段階:

1. **デコード** — 元動画ファイルを読み込んで生フレームに展開
2. **再エンコード** — 生フレームを libx264 で H.264 に圧縮し直す ← **ここでメモリを大量消費**
3. **HLS セグメント化** — 圧縮済みの映像を 10 秒ごとの `.ts` ファイル + `.m3u8` に分割

つまり:

- 同じ libx264 で mp4 を出力しても同じだけメモリを食う（HLS 出力でも mp4 出力でも変わらない）
- 逆に「再エンコードせずに HLS セグメント化だけ」する選択肢もある（`-c copy` で映像をそのままコピー）→ これなら軽量だが、元動画のコーデックがブラウザ非対応だと再生できない

現在のコード (`apps/api/src/videos/video-processor.service.ts:131-152`):

```ts
ffmpeg(inputPath)
  .outputOptions([
    "-c:v", "libx264",  // 再エンコードを指示
    "-preset", "fast",
    "-crf", "23",
    "-c:a", "aac",
    ...
  ])
```

これは「すべての動画を H.264/AAC に統一して画質を制御する」典型的な構成で、安全側に倒すと再エンコード必須だが、メモリは重い。

### なぜ「16 分の動画」で初めて顕在化したか

- 短尺動画（1〜2 分）なら、libx264 のメモリピークがコンテナ上限に達する前に処理が終わる可能性がある
- 16 分の動画は処理時間が長く、メモリピークの累積・GC 遅延・並列処理で上限を踏み抜く確率が大幅に上がる
- 「**HLS だから起きた**」ではなく「**再エンコードの規模（時間 × 解像度 × フレームレート）が大きくなったから OOM になった**」が正確

### 実装上の追加要因

`apps/api/src/videos/video-processor.service.ts:28-42` の構造:

```ts
async processVideo(videoId, inputBuffer: Buffer, originalName) {
  // ❶ 動画全体を Buffer としてメモリに保持（multer 経由）
  fs.writeFileSync(inputPath, inputBuffer); // ❷ 同じデータを /tmp に書き出し
  await this.convertToHls(...);             // ❸ ffmpeg(libx264) が大量メモリ使用
}
```

Node プロセスのヒープ（Buffer 保持）と ffmpeg の合計メモリが上限を圧迫している。

## 3. 制約条件

- Railway は **無料プラン** を継続する前提
- ステージング段階のため R2/Redis/Sentry は後回しの方針（参照: `project_staging_deployment.md`）
- 動画機能はステージング上で UI/UX 確認できる程度に動けば十分
- **【最重要】動画再生パフォーマンスが本プロジェクトの最優先要件**（再生開始の速さ・シーク応答・回線変動への適応・CDN 配信品質・画質）

## 4. 対策の選択肢

### 4.1 初期に出した選択肢（HLS をやめる方向 + 外部委譲）

| #   | 方針                                                                           | 即効性 | 工数 | コスト | 検証可能性                        |
| --- | ------------------------------------------------------------------------------ | ------ | ---- | ------ | --------------------------------- |
| 1   | **HLS 変換をやめて mp4 直再生にする**（暫定撤去しやすい形）                    | 高     | 中   | 0      | ◎                                 |
| 2   | Railway を Hobby プラン（$5/月、8GB メモリ）に上げる                           | 高     | 0    | 月 $5  | ◎                                 |
| 3   | 外部動画 SaaS（Cloudflare Stream / Mux）に変換を委譲                           | 中     | 大   | 従量   | ◎                                 |
| 4   | ffmpeg オプション調整（`-preset ultrafast` / 解像度 480p 強制 / `-threads 1`） | 低     | 小   | 0      | △（16分だと結局通らない可能性）   |
| 5   | アップロード上限を厳しくする（数十秒・数十MB）                                 | 低     | 小   | 0      | ×（ステージング検証用途には不適） |

### 4.2 無料 Railway を維持しつつ HLS を実現する選択肢（深掘り）

「無料維持」と「HLS 継続」を両立する道がないかを掘った結果。メモリを食う本体は **再エンコード** なので、「再エンコードを省略する」か「再エンコードを別の場所でやる」のいずれかになる。

| 選択肢 | 仕組み                                                                           | 制約                                                                                                                | 工数   |
| ------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------ |
| **A**  | **`-c copy` で再エンコードを省略**（映像/音声をコピーして HLS セグメント化のみ） | 元動画のコーデックがブラウザ互換（H.264/AAC）必須。スマホ撮影や OBS 出力なら大体 OK。H.265/HEVC や AV1 だと再生不可 | 小     |
| **B**  | **解像度を極端に下げて再エンコード**（360p, ultrafast, `-threads 1`）            | 画質が落ちる。16 分でも通る保証はない（試行錯誤要）                                                                 | 小     |
| **C**  | **クライアントサイドで HLS 変換**（`ffmpeg.wasm`）                               | ユーザー端末・回線依存、16 分動画は端末次第で厳しい                                                                 | 中〜大 |
| **D**  | **GitHub Actions で変換オフロード**                                              | GitHub Actions 無料枠（月 2000 分）内なら無料、起動遅延 1〜2 分、実装複雑                                           | 大     |
| **E**  | **YouTube / Vimeo 埋め込み**                                                     | コミュニティ動画を外部に置く設計判断、iframe 制約、ただし完全無料                                                   | 中     |

#### 推奨（4.2 内で）: 選択肢 A（`-c copy`）

理由:

- メモリ消費がほぼゼロ（ffmpeg はコンテナの詰め直しだけ）
- 実装変更は `outputOptions` の数行のみ
- スマホ撮影 mp4 / Zoom 録画 mp4 などは大半 H.264/AAC なので互換性が出やすい
- ステージング検証用途には十分

実装イメージ:

```ts
// 現状
.outputOptions([
  "-c:v", "libx264",      // → "copy"
  "-preset", "fast",       // → 削除
  "-crf", "23",            // → 削除
  "-c:a", "aac",           // → "copy"
  "-b:a", "128k",          // → 削除
  ...
])
```

#### 4.2 A のリスクと回避策

- **元動画が H.264 でないと再生不可** → ffprobe でコーデック判定し、`copy` 不可な動画はステージングでは「未対応」として弾く
- **解像度が大きすぎる場合**: `copy` でも巨大ファイルになる → R2 帯域・ストレージ負荷 → アップロード上限を設けて運用回避（例: 500MB）

#### 4.2 選択肢 1（mp4 直再生）vs 選択肢 A（HLS + `-c copy`）の比較

| 項目                 | 選択肢 1（mp4 直再生）                 | 選択肢 A（HLS + `-c copy`）                                      |
| -------------------- | -------------------------------------- | ---------------------------------------------------------------- |
| メモリ               | ほぼゼロ                               | ほぼゼロ                                                         |
| 実装変更             | 中（フロント再生に mp4 fallback 必要） | 小（`outputOptions` のみ）                                       |
| 本番化時の戻し作業   | env トグル戻すだけ                     | env トグル戻すだけ                                               |
| ブラウザ互換性       | mp4 直再生はどのブラウザも OK          | HLS は Safari ネイティブ / Chrome は hls.js 必須（既存対応済み） |
| 元動画コーデック制約 | なし                                   | あり（H.264 のみ）                                               |

> ⚠️ **4.2 の検討結果は「7. パフォーマンス最優先要件を踏まえた再評価」で覆された。** 単一ビットレートの HLS（A）では ABR が成立せず、CDN もないため、パフォーマンス要件を満たさない。本セクションは「無料維持」のみを優先した中間検討として記録する。

## 5. 推奨方針（初期案・パフォーマンス要件未反映）

> ⚠️ 本セクションは「制約条件 3-4（動画パフォーマンス最優先）」を考慮していない初期案。最終方針は **7. パフォーマンス最優先要件を踏まえた再評価** を参照すること。

### 短期（ステージング検証用）

**選択肢 1: HLS 変換をやめて mp4 直再生にする**

理由:

- 無料 Railway 制約を変えずに動かせる
- ステージング段階では動画再生 UI が動けば検証目的を満たす
- 暫定撤去ルール（`feedback_temporary_code_removable.md`）に沿わせれば、本番化時に HLS に戻すコストが低い

実装方針:

- `apps/api/src/videos/videos.controller.ts:134` の `processor.processVideo(...)` 呼び出しを env トグル（例: `VIDEO_HLS_ENABLED`）で分岐
- HLS が無効のとき:
  - 元ファイルをそのまま R2 に `videos/{id}/source.mp4` 等で保存
  - `playbackUrl` に R2 公開 URL を設定
  - `streamStatus: "ready"`
- フロント側の `<video>` / hls.js 再生コードは、`playbackUrl` の拡張子で再生方法を切り替えるか、mp4 fallback を入れる
- 既存の HLS 経路コードは削除せず、コメントで残す（env トグルで再有効化可能にする）

### 長期（本番リリース前）

**選択肢 3: 外部動画 SaaS（Cloudflare Stream 推奨）**

理由:

- 自前で ffmpeg を持つよりスケール・耐障害性に優れる
- アップロード → 自動 HLS 変換 → 再生 URL 取得のフローが SaaS で完結
- Cloudflare Stream は R2 と同じエコシステムで運用負担が小さい

検討タイミング: Phase 12（本番デプロイ）または動画機能の本番リリース直前

## 6. 関連ファイル

- `apps/api/src/videos/video-processor.service.ts` — HLS 変換ロジック本体
- `apps/api/src/videos/videos.controller.ts` — アップロード API
- `apps/api/src/videos/videos.service.ts` — `createForUpload` で `streamStatus: "uploading"` 初期化
- `apps/api/src/files/storage/storage.service.ts` — R2/MinIO 抽象化
- `docs/動画配信設計.md` — 既存の動画配信設計

## 7. パフォーマンス最優先要件を踏まえた再評価

「動画再生パフォーマンスが本プロジェクトの最重要要件」という前提が明らかになったため、5 章の初期案（短期 mp4 直再生）は **要件と矛盾する** ため非推奨に格下げする。

### 7.1 「動画パフォーマンス」の構成要素

1. **再生開始の速さ**（First frame まで）
2. **シーク・スキップの応答性**
3. **回線変動への適応**（Adaptive Bitrate Streaming, ABR）
4. **CDN による配信速度・到達性**
5. **画質と帯域のバランス**

これらを満たすのは「**複数ビットレートにエンコードした HLS を CDN 経由で配信**」する構成。

- 1, 2 は HLS のセグメント分割で実現
- 3 は ABR（複数解像度のマニフェスト）が必要
- 4 は CDN が必要
- 5 はエンコード品質設計に依存

### 7.2 選択肢のパフォーマンス再評価

| 選択肢                                   | 1.開始       | 2.シーク    | 3.ABR | 4.CDN       | 5.画質       | 総合                                 |
| ---------------------------------------- | ------------ | ----------- | ----- | ----------- | ------------ | ------------------------------------ |
| 1. mp4 直再生                            | × 全体DL待ち | △ Range頼み | ×     | △ (R2 公開) | △ 単一       | ×                                    |
| A. `-c copy` HLS（単一ビットレート）     | ◯            | ◯           | ×     | △           | △ 元動画依存 | △                                    |
| 4. ffmpeg 軽量化（低解像度再エンコード） | ◯            | ◯           | ×     | △           | × 画質低い   | △                                    |
| 自前 ABR HLS（複数解像度）               | ◎            | ◎           | ◎     | △           | ◎            | ◎ だが **無料 Railway では絶対不可** |
| Cloudflare Stream                        | ◎            | ◎           | ◎     | ◎           | ◎            | ◎                                    |
| YouTube / Vimeo 埋め込み                 | ◎            | ◎           | ◎     | ◎           | ◎            | ◎                                    |

**結論**: パフォーマンス最重視の要件下では、無料 Railway 内で自前変換する道は構造的に不可能。**外部サービスへの委譲が必須**。

### 7.3 取るべき道（実質 2 択）

#### 道 A: Cloudflare Stream（推奨）

- アップロード → 自動 ABR HLS 変換 → グローバル CDN 配信
- 料金: 保存 $5/1000 分、視聴 $1/1000 分（従量課金、無料枠なし）
- 署名付き URL で権限制御可能
- R2 と同じ Cloudflare エコシステムで運用負担最小
- メトリクス・分析ダッシュボード標準装備
- 自前 ffmpeg を完全に捨てられる

#### 道 B: YouTube / Vimeo 埋め込み

- 完全無料・世界最大級 CDN によるパフォーマンス
- 限定公開・パスワード保護で最低限の権限制御は可能
- デメリット:
  - コミュニティ動画を **外部に置く** 設計判断（規約・コンプライアンス確認要）
  - UI が `<iframe>` 制約（再生コントロール・進捗管理が独自実装しづらい）
  - Vimeo の高度な権限制御は Pro 以上の有料機能
  - 既存実装（HLS + hls.js + 視聴進捗管理）の大半を破棄

### 7.4 推奨方針（更新版）

**Cloudflare Stream を短期から導入し、自前 ffmpeg 構成は撤去する**

理由:

- パフォーマンス最重視という要件を満たせる唯一の現実解
- ステージング段階から本番志向で組める（後で作り直さない）
- 従量課金なので少量利用なら月額数百円程度に収まる
- R2 + Cloudflare Stream の組み合わせは公式に親和性が高く、運用が単純化する
- 自前 ffmpeg は「コアコンピタンス（プロダクトの差別化要因）ではない」のに運用負担が大きい

### 7.5 移行のステップ案

1. **Cloudflare Stream のアカウント・API キー準備**（環境変数追加）
2. **`StorageService` または `VideoUploadService` に Stream 連携を追加**
   - アップロード時: ファイルを Stream に POST → `videoExternalId` に Stream の uid を保存
   - 変換完了通知: Stream の Webhook を受けて `streamStatus: "ready"` + `playbackUrl` 更新
3. **既存の `VideoProcessorService` を env トグルで無効化**（撤去しやすい形で残す。参照: `feedback_temporary_code_removable.md`）
4. **フロント側の hls.js 再生は維持**（Stream も HLS で配信するため大半そのまま使える）
5. **視聴認可**: 動画詳細 API が署名付き URL を発行する形に変更
6. **既存動画データの移行**（ステージングなら廃棄でも可、本番に既存動画があれば一括 Stream 投入）

### 7.6 検討すべき確認事項

最終決定の前に、以下を整理しておくと判断が早い:

- 動画の想定**長さ・本数・同時視聴規模**（→ 月額試算）
- **コミュニティ動画を Cloudflare に保管する** ことの規約・コンプライアンス上の確認
- 視聴履歴・進捗管理は **自前 DB 継続**（Stream は再生のみ担当）で問題ないか
- ライブ配信・ダウンロード許可の要否（Stream の機能で対応可能）
- ステージング段階での **コスト上限**（誤って大量アップロードした際の課金対策）

## 8. 短期対応の実装（MP4 直配信 + faststart）

2026-06-11 時点で **「一旦 MP4 形式で実装」** をユーザー意向として採用し、7 章の Cloudflare Stream 移行までのつなぎとして以下を実装した。撤去しやすい形（`feedback_temporary_code_removable.md`）に従い、HLS 経路は削除せず env トグルで戻せる構成。

詳細プラン: `docs/plans/videos/mp4-temporary-distribution.md`

### 実装サマリ

| 観点               | 内容                                                                     |
| ------------------ | ------------------------------------------------------------------------ |
| ffmpeg             | `-c copy -movflags +faststart`（再エンコードなし、moov atom 先頭配置）   |
| env トグル         | `VIDEO_OUTPUT_FORMAT` (`mp4` default / `hls`)                            |
| コーデック判定     | ffprobe で H.264/AAC でない動画は `streamStatus=error` で弾く            |
| VideoProvider enum | `r2_hls` を流用（マイグレーション回避）、実体は playbackUrl 拡張子で識別 |
| R2 キー            | `videos/{id}/source.mp4`（HLS 側 `videos/{id}/hls/` と分離）             |
| フロント           | `HlsPlayer` 内部で `.mp4` 早期 return（コンポーネント名据え置き）        |
| 撤去マーカー       | `// TEMP: VIDEO_OUTPUT_FORMAT=mp4 (Cloudflare Stream 移行までの暫定)`    |

### 残課題（Cloudflare Stream 移行のトリガにもなる）

- **Multer Buffer の 2 重メモリ保持**: `file.buffer`（メモリストレージ）+ `fs.writeFileSync(inputBuffer)` で 500MB 動画なら 500MB Buffer を保持。`-c copy` でも完全には解消されず、16 分以上の動画では引き続き OOM 再発リスクあり。`diskStorage` への切替は広範な変更（controller / interceptor / spec）になるため別 Issue で対応する想定。**MP4 でも OOM が再発したら即 Cloudflare Stream 移行のトリガ**。
- **コーデック非対応動画の頻発**: ステージング検証中、`videoCodec !== 'h264'` 判定が 3 件以上発生したら Cloudflare Stream 移行を検討。
- **再生体感**: faststart 付きでも単一ビットレートで CDN なしのため、回線が細いユーザーで体感が悪い場合は Cloudflare Stream 移行のシグナル。

### 撤去・移行手順

1. **短期ロールバック**: `VIDEO_OUTPUT_FORMAT=hls` に env を変更（コード変更不要、HLS 経路に即復帰）
2. **Cloudflare Stream 本格移行**: `grep "TEMP: VIDEO_OUTPUT_FORMAT=mp4"` で 4 箇所をヒット → MP4 ブロックを一括削除。詳細は `docs/plans/videos/mp4-temporary-distribution.md` の「Cloudflare Stream 移行親和性」セクション参照。
