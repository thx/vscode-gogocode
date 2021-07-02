import * as gogocode from 'gogocode';
import { parse, stringify } from 'flatted';

export function noop() {}

export function runGoGoCode(sourceCode: string, workCode: string, sourceCodePath: string = '') {
  try {
    // eslint-disable-next-line no-new-func
    const func = new Function('return ' + workCode)();
    return func(
      { source: sourceCode, path: sourceCodePath },
      { gogocode, parse, stringify },
      {},
    ).toString();
  } catch (e) {
    return '/**\n出错了！\n' + e + '\n**/';
  }
}


export function getCommandSplit() {
    let split = ';'
    if (process.platform === 'win32') {
        split = "&"
    }
  
    return split
}