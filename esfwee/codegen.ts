import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "https://graphql.anilist.co",
  documents: ["app/**/*.{ts,tsx}", "*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
  generates: {
    "./__generated__/graphql.ts": {
      plugins: [
        "typescript",
        "typescript-operations",
      ],
      config: {
        avoidOptionals: true,
      },
    },
  },
};

export default config;
