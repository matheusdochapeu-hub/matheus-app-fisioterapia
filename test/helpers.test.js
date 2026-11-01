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

function extractFnWithScope(name, scopeObj) {
  const regex = new RegExp(`function ${name}\\([\\s\\S]*?\\n}`);
  const match = html.match(regex);
  if (!match) throw new Error(`Function ${name} not found in atendimentos.html`);
  const keys = Object.keys(scopeObj);
  const vals = Object.values(scopeObj);
  return new Function(...keys, `return (${match[0]})`)(...vals);
}

const parseValor = extractFn('parseValor');
const formatDateBR = extractFn('formatDateBR');
const initials = extractFn('initials');
const escapeHtml = extractFn('escapeHtml');
const getPatientDisplayName = extractFn('getPatientDisplayName');
const getPatientLegalName = extractFn('getPatientLegalName');
const renderPatientAvatar = extractFnWithScope('renderPatientAvatar', { escapeHtml, initials });

describe('parseValor', () => {
  test('parses numbers and strings correctly', () => {
    assert.equal(parseValor(150), 150);
    assert.equal(parseValor('150.00'), 150);
    assert.equal(parseValor('150,00'), 150);
    assert.equal(parseValor('R$ 1.250,50'), 1250.5);
    assert.equal(parseValor(null), 0);
    assert.equal(parseValor(''), 0);
  });

  test('guards against accidental ISO timestamps and dates (returns 0)', () => {
    assert.equal(parseValor('2026-08-10T18:54:17.973Z'), 0);
    assert.equal(parseValor('2026-10-30'), 0);
    assert.equal(parseValor('2026-09-17'), 0);
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

describe('getPatientDisplayName and getPatientLegalName', () => {
  test('prefers nomeFantasia for internal display and nome for external documents', () => {
    const p = { nome: 'Diva Ferreira dos Santos', nomeFantasia: 'Dona Diva' };
    assert.equal(getPatientDisplayName(p), 'Dona Diva');
    assert.equal(getPatientLegalName(p), 'Diva Ferreira dos Santos');
  });

  test('falls back to nome when nomeFantasia is empty', () => {
    const p = { nome: 'Maria das Graças Silva', nomeFantasia: '' };
    assert.equal(getPatientDisplayName(p), 'Maria das Graças Silva');
    assert.equal(getPatientLegalName(p), 'Maria das Graças Silva');
  });
});

describe('renderPatientAvatar', () => {
  test('renders image tag when patient has photo', () => {
    const p = { nome: 'Diva Ferreira', nomeFantasia: 'Dona Diva', foto: 'data:image/jpeg;base64,abc123xyz' };
    const res = renderPatientAvatar(p);
    assert.match(res, /<img src="data:image\/jpeg;base64,abc123xyz"/);
    assert.match(res, /class="avatar-img"/);
  });

  test('falls back to initials using nomeFantasia when patient has no photo', () => {
    const p = { nome: 'Diva Ferreira dos Santos', nomeFantasia: 'Dona Diva', foto: '' };
    const res = renderPatientAvatar(p);
    assert.equal(res, '<div class="avatar">DD</div>');
  });

  test('handles null patient with fallback name', () => {
    const res = renderPatientAvatar(null, 'Carlos Souza');
    assert.equal(res, '<div class="avatar">CS</div>');
  });
});

const scheduleMatchesPatient = extractFnWithScope('scheduleMatchesPatient', {
  findPatientByName: () => null
});
const isSchedulePendingForecast = extractFnWithScope('isSchedulePendingForecast', {
  entries: [{ id: 'e123' }]
});

describe('scheduleMatchesPatient and isSchedulePendingForecast', () => {
  test('matches schedule by pacienteId, legal name, or nomeFantasia', () => {
    const p = { id: 'p1', nome: 'Diva Ferreira dos Santos', nomeFantasia: 'Dona Diva' };
    assert.equal(scheduleMatchesPatient({ pacienteId: 'p1', pacienteNome: 'Outro' }, p), true);
    assert.equal(scheduleMatchesPatient({ pacienteId: '', pacienteNome: 'Diva Ferreira dos Santos' }, p), true);
    assert.equal(scheduleMatchesPatient({ pacienteId: '', pacienteNome: 'dona diva' }, p), true);
    assert.equal(scheduleMatchesPatient({ pacienteId: 'p2', pacienteNome: 'Outro Paciente' }, p), false);
  });

  test('identifies only unlinked Agendado schedules as pending forecast', () => {
    assert.equal(isSchedulePendingForecast({ status: 'Agendado', atendimentoId: '' }), true);
    assert.equal(isSchedulePendingForecast({ status: '', atendimentoId: '' }), true);
    assert.equal(isSchedulePendingForecast({ status: 'Realizado', atendimentoId: 'e123' }), false);
    assert.equal(isSchedulePendingForecast({ status: 'Cancelado', atendimentoId: '' }), false);
    assert.equal(isSchedulePendingForecast({ status: 'Agendado', atendimentoId: 'e123' }), false);
  });
});



