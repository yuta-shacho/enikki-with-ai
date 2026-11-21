import cloudflare from "@cloudflare/oxlint-config";
import { defineConfig } from "vite-plus";

// lint と整形の両方から外す場所（docs/lint-and-format.md の4章）
const ignorePatterns = [
  ".claude/skills/**",
  ".github/ISSUE_TEMPLATE/**",
  "docs/diagrams/**",
  "web/AGENTS.md",
  "web/db/migrations/**",
];

const server = "web/src/server";

// D1 と Drizzle に触れるモジュール。D1 を読み書きするのは adapter/ だけにする
const dbModules = ["void/db", "void/schema-*", "void/drizzle-*", "drizzle-orm", "drizzle-orm/*"];

export default defineConfig({
  fmt: {
    ignorePatterns,
    sortImports: true,
  },
  lint: {
    ...cloudflare,
    ignorePatterns: [...(cloudflare.ignorePatterns ?? []), ...ignorePatterns],
    jsPlugins: [
      ...(cloudflare.jsPlugins ?? []),
      { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
      { name: "enikki", specifier: "./lint/enikki.ts" },
    ],
    options: { ...cloudflare.options, typeAware: true, typeCheck: true },
    rules: { ...cloudflare.rules, "vite-plus/prefer-vite-plus-imports": "error" },
    // 同じファイルに当たる override は、後ろに書いたほうが使われる
    overrides: [
      ...(cloudflare.overrides ?? []),
      {
        files: ["web/**"],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              patterns: [
                { group: ["void/db"], message: "D1 を読み書きするのは adapter/ だけにする" },
              ],
            },
          ],
        },
      },
      {
        files: [`${server}/adapter/**`, "web/db/**"],
        rules: { "no-restricted-imports": "off" },
      },
      {
        files: [`${server}/**`],
        rules: {
          "enikki/index-reexport-only": "error",
          "enikki/no-catch-all-file": "error",
          "enikki/no-ports-dir": "error",
          "import/no-cycle": "error",
          "typescript/consistent-type-assertions": ["error", { assertionStyle: "never" }],
          "typescript/consistent-type-definitions": ["error", "type"],
          "typescript/method-signature-style": ["error", "property"],
        },
      },
      {
        files: [`${server}/domain/**`],
        rules: {
          "enikki/no-class": "error",
          "no-restricted-imports": [
            "error",
            {
              patterns: [
                {
                  group: [
                    "**/usecase/**",
                    "**/adapter/**",
                    "**/db/schema",
                    "**/db/schema.ts",
                    "@schema",
                  ],
                  message: "domain/ は usecase/、adapter/、db/schema.ts を import しない",
                },
                { group: dbModules, message: "domain/ は D1 と Drizzle を import しない" },
              ],
            },
          ],
        },
      },
      {
        // shortcut: void init の見本の表を使っている。DB の設計の表に置き換えたら外す
        files: ["web/pages/index.server.ts"],
        rules: { "no-restricted-imports": "off" },
      },
    ],
  },
  test: {
    include: ["lint/**/*.test.ts"],
  },
});
