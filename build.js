const esbuild = require('esbuild');
const fs = require('fs/promises');
const path = require('path');

const args = new Set(process.argv.slice(2));
const watchMode = args.has('--watch');

const rootDir = __dirname;
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');

const bundles = [
  {
    name: 'shared',
    sourceDir: path.join(srcDir, 'shared'),
    outfile: path.join(distDir, 'shared', 'shared.js'),
    platform: 'neutral'
  },
  {
    name: 'server',
    sourceDir: path.join(srcDir, 'server'),
    outfile: path.join(distDir, 'server', 'main.js'),
    platform: 'neutral'
  },
  {
    name: 'client',
    sourceDir: path.join(srcDir, 'client'),
    outfile: path.join(distDir, 'client', 'main.js'),
    platform: 'neutral'
  },
  {
    name: 'web',
    sourceDir: path.join(srcDir, 'web'),
    outfile: path.join(distDir, 'web', 'app.js'),
    platform: 'browser'
  }
];

const typeScriptExtensions = new Set(['.ts', '.tsx', '.d.ts']);
let buildQueued = false;
let building = false;
let watchFallbackTimer;

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function isTypeScriptFile(filePath) {
  return filePath.endsWith('.d.ts') || typeScriptExtensions.has(path.extname(filePath));
}

async function findTypeScriptFiles(currentDir) {
  if (!(await pathExists(currentDir))) {
    return [];
  }

  const files = [];
  const items = await fs.readdir(currentDir, { withFileTypes: true });

  for (const item of items) {
    const sourcePath = path.join(currentDir, item.name);

    if (item.isDirectory()) {
      files.push(...await findTypeScriptFiles(sourcePath));
      continue;
    }

    if (item.isFile() && isTypeScriptFile(sourcePath) && !sourcePath.endsWith('.d.ts')) {
      files.push(sourcePath);
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

function toImportPath(filePath) {
  const relativePath = path.relative(rootDir, filePath).split(path.sep).join('/');
  return `./${relativePath}`;
}

async function bundleFolders() {
  for (const item of bundles) {
    const entryFiles = await findTypeScriptFiles(item.sourceDir);

    if (entryFiles.length === 0) {
      console.log(`[skip] ${item.name}: no TypeScript files found in ${path.relative(rootDir, item.sourceDir)}.`);
      continue;
    }

    console.log(`[build] ${item.name}: bundling ${entryFiles.length} file(s) from ${path.relative(rootDir, item.sourceDir)} -> ${path.relative(rootDir, item.outfile)}`);

    await esbuild.build({
      stdin: {
        contents: entryFiles.map((filePath) => `import '${toImportPath(filePath)}';`).join('\n'),
        resolveDir: rootDir,
        sourcefile: `${item.name}-bundle-entry.ts`,
        loader: 'ts'
      },
      outfile: item.outfile,
      bundle: true,
      format: 'iife',
      platform: item.platform,
      target: 'es2022',
      sourcemap: false,
      treeShaking: false,
      logLevel: 'silent',
      tsconfig: path.join(rootDir, 'tsconfig.json')
    });
  }
}

async function copyAssetsFromDir(currentDir) {
  const items = await fs.readdir(currentDir, { withFileTypes: true });

  for (const item of items) {
    const sourcePath = path.join(currentDir, item.name);
    const relativePath = path.relative(srcDir, sourcePath);
    const targetPath = path.join(distDir, relativePath);

    if (item.isDirectory()) {
      await copyAssetsFromDir(sourcePath);
      continue;
    }

    if (!item.isFile() || isTypeScriptFile(sourcePath)) {
      continue;
    }

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.copyFile(sourcePath, targetPath);
    console.log(`[copy] ${path.relative(rootDir, sourcePath)} -> ${path.relative(rootDir, targetPath)}`);
  }
}

async function copyAssets() {
  if (!(await pathExists(srcDir))) {
    console.log('[skip] src directory does not exist.');
    return;
  }

  console.log('[copy] Copying non-TypeScript assets from src to dist.');
  await copyAssetsFromDir(srcDir);
}

async function buildAll() {
  if (building) {
    buildQueued = true;
    return;
  }

  building = true;

  try {
    console.log('[build] Starting build.');
    await fs.rm(distDir, { recursive: true, force: true });
    await fs.mkdir(distDir, { recursive: true });
    await bundleFolders();
    await copyAssets();
    console.log('[build] Build complete.');
  } catch (error) {
    console.error('[error] Build failed.');
    console.error(error);
    if (!watchMode) {
      process.exitCode = 1;
    }
  } finally {
    building = false;
    if (buildQueued) {
      buildQueued = false;
      await buildAll();
    }
  }
}

async function watchSrc() {
  console.log('[watch] Watching src for changes.');

  let watcher;

  try {
    watcher = require('fs').watch(srcDir, { recursive: true }, () => {
      buildAll();
    });
  } catch {
    console.log('[watch] Recursive file watching is unavailable. Polling src instead.');
    watchFallbackTimer = setInterval(() => {
      buildAll();
    }, 1000);
  }

  process.on('SIGINT', () => {
    if (watcher) {
      watcher.close();
    }

    if (watchFallbackTimer) {
      clearInterval(watchFallbackTimer);
    }

    process.exit(0);
  });
}

async function main() {
  await fs.mkdir(srcDir, { recursive: true });
  await buildAll();

  if (watchMode) {
    await watchSrc();
  }
}

main();
