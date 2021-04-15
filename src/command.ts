import * as vscode from 'vscode';
import * as fs from 'fs';
import { GoGoCodePanel } from './panel';

export class TransformFileCommand {
  public static registerCommand(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.commands.registerCommand('gogocode.transformFile', (args) => {
        const currentPanel = GoGoCodePanel.createOrShow(context.extensionPath);
        const filePath = args.path;
        currentPanel.postMessageToWebview({
          command: 'file-paths',
          filePaths: [filePath]
        });
        if (!filePath) {
          return;
        }
      })
    );
  }
}
