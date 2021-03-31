import CodeGenerator from "apollo-codegen-core/lib/utilities/CodeGenerator";
import { LegacyCompilerContext } from "apollo-codegen-core/lib/compiler/legacyIR";

export interface Property {
  propertyName: string;
  typeName: string;
  traitName?: string;
  isOptional?: boolean;
  isList?: boolean;
  description?: string;
}

export function comment(
  generator: CodeGenerator<LegacyCompilerContext, any>,
  comment: string
) {
  const split = comment ? comment.split("\n") : [];
  if (split.length > 0) {
    split.forEach(line => {
      generator.printOnNewline(`# ${line.trim()}`);
    });

  }
}

export function namedTupleDeclaration(
  generator: CodeGenerator<LegacyCompilerContext, any>,
  {
    objectName,
  }: {
    objectName: string;
  },
  closure?: () => void
) {
  generator.printNewlineIfNeeded();
  generator.printOnNewline(
    `const ${objectName} = @NamedTuple `
  );
  generator.pushScope({ typeName: objectName });
  if (closure) {
    generator.withinBlock(closure, " begin", "end\n\n");
  }
  generator.popScope();
}

const reservedKeywords = new Set([
  "function"
]);

export function escapeIdentifierIfNeeded(identifier: string) {
  if (reservedKeywords.has(identifier)) {
    return "`" + identifier + "`";
  } else {
    return identifier;
  }
}
