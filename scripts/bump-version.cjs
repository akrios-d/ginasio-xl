#!/usr/bin/env node
/**
 * Ginásio XL — pre-push version bumper
 *
 * Reads the commits about to be pushed (via stdin in husky pre-push format),
 * determines the highest version-bump level from conventional commit types,
 * updates package.json, and amends the last commit so no extra bump commit
 * appears in the history.
 *
 * Bump rules (highest wins across all commits in the push):
 *   feat! or "BREAKING CHANGE:" footer → major  (X.0.0)
 *   feat                               → minor  (x.Y.0)
 *   fix | perf | refactor              → patch  (x.y.Z)
 *   chore | docs | style | ci | test | build → no bump
 */

'use strict';

const { execSync } = require('node:child_process');
const fs           = require('node:fs');
const path         = require('node:path');
const readline     = require('node:readline');

const ROOT = path.resolve(__dirname, '..');
const PKG  = path.join(ROOT, 'package.json');

// ─── Bump logic ───────────────────────────────────────────────────────────────

const BUMP_RANK = { none: 0, patch: 1, minor: 2, major: 3 };

function commitBumpLevel(subject, fullBody) {
  if (/^[a-z]+(\([^)]+\))?!:/.test(subject)) return 'major';
  if (/^BREAKING CHANGE:/m.test(fullBody))     return 'major';
  if (/^feat(\([^)]+\))?:/.test(subject))      return 'minor';
  if (/^(fix|perf|refactor)(\([^)]+\))?:/.test(subject)) return 'patch';
  return 'none';
}

function bumpVersion(version, level) {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    throw new Error(`Cannot parse version "${version}"`);
  }
  const [major, minor, patch] = parts;
  if (level === 'major') return `${major + 1}.0.0`;
  if (level === 'minor') return `${major}.${minor + 1}.0`;
  if (level === 'patch') return `${major}.${minor}.${patch + 1}`;
  return version;
}

// ─── Git helpers ──────────────────────────────────────────────────────────────

const ZERO_SHA = '0'.repeat(40);

function git(args, opts = {}) {
  return execSync(`git ${args}`, { cwd: ROOT, encoding: 'utf8', ...opts }).trim();
}

function gitOrNull(args) {
  try { return git(args); } catch { return null; }
}

function lastTag() {
  return gitOrNull('describe --tags --abbrev=0');
}

function alreadyAmended() {
  const diff = gitOrNull('show HEAD -- package.json');
  return diff !== null && /^\+\s+"version"/m.test(diff);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function collectRanges(rl) {
  const ranges = [];
  for await (const line of rl) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 4) continue;
    const [, localSha, , remoteSha] = parts;
    if (!localSha || localSha === ZERO_SHA) continue;
    if (remoteSha === ZERO_SHA) {
      const tag = lastTag();
      ranges.push(tag ? `${tag}..${localSha}` : localSha);
    } else {
      ranges.push(`${remoteSha}..${localSha}`);
    }
  }
  return ranges;
}

function analyzeCommits(ranges) {
  let topBump = 'none';
  for (const range of ranges) {
    let hashes;
    try {
      hashes = git(`log ${range} --format=%H`).split('\n').filter(Boolean);
    } catch {
      log(`Could not resolve range "${range}" — skipping.`);
      continue;
    }
    for (const hash of hashes) {
      const subject  = git(`log -1 --format=%s ${hash}`);
      const fullBody = git(`log -1 --format=%B ${hash}`);
      const level    = commitBumpLevel(subject, fullBody);
      if (BUMP_RANK[level] > BUMP_RANK[topBump]) topBump = level;
    }
  }
  return topBump;
}

async function main() {
  const rl     = readline.createInterface({ input: process.stdin, terminal: false });
  const ranges = await collectRanges(rl);

  if (ranges.length === 0) { log('No commit ranges — skipping.'); process.exit(0); }

  const topBump = analyzeCommits(ranges);

  if (topBump === 'none') {
    log('No version-worthy commits (chore/docs/style/ci/test/build) — skipping bump.');
    process.exit(0);
  }

  if (alreadyAmended()) { log('Version already amended in last commit — skipping.'); process.exit(0); }

  const pkg    = JSON.parse(fs.readFileSync(PKG, 'utf8'));
  const oldVer = pkg.version;
  pkg.version  = bumpVersion(oldVer, topBump);
  fs.writeFileSync(PKG, JSON.stringify(pkg, null, 2) + '\n');

  git('add package.json');
  git('commit --amend --no-edit --no-verify');
  log(`Version bumped: ${oldVer} → ${pkg.version} (${topBump})`);
}

function log(msg) {
  process.stderr.write(`[bump-version] ${msg}\n`);
}

main().catch(err => {
  process.stderr.write(`[bump-version] Fatal: ${err.message}\n`);
  process.exit(1);
});
