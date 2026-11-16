// Local oxlint rules for conventions the built-in rules cannot express. Each rule replaces a line
// of AGENTS.md prose, so an agent learns the rule from the lint error instead of a document.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

// oxlint ships no plugin types; these cover the ESTree fields the rules read.
type Node = { type: string; parent?: Node; [key: string]: any };
type Context = {
  filename: string;
  report(descriptor: { node: Node; message: string }): void;
};
type Rule = { create(context: Context): Record<string, (node: any) => void> };

const keyName = (property: Node): string | undefined =>
  property.type === "Property" && !property.computed
    ? (property.key.name ?? property.key.value)
    : undefined;

const calleeName = (call: Node): string | undefined =>
  call.callee.type === "Identifier"
    ? call.callee.name
    : call.callee.type === "MemberExpression"
      ? call.callee.property.name
      : undefined;

const zodNamespaceImport: Rule = {
  create(context) {
    return {
      ImportDeclaration(node) {
        if (!/^zod(\/|$)/.test(node.source.value)) return;
        for (const specifier of node.specifiers) {
          if (specifier.type === "ImportSpecifier" && specifier.imported.name === "z") {
            context.report({
              node: specifier,
              message: 'Import zod as a namespace: `import * as z from "zod"`.',
            });
          }
        }
      },
    };
  },
};

// a subclass of Error is how JavaScript names an error type, so it stays allowed
const noEnumOrClass: Rule = {
  create(context) {
    const checkClass = (node: Node) => {
      if (node.superClass?.type === "Identifier" && node.superClass.name.endsWith("Error")) return;
      context.report({
        node,
        message: "Use functions and plain objects instead of a class (an Error subclass is fine).",
      });
    };
    return {
      TSEnumDeclaration(node) {
        context.report({
          node,
          message: "Use an `as const` object or a union instead of an enum.",
        });
      },
      ClassDeclaration: checkClass,
      ClassExpression: checkClass,
    };
  },
};

const noAsChild: Rule = {
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.name !== "asChild") return;
        context.report({
          node,
          message:
            "`asChild` is Radix's API and does nothing in Base UI: pass the element through `render` (`<DialogTrigger render={<Button />}>`).",
        });
      },
    };
  },
};

const suspenseQueriesEnabled: Rule = {
  create(context) {
    return {
      Property(node) {
        if (keyName(node) !== "enabled") return;
        for (let parent = node.parent; parent; parent = parent.parent) {
          if (parent.type === "CallExpression" && calleeName(parent) === "useSuspenseQueries") {
            context.report({
              node,
              message:
                "`useSuspenseQueries` has no `enabled`: a disabled query suspends forever. Fetch unconditionally and ignore the result when it does not apply.",
            });
            return;
          }
        }
      },
    };
  },
};

const moduleText = new Map<string, string>();

// a local import's source, "" when it is a package or cannot be found; `@/` is the file's `src/`
function readLocalModule(fromFile: string, source: string): string {
  let base: string;
  if (source.startsWith("@/")) {
    const src = fromFile.indexOf("/src/");
    if (src < 0) return "";
    base = join(fromFile.slice(0, src + 5), source.slice(2));
  } else if (source.startsWith(".")) {
    base = resolve(dirname(fromFile), source);
  } else {
    return "";
  }
  const cached = moduleText.get(base);
  if (cached !== undefined) return cached;
  let text = "";
  for (const path of [`${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) {
    if (existsSync(path)) {
      text = readFileSync(path, "utf8");
      break;
    }
  }
  moduleText.set(base, text);
  return text;
}

// a module in stores/ also exports plain hooks, so a hook counts only when Zustand's create makes it
const storeSelector: Rule = {
  create(context) {
    const hooks = new Set<string>();
    return {
      ImportDeclaration(node) {
        const named = node.specifiers.filter(
          (specifier: Node) =>
            specifier.type === "ImportSpecifier" && /^use[A-Z]/.test(specifier.imported.name),
        );
        if (named.length === 0) return;
        const text = readLocalModule(context.filename, node.source.value);
        for (const specifier of named) {
          if (new RegExp(`export const ${specifier.imported.name}\\s*=\\s*create\\b`).test(text)) {
            hooks.add(specifier.local.name);
          }
        }
      },
      CallExpression(node) {
        if (node.callee.type !== "Identifier" || !hooks.has(node.callee.name)) return;
        if (node.arguments.length > 0) return;
        context.report({
          node,
          message: `Read a Zustand store through a selector (\`${node.callee.name}((s) => s.field)\`): the whole store re-renders on every change.`,
        });
      },
    };
  },
};

