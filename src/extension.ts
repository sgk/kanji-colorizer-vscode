import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const baseGradeKeys = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7'] as const;
type BaseGradeKey = typeof baseGradeKeys[number];
type GradeKey = BaseGradeKey | 'other';
const allGradeKeys = [...baseGradeKeys, 'other'] as const;

let decorations: Record<GradeKey, vscode.TextEditorDecorationType> | null = null;
let gradeRegex: Partial<Record<GradeKey, RegExp>> = {};
let knownKanjiSet: Set<string> = new Set();
let debounceTimer: NodeJS.Timeout | null = null;
let gradeByKanji: Map<string, GradeKey> = new Map();
let statusItem: vscode.StatusBarItem | null = null;

const buttonCommandIds = {
  off: 'kanjiColorize.button.off',
  unknown: 'kanjiColorize.button.unknown',
  g1: 'kanjiColorize.button.g1',
  g2: 'kanjiColorize.button.g2',
  g3: 'kanjiColorize.button.g3',
  g4: 'kanjiColorize.button.g4',
  g5: 'kanjiColorize.button.g5',
  g6: 'kanjiColorize.button.g6',
  g7: 'kanjiColorize.button.g7',
  other: 'kanjiColorize.button.other'
} as const;

type ButtonLabel = keyof typeof buttonCommandIds;

const gradeLabel: Record<GradeKey, string> = {
  g1: '1年生の漢字',
  g2: '2年生の漢字',
  g3: '3年生の漢字',
  g4: '4年生の漢字',
  g5: '5年生の漢字',
  g6: '6年生の漢字',
  g7: '中学生の漢字',
  other: '常用漢字外の漢字'
};

const buttonLabelContextKey = 'kanjiColorize.buttonLabel';
const extensionActiveContextKey = 'kanjiColorize.isActive';
let currentButtonLabel: ButtonLabel | null = null;
const gradeVisibilityStateKey = 'kanjiColorize.enabledGrades';
let gradeVisibility: Record<GradeKey, boolean> = {
  g1: true,
  g2: true,
  g3: true,
  g4: true,
  g5: true,
  g6: true,
  g7: true,
  other: true
};

// デフォルト OFF。オンにしたファイル URI を保持。
const enabledFiles = new Set<string>();

function loadKanjiSets(context: vscode.ExtensionContext): Record<BaseGradeKey, string> {
  const p = path.join(context.extensionPath, 'data', 'kyouiku_kanji.json');
  const raw = fs.readFileSync(p, 'utf8');
  return JSON.parse(raw);
}

