import * as ts from 'typescript';

export function findExportsWithNoValue(sourceFile: ts.SourceFile): string[] {
  const types = new Set<string>();
  const values = new Set<string>();
  const exported: {
    [name: string]: {
      asType: boolean;
      asValue: boolean;
    };
  } = {};

  function recordExport(name: string, {asType, asValue}: {asType?: boolean; asValue?: boolean}) {
    const e = exported[name] || {asType: false, asValue: false};
    e.asType = e.asType || asType || false;
    e.asValue = e.asValue || asValue || false;
    exported[name] = e;
  }

  for (const statement of sourceFile.statements) {
    if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) {
      const name = statement.name.text;
      types.add(name);
      if (hasExportModifier(statement)) {
        recordExport(name, {asType: true});
      }
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          const name = declaration.name.text;
          values.add(name);
          if (hasExportModifier(statement)) {
            recordExport(name, {asValue: true});
          }
        }
      }
    } else if (ts.isFunctionDeclaration(statement)) {
      if (statement.name) {
        const name = statement.name.text;
        values.add(name);
        if (hasExportModifier(statement)) {
          recordExport(name, {asValue: true});
        }
      }
    } else if (ts.isClassDeclaration(statement) || ts.isEnumDeclaration(statement)) {
      if (statement.name) {
        const name = statement.name.text;
        types.add(name);
        values.add(name);
        if (hasExportModifier(statement)) {
          recordExport(name, {asType: true, asValue: true});
        }
      }
    } else if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause &&
      !statement.moduleSpecifier &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const element of statement.exportClause.elements) {
        const name = (element.propertyName || element.name).text;
        recordExport(name, {asType: true, asValue: !statement.isTypeOnly});
      }
    }
  }
  const exportsWithNoValue = new Set<string>();
  for (const [name, e] of Object.entries(exported)) {
    if (!types.has(name)) {
      // No need for a fake value export if there is no type, because
      // nobody will import that as a type.
      continue;
    }
    if (e.asValue && values.has(name)) {
      // No need for a fake value export..
      continue;
    }
    exportsWithNoValue.add(name);
  }
  return [...exportsWithNoValue];
}

function hasExportModifier(node: ts.Node) {
  return (
    node.modifiers && node.modifiers.findIndex((m) => m.kind === ts.SyntaxKind.ExportKeyword) !== -1
  );
}
