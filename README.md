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
| `issuePrice` | 公開価格（円）。上場済みで入力すると初値騰落率・損益を自動計算 |
| `firstDayPrice` | 初値（円） |
| `firstDayChangePct` / `profit` | `issuePrice`/`firstDayPrice`が無い場合の手入力用（後方互換） |
| `brokers` | 申込先の配列（`name`, `account`, `shares`, `status`） |

`annualSummary` で年間の申込件数・当選件数・利益を管理します（現状は手動更新）。

`issuePrice` と `firstDayPrice` を入力すると、初値騰落率・損益（当選した証券会社の株数分）・月別損益グラフが自動計算されます。手動で`firstDayChangePct`/`profit`を入れることもできますが、基本的には公開価格と初値を入力するだけで済むようにしています。

### 証券会社リンク

`brokers`の`name`が下記のいずれかに一致すると、カード内の証券会社名がリンクになります（各社トップページへ）。
SBI証券／楽天証券／マネックス証券／松井証券／SMBC日興証券／auカブコム証券／三菱UFJ eスマート証券／みずほ証券／野村證券／DMM株／SBIネオトレード証券

### 合言葉の変更方法

ブラウザのコンソール（開発者ツール）で以下を実行し、表示されたハッシュ値を `data/auth.json` の `passcodeHash` に設定してください。

```js
crypto.subtle.digest("SHA-256", new TextEncoder().encode("新しい合言葉"))
  .then(buf => console.log(Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("")))
```

## キャッシュ対策（バージョニング）

`index.html`の`style.css` / `script.js` / `auth.js`の読み込みには `?v=2.2.0` のようなバージョン番号を付けています。今後CSSやJSを更新するときは、この番号を更新するとブラウザが確実に新しいファイルを読み込み直します（PCでのハード再読み込みが基本的に不要になります）。`service-worker.js`の`CORE_ASSETS`と`CACHE_NAME`も同じ番号に揃えてください。

この番号の更新は、今後Claudeが更新ファイルを作成する際に合わせて行います。

## 今後の拡張候補

- 銘柄アーカイブ（`archive/`）への自動移動
- 抽選資金の合計表示
- 上場済IPOの年別グループ化
