// kamae の決まりのうち、oxlint の組み込みのルールでは確かめられないもの（docs/lint-and-format.md の2章）
import { definePlugin, defineRule } from "vite-plus/lint/plugins";

const pathSegments = (filename: string) => filename.split(/[\\/]/);
// src/server/ より後ろのディレクトリ。チェックアウト先の親のディレクトリの名前を見ないようにする
const serverDirectories = (filename: string) => {
  const path = `/${filename.replaceAll("\\", "/")}`;
  const marker = "/src/server/";
  const start = path.lastIndexOf(marker);
  return start === -1
    ? []
    : path
        .slice(start + marker.length)
        .split("/")
        .slice(0, -1);
};
const baseName = (filename: string) => pathSegments(filename).at(-1) ?? "";
const scriptFile = (name: string) => new RegExp(`^(?:${name})\\.[cm]?[jt]sx?$`);

const noPortsDir = defineRule({
  meta: {
    type: "suggestion",
    messages: {
      noPortsDir:
        "port/ や ports/ のディレクトリを作らない。読み書きの型は、それを使うドメインの概念の隣に置く",
    },
  },
  create(context) {
    return {
      Program(node) {
        const directories = serverDirectories(context.filename);
        if (directories.some((directory) => directory === "port" || directory === "ports")) {
          context.report({ messageId: "noPortsDir", node });
        }
      },
    };
  },
});

const catchAllFile = scriptFile("types|models|domain");

const noCatchAllFile = defineRule({
  meta: {
    type: "suggestion",
    messages: {
      noCatchAllFile: "寄せ集めのファイルを作らない。1つのファイルには1つの概念を置く",
    },
  },
  create(context) {
    return {
      Program(node) {
        if (catchAllFile.test(baseName(context.filename))) {
          context.report({ messageId: "noCatchAllFile", node });
        }
      },
    };
  },
});

const indexFile = scriptFile("index");

const indexReexportOnly = defineRule({
  meta: {
    type: "suggestion",
    messages: {
      indexReexportOnly: "index.ts には re-export（export ... from）だけを書く",
    },
  },
  create(context) {
    return {
      Program(node) {
        if (!indexFile.test(baseName(context.filename))) {
          return;
        }
        for (const statement of node.body) {
          const isReexport =
            statement.type === "ExportAllDeclaration" ||
            (statement.type === "ExportNamedDeclaration" && statement.source !== null);
          if (!isReexport) {
            context.report({ messageId: "indexReexportOnly", node: statement });
          }
        }
      },
    };
  },
});

const noClass = defineRule({
  meta: {
    type: "suggestion",
    messages: {
      noClass: "class を使わない。状態は判別可能なユニオン型と、同じ名前のオブジェクトの関数で表す",
    },
  },
  create(context) {
    return {
      ClassDeclaration(node) {
        context.report({ messageId: "noClass", node });
      },
      ClassExpression(node) {
        context.report({ messageId: "noClass", node });
      },
    };
  },
});

export default definePlugin({
  meta: { name: "enikki" },
  rules: {
    "index-reexport-only": indexReexportOnly,
    "no-catch-all-file": noCatchAllFile,
    "no-class": noClass,
    "no-ports-dir": noPortsDir,
  },
});
