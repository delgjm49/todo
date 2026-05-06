import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { finished } from "node:stream/promises";
import { run } from "node:test";
import { tap } from "node:test/reporters";

const compiledRoot = resolve(".test-dist");
const testFiles = [];

function collectTests(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      collectTests(fullPath);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".test.js")) {
      testFiles.push(fullPath);
    }
  }
}

collectTests(compiledRoot);

if (testFiles.length === 0) {
  console.error(`No compiled test files found under ${compiledRoot}`);
  process.exitCode = 1;
} else {
  const stream = run({
    files: testFiles,
    concurrency: 1,
    isolation: "none",
  });

  let allPassed = true;
  stream.on("test:summary", (summary) => {
    allPassed = allPassed && summary.success;
  });

  const reporter = stream.compose(tap);
  reporter.pipe(process.stdout);
  await finished(reporter);
  process.exitCode = allPassed ? 0 : 1;
}
