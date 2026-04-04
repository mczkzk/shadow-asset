<p align="center">
  <img src="src-tauri/icons/icon.png" width="128" alt="Shadow Asset">
</p>

# Shadow Asset

プライバシーファーストの資産シミュレーター。外部金融サービスに接続せず、「公開市場価格 x 自分で入力した数量」だけで資産総額をリアルタイム計算するデスクトップアプリ。

## 特徴

- **数量のみ保存、金額はリアルタイム計算** (Yahoo Finance, CoinGecko, 田中貴金属等から取得)
- **完全ローカル** (クラウド不要、アカウント不要)
- **口座 + 銘柄の2層構造** (NISA, iDeCo, 特定口座, 仮想通貨, ゴールド, DC)
- **積立シミュレーション** (確認日 + 月額から現在の口数を推定)
- **リポジトリはpublic化可能** (個人データはローカルSQLiteのみ)

## 技術スタック

- **アプリ**: [Tauri v2](https://tauri.app/) (Rust + WebView)
- **フロント**: React + TypeScript + Tailwind CSS v4 + Recharts
- **DB**: SQLite via rusqlite (Rust側で管理)
- **価格取得**: reqwest (Rust HTTP client)

## 前提条件

- [Rust](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) v20+
- macOS (現在の対象プラットフォーム)

## 開発

```bash
# 依存関係のインストール
npm install

# 開発モードで起動 (ホットリロード対応)
npm run tauri dev
```

初回はRustのコンパイルに数分かかります。2回目以降は差分ビルドで高速です。

フロントエンドのコード変更は即座にTauriウィンドウに反映されます。
Rust側のコード変更は自動リコンパイル後に反映されます。

## 本番ビルド

```bash
npm run tauri build
```

成果物:
- `src-tauri/target/release/bundle/macos/Shadow Asset.app`
- `src-tauri/target/release/bundle/dmg/Shadow Asset_0.1.0_aarch64.dmg`

## プロジェクト構造

```
src/                        # React フロントエンド
├── components/dashboard/   # ダッシュボードUI
├── hooks/                  # Tauri invoke ラッパー
├── lib/                    # 型定義, フォーマッタ, プリセット
└── pages/                  # ダッシュボード, 保有管理

src-tauri/src/              # Rust バックエンド
├── commands/               # Tauri コマンド (CRUD, 価格取得)
├── pricing/                # 外部API (Yahoo Finance, CoinGecko等)
├── db.rs                   # SQLite初期化
└── lib.rs                  # エントリポイント
```

## データ保存先

```
~/Library/Application Support/com.mczkzk.shadow-asset/shadow-asset.db
```

SQLiteファイルに口座名・ティッカー・数量のみ保存。gitには含まれません。
