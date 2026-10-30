# Plan 005: Remove Hardcoded Script URL & Protect Setup Configuration

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> Check `atendimentos.html` lines 615–622 and lines 720–730. Compare against "Current state".

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: MED
- **Depends on**: `plans/001-verification-baseline.md`
- **Category**: security
- **Planned at**: commit `f4e6d7c`, 2026-10-30

## Why this matters

The repository currently has a live production Google Apps Script Web App URL hardcoded in `atendimentos.html` (`SCRIPT_URL`). Because the script deployment is configured with public access ("Qualquer pessoa"), anyone who clones the repository or visits the webpage can query or wipe patient data, contact details, payment receipts, and geolocation coordinates. Removing the hardcoded production URL ensures forks or new users do not target the author's private spreadsheet, enforces initial setup of the user's own `/exec` URL, and documents rotation of the exposed deployment.

## Current state

- File: `atendimentos.html` lines 615–620:
  ```javascript
  /* ============================================================
     LINK DA PLANILHA (Google Apps Script) — já embutido no app.
     Para trocar de planilha, basta substituir a URL abaixo pela
     nova implantação que termina em /exec.
     ============================================================ */
  var SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbykxU4Vmk-UfaWW8lAz9PHTY3Fh4ukcgOyWy_d2X2DlQR9occh7bK5Y8UTFcBdArhCC/exec';
  ```
- File: `atendimentos.html` lines 722–725:
  ```javascript
  // Precisa configurar na primeira vez só se ainda não há nome salvo.
  if(!config || !config.providerName){
    document.getElementById('setupScreen').classList.remove('hidden');
  }
  ```

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Run tests | `node --test`            | exit 0 |

## Scope

**In scope**:
- `atendimentos.html` (replace hardcoded URL with empty default; prompt for `scriptUrl` during first-time setup if missing)
- `README.md` (instructions for deployment URL rotation and initial setup)

**Out of scope**:
- Do not remove the user's ability to save or change `scriptUrl` in `openSettings()`.
- Never print or commit the active secret deployment URL.

## Git workflow

- Branch: `advisor/005-protect-script-url-and-credentials`
- Commit style: `security: remove hardcoded script URL and enforce setup configuration`

## Steps

### Step 1: Replace hardcoded `SCRIPT_URL` with empty template default
In `atendimentos.html`, replace lines 615–620:
```javascript
/* ============================================================
   LINK DA PLANILHA (Google Apps Script)
   Insira o link gerado em "Implantar > App da Web" (/exec).
   Se vazio, o app solicitará o link na primeira inicialização.
   ============================================================ */
var SCRIPT_URL = '';
```

### Step 2: Enforce `scriptUrl` check on initial setup
In `atendimentos.html`, update `init()` (around line 722):
```javascript
  // Exige configuração inicial se não houver profissional salva ou se não houver URL configurada
  var hasUrl = (config && config.scriptUrl && config.scriptUrl.indexOf('/exec') > -1) || (SCRIPT_URL && SCRIPT_URL.indexOf('/exec') > -1);
  if(!config || !config.providerName || !hasUrl){
    document.getElementById('setupScreen').classList.remove('hidden');
  } else {
    document.getElementById('mainScreen').classList.remove('hidden');
    document.getElementById('fab').classList.remove('hidden');
    document.getElementById('providerNameDisplay').textContent = config.providerName || 'Atendimentos';
    updateMonthLabel();
    await loadData();
  }
```

### Step 3: Update `README.md` with rotation and setup notice
Add a prominent security notice in `README.md` under `Instalação`:
```markdown
> ⚠️ **Importante (Segurança da Planilha):**
> Nunca compartilhe publicamente o link `/exec` da sua implantação do Apps Script.
> Caso seu link tenha sido exposto, acesse o editor do Apps Script, vá em **Implantar > Gerenciar implantações**,
> exclua a implantação antiga e crie uma nova (**Nova implantação > App da Web**).
```

**Verify**:
- Open `atendimentos.html` in browser without localStorage: setup modal displays with both "Nome da profissional" and "Link do Apps Script" fields.

## Done criteria

- [ ] `SCRIPT_URL` in `atendimentos.html` does not contain any live production deployment tokens.
- [ ] First-time load prompts for the Google Apps Script URL if not already saved in `localStorage`.
- [ ] `README.md` includes explicit rotation instructions for exposed Web App URLs.
- [ ] `node --test` passes.

## STOP conditions

- If existing users with `localStorage.getItem('config')` already configured lose access to their saved URL, ensure `config.scriptUrl` is always prioritized before checking `SCRIPT_URL`.

## Maintenance notes

- Recommends configuring a private deployment URL per user rather than sharing one global sheet across all visitors of a static website.
