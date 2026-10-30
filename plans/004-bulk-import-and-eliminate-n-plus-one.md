# Plan 004: Bulk Import Endpoint in `Code.gs` & Elimination of N+1 Loop in `importBackup`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> Check `atendimentos.html` lines 2575–2605 and `Code.gs` `doPost`. Compare against "Current state".

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/001-verification-baseline.md`, `plans/003-codegs-concurrency-locking.md`
- **Category**: perf
- **Planned at**: commit `f4e6d7c`, 2026-10-30

## Why this matters

The backup restoration function (`importBackup`) currently iterates over every single patient, attendance, exercise, and routine item with a sequential `await postAction(...)` call. Restoring a typical backup with 300 entities fires 300 separate HTTP POST requests to Google Apps Script. Because each script invocation takes ~1.5–3 seconds to initialize, a restore takes 10+ minutes, frequently freezes the mobile browser, and hits Google Apps Script simultaneous/daily quota limits. Adding a batch import endpoint reduces 300 round-trips to 1 single request taking under 2 seconds.

## Current state

- File: `atendimentos.html` lines 2578–2598:
  ```javascript
  var falhas = 0;
  for(var i=0;i<novosP.length;i++){
    var p = novosP[i];
    patients.push(p);
    try{ await postAction({ action:'create_patient', id:p.id, nome:p.nome, telefone:p.telefone||'', valorPadrao:p.valorPadrao||'', formaPagamento:p.formaPagamento||'' }); }catch(e){ falhas++; }
  }
  for(var j=0;j<novosE.length;j++){
    var e = novosE[j];
    entries.push(e);
    try{ await postAction({ action:'create', id:e.id, nome:e.nome, data:e.data, hora:e.hora||'', valor:e.valor, status:e.status||'Pendente', paymentDate:e.paymentDate||'', lat:e.lat||'', lng:e.lng||'' }); }catch(err){ falhas++; }
  }
  for(var k=0;k<novosX.length;k++){
    var x = novosX[k];
    exercises.push(x);
    try{ await postAction({ action:'create_exercise', id:x.id, nome:x.nome, tipo:x.tipo||'', seriesPadrao:x.seriesPadrao||'', repsPadrao:x.repsPadrao||'', observacao:x.observacao||'', imagem:x.imagem||'' }); }catch(err){ falhas++; }
  }
  for(var l=0;l<novosR.length;l++){
    var r = novosR[l];
    routines.push(r);
    try{ await postAction({ action:'create_routine_item', id:r.id, pacienteId:r.pacienteId||'', pacienteNome:r.pacienteNome||'', exercicioId:r.exercicioId||'', ordem:r.ordem||'', series:r.series||'', reps:r.reps||'', observacao:r.observacao||'', rotulo:r.rotulo||'' }); }catch(err){ falhas++; }
  }
  ```
- File: `Code.gs` only supports individual `create`, `create_patient`, `create_exercise`, `create_routine_item`.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Check JS syntax | `node -c Code.gs`        | exit 0 |
| Run test suite  | `node --test`            | exit 0 |

## Scope

**In scope**:
- `Code.gs` (add `bulk_import` handler that appends rows in batches via `setValues`)
- `atendimentos.html` (`importBackup` logic to use `bulk_import`, with fallback for older script deployments)

**Out of scope**:
- Do not modify backup export format (`exportBackup`).
- Do not alter spreadsheet column mappings.

## Git workflow

- Branch: `advisor/004-bulk-import-and-eliminate-n-plus-one`
- Commit style: `perf: batch backup restoration to eliminate sequential N+1 requests`

## Steps

### Step 1: Add `bulk_import` handler in `Code.gs`
In `Code.gs`, inside `doPost(e)` (before the final `else`), add support for `bulk_import`:
```javascript
    } else if (body.action === 'bulk_import') {
      var nowIso = new Date().toISOString();
      
      // 1. Pacientes
      if (Array.isArray(body.pacientes) && body.pacientes.length > 0) {
        var pRows = body.pacientes.map(function(p) {
          return [p.id, p.nome, p.telefone || '', p.valorPadrao || '', p.formaPagamento || '', p.criadoEm || nowIso];
        });
        var sP = getPacSheet_();
        sP.getRange(sP.getLastRow() + 1, 1, pRows.length, PAC_HEADERS.length).setValues(pRows);
      }

      // 2. Atendimentos
      if (Array.isArray(body.atendimentos) && body.atendimentos.length > 0) {
        var aRows = body.atendimentos.map(function(a) {
          return [a.id, a.nome, a.data, a.hora || '', a.valor, a.status || 'Pendente', a.paymentDate || '', a.lat || '', a.lng || '', a.criadoEm || nowIso];
        });
        var sA = getAtendSheet_();
        sA.getRange(sA.getLastRow() + 1, 1, aRows.length, ATEND_HEADERS.length).setValues(aRows);
      }

      // 3. Exercícios
      if (Array.isArray(body.exercicios) && body.exercicios.length > 0) {
        var eRows = body.exercicios.map(function(x) {
          return [x.id, x.nome, x.tipo || '', x.seriesPadrao || '', x.repsPadrao || '', x.observacao || '', x.imagem || '', x.criadoEm || nowIso];
        });
        var sE = getExeSheet_();
        sE.getRange(sE.getLastRow() + 1, 1, eRows.length, EXE_HEADERS.length).setValues(eRows);
      }

      // 4. Rotinas
      if (Array.isArray(body.rotinas) && body.rotinas.length > 0) {
        var rRows = body.rotinas.map(function(r) {
          return [r.id, r.pacienteId || '', r.pacienteNome || '', r.exercicioId || '', r.ordem || '', r.series || '', r.reps || '', r.observacao || '', r.criadoEm || nowIso, r.rotulo || ''];
        });
        var sR = getRotSheet_();
        sR.getRange(sR.getLastRow() + 1, 1, rRows.length, ROT_HEADERS.length).setValues(rRows);
      }

      result.importedCounts = {
        pacientes: (body.pacientes || []).length,
        atendimentos: (body.atendimentos || []).length,
        exercicios: (body.exercicios || []).length,
        rotinas: (body.rotinas || []).length
      };
```

### Step 2: Refactor `importBackup` in `atendimentos.html`
Update `importBackup` (lines 2576–2605) to send all new items in a single request, with fallback if the deployed script is an older version:
```javascript
  if(!confirm('Restaurar ' + novosP.length + ' paciente(s), ' + novosE.length + ' atendimento(s), ' + novosX.length + ' exercício(s) e ' + novosR.length + ' item(ns) de rotina? Os dados atuais são mantidos.')) return;

  showToast('Restaurando backup...', 'ok');
  var useBatch = true;
  try {
    await postAction({
      action: 'bulk_import',
      pacientes: novosP,
      atendimentos: novosE,
      exercicios: novosX,
      rotinas: novosR
    });
  } catch(err) {
    if(err.message && err.message.indexOf('Ação não reconhecida') > -1) {
      // Script antigo: fallback para laço sequencial com aviso
      useBatch = false;
    } else {
      showError('Falha ao restaurar backup na planilha: ' + err.message);
      return;
    }
  }

  if(useBatch) {
    novosP.forEach(function(p){ patients.push(p); });
    novosE.forEach(function(e){ entries.push(e); });
    novosX.forEach(function(x){ exercises.push(x); });
    novosR.forEach(function(r){ routines.push(r); });
    populatePatientFilter();
    renderList();
    showToast('Backup restaurado com sucesso.', 'ok');
    return;
  }

  // Fallback para versões legadas do Apps Script
  var falhas = 0;
  for(var i=0; i<novosP.length; i++){
    var p = novosP[i];
    try{ await postAction({ action:'create_patient', id:p.id, nome:p.nome, telefone:p.telefone||'', valorPadrao:p.valorPadrao||'', formaPagamento:p.formaPagamento||'' }); patients.push(p); }catch(e){ falhas++; }
  }
  for(var j=0; j<novosE.length; j++){
    var e = novosE[j];
    try{ await postAction({ action:'create', id:e.id, nome:e.nome, data:e.data, hora:e.hora||'', valor:e.valor, status:e.status||'Pendente', paymentDate:e.paymentDate||'', lat:e.lat||'', lng:e.lng||'' }); entries.push(e); }catch(err){ falhas++; }
  }
  for(var k=0; k<novosX.length; k++){
    var x = novosX[k];
    try{ await postAction({ action:'create_exercise', id:x.id, nome:x.nome, tipo:x.tipo||'', seriesPadrao:x.seriesPadrao||'', repsPadrao:x.repsPadrao||'', observacao:x.observacao||'', imagem:x.imagem||'' }); exercises.push(x); }catch(err){ falhas++; }
  }
  for(var l=0; l<novosR.length; l++){
    var r = novosR[l];
    try{ await postAction({ action:'create_routine_item', id:r.id, pacienteId:r.pacienteId||'', pacienteNome:r.pacienteNome||'', exercicioId:r.exercicioId||'', ordem:r.ordem||'', series:r.series||'', reps:r.reps||'', observacao:r.observacao||'', rotulo:r.rotulo||'' }); routines.push(r); }catch(err){ falhas++; }
  }
  populatePatientFilter();
  renderList();
  if(falhas > 0){
    showError('Restauração concluída com ' + falhas + ' falha(s). Atualize o Code.gs para suporte a importação rápida.');
  } else {
    showToast('Backup restaurado.', 'ok');
  }
```

**Verify**: `node -c Code.gs` → exits 0.

## Done criteria

- [ ] `Code.gs` implements `bulk_import` utilizing `setValues` for atomic batch insertion.
- [ ] `importBackup` in `atendimentos.html` attempts single-roundtrip `bulk_import` first.
- [ ] Fallback to sequential calls is retained if the script responds with unhandled action error.
- [ ] `node -c Code.gs` passes.

## STOP conditions

- If Google Sheets `getRange().setValues()` throws type mismatch on empty arrays, ensure array length checks guard every sheet call.

## Maintenance notes

- Whenever new entity columns are added to `Code.gs`, update the mapping array inside `bulk_import`.
