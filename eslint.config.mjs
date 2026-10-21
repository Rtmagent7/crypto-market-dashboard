import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Layer rules (CLAUDE.md, spec Section 7): route handler → service → repository → infra.
const UI_MAY_NOT_IMPORT = [
  {
    group: ["@/infra/*", "@/infra/**"],
    message: "UI never imports from infra/. Go through an /api/* route or a service.",
  },
  {
    group: ["@/modules/*/*.repository", "@/modules/*/*.repository.*"],
    message: "Only services call repositories.",
  },
];

const ONLY_REPOSITORIES_MAY_IMPORT = [
  {
    group: ["@/infra/providers/*", "@/infra/outbound/*"],
    message: "Only modules/*/*.repository.ts may reach providers, and only via callWithBudget.",
  },
];

const FRAMEWORK_FREE = {
  group: ["next", "next/*", "react", "react-dom"],
  message: "modules/ is framework-free.",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "react/no-danger": "error",
    },
  },
  {
    // Vendored shadcn/ui primitives keep their generated shape; restyle via tokens only.
    files: ["src/components/ui/**"],
    rules: { "@typescript-eslint/explicit-function-return-type": "off" },
  },
  {
    files: ["src/app/**", "src/config/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: ONLY_REPOSITORIES_MAY_IMPORT }],
    },
  },
  {
    files: ["src/components/**", "src/hooks/**", "src/stores/**", "src/app/(dashboard)/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [...UI_MAY_NOT_IMPORT, ...ONLY_REPOSITORIES_MAY_IMPORT] },
      ],
    },
  },
  {
    // Service + repository layers stay framework-free and never fetch directly.
    files: ["src/modules/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [FRAMEWORK_FREE, ...ONLY_REPOSITORIES_MAY_IMPORT] },
      ],
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "Provider calls go through infra/providers via callWithBudget." },
      ],
    },
  },
  {
    files: ["src/modules/*/*.repository.ts"],
    rules: { "no-restricted-imports": ["error", { patterns: [FRAMEWORK_FREE] }] },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
