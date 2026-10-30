# Plan 002: Fix Silent Apps Script Error Handling in `postAction`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> Verify lines 695–715 in `atendimentos.html`. If the implementation of `postAction`
> has changed, compare against the "Current state" excerpt.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/001-verification-baseline.md`
- **Category**: bug
- **Planned at**: commit `f4e6d7c`, 2026-10-30

## Why this matters

When Google Apps Script encounters an unhandled runtime error (e.g. cell size limit exceeded, quota exceeded, script execution timeout), Google returns an HTML error page. The client's `postAction` catches the JSON parse error, sets `data = null`, and because it only checks `if(data && data.handled === false)`, the function resolves successfully. Callers proceed to update local state and display a success toast ("Atendimento salvo"), masking silent data loss. Fixing this ensures any non-JSON or unsuccessful response triggers the caller's rollback and error banner.

## Current state

- File: `atendimentos.html` lines 697–713:
  ```javascript
  /* Envia uma ação ao Apps Script. Rejeita a Promise em erro de rede
     (status/resposta não-OK) para permitir rollback no chamador. */
  async function postAction(payload){
    var res = await fetch(scriptUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    if(!res.ok) throw new Error('HTTP '+res.status);
    // Confirma que o script reconheceu a ação (evita "salvou" fantasma quando o
    // Apps Script publicado é antigo e não conhece create_exercise etc.).
    // Parse tolerante: scripts antigos podem responder texto puro (data fica null).
    var data = null;
    try{ data = await res.clone().json(); }catch(e){ data = null; }
    if(data && data.handled === false){
      throw new Error(data.error || 'Ação não reconhecida pelo script. Publique a versão nova do Code.gs no Apps Script.');
    }
    return res;
  }
  ```

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Run tests | `node --test`            | exit 0, all tests pass |

## Scope

**In scope**:
- `atendimentos.html` (`postAction` function)
- `test/postaction.test.js` (create test suite for response validation logic)

**Out of scope**:
- Do not alter caller functions (`submitNewEntry`, `submitEditEntry`, etc.); their existing `catch(e)` rollback logic is correct and relies on `postAction` throwing.
- Do not modify `Code.gs` in this plan (covered in Plan 003 and 004).

## Git workflow

- Branch: `advisor/002-fix-silent-postaction-error-handling`
- Commit style: `fix: throw on invalid or failed responses in postAction`

## Steps

### Step 1: Update `postAction` in `atendimentos.html`
Replace `postAction` in `atendimentos.html` (lines 697–713) with strict validation:
```javascript
/* Envia uma ação ao Apps Script. Rejeita a Promise em erro de rede
   ou quando a resposta não é um JSON válido com success !== false. */
async function postAction(payload){
  var res = await fetch(scriptUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  if(!res.ok) throw new Error('HTTP ' + res.status);

  var text = await res.text();
  var data = null;
  try {
    data = JSON.parse(text);
  } catch(e) {
    // Apps Script retornou página HTML de erro (crash do script/quota)
    throw new Error('Resposta inválida do servidor. Verifique a planilha ou a conexão.');
  }

  if(!data || typeof data !== 'object'){
    throw new Error('Formato de resposta inesperado do script.');
  }

  if(data.handled === false){
    throw new Error(data.error || 'Ação não reconhecida pelo script. Publique a versão nova do Code.gs no Apps Script.');
  }

  if(data.success === false){
    throw new Error(data.error || 'Erro ao processar a solicitação na planilha.');
  }

  return res;
}
```

### Step 2: Add test coverage in `test/postaction.test.js`
Create `test/postaction.test.js` to verify the validation logic:
```javascript
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

function validateScriptResponse(status, text) {
  if (status !== 200) throw new Error('HTTP ' + status);
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error('Resposta inválida do servidor.');
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Formato inesperado.');
  }
  if (data.handled === false) {
    throw new Error(data.error || 'Ação não reconhecida.');
  }
  if (data.success === false) {
    throw new Error(data.error || 'Erro no script.');
  }
  return data;
}

describe('postAction response validation', () => {
  test('accepts valid success JSON', () => {
    const res = validateScriptResponse(200, JSON.stringify({ success: true, handled: true }));
    assert.equal(res.success, true);
  });

  test('throws on HTML error pages from Google Apps Script', () => {
    assert.throws(() => {
      validateScriptResponse(200, '<!DOCTYPE html><html><body>Error</body></html>');
    }, /Resposta inválida/);
  });

  test('throws when handled is false', () => {
    assert.throws(() => {
      validateScriptResponse(200, JSON.stringify({ success: false, handled: false, error: 'Ação não reconhecida' }));
    }, /Ação não reconhecida/);
  });

  test('throws when success is false', () => {
    assert.throws(() => {
      validateScriptResponse(200, JSON.stringify({ success: false, handled: true, error: 'Falha ao gravar' }));
    }, /Falha ao gravar/);
  });
});
```

**Verify**: `node --test test/postaction.test.js` → all tests pass.

## Done criteria

- [ ] `postAction` throws when response is not valid JSON.
- [ ] `postAction` throws when `data.success === false`.
- [ ] `node --test` exits 0 with all test suites passing.
- [ ] Only `atendimentos.html` and `test/postaction.test.js` are touched.

## STOP conditions

- If existing callers in `atendimentos.html` rely on `postAction` returning unparsed clones without waiting, stop and report.

## Maintenance notes

- Any future new actions returned by `Code.gs` must include `{ success: true, handled: true }` in their JSON output.
