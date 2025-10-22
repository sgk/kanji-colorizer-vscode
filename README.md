# Kanji Grade Colorizer

小学校の学年ごとに漢字を背景色で色分けする VS Code 拡張です。
- **ファイル単位トグル**：エディタ右上（タイトルバー）にボタン。クリックでオン/オフ。
- **既定 OFF**：オンにしたファイルのみ着色。
- **範囲外（教育漢字以外）は赤**。色は設定で変更可。

## 動かし方
1. このフォルダを VS Code で開く
2. `npm install` → `npm run build`
3. `F5` で拡張開発ホスト起動
4. テキストを開き、右上の **「Kanji Colorize: このファイルでオン/オフ」** を押してオン

## ビルド
- 依存関係を導入：`npm install`
- TypeScript をコンパイル：`npm run build`（成果物は `out/` 以下）
- 開発中に自動再ビルドしたい場合は `npm run compile`（ウォッチモード）を使用

## パッケージング
1. （未インストールの場合）`npx vsce package` を実行すると `vsce` が一時的に導入されます。常用する場合は `npm install --save-dev @vscode/vsce` を推奨。
2. コマンドが完了すると、拡張パッケージ `kanji-grade-colorizer-<version>.vsix` がプロジェクト直下に生成されます。
3. VS Code で `code --install-extension ./kanji-grade-colorizer-<version>.vsix`、または拡張機能ビューの「Install from VSIX…」から取り込めます。

※ `vsce` 実行時に `repository` や `LICENSE` の有無について警告が表示されるので、公開予定がある場合は `package.json` へリポジトリ情報を追加し、ライセンスファイルを用意してください。

## 設定
- `kanjiColorize.colors.g1` ～ `g6`：学年ごとの色
- `kanjiColorize.colors.other`：教育漢字外の色（既定：赤）
- `kanjiColorize.opacity`：不透明度（0～1）

## データ出典
文部科学省「別表 学年別漢字配当表」をもとに g1～g6 を収録しています。