function makeDecorations() {
  const cfg = vscode.workspace.getConfiguration('kanjiColorize');
  const opacity = Math.min(Math.max(Number(cfg.get('opacity', 0.6)), 0), 1);
  const textColorSetting = cfg.get<string>('textColor', '#000000');
  const textColor = typeof textColorSetting === 'string' && textColorSetting.trim().length > 0
    ? textColorSetting.trim()
    : null;
  const make = (colorSettingKey: string, fallback: string) => {
    const color = String(cfg.get(colorSettingKey) ?? fallback);
    const options: vscode.DecorationRenderOptions = {
      backgroundColor: hexToRgba(color, opacity),
      borderRadius: '3px'
    };
    if (textColor) {
      options.color = textColor;
    }
    return vscode.window.createTextEditorDecorationType(options);
  };
  decorations = {
    g1: make('colors.g1', '#fffa99'),
    g2: make('colors.g2', '#ffd199'),
    g3: make('colors.g3', '#f99'),
    g4: make('colors.g4', '#99ffce'),
    g5: make('colors.g5', '#a399ff'),
    g6: make('colors.g6', '#d699ff'),
    g7: make('colors.g7', '#ff66ff'),
    other: make('colors.other', '#ef4444') // 範囲外：赤
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) { return hex; }
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildRegexFromSet(chars: string): RegExp {
  const cls = [...new Set([...chars])].join('');
  return new RegExp(`[${cls}]`, 'g');
}

function rebuildRegex(context: vscode.ExtensionContext) {
  const sets = loadKanjiSets(context);
  const rx: Partial<Record<GradeKey, RegExp>> = {};
  knownKanjiSet = new Set<string>();
  gradeByKanji = new Map();
  baseGradeKeys.forEach(k => {
    const s = (sets as any)[k];
    if (typeof s === 'string' && s.length) {
      rx[k] = buildRegexFromSet(s);
      for (const ch of s) {
        knownKanjiSet.add(ch);
        gradeByKanji.set(ch, k);
      }
    }
  });
  gradeRegex = rx;
}

function setButtonLabel(label: ButtonLabel) {
  if (currentButtonLabel === label) return;
  currentButtonLabel = label;
  void vscode.commands.executeCommand('setContext', buttonLabelContextKey, label);
}

function updateActiveFileContext(editor = vscode.window.activeTextEditor) {
  const enabled = editor ? isFileOn(editor) : false;
  void vscode.commands.executeCommand('setContext', extensionActiveContextKey, enabled);
}

function loadGradeVisibility(context: vscode.ExtensionContext) {
  const stored = context.workspaceState.get<Record<GradeKey, boolean>>(gradeVisibilityStateKey);
  if (!stored) {
    return;
  }
  gradeVisibility = { ...gradeVisibility, ...stored };
}

function saveGradeVisibility(context: vscode.ExtensionContext) {
  return context.workspaceState.update(gradeVisibilityStateKey, gradeVisibility);
}

function isGradeEnabled(key: GradeKey): boolean {
  return gradeVisibility[key] !== false;
}

function isFileOn(editor = vscode.window.activeTextEditor): boolean {
  if (!editor) return false;
  const key = editor.document.uri.toString();
  return enabledFiles.has(key);
}

function clearAllDecorations(editor?: vscode.TextEditor) {
  if (!decorations || !editor) return;
  Object.values(decorations).forEach(d => editor.setDecorations(d, []));
}

function isHan(ch: string): boolean {
  // CJK統合漢字
  return /\p{Script=Han}/u.test(ch);
}

function updateActiveEditor(editor: vscode.TextEditor | undefined) {
  if (!editor || !decorations) return;
  if (!isFileOn(editor)) {
    clearAllDecorations(editor);
    statusItem?.hide();
    setButtonLabel('off');
    return;
  }

  const perGradeRanges = {} as Record<GradeKey, vscode.Range[]>;
  allGradeKeys.forEach(k => { perGradeRanges[k] = []; });

  for (let i = 0; i < editor.document.lineCount; i++) {
    const line = editor.document.lineAt(i).text;

    // まず各学年を正規表現で拾う
    baseGradeKeys.forEach((k) => {
      const rx = gradeRegex[k];
      if (!rx) return;
      rx.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = rx.exec(line))) {
        const col = m.index;
        perGradeRanges[k].push(new vscode.Range(
          new vscode.Position(i, col),
          new vscode.Position(i, col + 1)
        ));
      }
    });

    // 範囲外（常用漢字以外）= CJK漢字で、knownKanjiSet に含まれないもの
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      if (isHan(ch) && !knownKanjiSet.has(ch)) {
        perGradeRanges.other.push(new vscode.Range(
          new vscode.Position(i, col),
          new vscode.Position(i, col + 1)
        ));
      }
    }
  }

  allGradeKeys.forEach((k) => {
    const deco = decorations![k];
    if (deco) {
      editor.setDecorations(deco, isGradeEnabled(k) ? perGradeRanges[k] : []);
    }
  });
  updateCursorStatus(editor);
}

function scheduleUpdate(editor = vscode.window.activeTextEditor) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => updateActiveEditor(editor), 80);
}

function updateCursorStatus(editor = vscode.window.activeTextEditor) {
  if (!statusItem) return;
  if (!editor || !isFileOn(editor)) {
    statusItem.hide();
    setButtonLabel('off');
    return;
  }

  const activePos = editor.selection.active;
  if (activePos.line >= editor.document.lineCount) {
    statusItem.hide();
    setButtonLabel('unknown');
    return;
  }
  const line = editor.document.lineAt(activePos.line).text;
  if (activePos.character >= line.length) {
    statusItem.hide();
    setButtonLabel('unknown');
    return;
  }

  const ch = line[activePos.character];
  let gradeKey: GradeKey | undefined = gradeByKanji.get(ch);
  if (!gradeKey && isHan(ch) && !knownKanjiSet.has(ch)) {
    gradeKey = 'other';
  }

  if (gradeKey) {
    statusItem.text = `$(book) ${gradeLabel[gradeKey]}`;
    statusItem.tooltip = `${ch} は ${gradeLabel[gradeKey]}`;
    statusItem.show();
    setButtonLabel(gradeKey);
  } else {
    statusItem.hide();
    setButtonLabel('unknown');
  }
}

