import baseConfig from "@repo/lint/oxlint.config";
import { defineConfig, type OxlintConfig } from "oxlint";

const UI_KIT_PATTERNS = [
  {
    group: ["@radix-ui/*"],
    message:
      "The UI kit is Base UI: add a component as `@cnippet/<name>` (components/ui/README.md).",
  },
  {
    group: ["lucide-react", "react-icons", "react-icons/*", "@tabler/*", "@heroicons/*"],
    message: "Icons come from `@phosphor-icons/react`.",
  },
];

// an import of the feature by alias or by relative path from one or two folders down
const featurePaths = (feature: string, file = "**") => [
  `@/features/${feature}/${file}`,
  `../${feature}/${file}`,
  `../../${feature}/${file}`,
];

// type-only imports stay allowed: they are erased at build time, as import/no-cycle treats them
const featuresAbove = (features: string[], except: string[] = []) => ({
  group: [
    ...features.flatMap((feature) => featurePaths(feature)),
    ...except.map((path) => `!${path}`),
  ],
  allowTypeImports: true,
  message:
    "features/ import one way, list < offers < chat < trade: move the shared symbol down (apps/web/AGENTS.md, Feature order).",
});

type ImportPattern = { group: string[]; message: string; allowTypeImports?: boolean };

const restrictImports = (
  ...patterns: ImportPattern[]
): NonNullable<OxlintConfig["rules"]>["no-restricted-imports"] => [
  "error",
  { patterns: [...UI_KIT_PATTERNS, ...patterns] },
];

export default defineConfig({
  extends: [baseConfig],
  ignorePatterns: [
    "node_modules",
    ".turbo",
    "dist",
    "src/routeTree.gen.ts",
    "src/paraglide",
    ".tanstack",
  ],
  rules: {
    // a stray non-component export makes Fast Refresh reload the page on every edit of the file
    "react/only-export-components": ["warn", { allowConstantExport: true }],
    "no-restricted-imports": restrictImports(),
    "repo/no-as-child": "error",
    "repo/suspense-queries-enabled": "error",
    "repo/store-selector": "error",
    "repo/no-subtle-token": "error",
  },
  overrides: [
    {
      files: ["src/features/list/**"],
      rules: {
        "no-restricted-imports": restrictImports(featuresAbove(["offers", "chat", "trade"])),
      },
    },
    {
      // an offer is a chat message, so offers reads chat's queries and its refusal wording
      files: ["src/features/offers/**"],
      rules: {
        "no-restricted-imports": restrictImports(
          featuresAbove(["trade"]),
          featuresAbove(
            ["chat"],
            [...featurePaths("chat", "queries"), ...featurePaths("chat", "format")],
          ),
        ),
      },
    },
    {
      files: ["src/features/chat/**"],
      rules: { "no-restricted-imports": restrictImports(featuresAbove(["trade"])) },
    },
    {
      // list's page shell carries Post it and MessageButton
      files: [
        "src/features/list/list-view.tsx",
        "src/features/list/list-header.tsx",
        "src/features/list/edit-list-dialog.tsx",
        "src/features/list/create-list-dialog.tsx",
      ],
      rules: { "no-restricted-imports": restrictImports(featuresAbove(["offers"])) },
    },
    {
      // TanStack's router plugin handles route files' HMR
      files: ["src/routes/**"],
      rules: { "react/only-export-components": "off" },
    },
    {
      // vendored verbatim from the registry, lucide icons and classes included
      files: ["src/components/ui/**"],
      rules: {
        "react/only-export-components": "off",
        "no-restricted-imports": "off",
        "repo/no-enum-or-class": "off",
      },
    },
    {
      // vendored verbatim; the effect is FileUploadItemPreview's object URL, a part no caller uses
      files: ["src/components/ui/file-upload.tsx"],
      rules: { "react/set-state-in-effect": "off" },
    },
  ],
});
