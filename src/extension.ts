import * as vscode from 'vscode';
import { PreviewPanel } from './preview/PreviewPanel';
import { PlantUMLServer } from './services/PlantUMLServer';
import { PlantUMLRenderer } from './renderers/PlantUMLRenderer';
import { JavaDetector } from './utils/JavaDetector';

let currentPanel: PreviewPanel | undefined;
let plantUMLServer: PlantUMLServer | undefined;

/**
 * Extension activation entry point.
 * Called when the extension is activated (on opening a Markdown file).
 *
 * @param context - Extension context provided by VSCode
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('Markdown Preview Enhanced extension activated');

  // Initialize PlantUML server if local mode is enabled
  try {
    console.log('[Extension] Calling initializePlantUMLServer...');
    await initializePlantUMLServer(context);
    console.log('[Extension] initializePlantUMLServer completed successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : '';
    console.error('[Extension] FATAL: Failed to initialize PlantUML server:', errorMessage);
    console.error('[Extension] Stack trace:', stack);
    vscode.window.showErrorMessage(`PlantUML server initialization failed: ${errorMessage}`);
  }

  // Register command: Open Preview
  const openPreviewCommand = vscode.commands.registerCommand(
    'markdownPreviewer.openPreview',
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
    'markdownPreviewer.openPreviewToSide',
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
  if (vscode.workspace.getConfiguration('markdownPreviewer').get('preview.autoOpen')) {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.languageId === 'markdown') {
      openOrUpdatePreview(context, editor, vscode.ViewColumn.Beside);
    }
  }

  // Watch for configuration changes to restart PlantUML server
  const configChangeSubscription = vscode.workspace.onDidChangeConfiguration(async (event) => {
    if (event.affectsConfiguration('markdownPreviewer.plantuml')) {
      console.log('[PlantUML] Configuration changed, restarting server...');

      // Stop existing server
      if (plantUMLServer) {
        plantUMLServer.stop();
        plantUMLServer = undefined;
        PlantUMLRenderer.setServerInstance(null);
      }

      // Restart server with new configuration
      await initializePlantUMLServer(context);
    }
  });

  context.subscriptions.push(
    openPreviewCommand,
    openPreviewToSideCommand,
    changeDocumentSubscription,
    changeEditorSubscription,
    configChangeSubscription
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
 * Initialize PlantUML server for local rendering.
 *
 * This function starts a persistent PlantUML server process if:
 * 1. Local mode is enabled in settings
 * 2. Java is installed
 * 3. PlantUML JAR path is configured
 *
 * The server dramatically improves rendering performance (10s → 0.2-0.5s).
 *
 * @param context - Extension context
 */
async function initializePlantUMLServer(context: vscode.ExtensionContext): Promise<void> {
  const config = vscode.workspace.getConfiguration('markdownPreviewer');
  const mode = config.get<'online' | 'local'>('plantuml.mode', 'online');

  console.log('[PlantUML] Initialization started, mode:', mode);

  // Only initialize server if local mode is enabled
  if (mode !== 'local') {
    console.log('[PlantUML] Server not started: online mode selected');
    return;
  }

  const jarPath = config.get<string>('plantuml.jarPath', '');
  const preferredPort = config.get<number>('plantuml.serverPort', 0);

  console.log('[PlantUML] JAR path:', jarPath);
  console.log('[PlantUML] Preferred port:', preferredPort);

  // Validate prerequisites
  if (!jarPath || jarPath.trim() === '') {
    const errorMsg = 'PlantUML JAR path not configured';
    console.error('[PlantUML]', errorMsg);
    throw new Error(errorMsg);
  }

  console.log('[PlantUML] Checking Java installation...');
  if (!JavaDetector.isJavaInstalledSync()) {
    const errorMsg = 'Java not installed. Please install Java and ensure it is in your PATH.';
    console.error('[PlantUML]', errorMsg);
    throw new Error(errorMsg);
  }
  console.log('[PlantUML] Java is installed');

  console.log('[PlantUML] Validating PlantUML JAR...');
  if (!JavaDetector.validatePlantUMLJar(jarPath)) {
    const errorMsg = `Invalid PlantUML JAR path: ${jarPath}`;
    console.error('[PlantUML]', errorMsg);
    throw new Error(errorMsg);
  }
  console.log('[PlantUML] JAR validation passed');

  // Start PlantUML server
  console.log('[PlantUML] Starting server...');
  plantUMLServer = new PlantUMLServer();

  const port = await plantUMLServer.start(jarPath, preferredPort);

  // Set server instance in renderer
  PlantUMLRenderer.setServerInstance(plantUMLServer);

  console.log(`[PlantUML] Server started successfully on port ${port}`);
  vscode.window.showInformationMessage(
    `PlantUML server started on port ${port} (fast rendering enabled)`
  );

  // Register server cleanup on extension deactivation
  context.subscriptions.push({
    dispose: () => {
      if (plantUMLServer) {
        plantUMLServer.stop();
        PlantUMLRenderer.setServerInstance(null);
        console.log('[PlantUML] Server stopped');
      }
    }
  });
}

/**
 * Extension deactivation.
 * Called when the extension is deactivated.
 */
export function deactivate(): void {
  if (currentPanel) {
    currentPanel.dispose();
  }

  if (plantUMLServer) {
    plantUMLServer.stop();
    PlantUMLRenderer.setServerInstance(null);
    console.log('[PlantUML] Server stopped on deactivation');
  }

  console.log('Markdown Preview Enhanced extension deactivated');
}
