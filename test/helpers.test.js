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

const timeStrToMin = extractFn('timeStrToMin');
const minToTimeStr = extractFnWithScope('minToTimeStr', {
  pad: (n) => String(n).padStart(2, '0')
});
const formatDurationFriendly = extractFn('formatDurationFriendly');
const calcFuelMetrics = extractFnWithScope('calcFuelMetrics', {
  getCarKmPerLiter: () => 14,
  getGasPrice: () => 6.10
});
const buildGoogleMapsDirUrl = extractFn('buildGoogleMapsDirUrl');
const formatDistanceKm = extractFn('formatDistanceKm');
const parseTimeMinutes = extractFn('parseTimeMinutes');
const formatTimeMinutes = extractFnWithScope('formatTimeMinutes', { minToTimeStr });
const formatDurationHuman = extractFnWithScope('formatDurationHuman', { formatDurationFriendly });
const calcFuelCost = extractFnWithScope('calcFuelCost', { calcFuelMetrics });
const buildGoogleMapsDirectionsUrl = extractFnWithScope('buildGoogleMapsDirectionsUrl', { buildGoogleMapsDirUrl });

describe('Route and Fuel Assistant helpers', () => {
  test('timeStrToMin converts HH:MM to total minutes correctly', () => {
    assert.equal(timeStrToMin('00:00'), 0);
    assert.equal(timeStrToMin('10:00'), 600);
    assert.equal(timeStrToMin('14:00'), 840);
    assert.equal(timeStrToMin('14:50'), 890);
    assert.equal(timeStrToMin('15:00'), 900);
    assert.equal(timeStrToMin('16:00'), 960);
  });

  test('minToTimeStr formats total minutes into HH:MM string', () => {
    assert.equal(minToTimeStr(0), '00:00');
    assert.equal(minToTimeStr(600), '10:00');
    assert.equal(minToTimeStr(840), '14:00');
    assert.equal(minToTimeStr(890), '14:50');
    assert.equal(minToTimeStr(900), '15:00');
    assert.equal(minToTimeStr(960), '16:00');
  });

  test('formatDurationFriendly handles minutes and hours properly', () => {
    assert.equal(formatDurationFriendly(8), '8 min');
    assert.equal(formatDurationFriendly(9), '9 min');
    assert.equal(formatDurationFriendly(50), '50 min');
    assert.equal(formatDurationFriendly(60), '1h');
    assert.equal(formatDurationFriendly(70), '1h 10min');
    assert.equal(formatDurationFriendly(130), '2h 10min');
  });

  test('calcFuelMetrics calculates liters and cost with 14 km/L and R$ 6.10/L', () => {
    const res = calcFuelMetrics(14);
    assert.equal(res.km, 14);
    assert.equal(res.liters, 1.0);
    assert.equal(res.cost, 6.10);
    assert.equal(res.kml, 14);

    const res28 = calcFuelMetrics(28);
    assert.equal(res28.km, 28);
    assert.equal(res28.liters, 2.0);
    assert.equal(res28.cost, 12.20);

    const zero = calcFuelMetrics(0);
    assert.equal(zero.km, 0);
    assert.equal(zero.liters, 0);
    assert.equal(zero.cost, 0);
  });

  test('buildGoogleMapsDirUrl constructs valid direction URL with origin, destination, and optional waypoint', () => {
    const url = buildGoogleMapsDirUrl('Rua Maracaju, 88', 'Av Independencia, 1200');
    assert.match(url, /https:\/\/www\.google\.com\/maps\/dir\/\?api=1/);
    assert.match(url, /origin=Rua%20Maracaju%2C%2088/);
    assert.match(url, /destination=Av%20Independencia%2C%201200/);
    assert.match(url, /travelmode=driving/);

    const urlWaypoint = buildGoogleMapsDirUrl('Rua Maracaju, 88', 'Rua B', 'Rua A');
    assert.match(urlWaypoint, /waypoints=Rua%20A/);

    const urlAlias = buildGoogleMapsDirectionsUrl('Rua Maracaju, 88', ['Rua B']);
    assert.match(urlAlias, /destination=Rua%20B/);
  });

  test('formatDistanceKm formats km with comma decimal', () => {
    assert.equal(formatDistanceKm(4.5), '4,5 km');
    assert.equal(formatDistanceKm(12), '12,0 km');
    assert.equal(formatDistanceKm(0), '0,0 km');
  });

  test('parseTimeMinutes and formatTimeMinutes roundtrip correctly', () => {
    assert.equal(parseTimeMinutes('14:30'), 870);
    assert.equal(parseTimeMinutes(''), null);
    assert.equal(parseTimeMinutes(null), null);
    assert.equal(formatTimeMinutes(870), '14:30');
    assert.equal(formatDurationHuman(75), '1h 15min');
  });

  test('calcFuelCost delegates to calcFuelMetrics', () => {
    const f = calcFuelCost(28);
    assert.equal(f.liters, 2.0);
    assert.equal(f.cost, 12.20);
  });
});



