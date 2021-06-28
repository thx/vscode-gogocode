import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { runGoGoCode } from './util';

export class GoGoCodePanel {
  /**
   * Track the currently panel. Only allow a single panel to exist at a time.
   */
  public static currentPanel: GoGoCodePanel | undefined;
  public static readonly viewType = 'gogocode';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionPath: string;
  private _disposables: vscode.Disposable[] = [];

  private paths: string[] = [];
  private _activedMessages: any[] = [];
  private _isWebviewActived: boolean = false;

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
    return GoGoCodePanel.currentPanel;
  }

  public postMessageToWebview(message: any) {
    if (this._isWebviewActived) {
      this._panel.webview.postMessage(message);
    } else {
      this._activedMessages.push(message);
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
          case 'activated':
            this._isWebviewActived = true;
            while (this._activedMessages.length) {
              const message = this._activedMessages.shift();
              this._panel.webview.postMessage(message);
            }
            break;
          case 'log':
            console.log(message);
            break;
          case 'get-file-content': {
            this.onGetFileContent(message.path);
            break;
          }
          case 'replace-one': {
            const path = message.path;
            const content = message.content;
            fs.promises.writeFile(path, content).then(() => {
              this.postMessageToWebview({
                command: 'message',
                type: 'success',
                duration: 2,
                content: `文件：${path} 已经成功替换`,
              });
              this.onGetFileContent(path);
            });
            break;
          }
          case 'replace-all': {
            const treeData = message.treeData;
            const transformCode = message.transformCode;
            
            const pathList: string[] = [];
            flatTreeData(treeData);

            Promise.all(pathList.map(path => doTransform(path, transformCode)))
            .then(() => {
              this.postMessageToWebview({
                command: 'message',
                type: 'success',
                duration: 2,
                content: `替换成功！`,
              });
            });

            function flatTreeData(originData: any) {
              if (!originData || !originData.length) return;
              originData.forEach((item: any) => {
                const { key, isLeaf, children } = item;
                if (isLeaf) {
                  pathList.push(key);
                }
                children && children.length && flatTreeData(children);
              })
            }
            function doTransform(path: string, transformCode: string) {
              const inputCode = fs.readFileSync(path).toString();
              const content = runGoGoCode(inputCode, transformCode, path);
              return fs.promises.writeFile(path, content)
            }
            break;
          }
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
    this._isWebviewActived = false;

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private onGetFileContent(path: string) {
    const content = fs.readFileSync(path).toString();
    this.postMessageToWebview({
      command: 'file-content',
      path,
      content,
    });
  }

  private _getHtmlForWebview() {
    const resourcePath =
      process.env.NODE_ENV === 'development'
        ? path.join(this._extensionPath, 'webview.dev.html')
        : path.join(this._extensionPath, 'webview.html');
    return fs.readFileSync(resourcePath, 'UTF-8');
  }
}
