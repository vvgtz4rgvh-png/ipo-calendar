# IPO Manager (v2.0.0 Phase1)

個人用のIPO管理PWA。GitHub Pagesでの公開を前提に作成しています。

## ファイル構成

```
ipo-calendar/
├── index.html          画面本体（基本的に触らない）
├── style.css            デザイン（基本的に触らない）
├── script.js             データ読込・表示ロジック（基本的に触らない）
├── manifest.json         PWA設定
├── service-worker.js     オフライン対応
├── assets/icons/         アプリアイコン
├── data/
│   └── ipos.json         ★毎回更新するのはここだけ★
└── ics/
    └── 593A.ics          カレンダー用ファイル（銘柄ごとに追加）
```

## 日常の更新方法

新しいIPOに申し込んだとき／状況が変わったときは、`data/ipos.json` だけを編集します。

1. `data/ipos.json` を開く
2. `ipos` 配列に銘柄を追加、または既存の銘柄の `brokers` の `status` を更新
   （例: `"抽選待ち"` → `"当選"` / `"落選"`）
3. 上場が確定したら `listed` を `true` にし、`listingDate` / `firstDayChangePct` / `profit` を入力
4. 必要であれば `ics/銘柄コード.ics` を追加（テンプレートは `ics/593A.ics` を参照）
5. GitHub Desktopで **Commit → Push**

`index.html` / `style.css` / `script.js` は一度公開したら基本的に変更不要です。

## データ項目

| フィールド | 内容 |
|---|---|
| `code` | 証券コード（例: "593A"） |
| `name` | 銘柄名 |
| `market` | 市場（例: "東証グロース"） |
| `bbStart` / `bbEnd` | ブックビルディング期間 |
| `lotteryDate` | 抽選日 |
| `purchaseStart` / `purchaseEnd` | 購入申込期間 |
| `listed` | 上場済みなら `true` |
| `listingDate` | 上場日（上場済みのみ） |
| `firstDayChangePct` | 初値騰落率（%） |
| `profit` | 損益（円） |
| `brokers` | 申込先の配列（`name`, `account`, `shares`, `status`） |

`annualSummary` で年間の申込件数・当選件数・利益を管理します。

## 今後の拡張（Phase2以降の候補）

- 当選／落選をタップで記録するUI
- 証券会社サイトへのショートカットリンク
- 銘柄アーカイブ（`archive/`）への自動移動
