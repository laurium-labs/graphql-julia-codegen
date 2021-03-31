import {
  parse
} from "graphql";

import {
  generateSource
} from "../codeGeneration";

import { loadSchema } from "apollo-codegen-core/lib/loading";
const schema = loadSchema(
  require.resolve("../../schema.json")
);

import CodeGenerator from "apollo-codegen-core/lib/utilities/CodeGenerator";

import {
  compileToLegacyIR,
  LegacyCompilerContext
} from "apollo-codegen-core/lib/compiler/legacyIR";

import * as fs from 'fs';


describe("Scala code generation", function () {
  let generator: CodeGenerator;
  let resetGenerator;
  let compileFromSource: (source: string) => LegacyCompilerContext;
  let addFragment;

  beforeEach(function () {
    resetGenerator = () => {
      const context = {
        schema: schema,
        operations: {},
        fragments: {},
        typesUsed: {}
      };
      generator = new CodeGenerator(context);
    };

    compileFromSource = (
      source: string,
      options = { generateOperationIds: false, namespace: undefined }
    ) => {
      const document = parse(source);
      let context = compileToLegacyIR(schema, document);
      options.generateOperationIds &&
        Object.assign(context.options, {
          generateOperationIds: true,
          operationIdsMap: {}
        });
      options.namespace &&
        Object.assign(context.options, { namespace: options.namespace });
      generator.context = context;
      return context;
    };

    addFragment = (fragment: any) => {
      generator.context.fragments[fragment.fragmentName] = fragment;
    };

    resetGenerator();
  });

  describe("#generateSource()", function () {
    test(`should emit a package declaration when the namespace option is specified`, function () {
      const context = compileFromSource(
        `
        query MyQuery {
          viewer {
            login
          }
        }
      `
      );

      fs.writeFile(`./GithubGraphQL/src/generated/${Object.keys(context.operations)[0]}.jl`, generateSource(context), () => { })
      //

      expect(generateSource(context)).toMatchSnapshot();
    });
  });
});