const SUBTLE_TOKEN =
  /(^|[\s:"'`!])(?:bg|text|border|ring|outline|fill|stroke|from|via|to|divide|decoration|shadow)-[a-z0-9-]+-subtle\b/;

const noSubtleToken: Rule = {
  create(context) {
    const check = (node: Node, text: unknown) => {
      if (typeof text !== "string" || !SUBTLE_TOKEN.test(text)) return;
      context.report({
        node,
        message:
          "There is no `*-subtle` token: a tint is an opacity modifier on the fill (`bg-destructive/8`).",
      });
    };
    return {
      Literal: (node) => check(node, node.value),
      TemplateElement: (node) => check(node, node.value.cooked),
    };
  },
};

const LINK_WRITE_CALLS = new Set(["set", "values", "onConflictDoUpdate"]);

function touchesUserId(node: Node | undefined): boolean {
  if (!node) return false;
  switch (node.type) {
    case "ObjectExpression":
      return node.properties.some(
        (property: Node) => keyName(property) === "userId" || touchesUserId(property.value),
      );
    case "ConditionalExpression":
      return touchesUserId(node.consequent) || touchesUserId(node.alternate);
    case "LogicalExpression":
      return touchesUserId(node.left) || touchesUserId(node.right);
    case "ArrayExpression":
      return node.elements.some(touchesUserId);
    default:
      return false;
  }
}

function isUserAddressWrite(node: Node): boolean {
  for (let call = node; call?.type === "CallExpression"; call = call.callee.object) {
    if (call.callee.type !== "MemberExpression") return false;
    const name = call.callee.property.name;
    if ((name === "update" || name === "insert") && call.arguments[0]?.name === "userAddress") {
      return true;
    }
  }
  return false;
}

const userAddressLinkWrite: Rule = {
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.type !== "MemberExpression") return;
        if (!LINK_WRITE_CALLS.has(node.callee.property.name)) return;
        if (!touchesUserId(node.arguments[0]) || !isUserAddressWrite(node.callee.object)) return;
        context.report({
          node,
          message:
            "Change `user_address.user_id` only through `services/account/cosmo-link.ts` or `services/moderation/links.ts`: they keep `address_link_event` and the relink cooldown.",
        });
      },
    };
  },
};

// every cron job runs under safeRun, which holds its Valkey lock and logs a failure
const cronSafeRun: Rule = {
  create(context) {
    const wrapped = new Set<string>();
    const cronCalls: Node[] = [];
    const isSafeRun = (node: Node | undefined) =>
      node?.type === "CallExpression" && calleeName(node) === "safeRun";
    return {
      VariableDeclarator(node) {
        if (node.id.type === "Identifier" && isSafeRun(node.init)) wrapped.add(node.id.name);
      },
      CallExpression(node) {
        if (node.callee.type === "Identifier" && node.callee.name === "cron") cronCalls.push(node);
      },
      "Program:exit"() {
        for (const call of cronCalls) {
          const job = call.arguments[1];
          if (isSafeRun(job) || (job?.type === "Identifier" && wrapped.has(job.name))) continue;
          context.report({
            node: call,
            message:
              "Register a cron job through `safeRun(tag, job)`: it runs the job under its Valkey lock and logs a failure instead of crashing the worker.",
          });
        }
      },
    };
  },
};

export default {
  meta: { name: "repo" },
  rules: {
    "zod-namespace-import": zodNamespaceImport,
    "no-enum-or-class": noEnumOrClass,
    "no-as-child": noAsChild,
    "suspense-queries-enabled": suspenseQueriesEnabled,
    "store-selector": storeSelector,
    "no-subtle-token": noSubtleToken,
    "user-address-link-write": userAddressLinkWrite,
    "cron-safe-run": cronSafeRun,
  },
};
