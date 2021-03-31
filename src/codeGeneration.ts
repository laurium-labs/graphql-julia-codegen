import {
  GraphQLError,
  getNamedType,
  isCompositeType,
  GraphQLEnumType,
  GraphQLInputObjectType,
  isNonNullType,
  isEnumType,
  isInputObjectType
} from "graphql";

import { isTypeProperSuperTypeOf } from "apollo-codegen-core/lib/utilities/graphql";

import { join } from "apollo-codegen-core/lib/utilities/printing";

import {
  namedTupleDeclaration,
  escapeIdentifierIfNeeded,
  comment,
  traitDeclaration,
  propertyDeclaration,
  methodDeclaration
} from "./language";

import {
  traitNameForPropertyName,
  traitNameForFragmentName,
  traitNameForInlineFragment,
  operationClassName,
  enumCaseName,
  propertyFromLegacyField,
  propertyFromInputField
} from "./naming";

import { multilineString } from "./values";

import { possibleTypesForType, typeNameFromGraphQLType } from "./types";

import CodeGenerator from "apollo-codegen-core/lib/utilities/CodeGenerator";
import {
  LegacyCompilerContext,
  LegacyOperation,
  LegacyFragment,
  LegacyField,
  LegacyInlineFragment
} from "apollo-codegen-core/lib/compiler/legacyIR";
import { GraphQLType } from "graphql";
import { Property } from "./language";
import { GraphQLCompositeType } from "graphql";


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

      if (operationId) {
        operationIdentifier(generator, operationId);
      }

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


  function print(s: string) {
    generator.printOnNewline(s)
    //console.log(s)
  }


  // function printField(indent: string, prefix: string, field: LegacyField): string {
  //   // console.log("observing: " + JSON.stringify(field))
  //   if (field.fields) {
  //     for (let f of field.fields) {
  //       // console.log("here: " + f.type)
  //       if (f.fields?.length) {
  //         // console.log(f.type + " is a composite type!")
  //         const res = printField(indent + "  ", prefix + "_" + f.responseName, f)
  //         //console.log(res)
  //       } else {
  //         // console.log(f.type + " is not composite!")
  //       }
  //     }

  //     if (!field.fields.some(f => isCompositeType(f))) {
  //       generator.printOnNewline(`const ${prefix} = @NamedTuple begin`)
  //     }

  //     for (let f of field.fields) {
  //       if (!isCompositeType(f.type)) {
  //         printField(indent + "  ", prefix + "_" + f.responseName, f)
  //       }
  //     }

  //     generator.printOnNewline('end\n')

  //   }

  //   if (field.fields?.length) {
  //     generator.printOnNewline(`const ${prefix} = @NamedTuple begin`)
  //     generator.printOnNewline(`${indent + "  "}${field.responseName}::${prefix}`)
  //     generator.printOnNewline('end\n')


  //   } else {
  //     generator.printOnNewline(`${indent}${field.fieldName}::${typeNameFromGraphQLType(generator.context, field.type)}`)
  //   }

  //   return ''
  // }

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


  // namedTupleDeclaration(
  //   generator,
  //   {
  //     objectName,
  //   },
  //   () => {

  //     if (operationId) {
  //       operationIdentifier(generator, operationId);
  //     }

  //     generator.printNewlineIfNeeded();

  //     console.log(JSON.stringify(fields))

  //     traitDeclarationForSelectionSet(generator, {
  //       traitName: "Data",
  //       parentType: rootType,
  //       fields,
  //       inlineFragments,
  //       fragmentSpreads
  //     });
  //   }
  // );
}

export function traitDeclarationForFragment(
  generator: CodeGenerator<LegacyCompilerContext, any>,
  {
    fragmentName,
    typeCondition,
    fields,
    inlineFragments,
    fragmentSpreads,
    source
  }: LegacyFragment
) {
  const traitName = traitNameForFragmentName(fragmentName);

  traitDeclarationForSelectionSet(
    generator,
    {
      traitName,
      parentType: typeCondition,
      fields,
      inlineFragments,
      fragmentSpreads
    },
    () => {
      if (source) {
        generator.printOnNewline("val fragmentString =");
        generator.withIndent(() => {
          multilineString(generator, source);
        });
      }
    }
  );
}

