import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function runCase(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function collectTypeScriptFiles(dir: string, fileList: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "_generated") continue;
      collectTypeScriptFiles(fullPath, fileList);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".ts")) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

runCase("convex functions do not use dynamic imports", () => {
  const convexDir = path.resolve(process.cwd(), "convex");
  const files = collectTypeScriptFiles(convexDir);

  const offenders = files
    .map((file) => ({
      file,
      content: fs.readFileSync(file, "utf8"),
    }))
    .filter(({ content }) => content.includes("await import("))
    .map(({ file }) => path.relative(process.cwd(), file));

  assert.equal(
    offenders.length,
    0,
    `Dynamic imports are not allowed in Convex source. Found in: ${offenders.join(", ")}`
  );
});
