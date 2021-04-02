# graphql-julia-codegen

This is a cli that takes GraphQL queries and a GraphQL schema and generates Julia Named Tuples.

### Usage
- `export github_access_token=YOUR_ACCESS_TOKEN`
- `graphql-julia-codegen --source="src/" --destination="src/generated/" --endpoint="https://api.github.com/graphql" --header="Authorization:Bearer $github_access_token"`

