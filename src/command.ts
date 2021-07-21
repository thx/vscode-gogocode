import * as vscode from 'vscode';
import { GoGoCodePanel } from './panel';
import * as dirTree from 'directory-tree';
import { execSync } from 'child_process';
import { getCommandSplit } from './util';
export class TransformFileCommand {
  public static registerCommand(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.commands.registerCommand('gogocode.transformFile', (args) => {
        const currentPanel = GoGoCodePanel.createOrShow(context.extensionPath);
        const filePath = args.path;
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
        const treeData = formatTreeData([dirTree(args.path)]);
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
          await execSync('gogocode -V');
        } catch (e) {
          if (e.message.match('command not found'))  {
            vscode.window.showErrorMessage('请先安装gogocode-cli: npm install gogocode-cli -g');
          } else {
            vscode.window.showErrorMessage(e.stack)
          }
         
          return;
        }
        vscode.window.showWarningMessage('vue2代码升级中，请稍候...')
        setTimeout(async () => {
          try {
            const dir = args.path.split('/').slice(0, -1).join('/');
            const path = args.path.split('/').pop()
            const split = getCommandSplit();
            await execSync(`cd ${dir} ${split} gogocode -s ./${path} -t gogocode-plugin-vue -o ./${path}-out`)
            vscode.window.showInformationMessage('vue2代码转换成功！如遇问题，请前往https://github.com/thx/gogocode/issues反馈，感谢！')
          } catch (e) {
            vscode.window.showErrorMessage(e.stack + '\n vue2代码转换失败！请前往https://github.com/thx/gogocode/issues反馈，感谢！')
            return;
          }
        }, 2)
      })
    );
  }
}