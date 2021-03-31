import {
  parse,
} from "graphql";

import {
  generateSource,
} from "../codeGeneration";

import { loadSchema } from "apollo-codegen-core/lib/loading";
const schema = loadSchema(
  require.resolve("./schema.json")
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
        query HeroName($episode: Episode) {
          hero(episode: $episode) {
            name
            appearsIn
          }
        }
      `
      );

      //

      expect(generateSource(context)).toMatchSnapshot();
    });
  });

  describe("#classDeclarationForOperation()", function () {


    test(`should generate a class declaration for a query with fragment spreads`, function () {
      const context = compileFromSource(`
        query Hero {
          hero {
            ...HeroDetails
          }
        }

        fragment HeroDetails on Character {
          name
        }
      `);

      expect(generateSource(context)).toMatchSnapshot();

    });

    // TODO: What the heck is this?
    // test(`should generate a class declaration for a query with conditional fragment spreads`, function () {
    //   const context = compileFromSource(`
    //       query Hero {
    //         hero {
    //           ...DroidDetails
    //         }
    //       }

    //       fragment DroidDetails on Droid {
    //         primaryFunction
    //       }
    //     `);
    //   fs.writeFile('./out.jl', generateSource(context), () => { })
    //   // classDeclarationForOperation(generator, operations["Hero"]);
    //   // expect(generator.output).toMatchSnapshot();
    //   expect(generateSource(context)).toMatchSnapshot();

    // });

    // test(`should generate a class declaration for a query with a fragment spread nested in an inline fragment`, function () {
    //   const context = compileFromSource(`
    //       query Hero {
    //         hero {
    //           ... on Droid {
    //             ...HeroDetails
    //           }
    //         }
    //       }

    //       fragment HeroDetails on Character {
    //         name
    //       }
    //     `);

    //   fs.writeFile('./out.jl', generateSource(context), () => { })

    //   expect(generateSource(context)).toMatchSnapshot();
    //   // classDeclarationForOperation(generator, operations["Hero"]);

    //   // expect(generator.output).toMatchSnapshot();
    // });

    test(`should nested query`, function () {
      const context = compileFromSource(`
          query Hero {
            hero {
              name
              friends {
                name
              }
            }
          }
        `);



      expect(generateSource(context)).toMatchSnapshot();
      // classDeclarationForOperation(generator, operations["Hero"]);

      // traitDeclarationForFragment(generator, fragments["HeroDetails"]);

      // expect(generator.output).toMatchSnapshot();
    });

    test(`should generate a class declaration for a query with a fragment spread containing deep fields`, function () {
      const context = compileFromSource(`
          query Hero {
            hero {
              ...HeroDetails
            }
          }

          fragment HeroDetails on Character {
            name
            friends {
              name
            }
          }
        `);



      expect(generateSource(context)).toMatchSnapshot();
      // classDeclarationForOperation(generator, operations["Hero"]);

      // traitDeclarationForFragment(generator, fragments["HeroDetails"]);

      // expect(generator.output).toMatchSnapshot();
    });

    test(`should generate a class declaration for a mutation with variables`, function () {
      const context = compileFromSource(`
          mutation CreateReview($episode: Episode) {
            createReview(episode: $episode, review: { stars: 5, commentary: "Wow!" }) {
              stars
              commentary
            }
          }
        `);

      fs.writeFile('./out.jl', generateSource(context), () => { })

      //classDeclarationForOperation(generator, operations["CreateReview"]);

      expect(generateSource(context)).toMatchSnapshot();
    });

  });
});