export function traitDeclarationForSelectionSet(
  generator: CodeGenerator<LegacyCompilerContext, any>,
  {
    traitName,
    parentType,
    fields,
    inlineFragments,
    fragmentSpreads,
    viewableAs,
    parentFragments
  }: {
    traitName: string;
    parentType: GraphQLCompositeType;
    fields: LegacyField[];
    inlineFragments?: LegacyInlineFragment[];
    fragmentSpreads?: string[];
    viewableAs?: {
      traitName: string;
      properties: (LegacyField & Property)[];
    };
    parentFragments?: string[];
  },
  objectClosure?: () => void
) {
  const possibleTypes = parentType
    ? possibleTypesForType(generator.context, parentType)
    : null;

  const properties = fields
    .map(field => propertyFromLegacyField(generator.context, field, traitName))
    .filter(field => field.propertyName != "__typename");

  const fragmentSpreadSuperClasses = (fragmentSpreads || []).filter(spread => {
    const fragment = generator.context.fragments[spread];
    const alwaysDefined = isTypeProperSuperTypeOf(
      generator.context.schema,
      fragment.typeCondition,
      parentType
    );

    return alwaysDefined;
  });

  // add types and implicit conversions
  if (inlineFragments && inlineFragments.length > 0) {
    inlineFragments.forEach(inlineFragment => {
      traitDeclarationForSelectionSet(generator, {
        traitName: traitNameForInlineFragment(inlineFragment),
        parentType: inlineFragment.typeCondition,
        fields: inlineFragment.fields,
        fragmentSpreads: inlineFragment.fragmentSpreads,
        viewableAs: {
          traitName,
          properties
        }
      });
    });
  }

  dataContainerDeclaration(generator, {
    name: traitName,
    properties,
    extraSuperClasses: [
      ...(viewableAs ? [viewableAs.traitName] : []),
      ...(fragmentSpreadSuperClasses || []),
      ...(parentFragments || [])
    ],
    insideCompanion: () => {
      if (possibleTypes) {
        generator.printNewlineIfNeeded();
        generator.printOnNewline("val possibleTypes = scala.collection.Set(");
        generator.print(
          join(Array.from(possibleTypes).map(type => `"${String(type)}"`), ", ")
        );
        generator.print(")");
      }

      generator.printNewlineIfNeeded();
      generator.printOnNewline(
        `implicit class ViewExtensions(private val orig: ${traitName}) extends AnyVal`
      );
      generator.withinBlock(() => {
        if (inlineFragments && inlineFragments.length > 0) {
          inlineFragments.forEach(inlineFragment => {
            const fragClass = traitNameForInlineFragment(inlineFragment);
            generator.printOnNewline(`def as${inlineFragment.typeCondition}`);
            generator.print(`: Option[${fragClass}] =`);
            generator.withinBlock(() => {
              generator.printOnNewline(
                `if (${fragClass}.possibleTypes.contains(orig.asInstanceOf[scala.scalajs.js.Dynamic].__typename.asInstanceOf[String])) Some(orig.asInstanceOf[${fragClass}]) else None`
              );
            });
          });
        }

        if (fragmentSpreads) {
          fragmentSpreads.forEach(s => {
            const fragment = generator.context.fragments[s];
            const alwaysDefined = isTypeProperSuperTypeOf(
              generator.context.schema,
              fragment.typeCondition,
              parentType
            );
            if (!alwaysDefined) {
              generator.printOnNewline(`def as${s}`);
              generator.print(`: Option[${s}] =`);
              generator.withinBlock(() => {
                generator.printOnNewline(
                  `if (${s}.possibleTypes.contains(orig.asInstanceOf[scala.scalajs.js.Dynamic].__typename.asInstanceOf[String])) Some(orig.asInstanceOf[${s}]) else None`
                );
              });
            }
          });
        }
      });

      const fragments = (fragmentSpreads || []).map(
        f => generator.context.fragments[f]
      );
      fields
        .filter(field => isCompositeType(getNamedType(field.type)))
        .forEach(field => {
          traitDeclarationForSelectionSet(generator, {
            traitName: traitNameForPropertyName(field.responseName),
            parentType: getNamedType(field.type) as GraphQLCompositeType,
            fields: field.fields || [],
            inlineFragments: field.inlineFragments,
            fragmentSpreads: field.fragmentSpreads,
            parentFragments: fragments
              .filter(f => {
                return f.fields.some(o => field.responseName == o.responseName);
              })
              .map(f => {
                return (
                  traitNameForFragmentName(f.fragmentName) +
                  "." +
                  traitNameForPropertyName(field.responseName)
                );
              })
          });
        });

      if (objectClosure) {
        objectClosure();
      }
    }
  });
}

