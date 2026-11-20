import { build, context } from "esbuild";

const options = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "dist/extension.cjs",
  platform: "node",
  target: "node20",
  format: "cjs",
  sourcemap: true,
  minify: !process.argv.includes("--watch"),
  external: ["vscode"],
  logLevel: "info"
};

if (process.argv.includes("--watch")) {
  const ctx = await context(options);
  await ctx.watch();
} else {
  await build(options);
}
