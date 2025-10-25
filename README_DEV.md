# Kanji Grade Colorizer

小・中学校の学年ごとに漢字を背景色で色分けする VS Code 拡張です。
- **ファイル単位トグル**：エディタ右上の「漢」ボタンでオン/オフ切り替え。オン時はカーソル位置の漢字に応じて学年アイコン（0～中、外）が表示されます。
- **既定 OFF**：オンにしたファイルのみ着色。
- **学年ごとの表示切り替え**：色付けをオンにすると「設」アイコンが表示され、クイックピックで色付けする学年を選択できます。
- **カーソル情報**：カーソル位置が漢字の場合、その学年/常用漢字外をステータスバーに表示。

## 動かし方
1. このフォルダを VS Code で開く
2. `npm install` → `npm run build`
3. `F5` で拡張開発ホスト起動
4. テキストを開き、右上の **「漢」アイコン** をクリックしてオン

## ビルド
- 依存関係を導入：`npm install`
- TypeScript をコンパイル：`npm run build`（成果物は `out/` 以下）
- 開発中に自動再ビルドしたい場合は `npm run compile`（ウォッチモード）を使用

## アイコン生成の仕組み

学年ボタン（g0～g9、other）のアイコンは**動的に生成**され、`media/generated/` に出力されます。

### 生成の流れ
1. **開発時（F5デバッグ起動）**: 拡張の `activate()` 関数内で `generateGradeIcons()` が呼ばれ、`media/generated/button_g0.svg` ～ `button_other.svg` が自動生成されます。
2. **ビルド時（パッケージング前）**: `npm run vscode:prepublish` → `npm run generate-icons` が実行され、CLI 経由で同様のアイコンが生成されます。

### ファイル配置
- **静的アイコン**: `media/button_off.svg`, `button_settings.svg`, `button_unknown.svg` は Git で管理
- **動的生成アイコン**: `media/generated/*.svg` は `.gitignore` で無視（ビルド時に自動生成）

### 技術的な背景
- `src/iconGenerator.ts` は `vscode` モジュールに依存しているため、Node.js から直接実行するとエラーになります。
- これを回避するため、`generateGradeIcons()` 内で `await import('vscode')` による動的インポートを行い、CLI 用の `generateGradeIconsCLI()` では型のみを使用するように分離しています。
- `package.json` の `vscode:prepublish` フックでアイコン生成を実行することで、パッケージング時に必ず最新のアイコンが含まれるようにしています。

### 手動生成
アイコンを手動で再生成したい場合：
```bash
npm run build
npm run generate-icons
```

## パッケージング
1. （未インストールの場合）`npx vsce package` を実行すると `vsce` が一時的に導入されます。常用する場合は `npm install --save-dev @vscode/vsce` を推奨。
2. コマンドが完了すると、拡張パッケージ `kanji-grade-colorizer-<version>.vsix` がプロジェクト直下に生成されます。
   - パッケージング前に `vscode:prepublish` フックが自動実行され、アイコンが生成されます。
3. VS Code で `code --install-extension ./kanji-grade-colorizer-<version>.vsix`、または拡張機能ビューの「Install from VSIX…」から取り込めます。

※ `vsce` 実行時に `repository` や `LICENSE` の有無について警告が表示されるので、公開予定がある場合は `package.json` へリポジトリ情報を追加し、ライセンスファイルを用意してください。

## 設定

### VS Code設定項目
- `kanjiColorize.textColor`：背景色適用時の文字色（空欄でテーマどおり）、既定：`#000000`
- `kanjiColorize.opacity`：背景色の不透明度（0～1）、既定：`0.6`

### 学年定義（data/kanji.json）
各学年の色や表示ラベル、収録漢字は `data/kanji.json` で定義されています。
- 利用可能なキー：`g0`～`g9` と `other`
- 各エントリの構成：
  - `key`: 学年キー（g0～g9, other）
  - `label`: 表示用ラベル（例：「1年生の漢字」）
  - `iconText`: アイコン内の文字（例：「1」「中」「外」）
  - `color`: 背景色（16進数カラーコード）
  - `characters`: その学年に含まれる漢字（文字列）

拡張機能は `data/kanji.json` を読み込み、設定ファイルで `kanjiColorize.colors.g1` のように個別の色を上書きできます（現在は VS Code の設定 UI には未公開）。

現在の収録学年：g1～g7（小学1年～中学生）、other（常用漢字外）

## データ出典
文部科学省「別表 学年別漢字配当表」をもとに g1～g6 を収録し、常用漢字表のうち中学校配当分（g7）は KANJIDIC2 に含まれる Grade 8 の漢字を採用しています。
