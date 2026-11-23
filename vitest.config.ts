import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/tests/**/*.test.ts"]
  },
  resolve: {
    alias: {
      // Run tests against core's sources, so the suite does not depend on a
      // prior build of packages/core/dist (a fresh clone has none).
      "@chatgpt-md-export/core": path.resolve(
        import.meta.dirname,
        "packages/core/src/index.ts"
      ),
      // The real "vscode" module only exists inside a running editor, so the
      // extension's pure logic is tested against a stub of the API it uses.
      vscode: path.resolve(
        import.meta.dirname,
        "packages/extension/tests/vscode-stub.ts"
      )
    }
  }
});
