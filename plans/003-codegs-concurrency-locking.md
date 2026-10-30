# Plan 003: Implement Concurrency Locking & Cascade Deletion in `Code.gs`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> Check `Code.gs` lines 43–68 and 150–246. Compare against "Current state".

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/001-verification-baseline.md`
- **Category**: bug
- **Planned at**: commit `f4e6d7c`, 2026-10-30

## Why this matters

Google Apps Script spawns independent, parallel runtime executions for simultaneous HTTP requests. Without locking, concurrent operations (e.g. rapid status updates, multiple device syncs, or simultaneous deletions) perform uncoordinated reads and writes on the spreadsheet data range. This causes row index miscalculations and accidental deletion of wrong rows. Furthermore, deleting a patient leaves orphaned routine items in the `Rotinas` sheet. Adding `LockService` and cascade deletion guarantees ACID-like safety for spreadsheet transactions.

## Current state

- File: `Code.gs` lines 43–54:
  ```javascript
  function formatCellValue_(header, value) {
    if (Object.prototype.toString.call(value) === '[object Date]') {
      if (header === 'Data' || header === 'DataPagamento') {
        return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
      if (header === 'Hora') {
        return Utilities.formatDate(value, Session.getScriptTimeZone(), 'HH:mm');
      }
      return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
    }
    return value;
  }
  ```
- File: `Code.gs` lines 151–173:
  ```javascript
  function doPost(e) {
    var body = JSON.parse(e.postData.contents);
    var result = { success: true, action: body.action || 'create', handled: true };

    if (body.action === 'delete') {
      deleteRowById_(getAtendSheet_(), body.id);
    ...
    } else if (body.action === 'delete_patient') {
      deleteRowById_(getPacSheet_(), body.id);
  ```
  Notice: No `LockService`, no `try/catch/finally`, and deleting a patient does not clean up `Rotinas` (unlike `delete_exercise` at line 193).

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Check JS syntax | `node -c Code.gs`        | exit 0 |
| Run test suite  | `node --test`            | exit 0 |

## Scope

**In scope**:
- `Code.gs` (add `LockService` wrapper, robust `try/catch/finally`, cascade delete for patients, spreadsheet timezone fallback)

**Out of scope**:
- Do not modify frontend `atendimentos.html` in this plan.
- Do not alter the column structures (`ATEND_HEADERS`, `PAC_HEADERS`, `EXE_HEADERS`, `ROT_HEADERS`).

## Git workflow

- Branch: `advisor/003-codegs-concurrency-locking`
- Commit style: `fix: add LockService and cascade deletion in Code.gs`

## Steps

### Step 1: Update `formatCellValue_` to respect Spreadsheet Timezone
In `Code.gs`, use the active spreadsheet's timezone instead of the default script container timezone:
```javascript
function getTimeZone_() {
  try {
    return SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone() || 'America/Sao_Paulo';
  } catch(e) {
    return 'America/Sao_Paulo';
  }
}

function formatCellValue_(header, value) {
  if (Object.prototype.toString.call(value) === '[object Date]') {
    var tz = getTimeZone_();
    if (header === 'Data' || header === 'DataPagamento') {
      return Utilities.formatDate(value, tz, 'yyyy-MM-dd');
    }
    if (header === 'Hora') {
      return Utilities.formatDate(value, tz, 'HH:mm');
    }
    return Utilities.formatDate(value, tz, "yyyy-MM-dd'T'HH:mm:ss");
  }
  return value;
}
```

### Step 2: Add `LockService` and Cascade Deletion in `doPost`
Wrap `doPost(e)` with a 30-second script lock and structured error handling:
```javascript
function doPost(e) {
  var lock = LockService.getScriptLock();
  var lockAcquired = false;
  var result = { success: true, action: 'unknown', handled: true };

  try {
    // Tenta adquirir o lock por até 30 segundos para evitar corrida entre requisições
    lockAcquired = lock.tryLock(30000);
    if (!lockAcquired) {
      result.success = false;
      result.error = 'O servidor da planilha está ocupado. Tente novamente em instantes.';
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var body = {};
    try {
      body = JSON.parse(e.postData.contents || '{}');
    } catch (parseErr) {
      result.success = false;
      result.error = 'Payload JSON inválido: ' + parseErr.message;
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    result.action = body.action || 'create';

    if (body.action === 'delete') {
      deleteRowById_(getAtendSheet_(), body.id);

    } else if (body.action === 'update_status') {
      updateAtendField_(body.id, 'Status', body.status);
      updateAtendField_(body.id, 'DataPagamento', body.paymentDate || '');

    } else if (body.action === 'update') {
      if (body.nome !== undefined) updateAtendField_(body.id, 'Paciente', body.nome);
      if (body.data !== undefined) updateAtendField_(body.id, 'Data', body.data);
      if (body.hora !== undefined) updateAtendField_(body.id, 'Hora', body.hora);
      if (body.valor !== undefined) updateAtendField_(body.id, 'Valor', body.valor);

    } else if (body.action === 'create_patient') {
      getPacSheet_().appendRow([body.id, body.nome, body.telefone || '', body.valorPadrao || '', body.formaPagamento || '', new Date().toISOString()]);

    } else if (body.action === 'delete_patient') {
      deleteRowById_(getPacSheet_(), body.id);
      // Remove em cascata todos os itens de rotinas vinculados a esta paciente (coluna PacienteID = índice 1)
      deleteRowsByField_(getRotSheet_(), 1, body.id);

    /* ---------- Exercícios ---------- */
    } else if (body.action === 'create_exercise') {
      getExeSheet_().appendRow([
        body.id, body.nome, body.tipo || '', body.seriesPadrao || '', body.repsPadrao || '',
        body.observacao || '', body.imagem || '', new Date().toISOString()
      ]);

    } else if (body.action === 'update_exercise') {
      var exe = getExeSheet_();
      if (body.nome !== undefined) updateFieldById_(exe, body.id, 'Nome', body.nome);
      if (body.tipo !== undefined) updateFieldById_(exe, body.id, 'Tipo', body.tipo);
      if (body.seriesPadrao !== undefined) updateFieldById_(exe, body.id, 'SeriesPadrao', body.seriesPadrao);
      if (body.repsPadrao !== undefined) updateFieldById_(exe, body.id, 'RepsPadrao', body.repsPadrao);
      if (body.observacao !== undefined) updateFieldById_(exe, body.id, 'Observacao', body.observacao);
      if (body.imagem !== undefined) updateFieldById_(exe, body.id, 'Imagem', body.imagem);

    } else if (body.action === 'delete_exercise') {
      deleteRowById_(getExeSheet_(), body.id);
      deleteRowsByField_(getRotSheet_(), 3, body.id); // coluna ExercicioID (0-based = 3)

    /* ---------- Rotinas ---------- */
    } else if (body.action === 'create_routine_item') {
      getRotSheet_().appendRow([
        body.id, body.pacienteId || '', body.pacienteNome || '', body.exercicioId || '',
        body.ordem || '', body.series || '', body.reps || '', body.observacao || '',
        new Date().toISOString(), body.rotulo || ''
      ]);

    } else if (body.action === 'update_routine_item') {
      var rot = getRotSheet_();
      if (body.ordem !== undefined) updateFieldById_(rot, body.id, 'Ordem', body.ordem);
      if (body.series !== undefined) updateFieldById_(rot, body.id, 'Series', body.series);
      if (body.reps !== undefined) updateFieldById_(rot, body.id, 'Reps', body.reps);
      if (body.observacao !== undefined) updateFieldById_(rot, body.id, 'Observacao', body.observacao);

    } else if (body.action === 'delete_routine_item') {
      deleteRowById_(getRotSheet_(), body.id);

    } else if (body.action === 'rename_routine') {
      renameRoutineLabel_(body.pacienteId, body.rotuloAntigo, body.rotulo);

    } else if (body.action === 'clear_routine') {
      deleteRoutineByLabel_(body.pacienteId, body.rotulo);

    } else if (!body.action || body.action === 'create') {
      getAtendSheet_().appendRow([
        body.id,
        body.nome,
        body.data,
        body.hora || '',
        body.valor,
        body.status || 'Pendente',
        body.paymentDate || '',
        body.lat || '',
        body.lng || '',
        new Date().toISOString()
      ]);

    } else {
      result.success = false;
      result.handled = false;
      result.error = 'Ação não reconhecida pelo script: ' + body.action +
        '. Publique a versão mais recente do Code.gs (Nova versão) no Apps Script.';
    }

  } catch (err) {
    result.success = false;
    result.error = 'Exceção interna no script: ' + (err.message || String(err));
  } finally {
    if (lockAcquired) {
      lock.releaseLock();
    }
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
```

**Verify**: `node -c Code.gs` → exits 0 with no syntax errors.

## Done criteria

- [ ] `Code.gs` acquires a script lock before mutating sheets.
- [ ] `Code.gs` always releases the lock in a `finally` block.
- [ ] Deleting a patient deletes all related records in `Rotinas`.
- [ ] Any runtime error returns a clean `{ success: false, error: ... }` JSON payload instead of an uncaught exception.
- [ ] `node -c Code.gs` exits 0.

## STOP conditions

- If Google Apps Script API syntax is incompatible with ES5/V8 runtimes, stop and report.

## Maintenance notes

- Document in `README.md` that whenever `Code.gs` is updated, the user must publish a "Nova versão" under "Gerenciar implantações" in Google Apps Script.
