# graphql-julia-codegen

![image](https://user-images.githubusercontent.com/7853605/113448559-16cad300-93ca-11eb-94cd-9505b88590ef.png)


This is a cli that takes GraphQL queries and a GraphQL schema and generates Julia Named Tuples. [Blog Post](https://www.lauriumlabs.com/blog/julia-code-generation-with-graphql)

### Usage
- `npm install -g graphql-julia-codegen@latest`
- `export github_access_token=YOUR_ACCESS_TOKEN`
- `graphql-julia-codegen --source="src/" --destination="src/generated/" --endpoint="https://api.github.com/graphql" --header="Authorization:Bearer $github_access_token"`

See https://github.com/laurium-labs/GithubGraphQLExample.jl for an example project that consumes the GitHub GraphQL api


### Development

- `./bin/run` to run latest code in `src`
- `./node_modules/typescript/bin/tsc` to build
- `yarn publish` to publish to npm

