import { readdirSync } from "node:fs";
import { dirname, join, parse, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const srcRoot = join(process.cwd(), "src");

function findTests(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return findTests(path);
    }

    return entry.isFile() && entry.name.endsWith(".test.ts") ? [path] : [];
  });
}

const testFiles = findTests(srcRoot).map((path) =>
  relative(process.cwd(), path),
);

if (testFiles.length === 0) {
  throw new Error("No web test files found");
}

function findTsxLoader(startDirectory) {
  let directory = startDirectory;
  const root = parse(directory).root;

  while (true) {
    const pnpmDirectory = join(directory, "node_modules", ".pnpm");

    try {
      const packageDirectory = readdirSync(pnpmDirectory).find((entry) =>
        entry.startsWith("tsx@"),
      );

      if (packageDirectory) {
        return join(
          pnpmDirectory,
          packageDirectory,
          "node_modules",
          "tsx",
          "dist",
          "loader.mjs",
        );
      }
    } catch {
      // Keep walking up until the workspace root is found.
    }

    if (directory === root) {
      throw new Error("Could not locate tsx loader in workspace node_modules");
    }

    directory = dirname(directory);
  }
}

const result = spawnSync(
  process.execPath,
  [
    "--no-warnings",
    "--import",
    pathToFileURL(findTsxLoader(process.cwd())).href,
    "--test",
    ...testFiles,
  ],
  {
    stdio: "inherit",
    shell: false,
  },
);

process.exit(result.status ?? 1);
