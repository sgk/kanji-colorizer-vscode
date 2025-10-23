import * as vscode from 'vscode';

import {
  allGradeKeys,
  baseGradeKeys,
  BaseGradeKey,
  GradeDefinitions,
  GradeKey,
  loadGradeDefinitions
} from './gradeConfig';
import { generateGradeIcons } from './iconGenerator';

let decorations: Partial<Record<GradeKey, vscode.TextEditorDecorationType>> = {};
let gradeRegex: Partial<Record<GradeKey, RegExp>> = {};
let knownKanjiSet: Set<string> = new Set();
let debounceTimer: NodeJS.Timeout | null = null;
let gradeByKanji: Map<string, GradeKey> = new Map();
let statusItem: vscode.StatusBarItem | null = null;
let gradeDefinitions: GradeDefinitions = {};
let activeGradeQuickPick: vscode.QuickPick<vscode.QuickPickItem & { grade: GradeKey }> | null = null;

const buttonCommandIds = {
  off: 'kanjiColorize.button.off',
  unknown: 'kanjiColorize.button.unknown',
  g0: 'kanjiColorize.button.g0',
  g1: 'kanjiColorize.button.g1',
  g2: 'kanjiColorize.button.g2',
  g3: 'kanjiColorize.button.g3',
  g4: 'kanjiColorize.button.g4',
  g5: 'kanjiColorize.button.g5',
  g6: 'kanjiColorize.button.g6',
  g7: 'kanjiColorize.button.g7',
  g8: 'kanjiColorize.button.g8',
  g9: 'kanjiColorize.button.g9',
  other: 'kanjiColorize.button.other'
} as const;

type ButtonLabel = keyof typeof buttonCommandIds;

const buttonLabelContextKey = 'kanjiColorize.buttonLabel';
const extensionActiveContextKey = 'kanjiColorize.isActive';
let currentButtonLabel: ButtonLabel | null = null;
const gradeVisibilityStateKey = 'kanjiColorize.enabledGrades';
let gradeVisibility: Record<GradeKey, boolean> = {
  g0: true,
  g1: true,
  g2: true,
  g3: true,
  g4: true,
  g5: true,
  g6: true,
  g7: true,
  g8: true,
  g9: true,
  other: true
};

// デフォルト OFF。オンにしたファイル URI を保持。
const enabledFiles = new Set<string>();