function operationIdentifier(
  generator: CodeGenerator<LegacyCompilerContext, any>,
  operationId: string
) {
  if (!generator.context.options.generateOperationIds) {
    return;
  }

  generator.printNewlineIfNeeded();
  generator.printOnNewline(
    `val operationIdentifier: String = "${operationId}"`
  );
}

export function typeDeclarationForGraphQLType(
  generator: CodeGenerator<LegacyCompilerContext, any>,
  type: GraphQLType
) {
  if (isEnumType(type)) {
    enumerationDeclaration(generator, type);
  } else if (isInputObjectType(type)) {
    traitDeclarationForInputObjectType(generator, type);
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

function traitDeclarationForInputObjectType(
  generator: CodeGenerator<LegacyCompilerContext, any>,
  type: GraphQLInputObjectType
) {
  const { name, description } = type;
  const fields = Object.values(type.getFields());
  const properties = fields.map(field =>
    propertyFromInputField(
      generator.context,
      field,
      generator.context.options.namespace
    )
  );

  dataContainerDeclaration(generator, {
    name,
    properties,
    description: description || undefined
  });
}

function dataContainerDeclaration(
  generator: CodeGenerator<LegacyCompilerContext, any>,
  {
    name,
    properties,
    extraSuperClasses,
    description,
    insideCompanion
  }: {
    name: string;
    properties: (Property & {
      name?: string;
      responseName?: string;
    })[];
    extraSuperClasses?: string[];
    description?: string;
    insideCompanion?: () => void;
  }
) {
  traitDeclaration(
    generator,
    {
      traitName: name,
      superclasses: ["scala.scalajs.js.Object", ...(extraSuperClasses || [])],
      annotations: ["scala.scalajs.js.native"],
      description: description || undefined
    },
    () => {
      properties.forEach(p => {
        propertyDeclaration(generator, {
          jsName: p.name || p.responseName,
          propertyName: p.propertyName,
          typeName: p.typeName
        });
      });
    }
  );

  namedTupleDeclaration(
    generator,
    {
      objectName: name
    },
    () => {
      methodDeclaration(
        generator,
        {
          methodName: "apply",
          params: properties.map(p => {
            return {
              name: p.propertyName,
              type: p.typeName,
              defaultValue: p.isOptional
                ? "com.apollographql.scalajs.OptionalValue.empty"
                : ""
            };
          })
        },
        () => {
          const propertiesIn = properties
            .map(p => `"${p.name || p.responseName}" -> ${p.propertyName}`)
            .join(", ");
          generator.printOnNewline(
            `scala.scalajs.js.Dynamic.literal(${propertiesIn}).asInstanceOf[${name}]`
          );
        }
      );

      methodDeclaration(
        generator,
        {
          methodName: "unapply",
          params: [
            {
              name: "value",
              type: name
            }
          ]
        },
        () => {
          const propertiesExtracted = properties
            .map(p => `value.${p.propertyName}`)
            .join(", ");

          generator.printOnNewline(`Some((${propertiesExtracted}))`);
        }
      );

      generator.printNewlineIfNeeded();
      generator.printOnNewline(
        `implicit class CopyExtensions(private val orig: ${name}) extends AnyVal`
      );
      generator.withinBlock(() => {
        methodDeclaration(
          generator,
          {
            methodName: "copy",
            params: properties.map(p => {
              return {
                name: p.propertyName,
                type: p.typeName,
                defaultValue: `orig.${p.propertyName}`
              };
            })
          },
          () => {
            const propertiesIn = properties
              .map(p => `"${p.name || p.responseName}" -> ${p.propertyName}`)
              .join(", ");
            generator.printOnNewline(
              `scala.scalajs.js.Dynamic.literal(${propertiesIn}).asInstanceOf[${name}]`
            );
          }
        );
      });

      if (insideCompanion) {
        insideCompanion();
      }
    }
  );
}
