# Scripts

このディレクトリにはテーマ開発用のユーティリティスクリプトが含まれます。

## Shopify Files アップロード

`shopify-upload-files.mjs` は、ローカルの画像ファイルを Shopify Files（Content > Files）へアップロードする汎用スクリプトです。ALBION、Elegance、IGNIS など複数ブランドや、任意の用途で利用できます。

### 前提条件

1. **Dev Dashboard アプリ**: Shopify Dev Dashboard でアプリを作成し、`write_files` スコープを付与
2. **アプリのインストール**: 対象ストアにアプリをインストール
3. **環境変数**: `.env` に以下を設定

```env
SHOPIFY_SHOP=your-store.myshopify.com
SHOPIFY_CLIENT_ID=your_client_id
SHOPIFY_CLIENT_SECRET=your_client_secret
```

### 使い方

```bash
# 設定ファイルを指定してアップロード
node scripts/shopify-upload-files.mjs --config=scripts/albion-upload-config.json

# 事前確認（アップロードせず対象を表示）
node scripts/shopify-upload-files.mjs --config=scripts/albion-upload-config.json --dry-run

# デフォルト設定（scripts/upload-config.json）を使用する場合
node scripts/shopify-upload-files.mjs
```

### npm スクリプト

| コマンド | 説明 |
|----------|------|
| `npm run upload:files` | デフォルト設定でアップロード |
| `npm run upload:files:dry` | デフォルト設定で dry-run |
| `npm run albion:upload` | ALBION 用設定でアップロード |
| `npm run albion:upload:dry` | ALBION 用設定で dry-run |

### 設定ファイル

設定は JSON 形式で、以下のプロパティを指定します。

| プロパティ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `basePath` | string | いいえ | ファイルのベースパス（プロジェクトルートからの相対）。デフォルト: `docs/albion` |
| `prefix` | string | いいえ | `shopifyFilename` 未指定時のファイル名プレフィックス。デフォルト: `''` |
| `mappingOutput` | string | いいえ | マッピング JSON の出力パス。未指定時は設定ファイルと同じディレクトリに `*-mapping.json` として出力 |
| `files` | array | はい | アップロード対象ファイルの配列 |

#### files 配列の各要素

| プロパティ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `localPath` | string | はい | `basePath` からの相対パス |
| `shopifyFilename` | string | いいえ | Shopify 上のファイル名。未指定時は `prefix` + サニタイズしたファイル名 |
| `usage` | string | いいえ | 用途メモ（任意） |

### 設定例

**ALBION 用（docs/albion 配下）:**

```json
{
  "basePath": "docs/albion",
  "prefix": "albion_",
  "files": [
    {
      "localPath": "ブランドTOP_ビジュアル/4月/PC/AL/①AL26B前_PC_FLB_1280×640.jpg",
      "shopifyFilename": "albion_4月_AL_PC_1.jpg",
      "usage": "TOPバナー PC 1枚目"
    }
  ]
}
```

**Elegance 用（docs/albion 配下、別プレフィックス）:**

```json
{
  "basePath": "docs/albion",
  "prefix": "elegance_",
  "mappingOutput": "scripts/elegance-upload-mapping.json",
  "files": [
    {
      "localPath": "ブランドTOP_ビジュアル/4月/PC/EL/①EL26SS_FD_A：1280px × 640px.jpg",
      "shopifyFilename": "elegance_4月_EL_PC_1.jpg",
      "usage": "TOPバナー PC 1枚目"
    }
  ]
}
```

**任意のフォルダ（例: assets 用）:**

```json
{
  "basePath": "assets/source-images",
  "prefix": "custom_",
  "mappingOutput": "scripts/custom-upload-mapping.json",
  "files": [
    {
      "localPath": "banner.jpg",
      "shopifyFilename": "custom_banner.jpg"
    }
  ]
}
```

### 出力

- **マッピング JSON**: `shopifyFilename` → `shopify://shop_images/...` の対応が保存されます
- このマッピングをテンプレート JSON（`templates/*.json`）の該当ブロック（`image`、`image_sp` 等）に反映してください
- 反映は手動または AI エージェントで行います

### 注意事項

- 同一 `shopifyFilename` でアップロードすると `duplicateResolutionMode: 'REPLACE'` により上書きされます
- マッピング JSON は実行結果として生成されるため、`.gitignore` への追加を推奨します
- Client credentials は自社開発・自社ストア向けです
