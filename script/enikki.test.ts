import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, it } from "vite-plus/test";

import plugin from "./enikki.ts";

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester();
const rules = plugin.rules;
const domain = "web/src/server/domain";

tester.run("no-ports-dir", rules["no-ports-dir"], {
  valid: [
    { code: "export {};", filename: `${domain}/task/task-store.ts` },
    // チェックアウト先の親に ports があっても、src/server/ の中に ports がなければ通す
    { code: "export {};", filename: `/tmp/ports/enikki/${domain}/review.ts` },
  ],
  invalid: [
    { code: "export {};", errors: 1, filename: "web/src/server/ports/task-store.ts" },
    { code: "export {};", errors: 1, filename: `${domain}/port/task-store.ts` },
  ],
});

tester.run("no-catch-all-file", rules["no-catch-all-file"], {
  valid: [
    { code: "export {};", filename: `${domain}/task.ts` },
    { code: "export {};", filename: `${domain}/task-types.ts` },
  ],
  invalid: [
    { code: "export {};", errors: 1, filename: `${domain}/types.ts` },
    { code: "export {};", errors: 1, filename: `${domain}/models.ts` },
    { code: "export {};", errors: 1, filename: "web/src/server/domain.ts" },
  ],
});

tester.run("index-reexport-only", rules["index-reexport-only"], {
  valid: [
    {
      code: 'export * from "./task.ts";\nexport { Task } from "./task.ts";\nexport type { TaskStore } from "./task-store.ts";',
      filename: `${domain}/index.ts`,
    },
    { code: "export const a = 1;", filename: `${domain}/task.ts` },
  ],
  invalid: [
    { code: "export const a = 1;", errors: 1, filename: `${domain}/index.ts` },
    {
      code: 'import { Task } from "./task.ts";\nexport { Task };',
      errors: 2,
      filename: `${domain}/index.ts`,
    },
  ],
});

tester.run("no-class", rules["no-class"], {
  valid: [{ code: "type Task = Readonly<{ kind: 'Todo' }>;", filename: `${domain}/task.ts` }],
  invalid: [
    { code: "class Task {}", errors: 1, filename: `${domain}/task.ts` },
    { code: "const Task = class {};", errors: 1, filename: `${domain}/task.ts` },
  ],
});
