import { Command, flags } from '@oclif/command'
import { compileToLegacyIR } from 'apollo-codegen-core/lib/compiler/legacyIR';
import { buildClientSchema, DefinitionNode, GraphQLSchema, OperationDefinitionNode, Source } from 'graphql';


import { generateSource } from './codeGeneration'
import { promises, existsSync, readFileSync } from 'fs'
import { GraphQLDocument } from 'apollo-language-server/lib/document';
import { EndpointSchemaProvider } from 'apollo-language-server/lib/providers/schema/endpoint'
import { ToolError } from 'apollo-language-server';
const { resolve, join } = require('path');

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

function loadSchema(schemaPath: string): GraphQLSchema {
    if (!existsSync(schemaPath)) {
        throw new ToolError(`Cannot find GraphQL schema file: ${schemaPath}`);
    }
    const schemaData = JSON.parse(readFileSync(schemaPath, 'utf-8'));

    if (!schemaData.data && !schemaData.__schema) {
        throw new ToolError(
            "GraphQL schema file should contain a valid GraphQL introspection query result"
        );
    }
    return buildClientSchema(schemaData.data ? schemaData.data : schemaData);
}

function isObjectTypeDefinitionNode(node: DefinitionNode): node is OperationDefinitionNode {
    return node.kind === 'OperationDefinition'
}

const headersArrayToObject = (
    arr?: string[]
): Record<string, string> | undefined => {
    if (!arr) return;
    return arr
        .map(val => JSON.parse(val))
        .reduce((pre, next) => ({ ...pre, ...next }), {});
};

class GraphQLJuliaCodegen extends Command {
    static description = 'This utility generates Julia Types from GraphQL Operations and the GraphQL Schema.'

    static flags = {
        version: flags.version({ char: 'v' }),
        help: flags.help({ char: 'h' }),
        localSchemaFile: flags.string({ description: 'localSchemaFile' }),
        endpoint: flags.string({ description: 'graphql endpoint to introspect, for example https://api.github.com/graphql' }),
        source: flags.string({ description: 'source file/folder to generate from', required: true }),
        destination: flags.string({ description: 'destination file/folder to generate to', required: true }),
        header: flags.string({
            multiple: true,
            parse: header => {
                const separatorIndex = header.indexOf(":");
                const key = header.substring(0, separatorIndex).trim();
                const value = header.substring(separatorIndex + 1).trim();
                return JSON.stringify({ [key]: value });
            },
            description:
                "Additional header to send during introspection. May be used multiple times to add multiple headers. NOTE: The `--endpoint` flag is REQUIRED if using the `--header` flag."
        }),
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

        let schema: GraphQLSchema | undefined = undefined
        if (flags.endpoint) {
            // const headers = {}
            let headers: { [key: string]: string } = {}

            let real: string[] = (flags.header as unknown as string[]) || []

            real.forEach((s: string) => {
                const ob = JSON.parse(s)
                Object.keys(ob).forEach(k => {
                    headers[k] = ob[k]
                })
            })

            let provider = new EndpointSchemaProvider({
                name: 'donald duck',
                url: flags.endpoint,
                headers
            })
            schema = await provider.resolveSchema()
        } else if (flags.localSchemaFile) {
            schema = loadSchema(flags.localSchemaFile)
        } else {
            console.log('Please provide either the --localSchema="schema.json" OR the --endpoint="https://api.github.com/graphql" flag!')
            return
        }

        if (schema === undefined) {
            console.log('could not resolve GraphQL schema, not generating code')
            return
        }

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

                await promises.writeFile(join(flags.destination, name), output)
            }
        }


        console.log(`Done writing ${docCount} Julia files!`)
    }
}

export = GraphQLJuliaCodegen