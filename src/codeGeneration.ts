import {
  GraphQLError,
  getNamedType,
  isCompositeType,
  GraphQLEnumType,
  GraphQLInputObjectType,
  isEnumType,
  isInputObjectType,
  isNamedType
} from "graphql";

import {
  namedTupleDeclaration,
  comment,
} from "./language";

import {
  operationClassName,
} from "./naming";

import { typeNameFromGraphQLType } from "./types";

import CodeGenerator from "apollo-codegen-core/lib/utilities/CodeGenerator";
import {
  LegacyCompilerContext,
  LegacyOperation,
  LegacyFragment,
  LegacyField,
  LegacyInlineFragment
} from "apollo-codegen-core/lib/compiler/legacyIR";
import { GraphQLType } from "graphql";


export function generateSource(context: LegacyCompilerContext) {

  const generator = new CodeGenerator(context);

  generator.printOnNewline("# @generated");
  generator.printOnNewline(
    "# This file was automatically generated and should not be edited."
  );
  generator.printNewline();

  context.typesUsed.forEach(type => {
    typeDeclarationForGraphQLType(generator, type);
  });

  Object.values(context.operations).forEach(operation => {
    if (operation.variables && operation.variables.length) {
      variablesDeclaration(generator, operation);

    }
  });

  Object.values(context.operations).forEach(operation => {
    resultDeclaration(generator, operation);
  });

  // TODO: Write Fragments to another file?
  // Object.values(context.fragments).forEach(fragment => {
  //   traitDeclarationForFragment(generator, fragment);
  // });

  return generator.output;
}

export function variablesDeclaration(
  generator: CodeGenerator<LegacyCompilerContext, any>,
  {
    operationName,
    operationType,
    variables,
    fields,
    inlineFragments,
    fragmentSpreads,
    fragmentsReferenced,
    source,
    operationId
  }: LegacyOperation
) {
  let objectName;

  switch (operationType) {
    case "query":
      objectName = `${operationClassName(operationName)}Variables`;
      break;
    case "mutation":
      objectName = `${operationClassName(operationName)}Variables`;
      break;
    default:
      throw new GraphQLError(`Unsupported operation type "${operationType}"`);
  }

  namedTupleDeclaration(
    generator,
    {
      objectName,
    },
    () => {

      generator.printNewlineIfNeeded();

      variables.forEach(v => {
        generator.printOnNewline(`${v.name}::${typeNameFromGraphQLType(generator.context, v.type)}`)
      })
    }
  );
}

export function resultDeclaration(
  generator: CodeGenerator<LegacyCompilerContext, any>,
  {
    operationName,
    operationType,
    rootType,
    variables,
    fields,
    inlineFragments,
    fragmentSpreads,
    fragmentsReferenced,
    source,
    operationId
  }: LegacyOperation
) {
  let objectName = '';

  switch (operationType) {
    case "query":
      objectName = `${operationClassName(operationName)}Result`;
      break;
    case "mutation":
      objectName = `${operationClassName(operationName)}Result`;
      break;
    default:
      throw new GraphQLError(`Unsupported operation type "${operationType}"`);
  }

  function printField(prefix: string, field: LegacyField): string {
    if (field.fields?.length) {
      // not a primitive GraphQL Type.

      const nonPrimitiveFields = field.fields.filter(f => f.fields?.length)
      const newFieldNames: string[] = []
      nonPrimitiveFields.forEach(f => newFieldNames.push(printField(prefix + "_" + field.fieldName, f)))

      const primitiveFields = field.fields.filter(f => !f.fields?.length)
      const newFieldName = `${prefix}_${field.fieldName}`
      generator.printOnNewline(`const ${newFieldName} = @NamedTuple begin`)
      primitiveFields.forEach(f => generator.printOnNewline(`  ${f.fieldName}::${typeNameFromGraphQLType(generator.context, f.type)}`))
      nonPrimitiveFields.forEach((f, i) => generator.printOnNewline(`  ${f.fieldName}::${typeNameFromGraphQLType(generator.context, f.type, newFieldNames[i])}`))
      generator.printOnNewline('end\n')

      return newFieldName
    } else if (isNamedType(field.type)) {
      return typeNameFromGraphQLType(generator.context, field.type)
    } else {
      console.log('should never get here!!')
    }
    return ''
  }

  const baseFieldNames: string[] = []
  fields.forEach(f => baseFieldNames.push(printField(`${objectName}`, f)))

  generator.printOnNewline(`const ${objectName} = @NamedTuple begin`)
  fields.forEach((f, idx) => generator.printOnNewline(`  ${f.fieldName}::${baseFieldNames[idx]}`))
  generator.printOnNewline('end\n')

}


export function typeDeclarationForGraphQLType(
  generator: CodeGenerator<LegacyCompilerContext, any>,
  type: GraphQLType
) {
  if (isEnumType(type)) {
    enumerationDeclaration(generator, type);
  }
}

function enumerationDeclaration(
  generator: CodeGenerator<LegacyCompilerContext, any>,
  type: GraphQLEnumType
) {
  const { name, description } = type;
  const values = type.getValues();

  generator.printNewlineIfNeeded();
  comment(generator, description || "");
  generator.printOnNewline(`@enum ${name} ${values.map(v => v.name).join(" ")}`);
  generator.printNewline();
}