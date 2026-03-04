---
name: shopify-files-upload
description: Upload images to Shopify Files with predictable filenames. Use when uploading files to Shopify Content > Files, preparing config for shopify-upload-files.mjs, or when the user mentions Shopify file upload, Files アップロード, or image mapping.
---

# Shopify Files アップロード

Shopify Files への画像アップロード時は、**事前に Shopify の命名規則に合うファイル名を設定**し、アップロード後のリネームを避ける。

## 原則: 事前リネームで一貫性を保つ

Shopify はアップロード時にファイル名をサニタイズする。`4月` → `_` のように予測しづらい変換が入るため、**設定の `shopifyFilename` を最初からサニタイズ済みの名前にしておく**。

## Shopify の命名規則（サニタイズ基準）

`scripts/shopify-upload-files.mjs` の `toShopifyFilename` に準拠:

| 入力 | 出力 |
|------|------|
| スペース | `-` |
| ①②③...（丸数字） | `1`, `2`, `3`... |
| `×` | `x` |
| 英数字・`.`・`_`・`-` 以外 | `_` |

**許可文字**: `a-zA-Z0-9._-`

**例**:
- `albion_4月_AL_PC_1.jpg` → Shopify 側で `albion_4__AL_PC_1.jpg` に変換される
- 設定では最初から `albion_4__AL_PC_1.jpg` を指定する

## ワークフロー

1. 設定を用意 → 2. アップロード実行 → 3. マッピング反映

### 1. 設定ファイルを用意

`scripts/*-upload-config.json` 形式。`shopifyFilename` は**サニタイズ済み・ユニーク**にする。

```json
{
  "basePath": "docs/albion",
  "prefix": "albion_",
  "files": [
    {
      "localPath": "ブランドTOP_ビジュアル/4月/PC/AL/①AL26B前_PC_FLB_1280×640.jpg",
      "shopifyFilename": "albion_4__AL_PC_1.jpg",
      "usage": "TOPバナー PC 1枚目"
    }
  ]
}
```

- `shopifyFilename` 未指定時は `prefix` + サニタイズした `localPath` の basename が使われる
- 日本語・丸数字を含むローカル名は、必ず `shopifyFilename` を明示する
- ローカルファイルのリネームは不要。スクリプトは `localPath` を読み、`shopifyFilename` で Shopify に送る

### 2. アップロード実行

**アップロード実行**:

```bash
# 事前確認（ドライラン）
npm run albion:upload:dry

# 実行
npm run albion:upload
```

別の設定ファイルを使う場合:

```bash
npm run upload:files -- --config=scripts/別名-upload-config.json
npm run upload:files:dry -- --config=scripts/別名-upload-config.json
```

### 3. マッピングをテンプレートに反映

出力される `*-mapping.json` の内容を `templates/*.json` の該当ブロック（`image`, `image_sp`, `image_file`, `image_sp_file` 等）に反映する。

## 命名のベストプラクティス

1. **プレフィックスでブランドを区別**: `albion_`, `elegance_`, `ignis_`
2. **連番でユニーク化**: `_1`, `_2`, `PC`, `SP` など
3. **日本語・丸数字を事前に置換**: `4月` → `4__`, `①` → `1`

## 関連ファイル

- `scripts/shopify-upload-files.mjs` - アップロードスクリプト
- `scripts/README.md` - 詳細な使い方・前提条件
- `scripts/albion-upload-config.json` - ALBION 用設定例
- `package.json` - `albion:upload` / `albion:upload:dry` / `upload:files` / `upload:files:dry` スクリプト定義
