import {
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLID,
  GraphQLScalarType,
  isAbstractType,
  isNonNullType,
  isListType,
  isScalarType,
  isEnumType
} from "graphql";
import { LegacyCompilerContext } from "apollo-codegen-core/lib/compiler/legacyIR";
import { GraphQLType } from "graphql";

const builtInScalarMap = {
  [GraphQLString.name]: "AbstractString",
  [GraphQLInt.name]: "Int64",
  [GraphQLFloat.name]: "Float",
  [GraphQLBoolean.name]: "Boolean",
  // [GraphQLID.name]: "AbstractString"
};

export function possibleTypesForType(
  context: LegacyCompilerContext,
  type: GraphQLType
) {
  if (isAbstractType(type)) {
    return context.schema.getPossibleTypes(type);
  } else {
    return [type];
  }
}

export function typeNameFromGraphQLType(
  context: LegacyCompilerContext,
  type: GraphQLType,
  bareTypeName?: string,
  isOptional?: boolean,
  isInputObject?: boolean
): string {
  if (isNonNullType(type)) {
    return typeNameFromGraphQLType(
      context,
      type.ofType,
      bareTypeName,
      isOptional || false,
      isInputObject
    );
  } else if (isOptional === undefined) {
    isOptional = true;
  }

  let typeName;
  if (isListType(type)) {
    typeName = "Vector{" +
      typeNameFromGraphQLType(
        context,
        type.ofType,
        bareTypeName,
        undefined,
        isInputObject
      ) +
      "}";
    // if (isInputObject) {
    //   typeName =
    //     "Seq[" +
    //     typeNameFromGraphQLType(
    //       context,
    //       type.ofType,
    //       bareTypeName,
    //       undefined,
    //       isInputObject
    //     ) +
    //     "]";
    // } else {
    //   typeName =
    //     "scala.scalajs.js.Array[" +
    //     typeNameFromGraphQLType(
    //       context,
    //       type.ofType,
    //       bareTypeName,
    //       undefined,
    //       isInputObject
    //     ) +
    //     "]";
    // }
  } else if (isScalarType(type)) {
    typeName = typeNameForScalarType(context, type);
    // } else if (isEnumType(type)) {
    //   typeName = "AbstractString";
  } else {
    typeName = bareTypeName || type.name;
  }

  return isOptional
    ? `Union{Nothing,${typeName}}`
    : typeName;
}

function typeNameForScalarType(
  context: LegacyCompilerContext,
  type: GraphQLScalarType
): string {
  return (
    builtInScalarMap[type.name] ||
    (context.options.passthroughCustomScalars
      ? context.options.customScalarsPrefix + type.name
      : GraphQLString.name)
  );
}
