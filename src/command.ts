import * as vscode from 'vscode';
import { GoGoCodePanel } from './panel';
import * as dirTree from 'directory-tree';
import { execSync } from 'child_process';
const spawn = require('cross-spawn');
import * as path from 'path';

export class TransformFileCommand {
  public static registerCommand(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.commands.registerCommand('gogocode.transformFile', (args) => {
        const currentPanel = GoGoCodePanel.createOrShow(context.extensionPath);
        const filePath = args.fsPath;
        currentPanel.postMessageToWebview({
          command: 'folder-paths',
          treeData: []
        });
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

export class TransformFolderCommand {
  public static registerCommand(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.commands.registerCommand('gogocode.transformFolder', (args) => {
        const currentPanel = GoGoCodePanel.createOrShow(context.extensionPath);
        const treeData = formatTreeData([dirTree(args.fsPath)]);
        if (!treeData) return;
        currentPanel.postMessageToWebview({
          command: 'folder-paths',
          treeData
        });
      })
    );
  }
}

function formatTreeData(originData: any) {
  if (!originData) return undefined;
  const treeData = originData.map((item: any) => {
    const { path, name, type, children } = item;
    return {
      title: name,
      key: path,
      isLeaf: type !== 'directory',
      children: formatTreeData(children)
    }
  })
  return treeData.reverse();
}

export class VueUpCommand {
  public static registerCommand(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.commands.registerCommand('gogocode.vueUp', async (args) => {
        try {
          const { error } = spawn.sync('gogocode', ['-V'])
          if (error) {
            throw error
          }
        } catch (e: any) {
          if (e.message.match('command not found'))  {
            vscode.window.showErrorMessage('请先安装gogocode-cli: npm install gogocode-cli -g');
          } else {
            vscode.window.showErrorMessage(e.stack)
          }
          console.error(e)
          return;
        }
        vscode.window.showWarningMessage('vue2代码升级中，请稍候......')
        setTimeout(async () => {
          try {
            const dir = args.fsPath;
            const basePath = path.resolve(dir, '../')
            const dirName = path.basename(dir)
            const outPath = path.resolve(basePath, `${dirName}-out`)
            const cmdArgs = ['-s', dir, '-t', 'gogocode-plugin-vue', '-o', outPath]
            const { error, stdout, stderr} = spawn.sync('gogocode', cmdArgs)
            if (error) {
              throw error
            }
            
            if (stdout) {
              console.log(stdout.toString())
            }
            if (stderr) {
              console.log(stderr.toString())
            }
            vscode.window.showInformationMessage('vue2代码转换成功！如遇问题，请前往https://github.com/thx/gogocode/issues反馈，感谢！')
          } catch (e: any) {
            vscode.window.showErrorMessage(e.stack + '\n vue2代码转换失败！请前往https://github.com/thx/gogocode/issues反馈，感谢！')
            console.error(e)
            return;
          }
        }, 2)
      })
    );
  }
}