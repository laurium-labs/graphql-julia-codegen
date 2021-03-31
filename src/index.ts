import { Command, flags } from '@oclif/command'
import { Input } from '@oclif/parser/lib/args'
import { compileToLegacyIR } from 'apollo-codegen-core/lib/compiler/legacyIR';
import { loadSchema } from 'apollo-codegen-core/lib/loading';
import { DefinitionNode, DocumentNode, GraphQLSchema, isTypeDefinitionNode, Kind, ObjectTypeDefinitionNode, OperationDefinitionNode, Source, TypeDefinitionNode } from 'graphql';

import { extractGraphQLDocumentsFromJuliaStrings } from './codegen'

import { generateSource } from './codeGeneration'
import { formatDiagnostic } from 'typescript';
import { FileSet } from 'apollo-language-server/lib/fileSet';
import { promises } from 'fs'
import { GraphQLDocument } from 'apollo-language-server/lib/document';
const { resolve } = require('path');

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
    static description = 'describe the command here'

    static flags = {
        // add --version flag to show CLI version
        version: flags.version({ char: 'v' }),
        help: flags.help({ char: 'h' }),
        localSchemaFile: flags.string({ description: 'localSchemaFile', required: true }),
        source: flags.string({ description: 'source file/folder to generate from', required: true }),
        destination: flags.string({ description: 'destination file/folder to generate to', required: true }),
    }

    async run() {
        const { args, flags } = this.parse(GraphQLJuliaCodegen)

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
                //console.log(output)
            }


        }


        console.log(`Done writing ${docCount} Julia files!`)
    }
}

export = GraphQLJuliaCodegen