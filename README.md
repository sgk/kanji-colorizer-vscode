[# 日本語](#日本語) | [# English](#english)

## 日本語

# 漢字学年色分け

「漢字学年色分け」は、VS Code 上で小中学校の学年別に漢字へ背景色を付けて表示できる拡張機能です。読みやすさの向上や学習支援を目的に、学年ごとに色を切り替えながら文章を確認できます。

### 主な特徴
- 学年ごとの色分け：`data/kanji.json` に定義した学年キー（既定では g1〜g7 と other）に従って漢字を判定し、背景色で区別します。
- ファイル単位でオン/オフ：エディタ右上の「漢」アイコンをクリックすると、そのファイルのみ色付けを有効化・無効化できます。
- 学年ごとの色付け対象を選択：色付けをオンにするとアイコン列に現れる「設」アイコンから、各学年の色付けをその場で切り替えられます。
- カーソル情報表示：カーソルが漢字上にあるとき、学年や常用漢字外であるかをステータスバーに表示します。

### 収録漢字数
| グレード | 学年 | 文字数 |
| --- | --- | --- |
| g1 | 1年生 | 80 |
| g2 | 2年生 | 160 |
| g3 | 3年生 | 200 |
| g4 | 4年生 | 202 |
| g5 | 5年生 | 193 |
| g6 | 6年生 | 191 |
| g7 | 中学生 | 1110 |
| 合計 | 常用漢字 | 2136 |

### インストール方法
1. VS Code の拡張機能ビューを開きます。
2. 「漢字学年色分け」で検索し、`インストール` をクリックします。
3. インストール後、VS Code を再読み込みすると利用できる状態になります。

### 使い方
1. 対象となるテキストファイルを開きます。
2. エディタ右上に表示される「漢」アイコンをクリックします。
3. 色付けが有効な間は、カーソル位置の漢字に応じた学年アイコンが表示されます。再度クリックするとオフに戻ります。
4. 色付けをオンにしたファイルでは、エディタ右上に「設」アイコンが表示されます。これをクリックするとクイックピックが開き、色付けしたい学年（常用漢字外を含む）をオン/オフできます。細かく切り替えたい場合はチェック付きの一覧から選択してください。

### 設定項目
`設定` → `拡張機能` → `漢字学年色分け` で以下をカスタマイズできます。

| 設定キー | 説明 | 既定値 |
| --- | --- | --- |
| `kanjiColorize.textColor` | 背景色を適用した文字の色（空欄にするとテーマ準拠） | `#000000` |
| `kanjiColorize.opacity` | 背景色の不透明度 (0〜1) | `0.6` |

学年ごとの背景色や表示用ラベルは `data/kanji.json` にまとめて定義されています。必要に応じてこのファイルを編集すると、色やアイコン文字、分類に含める漢字を一括で変更できます。利用可能なキーは `g0`〜`g9` と `other` です。ファイル内に定義されなかったキーは自動的に無効化され、ボタンやクイックピックにも表示されません。

### サポート
不具合報告や要望がある場合は、[GitHub リポジトリ](https://github.com/sgk/kanji-colorizer-vscode/issues) で Issue を作成してください。

---
本拡張は文部科学省「学年別漢字配当表」を参考にしており、中学生配当分（g7）は KANJIDIC2 に含まれる Grade 8 の漢字を基に構成しています。
- 文部科学省 学年別漢字配当表: https://www.mext.go.jp/content/1413522_001.pdf
- KANJIDIC2: https://www.edrdg.org/wiki/index.php/KANJIDIC_Project


## English

# Kanji Grade Colorizer

Kanji Grade Colorizer is a VS Code extension that highlights Japanese kanji with background colors based on the grade level at which they are taught in elementary and junior high school. It improves readability and supports study sessions by letting you review texts while switching colors per grade.

### Key Features
- Grade-based highlighting: Characters are classified using the grade keys defined in `data/kanji.json` (default set: g1–g7 and `other`) and rendered with distinct background colors.
- Per-file toggle: Click the “漢” icon in the top-right corner of the editor to enable or disable highlighting for the current file only.
- Grade selection controls: When highlighting is active, a “設” icon appears in the same toolbar so you can toggle each grade on the fly.
- Cursor feedback: When the cursor is on a kanji, the status bar shows the corresponding grade or whether it is outside the Joyo kanji list.

### Covered Characters
| Grade | School year | Characters |
| --- | --- | --- |
| g1 | Grade 1 | 80 |
| g2 | Grade 2 | 160 |
| g3 | Grade 3 | 200 |
| g4 | Grade 4 | 202 |
| g5 | Grade 5 | 193 |
| g6 | Grade 6 | 191 |
| g7 | Junior high school | 1110 |
| Total | Elementary + junior high | 2136 |

### Installation
1. Open the Extensions view in VS Code.
2. Search for “Kanji Grade Colorizer” and click `Install`.
3. Reload VS Code after the installation completes.

### Usage
1. Open a text file that you want to inspect.
2. Click the “Kan” icon that appears in the top-right corner of the editor.
3. While highlighting is enabled, the toolbar displays a grade icon that reflects the kanji under the cursor. Click the “Kan” icon again to turn highlighting off.
4. With highlighting on, a “Settings” icon appears in the editor toolbar. Click it to open a quick pick where you can toggle the grades (including the `other` bucket) that should stay highlighted. Use the checkboxes for fine-grained control.

### Settings
Navigate to `Settings` → `Extensions` → `Kanji Grade Colorizer` to customize the following options.

| Setting key | Description | Default |
| --- | --- | --- |
| `kanjiColorize.textColor` | Text color applied on top of the highlighted background (leave empty to use the theme text color). | `#000000` |
| `kanjiColorize.opacity` | Opacity of the background color (0–1). | `0.6` |

Grade colors, labels, and the list of characters are centralized in `data/kanji.json`. Edit this file to adjust colors, icon glyphs, or the membership of each category. Supported keys are `g0`–`g9` and `other`. Keys that are not defined are automatically disabled and hidden from buttons and quick picks.

### Support
If you encounter issues or have feature requests, please open an issue on the [GitHub repository](https://github.com/sgk/kanji-colorizer-vscode/issues).

---
This extension follows the Ministry of Education, Culture, Sports, Science and Technology (MEXT) “List of Kanji by Grade”. The junior high school set (`g7`) is based on KANJIDIC2 Grade 8 characters.
- MEXT list: https://www.mext.go.jp/content/1413522_001.pdf
- KANJIDIC2: https://www.edrdg.org/wiki/index.php/KANJIDIC_Project
