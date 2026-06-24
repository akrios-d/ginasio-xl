#!/usr/bin/env node
/**
 * Creates .husky/pre-push and .husky/pre-merge-commit if they don't exist yet.
 * Called automatically by `npm run prepare` (after `husky` initialises the folder).
 */
'use strict';

const fs   = require('node:fs');
const path = require('node:path');

const ROOT      = path.resolve(__dirname, '..');
const HUSKY_DIR = path.join(ROOT, '.husky');

const HOOKS = [
  {
    file: 'pre-push',
    body: `#!/usr/bin/env sh
# Ginásio XL pre-push hook — bumps version based on conventional commits
node scripts/bump-version.cjs
`,
  },
  {
    file: 'pre-merge-commit',
    body: `#!/usr/bin/env sh
# Ginásio XL pre-merge-commit hook — enforce rebase workflow
echo ""
echo "✖ Merge commits are not allowed in this repository."
echo "  Use rebase instead: git pull --rebase  /  git rebase <branch>"
echo "  To set rebase as default: git config --global pull.rebase true"
echo ""
exit 1
`,
  },
];

if (!fs.existsSync(HUSKY_DIR)) {
  fs.mkdirSync(HUSKY_DIR, { recursive: true });
}

for (const { file, body } of HOOKS) {
  const hookPath = path.join(HUSKY_DIR, file);
  if (fs.existsSync(hookPath)) {
    console.log(`[setup-hooks] .husky/${file} already exists — skipped.`);
  } else {
    fs.writeFileSync(hookPath, body, { mode: 0o755 });
    console.log(`[setup-hooks] Created .husky/${file}`);
  }
}

// ─── Activate project.gitconfig include ──────────────────────────────────────
const { execSync } = require('node:child_process');

try {
  const current = execSync('git config --local include.path', { cwd: ROOT, encoding: 'utf8' }).trim();
  if (current.includes('project.gitconfig')) {
    console.log('[setup-hooks] project.gitconfig include already set — skipped.');
  } else {
    execSync('git config --local --add include.path ../project.gitconfig', { cwd: ROOT });
    console.log('[setup-hooks] Activated project.gitconfig (pull.rebase=true).');
  }
} catch {
  try {
    execSync('git config --local --add include.path ../project.gitconfig', { cwd: ROOT });
    console.log('[setup-hooks] Activated project.gitconfig (pull.rebase=true).');
  } catch (err) {
    console.warn(`[setup-hooks] Could not set include.path: ${err.message}`);
  }
}
