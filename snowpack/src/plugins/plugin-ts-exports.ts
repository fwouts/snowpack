import path from 'path';
import {promises as fs} from 'fs';
import {SnowpackPlugin, SnowpackConfig} from '../types';
import {esBuildTransform} from './plugin-esbuild';
import * as ts from 'typescript';
import {findExportsWithNoValue} from './ts-exports/find-exports';

export function tsExportsPlugin(
  config: SnowpackConfig,
  {input}: {input: string[]},
): SnowpackPlugin {
  return {
    name: '@snowpack/plugin-ts-exports',
    resolve: {
      input,
      output: ['.js'],
    },
    async load({filePath}) {
      const ext = path.extname(filePath);
      const isJSX = ext.endsWith('x');
      const contents = await fs.readFile(filePath, 'utf8');
      const sourceFile = ts.createSourceFile(
        filePath,
        contents,
        ts.ScriptTarget.Latest,
        false,
        isJSX ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      const fakeExportsCode = `
const __fakeValueExport__ = null;
export { ${findExportsWithNoValue(sourceFile)
        .map((e) => `__fakeValueExport__ as ${e}`)
        .join(', ')} };`;
      return esBuildTransform(config, filePath, contents + fakeExportsCode);
    },
    cleanup() {},
  };
}
