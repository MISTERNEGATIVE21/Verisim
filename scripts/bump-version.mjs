#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Read current version from package.json
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const currentVersion = pkg.version || '1.0.0';

// 2. Parse arguments
const args = process.argv.slice(2);
let bumpType = 'patch';
let createGitCommit = false;
let createGitTag = false;

for (const arg of args) {
  if (arg === '--git' || arg === '-g') {
    createGitCommit = true;
    createGitTag = true;
  } else if (arg === '--tag' || arg === '-t') {
    createGitTag = true;
  } else if (!arg.startsWith('-')) {
    bumpType = arg;
  }
}

function calculateNextVersion(current, type) {
  // If user provided explicit semver string (e.g. 6.0.1)
  if (/^\d+\.\d+\.\d+.*$/.test(type)) {
    return type.replace(/^v/, '');
  }

  const parts = current.split('.').map(n => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);

  if (type === 'major') {
    return `${parts[0] + 1}.0.0`;
  } else if (type === 'minor') {
    return `${parts[0]}.${parts[1] + 1}.0`;
  } else {
    // patch is default
    return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
  }
}

const nextVersion = calculateNextVersion(currentVersion, bumpType);
console.log(`\n📦 Bumping Verisim version: ${currentVersion} ➔ ${nextVersion}\n`);

// 3. Update package.json
pkg.version = nextVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`  ✓ Updated package.json`);

// 4. Update VERSION
const versionFilePath = path.join(rootDir, 'VERSION');
fs.writeFileSync(versionFilePath, `${nextVersion}\n`);
console.log(`  ✓ Updated VERSION`);

// 5. Update src-tauri/tauri.conf.json
const tauriConfPath = path.join(rootDir, 'src-tauri', 'tauri.conf.json');
if (fs.existsSync(tauriConfPath)) {
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
  tauriConf.version = nextVersion;
  fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
  console.log(`  ✓ Updated src-tauri/tauri.conf.json`);
}

// 6. Update src-tauri/Cargo.toml
const cargoTomlPath = path.join(rootDir, 'src-tauri', 'Cargo.toml');
if (fs.existsSync(cargoTomlPath)) {
  let cargoContent = fs.readFileSync(cargoTomlPath, 'utf8');
  cargoContent = cargoContent.replace(
    /(^\[package\][\s\S]*?^version\s*=\s*")([^"]+)(")/m,
    `$1${nextVersion}$3`
  );
  fs.writeFileSync(cargoTomlPath, cargoContent);
  console.log(`  ✓ Updated src-tauri/Cargo.toml`);
}

// 7. Optional Git commit & tag
if (createGitCommit) {
  try {
    const toAdd = ['package.json', 'VERSION', 'src-tauri/tauri.conf.json', 'src-tauri/Cargo.toml'];
    if (fs.existsSync(path.join(rootDir, 'src-tauri', 'Cargo.lock'))) {
      toAdd.push('src-tauri/Cargo.lock');
    }
    execSync(`git add ${toAdd.join(' ')}`, { cwd: rootDir, stdio: 'inherit' });
    execSync(`git commit -m "chore(release): bump version to v${nextVersion}"`, { cwd: rootDir, stdio: 'inherit' });
    console.log(`  ✓ Created git commit: chore(release): bump version to v${nextVersion}`);

    if (createGitTag) {
      execSync(`git tag -a "v${nextVersion}" -m "Release v${nextVersion}"`, { cwd: rootDir, stdio: 'inherit' });
      console.log(`  ✓ Created git tag: v${nextVersion}`);
    }
  } catch (err) {
    console.error(`  ⚠ Git action failed: ${err.message}`);
  }
}

console.log(`\n🎉 Successfully bumped version to ${nextVersion}!`);
console.log(`Next steps:`);
console.log(`  • To build:   bun run build:appimage`);
console.log(`  • To commit:  git commit -am "chore(release): bump to v${nextVersion}"`);
console.log(`  • To tag:     git tag v${nextVersion} && git push --tags\n`);
