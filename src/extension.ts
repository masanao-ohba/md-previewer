import * as vscode from 'vscode';
import { PreviewPanel } from './preview/PreviewPanel';

let currentPanel: PreviewPanel | undefined;

/**
 * Extension activation entry point.
 * Called when the extension is activated (on opening a Markdown file).
 *
 * @param context - Extension context provided by VSCode
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('Markdown Preview Enhanced extension activated');

  // Register command: Open Preview
  const openPreviewCommand = vscode.commands.registerCommand(
    'markdownPreviewEnhanced.openPreview',
    () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active Markdown editor found');
        return;
      }

      if (editor.document.languageId !== 'markdown') {
        vscode.window.showWarningMessage('Please open a Markdown file to preview');
        return;
      }

      openOrUpdatePreview(context, editor, vscode.ViewColumn.Active);
    }
  );

  // Register command: Open Preview to the Side
  const openPreviewToSideCommand = vscode.commands.registerCommand(
    'markdownPreviewEnhanced.openPreviewToSide',
    () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active Markdown editor found');
        return;
      }

      if (editor.document.languageId !== 'markdown') {
        vscode.window.showWarningMessage('Please open a Markdown file to preview');
        return;
      }

      openOrUpdatePreview(context, editor, vscode.ViewColumn.Beside);
    }
  );

  // Watch for text document changes to update preview
  const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument((event) => {
    if (event.document.languageId === 'markdown' && currentPanel) {
      currentPanel.update(event.document);
    }
  });

  // Watch for active editor changes
  const changeEditorSubscription = vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor && editor.document.languageId === 'markdown' && currentPanel) {
      currentPanel.update(editor.document);
    }
  });

  // Auto-open preview if configured
  if (vscode.workspace.getConfiguration('markdownPreviewEnhanced').get('preview.autoOpen')) {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.languageId === 'markdown') {
      openOrUpdatePreview(context, editor, vscode.ViewColumn.Beside);
    }
  }

  context.subscriptions.push(
    openPreviewCommand,
    openPreviewToSideCommand,
    changeDocumentSubscription,
    changeEditorSubscription
  );
}

/**
 * Open a new preview panel or update existing one.
 *
 * @param context - Extension context
 * @param editor - Active text editor
 * @param column - View column for the panel
 */
function openOrUpdatePreview(
  context: vscode.ExtensionContext,
  editor: vscode.TextEditor,
  column: vscode.ViewColumn
): void {
  if (currentPanel && !currentPanel.isDisposedPanel()) {
    // Panel exists and is not disposed - reuse it
    currentPanel.reveal(column);
    currentPanel.update(editor.document);
  } else {
    // Panel doesn't exist or is disposed - create new one
    currentPanel = PreviewPanel.create(context, editor.document, column);

    // Listen for panel disposal
    currentPanel.onDispose(() => {
      currentPanel = undefined;
    });
  }
}

/**
 * Extension deactivation.
 * Called when the extension is deactivated.
 */
export function deactivate(): void {
  if (currentPanel) {
    currentPanel.dispose();
  }
  console.log('Markdown Preview Enhanced extension deactivated');
}
