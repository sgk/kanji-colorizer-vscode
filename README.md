# Kanji Grade Colorizer

> 日本語の README は `README.ja.md` にあります。

Kanji Grade Colorizer is a VS Code extension that highlights Japanese kanji with background colors based on the grade level at which they are taught in elementary and junior high school. It improves readability and supports study sessions by letting you review texts while switching colors per grade.

## Key Features
- **Grade-based highlighting**: Characters are classified using the grade keys defined in `data/kanji.json` (default set: g1–g7 and `other`) and rendered with distinct background colors.
- **Per-file toggle**: Click the “Kan” icon in the top-right corner of the editor to enable or disable highlighting for the current file only.
- **Grade selection controls**: When highlighting is active, a “Settings” icon appears in the same toolbar so you can toggle each grade on the fly.
- **Cursor feedback**: When the cursor is on a kanji, the status bar shows the corresponding grade or whether it is outside the Joyo kanji list.

## Covered Characters
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

## Installation
1. Open the Extensions view in VS Code.
2. Search for “Kanji Grade Colorizer” and click `Install`.
3. Reload VS Code after the installation completes.

## Usage
1. Open a text file that you want to inspect.
2. Click the “Kan” icon that appears in the top-right corner of the editor.
3. While highlighting is enabled, the toolbar displays a grade icon that reflects the kanji under the cursor. Click the “Kan” icon again to turn highlighting off.
4. With highlighting on, a “Settings” icon appears in the editor toolbar. Click it to open a quick pick where you can toggle the grades (including the `other` bucket) that should stay highlighted. Use the checkboxes for fine-grained control.

## Settings
Navigate to `Settings` → `Extensions` → `Kanji Grade Colorizer` to customize the following options.

| Setting key | Description | Default |
| --- | --- | --- |
| `kanjiColorize.textColor` | Text color applied on top of the highlighted background (leave empty to use the theme text color). | `#000000` |
| `kanjiColorize.opacity` | Opacity of the background color (0–1). | `0.6` |

Grade colors, labels, and the list of characters are centralized in `data/kanji.json`. Edit this file to adjust colors, icon glyphs, or the membership of each category. Supported keys are `g0`–`g9` and `other`. Keys that are not defined are automatically disabled and hidden from buttons and quick picks.

## Support
If you encounter issues or have feature requests, please open an issue on the [GitHub repository](https://github.com/sgk/kanji-colorizer-vscode/issues).

---
This extension follows the Ministry of Education, Culture, Sports, Science and Technology (MEXT) “List of Kanji by Grade”. The junior high school set (`g7`) is based on KANJIDIC2 Grade 8 characters.
- MEXT list: https://www.mext.go.jp/content/1413522_001.pdf
- KANJIDIC2: https://www.edrdg.org/wiki/index.php/KANJIDIC_Project
