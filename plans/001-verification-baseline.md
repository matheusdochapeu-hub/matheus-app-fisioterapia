# Plan 001: Establish Node.js Native Test Verification Baseline

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> Check if `atendimentos.html` lines 630–675 have changed since commit `f4e6d7c`. Compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `f4e6d7c`, 2026-10-30

## Why this matters

The repository currently lacks a verification baseline: there is no `package.json`, no test runner, and no automated way to ensure changes to calculations, financial aggregates, or parsing functions do not introduce regressions. Without automated tests, every future plan (such as error handling, bulk operations, and data sanitization) requires manual browser verification and risks silent bugs. Establishing a zero-dependency `node --test` suite creates an instant feedback loop for executors and CI.

## Current state

- The repo has no `package.json`.
- Key calculation and formatting logic is defined inside the `<script>` tag of `atendimentos.html` (lines 633–671):
  ```javascript
  /* Converte valores que podem vir como número, "150", "150.00" ou "150,00" (pt-BR). */
  function parseValor(v){
    if(typeof v === 'number') return isFinite(v) ? v : 0;
    if(v === null || v === undefined) return 0;
    var s = String(v).trim().replace(/[R$\s\u00A0]/g,'');
    if(!s) return 0;
    if(s.indexOf(',') > -1){
      s = s.replace(/\./g,'').replace(',', '.');  // formato pt-BR: 1.234,56
    }
    var n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }
  function formatMoney(n){
    return (Number(n)||0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
  }
  function formatDateBR(iso){
    if(!iso) return '';
    var parts = String(iso).split('-');
    if(parts.length !== 3) return iso;
    return parts[2]+'/'+parts[1]+'/'+parts[0];
  }
  function initials(name){
    var parts = (name||'').trim().split(/\s+/).filter(Boolean);
    if(parts.length === 0) return '?';
    if(parts.length === 1) return parts[0].substring(0,2).toUpperCase();
    return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
  }
  function escapeHtml(s){
    return String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  ```

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Run tests | `node --test`            | exit 0, all tests pass |
| Check syntax | `node -c scripts/gerar-icones.js` | exit 0 |

## Scope

**In scope**:
- `package.json` (create)
- `test/helpers.test.js` (create)

**Out of scope**:
- Do NOT rewrite `atendimentos.html` to ES modules or bundlers (Vite/Webpack). The browser app must remain 100% vanilla and runnable directly via static file serving.
- Do NOT add heavy third-party testing dependencies (Jest, Mocha). Use native Node.js test runner (`node:test`, `node:assert`).

## Git workflow

- Branch: `advisor/001-verification-baseline`
- Commit style: `test: add package.json and node test verification baseline`

## Steps

### Step 1: Create `package.json` with native test command
Create `package.json` in the repository root with metadata and scripts:
```json
{
  "name": "matheus-app-fisioterapia",
  "version": "1.1.0",
  "private": true,
  "description": "App de controle de atendimentos de fisioterapia domiciliar.",
  "scripts": {
    "test": "node --test test/*.test.js",
    "gerar-icones": "node scripts/gerar-icones.js"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "author": "Matheus",
  "license": "MIT"
}
```

**Verify**: `node -e "const p = require('./package.json'); console.log(p.scripts.test)"` → outputs `node --test test/*.test.js`

### Step 2: Create `test/helpers.test.js`
Create `test/helpers.test.js` extracting and verifying the pure functions from `atendimentos.html`:
```javascript
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Extract pure helper functions directly from atendimentos.html to avoid divergence
const html = fs.readFileSync(path.join(__dirname, '../atendimentos.html'), 'utf-8');

function extractFn(name) {
  const regex = new RegExp(`function ${name}\\([\\s\\S]*?\\n}`);
  const match = html.match(regex);
  if (!match) throw new Error(`Function ${name} not found in atendimentos.html`);
  return new Function(`return (${match[0]})`)();
}

const parseValor = extractFn('parseValor');
const formatDateBR = extractFn('formatDateBR');
const initials = extractFn('initials');
const escapeHtml = extractFn('escapeHtml');

describe('parseValor', () => {
  test('parses numbers and strings correctly', () => {
    assert.equal(parseValor(150), 150);
    assert.equal(parseValor('150.00'), 150);
    assert.equal(parseValor('150,00'), 150);
    assert.equal(parseValor('R$ 1.250,50'), 1250.5);
    assert.equal(parseValor(null), 0);
    assert.equal(parseValor(''), 0);
  });
});

describe('formatDateBR', () => {
  test('converts ISO YYYY-MM-DD to DD/MM/YYYY', () => {
    assert.equal(formatDateBR('2026-10-30'), '30/10/2026');
    assert.equal(formatDateBR(''), '');
    assert.equal(formatDateBR('invalid'), 'invalid');
  });
});

describe('initials', () => {
  test('extracts two uppercase letters for single or multiple names', () => {
    assert.equal(initials('Maria Silva'), 'MS');
    assert.equal(initials('Ana'), 'AN');
    assert.equal(initials(''), '?');
  });
});

describe('escapeHtml', () => {
  test('escapes HTML special characters', () => {
    assert.equal(escapeHtml('<script>"alert"</script>'), '&lt;script&gt;&quot;alert&quot;&lt;/script&gt;');
    assert.equal(escapeHtml(null), '');
  });
});
```

**Verify**: `node --test` → all test suites pass with exit code 0.

## Done criteria

- [ ] `package.json` exists with `"test": "node --test test/*.test.js"`.
- [ ] `test/helpers.test.js` exists and executes without errors.
- [ ] Running `npm test` or `node --test` exits with code 0.
- [ ] No files outside `package.json` and `test/` are touched.

## STOP conditions

- If extracting functions via regex fails due to syntax changes in `atendimentos.html`, stop and report.
- If native `node:test` is unsupported (Node < 18), report environment version.

## Maintenance notes

- Future plans that add or modify pure business functions (such as bulk import transforms or receipt calculations) should add tests to `test/helpers.test.js`.