function makeDecorations() {
  const cfg = vscode.workspace.getConfiguration('kanjiColorize');
  const opacity = Math.min(Math.max(Number(cfg.get('opacity', 0.6)), 0), 1);
  const textColorSetting = cfg.get<string>('textColor', '#000000');
  const textColor = typeof textColorSetting === 'string' && textColorSetting.trim().length > 0
    ? textColorSetting.trim()
    : null;
  const make = (grade: GradeKey, color: string) => {
    const configured = cfg.get(`colors.${grade}`, color);
    const targetColor = typeof configured === 'string' && configured.trim().length > 0 ? configured : color;
    const options: vscode.DecorationRenderOptions = {
      backgroundColor: hexToRgba(targetColor, opacity),
      borderRadius: '3px'
    };
    if (textColor) {
      options.color = textColor;
    }
    return vscode.window.createTextEditorDecorationType(options);
  };
  // 既存のデコレーションを破棄
  Object.values(decorations).forEach(d => d?.dispose());
  decorations = {};
  const definedGrades = getDefinedGradeKeys();
  definedGrades.forEach(grade => {
    const def = gradeDefinitions[grade];
    if (!def) return;
    decorations[grade] = make(grade, def.color);
  });
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

function getDefinedBaseGradeKeys(): BaseGradeKey[] {
  return baseGradeKeys.filter((grade) => Boolean(gradeDefinitions[grade])) as BaseGradeKey[];
}

function getDefinedGradeKeys(): GradeKey[] {
  return allGradeKeys.filter((grade) => Boolean(gradeDefinitions[grade])) as GradeKey[];
}

function rebuildRegex() {
  const rx: Partial<Record<GradeKey, RegExp>> = {};
  knownKanjiSet = new Set<string>();
  gradeByKanji = new Map();
  getDefinedBaseGradeKeys().forEach(k => {
    const chars = gradeDefinitions[k]?.characters ?? '';
    if (typeof chars === 'string' && chars.length) {
      rx[k] = buildRegexFromSet(chars);
      for (const ch of chars) {
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
  if (!gradeDefinitions[key]) {
    return false;
  }
  return gradeVisibility[key] !== false;
}

function isFileOn(editor = vscode.window.activeTextEditor): boolean {
  if (!editor) return false;
  const key = editor.document.uri.toString();
  return enabledFiles.has(key);
}

function clearAllDecorations(editor?: vscode.TextEditor) {
  if (!editor) return;
  Object.values(decorations).forEach(d => {
    if (d) {
      editor.setDecorations(d, []);
    }
  });
}

function isHan(ch: string): boolean {
  // CJK統合漢字
  return /\p{Script=Han}/u.test(ch);
}

function updateActiveEditor(editor: vscode.TextEditor | undefined) {
  if (!editor) return;
  if (!isFileOn(editor)) {
    clearAllDecorations(editor);
    statusItem?.hide();
    setButtonLabel('off');
    return;
  }

  const activeGrades = getDefinedGradeKeys();
  const perGradeRanges: Partial<Record<GradeKey, vscode.Range[]>> = {};
  activeGrades.forEach(k => { perGradeRanges[k] = []; });

  for (let i = 0; i < editor.document.lineCount; i++) {
    const line = editor.document.lineAt(i).text;

    // まず各学年を正規表現で拾う
    getDefinedBaseGradeKeys().forEach((k) => {
      const rx = gradeRegex[k];
      if (!rx) return;
      rx.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = rx.exec(line))) {
        const col = m.index;
        perGradeRanges[k]?.push(new vscode.Range(
          new vscode.Position(i, col),
          new vscode.Position(i, col + 1)
        ));
      }
    });

    // 範囲外（常用漢字以外）= CJK漢字で、knownKanjiSet に含まれないもの
    if (gradeDefinitions.other) {
      for (let col = 0; col < line.length; col++) {
        const ch = line[col];
        if (isHan(ch) && !knownKanjiSet.has(ch)) {
          perGradeRanges.other?.push(new vscode.Range(
            new vscode.Position(i, col),
            new vscode.Position(i, col + 1)
          ));
        }
      }
    }
  }

  activeGrades.forEach((k) => {
    const deco = decorations[k];
    if (!deco) return;
    if (!isGradeEnabled(k)) {
      editor.setDecorations(deco, []);
      return;
    }
    editor.setDecorations(deco, perGradeRanges[k] ?? []);
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
  if (!gradeKey && gradeDefinitions.other && isHan(ch) && !knownKanjiSet.has(ch)) {
    gradeKey = 'other';
  }

  if (gradeKey && gradeDefinitions[gradeKey]) {
    const label = gradeDefinitions[gradeKey]?.label ?? gradeKey;
    statusItem.text = `$(book) ${label}`;
    statusItem.tooltip = `${ch} は ${label}`;
    statusItem.show();
    setButtonLabel(gradeKey);
  } else {
    statusItem.hide();
    setButtonLabel('unknown');
  }
}

export async function activate(context: vscode.ExtensionContext) {
  gradeDefinitions = loadGradeDefinitions(context);
  makeDecorations();
  rebuildRegex();
  loadGradeVisibility(context);
  updateActiveFileContext();
  statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusItem.name = 'Kanji Grade';
  context.subscriptions.push(statusItem);
  setButtonLabel('off');

  try {
    await generateGradeIcons(context, gradeDefinitions);
  } catch (err) {
    console.error('KanjiColorize: アイコン生成に失敗しました', err);
  }

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
    if (activeGradeQuickPick) {
      activeGradeQuickPick.hide();
      return;
    }
    const quickPick = vscode.window.createQuickPick<GradeQuickPickItem>();
    activeGradeQuickPick = quickPick;
    quickPick.canSelectMany = true;
    quickPick.placeholder = '色付けを有効にする学年を選択してください';
    const definedGrades = getDefinedGradeKeys();
    const items: GradeQuickPickItem[] = definedGrades.map(
      (grade): GradeQuickPickItem => ({
        label: gradeDefinitions[grade]?.label ?? grade,
        picked: false,
        grade
      })
    );
    const disposables: vscode.Disposable[] = [];
    const cleanup = () => {
      disposables.forEach(d => d.dispose());
      quickPick.dispose();
      if (activeGradeQuickPick === quickPick) {
        activeGradeQuickPick = null;
      }
    };

    quickPick.items = items;
    if (items.length === 0) {
      vscode.window.setStatusBarMessage('Kanji Colorize: 利用可能な学年定義が見つかりません', 2000);
      cleanup();
      return;
    }
    quickPick.selectedItems = items.filter(item => isGradeEnabled(item.grade));

    disposables.push(quickPick.onDidAccept(async () => {
      const selected = new Set(quickPick.selectedItems.map(item => item.grade));
      gradeVisibility = { ...gradeVisibility };
      allGradeKeys.forEach(grade => {
        gradeVisibility[grade] = selected.has(grade);
      });
      await saveGradeVisibility(context);
      scheduleUpdate();
      updateCursorStatus();
      vscode.window.setStatusBarMessage('Kanji Colorize: 色付け対象を更新しました', 1600);
      quickPick.hide();
    }));

    disposables.push(quickPick.onDidHide(() => {
      cleanup();
    }));

    quickPick.show();
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
        gradeDefinitions = loadGradeDefinitions(context);
        rebuildRegex();
        makeDecorations();
        scheduleUpdate();
        updateCursorStatus();
        void generateGradeIcons(context, gradeDefinitions);
      }
    })
  );

  (Object.values(buttonCommandIds) as string[]).forEach(id => {
    context.subscriptions.push(vscode.commands.registerCommand(id, toggle));
  });
}

export function deactivate() {
  Object.values(decorations).forEach(d => d?.dispose());
  enabledFiles.clear();
  statusItem?.dispose();
  statusItem = null;
  setButtonLabel('off');
  void vscode.commands.executeCommand('setContext', extensionActiveContextKey, false);
}
