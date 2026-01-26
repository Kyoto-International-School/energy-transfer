import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

const appRules = {
  quotes: [
    "error",
    "double",
    {
      allowTemplateLiterals: true,
      avoidEscape: true,
    },
  ],
  "max-lines": ["warn", { max: 500, skipBlankLines: true, skipComments: true }],
  "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],
};

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{js,jsx}"],
    ignores: ["**/node_modules/**", "**/dist/**", "wiki/**"],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    rules: {
      ...appRules,
    },
  },
]);
