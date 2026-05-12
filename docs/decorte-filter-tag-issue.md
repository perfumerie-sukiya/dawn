# Decorte コレクション `filter.p.tag` パラメータ問題

## 概要

Decorte コレクションページで `filter.p.tag` URLパラメータを使用した場合、一部のタグ（例：`パウダーファンデーション`）で商品一覧が表示されない問題が発生していた。

## 問題の詳細

### 症状

| URL形式 | 動作 |
|---------|------|
| `/collections/decorte?filter.p.tag=パウダーファンデーション` | 商品一覧が表示されない（トップページが表示される） |
| `/collections/decorte/パウダーファンデーション` | 正常に商品一覧が表示される |
| `/collections/all?filter.p.tag=%E3%83%91%E3%82%A6%E3%83%80%E3%83%BC...` | 正常に商品一覧が表示される |

### 影響範囲

- **ファイル**: `sections/main-collection-product-grid-decorte.liquid`
- **テンプレート**: `templates/collection.decorte.json`

## 調査過程

### 1. 初期仮説

`collection.filters` APIからタグを取得するロジックに問題があると考え、`canonical_url`からURLパラメータを直接パースするフォールバックを実装した。

### 2. デバッグ結果

デバッグ出力を追加して確認した結果：

```html
<!-- Debug: filter_tag=, canonical_url=https://online.sukiya.biz/collections/decorte, current_tags= -->
```

**発見事項**:
- `filter_tag`: 空（Storefront Filter APIで検出できず）
- `canonical_url`: クエリパラメータを含まない
- `current_tags`: 空（旧形式URLでないため）

### 3. 根本原因

Shopify Liquidの `canonical_url` 変数にはクエリパラメータが含まれない。そのため、Liquid側でURLパラメータを直接パースすることは不可能。

また、Shopifyの Storefront Filter API (`collection.filters`) が特定のタグを認識しない場合がある。これはURLエンコーディングの問題や、コレクション固有のフィルター設定に起因する可能性がある。

## 解決策

### 採用したアプローチ: JavaScriptによるリダイレクト

`filter.p.tag` パラメータがLiquidで検出できない場合、JavaScriptで旧形式のURL（`/collections/decorte/tag-name`）にリダイレクトする。

### 実装コード

```liquid
{% comment %}
  filter.p.tag パラメータが Shopify の Storefront Filter API で認識されない場合、
  旧形式の URL (/collections/decorte/tag-name) にリダイレクトする
{% endcomment %}
{% unless filter_tag %}
<script>
  (function() {
    var params = new URLSearchParams(window.location.search);
    var tagParam = params.get('filter.p.tag');
    if (tagParam) {
      // filter.p.tag が URL にあるが Liquid で検出できなかった場合、旧形式にリダイレクト
      var newUrl = window.location.pathname + '/' + encodeURIComponent(tagParam);
      window.location.replace(newUrl);
    }
  })();
</script>
{% endunless %}
```

### 動作フロー

```
1. ユーザーが /collections/decorte?filter.p.tag=パウダーファンデーション にアクセス
2. Liquid で filter_tag を検出しようとする
   - collection.filters から取得を試みる → 失敗
   - current_tags から取得を試みる → 空（旧形式URLでないため）
3. filter_tag が空のため、JavaScript リダイレクトスクリプトが出力される
4. JavaScript が filter.p.tag パラメータを検出
5. /collections/decorte/パウダーファンデーション にリダイレクト
6. 旧形式URLでは current_tags が正常に設定され、商品一覧が表示される
```

## 検討した代替案

### 1. canonical_url からのパース（不採用）

```liquid
assign current_url = canonical_url
if current_url contains 'filter.p.tag='
  assign url_parts = current_url | split: 'filter.p.tag='
  ...
endif
```

**不採用理由**: `canonical_url` にクエリパラメータが含まれないため機能しない。

### 2. ナビゲーションリンクの変更（部分的に有効）

Shopify管理画面の `decorte-category-menu` リンクリストのURLを旧形式に変更する。

**課題**: 外部からのリンクや検索エンジンからのアクセスには対応できない。

## 技術的な学び

1. **Shopify Liquid の制限**: `canonical_url` はクエリパラメータを含まない
2. **Storefront Filter API の挙動**: 特定のタグや特定のコレクションでフィルターが認識されない場合がある
3. **URL形式の違い**:
   - 旧形式: `/collections/handle/tag-name` → `current_tags` が設定される
   - 新形式: `?filter.p.tag=value` → `collection.filters` から取得する必要がある

## 関連ファイル

- `sections/main-collection-product-grid-decorte.liquid` - 修正対象
- `sections/main-collection-product-grid-cpb.liquid` - 参考（CPB実装）
- `templates/collection.decorte.json` - テンプレート設定
- `snippets/sp-navigation-decorte.liquid` - SPナビゲーション

## 日付

- 調査・修正日: 2026年1月15日
