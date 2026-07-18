import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "..");
const runtimePackageDirectories = [
  "packages/api",
  "packages/auth",
  "packages/db",
  "packages/env",
] as const;
const sourceDirectories = [
  "apps/server/src",
  "packages/api/src",
  "packages/auth/src",
  "packages/db/src",
] as const;

type ConditionalExport = string | Record<string, string>;
type PackageManifest = {
  name: string;
  main?: string;
  module?: string;
  exports: Record<string, ConditionalExport>;
};

function collectFiles(directory: string, predicate: (path: string) => boolean) {
  if (!existsSync(directory)) return [];

  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      files.push(...collectFiles(path, predicate));
    } else if (predicate(path)) {
      files.push(path);
    }
  }
  return files;
}

function readManifest(packageDirectory: string) {
  const manifestPath = resolve(
    repositoryRoot,
    packageDirectory,
    "package.json",
  );
  return JSON.parse(readFileSync(manifestPath, "utf8")) as PackageManifest;
}

const packagesByName = new Map(
  runtimePackageDirectories.map((packageDirectory) => {
    const manifest = readManifest(packageDirectory);
    return [manifest.name, { manifest, packageDirectory }] as const;
  }),
);

function runtimeTarget(exportEntry: ConditionalExport) {
  if (typeof exportEntry === "string") return exportEntry;
  return exportEntry.import ?? exportEntry.default;
}

function resolvePackageExport(specifier: string) {
  const [scope, packageSegment, ...subpathSegments] = specifier.split("/");
  const packageName = `${scope}/${packageSegment}`;
  const packageData = packagesByName.get(packageName);
  if (!packageData) {
    throw new Error(`Unknown internal workspace package: ${packageName}`);
  }

  const exportKey =
    subpathSegments.length === 0 ? "." : `./${subpathSegments.join("/")}`;
  const exactExport = packageData.manifest.exports[exportKey];
  if (exactExport) {
    return {
      packageDirectory: packageData.packageDirectory,
      target: runtimeTarget(exactExport),
    };
  }

  for (const [pattern, exportEntry] of Object.entries(
    packageData.manifest.exports,
  )) {
    const wildcardIndex = pattern.indexOf("*");
    if (wildcardIndex === -1) continue;

    const prefix = pattern.slice(0, wildcardIndex);
    const suffix = pattern.slice(wildcardIndex + 1);
    if (!exportKey.startsWith(prefix) || !exportKey.endsWith(suffix)) continue;

    const wildcard = exportKey.slice(
      prefix.length,
      exportKey.length - suffix.length,
    );
    return {
      packageDirectory: packageData.packageDirectory,
      target: runtimeTarget(exportEntry)?.replace("*", wildcard),
    };
  }

  throw new Error(`${packageName} does not export ${exportKey}`);
}

function assertRuntimeFile(
  packageDirectory: string,
  target: string | undefined,
  source: string,
) {
  if (!target) {
    throw new Error(`No import/default runtime export for ${source}`);
  }
  if (/\.(?:[cm]?ts|tsx)$/.test(target)) {
    throw new Error(
      `Runtime export points to source code: ${source} -> ${target}`,
    );
  }

  const resolvedTarget = resolve(repositoryRoot, packageDirectory, target);
  if (!existsSync(resolvedTarget)) {
    throw new Error(
      `Runtime export target is missing: ${source} -> ${relative(
        repositoryRoot,
        resolvedTarget,
      )}`,
    );
  }
}

for (const { manifest, packageDirectory } of packagesByName.values()) {
  for (const [field, target] of [
    ["main", manifest.main],
    ["module", manifest.module],
  ] as const) {
    if (!target) continue;
    assertRuntimeFile(packageDirectory, target, `${manifest.name}#${field}`);
  }
}

const internalImportPattern =
  /\b(?:from\s+|import\s*\(\s*)["'](@my-better-t-app\/[^"']+)["']/g;
for (const sourceDirectory of sourceDirectories) {
  const sourceRoot = resolve(repositoryRoot, sourceDirectory);
  for (const sourceFile of collectFiles(
    sourceRoot,
    (path) => path.endsWith(".ts") && !path.endsWith(".test.ts"),
  )) {
    const source = readFileSync(sourceFile, "utf8");
    for (const match of source.matchAll(internalImportPattern)) {
      const specifier = match[1];
      if (!specifier) continue;
      const resolvedExport = resolvePackageExport(specifier);
      assertRuntimeFile(
        resolvedExport.packageDirectory,
        resolvedExport.target,
        `${relative(repositoryRoot, sourceFile)} imports ${specifier}`,
      );
    }
  }
}

const relativeImportPattern =
  /\b(?:from\s+|import\s*\(\s*)["'](\.{1,2}\/[^"']+)["']/g;
for (const packageDirectory of runtimePackageDirectories) {
  const distDirectory = resolve(repositoryRoot, packageDirectory, "dist");
  for (const emittedFile of collectFiles(distDirectory, (path) =>
    path.endsWith(".js"),
  )) {
    const emittedSource = readFileSync(emittedFile, "utf8");
    for (const match of emittedSource.matchAll(relativeImportPattern)) {
      const specifier = match[1]?.split(/[?#]/, 1)[0];
      if (!specifier || extname(specifier)) continue;
      throw new Error(
        `Extensionless relative ESM import in ${relative(
          repositoryRoot,
          emittedFile,
        )}: ${specifier}`,
      );
    }
  }
}

const serverBundle = resolve(repositoryRoot, "apps/server/dist/index.mjs");
if (!existsSync(serverBundle)) {
  throw new Error("Server bundle is missing: apps/server/dist/index.mjs");
}

const bundleSource = readFileSync(serverBundle, "utf8");
if (internalImportPattern.test(bundleSource)) {
  throw new Error("Server bundle still contains internal workspace imports");
}

console.log("Production workspace exports and emitted imports are valid.");