export function activate(context: vscode.ExtensionContext) {
  makeDecorations();
  rebuildRegex(context);
  loadGradeVisibility(context);
  updateActiveFileContext();
  statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusItem.name = 'Kanji Grade';
  context.subscriptions.push(statusItem);
  setButtonLabel('off');

  const toggle = () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    const key = editor.document.uri.toString();
    if (enabledFiles.has(key)) {
      enabledFiles.delete(key);
      clearAllDecorations(editor);
      statusItem?.hide();
      setButtonLabel('off');
      vscode.window.setStatusBarMessage('Kanji Colorize: OFF (this file)', 1200);
    } else {
      enabledFiles.add(key);
      setButtonLabel('unknown');
      scheduleUpdate(editor);
      updateCursorStatus(editor);
      vscode.window.setStatusBarMessage('Kanji Colorize: ON (this file)', 1200);
    }
    updateActiveFileContext(editor);
  };

  const configureGrades = async () => {
    type GradeQuickPickItem = vscode.QuickPickItem & { grade: GradeKey };
    const items: GradeQuickPickItem[] = allGradeKeys.map(
      (grade): GradeQuickPickItem => ({
        label: gradeLabel[grade],
        picked: isGradeEnabled(grade),
        grade
      })
    );
    const picked = await vscode.window.showQuickPick<GradeQuickPickItem>(items, {
      canPickMany: true,
      placeHolder: '色付けを有効にする学年を選択してください'
    });
    if (!picked) {
      return;
    }
    const selected = new Set(picked.map(item => item.grade));
    gradeVisibility = { ...gradeVisibility };
    allGradeKeys.forEach(grade => {
      gradeVisibility[grade] = selected.has(grade);
    });
    await saveGradeVisibility(context);
    scheduleUpdate();
    updateCursorStatus();
    vscode.window.setStatusBarMessage('Kanji Colorize: 色付け対象を更新しました', 1600);
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('kanjiColorize.toggleFile', toggle),
    vscode.commands.registerCommand('kanjiColorize.configureGrades', configureGrades),
    vscode.window.onDidChangeActiveTextEditor(editor => {
      scheduleUpdate(editor ?? undefined);
      updateCursorStatus(editor ?? undefined);
      updateActiveFileContext(editor ?? undefined);
    }),
    vscode.workspace.onDidChangeTextDocument(e => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      if (e.document.uri.toString() !== editor.document.uri.toString()) return;
      if (!isFileOn(editor)) return;
      scheduleUpdate(editor);
      updateCursorStatus(editor);
    }),
    vscode.workspace.onDidCloseTextDocument(doc => {
      enabledFiles.delete(doc.uri.toString());
      if (statusItem && vscode.window.activeTextEditor?.document.uri.toString() === doc.uri.toString()) {
        statusItem.hide();
        setButtonLabel('off');
      }
      updateActiveFileContext();
    }),
    vscode.window.onDidChangeTextEditorSelection(e => {
      if (e.textEditor !== vscode.window.activeTextEditor) return;
      updateCursorStatus(e.textEditor);
    }),
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('kanjiColorize')) {
        if (decorations) Object.values(decorations).forEach(d => d.dispose());
        makeDecorations();
        scheduleUpdate();
        updateCursorStatus();
      }
    })
  );

  (Object.values(buttonCommandIds) as string[]).forEach(id => {
    context.subscriptions.push(vscode.commands.registerCommand(id, toggle));
  });
}

export function deactivate() {
  if (decorations) Object.values(decorations).forEach(d => d.dispose());
  enabledFiles.clear();
  statusItem?.dispose();
  statusItem = null;
  setButtonLabel('off');
  void vscode.commands.executeCommand('setContext', extensionActiveContextKey, false);
}
