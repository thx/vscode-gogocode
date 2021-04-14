import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class GoGoCodePanel {
  /**
   * Track the currently panel. Only allow a single panel to exist at a time.
   */
  public static currentPanel: GoGoCodePanel | undefined;
  public static readonly viewType = 'gogocode';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionPath: string;
  private _disposables: vscode.Disposable[] = [];
  private currentSearch: vscode.CancellationTokenSource = new vscode.CancellationTokenSource();
  private paths: string[] = [];

  public static createOrShow(extensionPath: string) {
    const activeEditor = vscode.window.activeTextEditor;

    let column = activeEditor ? activeEditor.viewColumn : undefined;

    // If we already have a panel, show it.
    // Otherwise, create a new panel.
    if (GoGoCodePanel.currentPanel) {
      GoGoCodePanel.currentPanel._panel.reveal(column);
    } else {
      const panel = vscode.window.createWebviewPanel(
        GoGoCodePanel.viewType,
        'GoGoCode',
        column || vscode.ViewColumn.One,
        {
          // Enable javascript in the webview
          enableScripts: true,
          // avoid by reseted
          retainContextWhenHidden: true,

          // And restric the webview to only loading content from our extension's `media` directory.
          localResourceRoots: [
            // vscode.Uri.file(path.join(extensionPath, 'build')),
          ],
        }
      );
      GoGoCodePanel.currentPanel = new GoGoCodePanel(panel, extensionPath);
    }
  }

  public static revive(panel: vscode.WebviewPanel, extensionPath: string) {
    GoGoCodePanel.currentPanel = new GoGoCodePanel(panel, extensionPath);
  }

  private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
    this._extensionPath = extensionPath;
    this._panel = panel;

    // Set the webview's initial html content
    this._panel.webview.html = this._getHtmlForWebview();

    // Update the content based on view changes
    this._panel.onDidChangeViewState(
      (e) => {
        if (this._panel.visible) {
          this._panel.webview.html = this._getHtmlForWebview();
        }
      },
      null,
      this._disposables
    );

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programatically
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case 'log-message':
            console.log(message);
            return;
        }
      },
      null,
      this._disposables
    );
  }

  public dispose() {
    GoGoCodePanel.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();
    this.currentSearch.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _getHtmlForWebview() {
    const resourcePath = path.join(this._extensionPath, 'webview.html');
    return fs.readFileSync(resourcePath, 'UTF-8');
  }
}
