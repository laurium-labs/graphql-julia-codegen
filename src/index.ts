import { Command, flags } from '@oclif/command'
import { compileToLegacyIR } from 'apollo-codegen-core/lib/compiler/legacyIR';
import { loadSchema } from 'apollo-codegen-core/lib/loading';
import { DefinitionNode, OperationDefinitionNode, Source } from 'graphql';


import { generateSource } from './codeGeneration'
import { promises } from 'fs'
import { GraphQLDocument } from 'apollo-language-server/lib/document';
const { resolve } = require('path');

function extractGraphQLDocumentsFromJuliaStrings(
    text: string
): GraphQLDocument[] | null {


    const documents: GraphQLDocument[] = [];

    const searchText = `gql"""`

    let start
    while ((start = text.search(searchText)) != -1) {
        let end = text.substring(start + searchText.length).search(`"""`)
        documents.push(new GraphQLDocument(new Source(text.substring(start + searchText.length, end + start + searchText.length))))
        text = text.substring(end + start + searchText.length)
    }


    if (documents.length < 1) return null;

    return documents;
}

async function* getFiles(dir: string): any {
    const dirents = await promises.readdir(dir, { withFileTypes: true });
    for (const dirent of dirents) {
        const res = resolve(dir, dirent.name);
        if (dirent.isDirectory()) {
            yield* getFiles(res);
        } else {
            yield res;
        }
    }
}

function isObjectTypeDefinitionNode(node: DefinitionNode): node is OperationDefinitionNode {
    return node.kind === 'OperationDefinition'
}

class GraphQLJuliaCodegen extends Command {
    static description = 'This utility generates Julia Types from GraphQL Operations and the GraphQL Schema.'

    static flags = {
        version: flags.version({ char: 'v' }),
        help: flags.help({ char: 'h' }),
        localSchemaFile: flags.string({ description: 'localSchemaFile', required: true }),
        source: flags.string({ description: 'source file/folder to generate from', required: true }),
        destination: flags.string({ description: 'destination file/folder to generate to', required: true }),
    }

    async run() {
        const { flags } = this.parse(GraphQLJuliaCodegen)

        const sources: GraphQLDocument[] = []
        for await (const f of getFiles(flags.source)) {
            const text = await promises.readFile(f, "utf8")
            let s = extractGraphQLDocumentsFromJuliaStrings(text)
            if (s)
                sources.push(...s)
        }

        const path = require.resolve("../" + flags.localSchemaFile)

        const schema = loadSchema(path)


        let docCount = 0
        for (let doc of sources) {

            let document = doc.ast

            if (document) {
                const context = compileToLegacyIR(schema, document, {});

                const output = generateSource(context);
                let name = 'couldnt_find_operation_name.jl'
                for (let def of [...document.definitions]) {
                    if (isObjectTypeDefinitionNode(def)) {
                        const n = def.name?.value
                        if (n) {
                            name = n + '.jl'
                        }
                    }
                }

                docCount++

                await promises.writeFile(`${flags.destination}/${name}`, output)
            }


        }


        console.log(`Done writing ${docCount} Julia files!`)
    }
}

export = GraphQLJuliaCodegen