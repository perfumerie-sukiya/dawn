# TOPページ パフォーマンス調査メモ (2026-01-15)

対象: https://online.sukiya.biz/ (Lighthouse JSON 参照)
計測日時: 2026-01-15T09:03:53.782Z

## Lighthouse スコア
- Performance: 0.57

## 主要メトリクス
- First Contentful Paint: 2.9 s
- Largest Contentful Paint: 3.6 s
- Speed Index: 33.4 s
- Total Blocking Time: 810 ms
- Cumulative Layout Shift: 0
- Time to Interactive: 27.0 s

## Main Thread 内訳 (合計 20.0s)
- Other: 7103.0ms
- Rendering: 4649.4ms
- Script Evaluation: 4437.8ms
- Style & Layout: 2531.4ms
- Script Parsing & Compilation: 973.5ms
- Garbage Collection: 219.7ms
- Parse HTML & CSS: 112.2ms

## Lighthouse 指摘（抜粋）
- Reduce unused JavaScript: Est savings of 1,349 KiB
- Reduce JavaScript execution time: 4.8 s
- Speed Index: 33.4 s / TBT: 810 ms / TTI: 27.0 s

### 未使用 JS 上位（拡張機能を除外）
- https://d1jf9jg4xqwtsf.cloudfront.net/330-60558ce8c4bc47315cea.js (wasted 172.8KB / total 217.0KB)
- https://cdn.shopify.com/extensions/7bc9bb47-adfa-4267-963e-cadee5096caf/inbox-1252/assets/shopifyChatV1Widget.js (wasted 135.7KB / total 256.3KB)
- https://www.googletagmanager.com/gtag/js?id=AW-779519439&cx=c&gtm=4e61d1 (wasted 105.3KB / total 164.4KB)
- https://d1jf9jg4xqwtsf.cloudfront.net/865-ced6e649e797dc825654.js (wasted 63.2KB / total 97.7KB)
- https://online.sukiya.biz/cdn/shop/t/10/assets/algolia_externals.js?v=29519840178773972841698826413 (wasted 62.4KB / total 84.5KB)
- https://www.googletagmanager.com/gtag/js?id=GT-5N5FZZM (wasted 52.8KB / total 123.5KB)
- https://d1jf9jg4xqwtsf.cloudfront.net/506-cc80c201bbd30831b020.js (wasted 52.1KB / total 91.0KB)
- https://modules.promolayer.io/index.js (wasted 48.9KB / total 100.9KB)

## リポジトリ静的調査（TOPページ寄りの所見）
- assets/algolia_externals.js: 501.9KB
- assets/main.js: 390.0KB
- assets/global.js: 46.9KB
- assets/materialdesignicons.min.css: 218.2KB
- assets/materialdesignicons-webfont.woff2: 276.4KB
- Algolia 関連の JS/CSS が全ページで読み込まれており、初期表示の JS 負荷に寄与している
- Swiper を含む main.js が全ページ読み込みになっている
- Material Design Icons のフォントがヘッダー用途で読み込まれている（サイズ大）

## 改善方針（TOPページ優先）
1. Algolia を条件読み込み化（search ページまたは検索 UI オープン時のみ読み込み）
2. 重いアイコンフォントを SVG 化 or 必要分のみ読み込み
3. Swiper を実体があるページのみ遅延ロード

## まず着手すること
- Algolia の条件読み込み化（TOPページでは読み込まない）

## 進捗

### 2026-01-16 ローカル計測 (http://127.0.0.1:9292/)
- Performance: 0.41
- First Contentful Paint: 8.7 s
- Largest Contentful Paint: 10.4 s
- Speed Index: 10.3 s
- Total Blocking Time: 580 ms
- Cumulative Layout Shift: 0
- Time to Interactive: 44.5 s

### 実施済み対応
- [x] Algolia を search ページのみ読み込み
- [x] Material Design Icons を SVG 化（ヘッダー/ナビ/アコーディオン/DECORTE一覧）
- [x] Swiper を必要ページのみ遅延ロード

### 2026-01-16 ローカル計測 (http://127.0.0.1:9292/) 2回目
- Performance: 0.43
- First Contentful Paint: 9.0 s
- Largest Contentful Paint: 10.1 s
- Speed Index: 10.2 s
- Total Blocking Time: 510 ms
- Cumulative Layout Shift: 0
- Time to Interactive: 42.1 s

## 改善アドバイス（網羅版）
### 画像・メディア
- LCP 対象のヒーロー/メイン画像は**サイズ縮小**と**圧縮率調整**を最優先（WebP/AVIF、適切な幅・高さ）
- TOPのスライダー画像は `srcset/sizes` でデバイス別に最適化（PC: 1200~1600px, SP: 720~900px 程度まで）
- `loading=lazy` はファーストビューのLCP画像には付けず、2枚目以降へ適用
- 画像の `width/height` を常に指定してレイアウト確定（CLS回避）
- GIF/動画は可能なら静止画+再生トリガーに置き換え

### フロントエンド（コード対応）
- TOPページで不要な JS/CSS を**条件読み込み**（今回のAlgolia/Swiperと同様に分割）
- スライダーは必要なページのみロード・自動再生やフェード効果を減らす
- 使っていないアプリJSを遅延 or ページ限定で読み込み
- `main.js` / `global.js` の見直し：必要な機能だけを分割し、TOPは軽量化
- クリティカルCSSのみ先読みし、残りは `media=print` + `onload` で遅延

### フォント
- Webフォントは必要最小限のウェイトに限定し、`font-display: swap` を徹底
- 可能ならシステムフォントに寄せる（特にファーストビュー）

### 3rdパーティ / アプリ
- GTM/広告/チャット/Promo系は**遅延ロード**（ユーザー操作後 or idle）
- TOPで必須でないスクリプトは、別ページでのみロード

### コンテンツ・構成
- TOPページの**セクション数を削減**（ファーストビュー優先で下は遅延）
- 商品一覧/ブランド一覧の一括表示は**一部のみ表示**+「もっと見る」へ
- 画像枚数が多いブロックは初期表示から外し、スクロール時に読み込み

### Shopify/配信設定
- Shopify テーマ設定の画像最適化オプション（有無）を再確認
- CDNキャッシュの活用：外部ホスト画像は Shopify CDN に寄せる
- アプリ埋め込みタグは必要ページだけ有効化

### 計測面
- ローカル計測は実環境とズレるため、本番URLでも定期計測
- LCP要素の特定 → 画像やDOMを重点改善

## 具体的な次の手順（TOP向け）
1. LCP 画像の**圧縮・サイズ調整**
2. TOPのスライダーを**静的画像1枚**に置き換える案の検証
3. 3rdパーティJSを**遅延ロード**へ移行
4. 重要セクション以外を**遅延レンダリング**
