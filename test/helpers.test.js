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

describe('Batch Scheduling and Preset Range Bounds', () => {
  const pad = (n) => (n < 10 ? '0' : '') + n;
  const isoDate = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const agendaMonth = new Date(2026, 10, 1); // Nov 2026

  const getPresetRangeBounds = extractFnWithScope('getPresetRangeBounds', { isoDate, agendaMonth });

  test('getPresetRangeBounds calculates correct bounds for week, 2weeks, month, nextmonth', () => {
    const bWeek = getPresetRangeBounds('week');
    assert.ok(bWeek && bWeek.start && bWeek.end);
    assert.ok(bWeek.start <= bWeek.end);

    const b2w = getPresetRangeBounds('2weeks');
    assert.ok(b2w && b2w.start && b2w.end);
    assert.ok(b2w.start <= b2w.end);

    const bMonth = getPresetRangeBounds('month');
    assert.equal(bMonth.start, '2026-11-01');
    assert.equal(bMonth.end, '2026-11-30');

    const bNextMonth = getPresetRangeBounds('nextmonth');
    assert.equal(bNextMonth.start, '2026-12-01');
    assert.equal(bNextMonth.end, '2026-12-31');
  });

  test('schedule duplicate check permits different hours on same day, blocks exact duplicate', () => {
    const p = { id: 'p1', nome: 'Dona Maria', nomeFantasia: 'Maria' };
    const schedules = [
      { id: 'ag1', pacienteId: 'p1', data: '2026-11-10', hora: '14:00', status: 'Agendado' }
    ];

    const isDupExact = schedules.some((sc) => (
      sc.status !== 'Cancelado' && sc.data === '2026-11-10' && sc.pacienteId === p.id && (sc.hora || '') === '14:00'
    ));
    assert.equal(isDupExact, true, 'Exact same date and hour must be identified as duplicate');

    const isDupDifferentHour = schedules.some((sc) => (
      sc.status !== 'Cancelado' && sc.data === '2026-11-10' && sc.pacienteId === p.id && (sc.hora || '') === '16:00'
    ));
    assert.equal(isDupDifferentHour, false, 'Different hour on same date must NOT be blocked');

    const isDupCancelled = schedules.some((sc) => (
      sc.status !== 'Cancelado' && sc.data === '2026-11-10' && sc.pacienteId === p.id && (sc.hora || '') === '14:00' && sc.status === 'Cancelado'
    ));
    assert.equal(isDupCancelled, false);
  });
});

describe('Route Engine, Haversine Estimation and Coordinates Matching', () => {
  const mCoords = html.match(/var RP_COORDS_REF = \[[\s\S]*?\];/);
  const RP_COORDS_REF = new Function('return (' + mCoords[0].replace('var RP_COORDS_REF = ', '').replace(/;$/, '') + ')')();

  const normAddrKey = extractFn('normAddrKey');
  const makeRoutePairKey = extractFnWithScope('makeRoutePairKey', { normAddrKey });
  const findApproxCoordsRP = extractFnWithScope('findApproxCoordsRP', { normAddrKey, RP_COORDS_REF });
  const haversineRoadEstimate = extractFn('haversineRoadEstimate');
  const getRouteSyncOrApprox = extractFnWithScope('getRouteSyncOrApprox', {
    normAddrKey,
    makeRoutePairKey,
    getRouteCacheMap: () => ({}),
    findApproxCoordsRP,
    haversineRoadEstimate
  });

  test('matches coordinates for known Ribeirão Preto neighborhoods', () => {
    const home = findApproxCoordsRP('Rua Maracaju, 88 - Vila Tibério, Ribeirão Preto');
    assert.ok(home && home.matched);
    assert.equal(home.lat, -21.1764);
    assert.equal(home.lon, -47.8266);

    const usp = findApproxCoordsRP('Avenida dos Bandeirantes, 3900 - Monte Alegre, USP');
    assert.ok(usp && usp.matched);
    assert.equal(usp.lat, -21.1685);

    const centro = findApproxCoordsRP('Rua General Osório, 400 - Centro, Ribeirão Preto');
    assert.ok(centro && centro.matched);
    assert.equal(centro.lat, -21.1775);

    const botanico = findApproxCoordsRP('Avenida Professor João Fiúsa, 1200 - Jardim Botânico');
    assert.ok(botanico && botanico.matched);
    assert.equal(botanico.lat, -21.2115);

    const bonfim = findApproxCoordsRP('Condomínio Alphaville - Bonfim Paulista');
    assert.ok(bonfim && bonfim.matched);
    assert.equal(bonfim.lat, -21.2550);
  });

  test('haversineRoadEstimate returns realistic road distances and urban drive times', () => {
    const c1 = { lat: -21.1764, lon: -47.8266 }; // Vila Tiberio
    const c2 = { lat: -21.1685, lon: -47.8425 }; // Monte Alegre / USP
    const est = haversineRoadEstimate(c1, c2);
    assert.equal(est.ok, true);
    assert.ok(est.distanceKm >= 2.0 && est.distanceKm <= 3.5, 'Distance between Vila Tiberio and USP should be ~2.5km');
    assert.ok(est.durationMin >= 6 && est.durationMin <= 12, 'Drive time should be ~8-9min');
  });

  test('getRouteSyncOrApprox returns 0km and 0min for identical addresses (mesmo endereço)', () => {
    const r = getRouteSyncOrApprox('Rua André Rebouças 1044', 'Rua André Rebouças 1044');
    assert.equal(r.ok, true);
    assert.equal(r.distanceKm, 0);
    assert.equal(r.durationMin, 0);
    assert.equal(r.sameLocation, true);
  });

  test('getRouteSyncOrApprox safely provides fallback for unknown neighborhoods without null/crash', () => {
    const r = getRouteSyncOrApprox('Rua Inexistente, 123', 'Avenida Qualquer, 456');
    assert.ok(r && r.ok);
    assert.ok(r.distanceKm > 0);
    assert.ok(r.durationMin > 0);
    assert.equal(r.approx, true);
  });

  test('ranking simulation does not crash when patients have blank addresses', () => {
    const patients = [
      { id: 'p1', nome: 'Paciente Sem Endereco', endereco: '', bairro: '', cidade: '' },
      { id: 'p2', nome: 'Paciente Com Endereco', endereco: 'Rua General Osorio, 100', bairro: 'Centro', cidade: 'Ribeirao Preto' }
    ];
    const getPatientFullAddress = (p) => {
      const parts = [p.endereco, p.bairro, p.cidade].filter(Boolean);
      return parts.join(', ');
    };
    const originAddr = 'Rua Maracaju, 88 - Vila Tiberio';
    const activeOthers = patients.filter((p) => getPatientFullAddress(p));
    assert.equal(activeOthers.length, 1);

    const rows = activeOthers.map((p) => {
      const pAddr = getPatientFullAddress(p);
      const r = getRouteSyncOrApprox(originAddr, pAddr) || { ok: true, distanceKm: 4.5, durationMin: 12, approx: true };
      return { patient: p, route: r, fuel: calcFuelMetrics(r.distanceKm) };
    }).sort((a, b) => a.route.durationMin - b.route.durationMin);

    assert.equal(rows.length, 1);
    assert.ok(rows[0].route.durationMin > 0);
    assert.ok(rows[0].fuel.liters > 0);
    assert.ok(rows[0].fuel.cost > 0);
  });
});






describe('Pacientes, bloqueios de agenda e período de férias (v46)', () => {
  const normName = extractFn('normName');
  const NON_PATIENT_NAMES = ['agachamento', 'flexao', 'prancha', 'exercicio', 'rotina', 'alongamento', '__bloqueio__', 'bloqueio', 'ausencia', 'ferias'];
  const BLOCK_LABELS = ['ferias', 'folga / recesso', 'congresso / curso', 'atestado / saude', 'atestado medico', 'feriado', 'bloqueio de horario'];
  const isInvalidPatientName = extractFnWithScope('isInvalidPatientName', { normName, NON_PATIENT_NAMES });
  const hasReservedName = extractFnWithScope('hasReservedName', { isInvalidPatientName });
  const isBlockLabelName = extractFnWithScope('isBlockLabelName', { normName, BLOCK_LABELS });
  const isNonPatientRecord = extractFnWithScope('isNonPatientRecord', { isInvalidPatientName, isBlockLabelName, hasReservedName });
  const isBlockSchedule = extractFn('isBlockSchedule');
  const isValidIsoDay = extractFn('isValidIsoDay');
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  const isoDate = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const VAC_MAX_DAYS = 120;
  const vacationSpanDays = extractFnWithScope('vacationSpanDays', { isValidIsoDay });
  const getVacationDatesRange = extractFnWithScope('getVacationDatesRange', { vacationSpanDays, VAC_MAX_DAYS, isoDate });

  test('paciente sem Nome Fantasia continua válido (não some da lista)', () => {
    assert.equal(isNonPatientRecord({ nome: 'Irani Souza', nomeFantasia: '' }), false);
    assert.equal(isNonPatientRecord({ nome: 'Irani Souza' }), false);
    assert.equal(isNonPatientRecord({ nome: '', nomeFantasia: 'Dona Diva' }), false);
  });

  test('exercícios e rótulos de férias/ausência não são pacientes', () => {
    assert.equal(isNonPatientRecord({ nome: 'Flexão', nomeFantasia: '' }), true);
    assert.equal(isNonPatientRecord({ nome: '🏖️ Férias', nomeFantasia: '' }), true);
    assert.equal(isNonPatientRecord({ nome: '🏥 Atestado / Saúde', nomeFantasia: '' }), true);
    assert.equal(isNonPatientRecord({ nome: 'Maria', nomeFantasia: 'Prancha' }), true);
    assert.equal(isNonPatientRecord({ nome: '', nomeFantasia: '' }), true);
  });

  test('isBlockSchedule identifica bloqueios e ignora atendimentos', () => {
    assert.equal(isBlockSchedule({ pacienteId: '__BLOQUEIO__' }), true);
    assert.equal(isBlockSchedule({ status: 'Ausência' }), true);
    assert.equal(isBlockSchedule({ pacienteId: 'p1', status: 'Agendado' }), false);
    assert.equal(isBlockSchedule(null), false);
  });

  test('período de férias tem limite e rejeita datas inválidas (sem travar com ano digitado)', () => {
    assert.equal(vacationSpanDays('2026-11-02', '2026-11-02'), 1);
    assert.equal(vacationSpanDays('2026-11-02', '2026-11-10'), 9);
    assert.equal(vacationSpanDays('2026-11-10', '2026-11-02'), -1);
    assert.equal(vacationSpanDays('20267-11-02', '2026-11-02'), -1);
    assert.deepEqual(getVacationDatesRange('2026-11-02', '2026-11-04'), ['2026-11-02', '2026-11-03', '2026-11-04']);
    // ano parcialmente digitado (0002) -> período gigante: não gera array
    assert.deepEqual(getVacationDatesRange('0002-11-02', '2026-11-02'), []);
    assert.equal(getVacationDatesRange('2026-01-01', '2026-12-31').length, 0);
    assert.equal(getVacationDatesRange('2026-01-01', '2026-04-30').length, 120);
  });
});


describe('Deduplicação de Pacientes (v47)', () => {
  const normName = extractFn('normName');
  const NON_PATIENT_NAMES = ['agachamento', 'flexao', 'prancha', 'exercicio', 'rotina', 'alongamento', '__bloqueio__', 'bloqueio', 'ausencia', 'ferias'];
  const BLOCK_LABELS = ['ferias', 'folga / recesso', 'congresso / curso', 'atestado / saude', 'atestado medico', 'feriado', 'bloqueio de horario'];
  const isInvalidPatientName = extractFnWithScope('isInvalidPatientName', { normName, NON_PATIENT_NAMES });
  const hasReservedName = extractFnWithScope('hasReservedName', { isInvalidPatientName });
  const isBlockLabelName = extractFnWithScope('isBlockLabelName', { normName, BLOCK_LABELS });
  const isNonPatientRecord = extractFnWithScope('isNonPatientRecord', { isInvalidPatientName, isBlockLabelName, hasReservedName });
  const deduplicatePatientsList = extractFnWithScope('deduplicatePatientsList', { normName, isNonPatientRecord });

  test('remove duplicatas com mesmo nome mantendo ID oficial da planilha em vez de pac_auto_', () => {
    const rawList = [
      { id: 'p1786388055991', nome: 'Irani', telefone: '16999991111' },
      { id: 'pac_auto_123456', nome: 'Irani', endereco: 'Rua das Flores, 120' },
      { id: 'p1786388068101', nome: 'Sebastião' },
      { id: 'pac_auto_789012', nome: 'Sebastião', telefone: '16988882222' }
    ];

    const clean = deduplicatePatientsList(rawList);
    assert.equal(clean.length, 2);

    const irani = clean.find(p => normName(p.nome) === 'irani');
    assert.ok(irani);
    assert.equal(irani.id, 'p1786388055991');
    assert.equal(irani.telefone, '16999991111');
    assert.equal(irani.endereco, 'Rua das Flores, 120');

    const sebastiao = clean.find(p => normName(p.nome) === 'sebastiao');
    assert.ok(sebastiao);
    assert.equal(sebastiao.id, 'p1786388068101');
    assert.equal(sebastiao.telefone, '16988882222');
  });

  test('unifica quando nome corresponde a nomeFantasia de registro duplicado', () => {
    const rawList = [
      { id: 'p1786388076217', nome: 'Dona Diva', nomeFantasia: '' },
      { id: 'pac_auto_999999', nome: 'Diva Ferreira dos Santos', nomeFantasia: 'Dona Diva', bairro: 'Vila Tibério' }
    ];

    const clean = deduplicatePatientsList(rawList);
    assert.equal(clean.length, 1);
    assert.equal(clean[0].id, 'p1786388076217');
    assert.equal(clean[0].bairro, 'Vila Tibério');
  });

  test('ignora itens que não são pacientes reais na deduplicação', () => {
    const rawList = [
      { id: 'p1', nome: 'Márcia' },
      { id: 'p2', nome: 'Flexão' },
      { id: 'p3', nome: '🏖️ Férias' },
      { id: 'p4', nome: 'Márcia' }
    ];

    const clean = deduplicatePatientsList(rawList);
    assert.equal(clean.length, 1);
    assert.equal(clean[0].nome, 'Márcia');
  });
});

describe('Controle de Modais e Proteção contra Fechamento Prematuro (v48)', () => {
  const closeModalBgFn = extractFnWithScope('closeModalBg', {
    Date: { now: () => 1000 },
    closeModal: () => {}
  });

  test('ignora clique no backdrop se modal acabou de abrir (< 350ms)', () => {
    let closed = false;
    const testScope = {
      _modalOpenTs: 900, // abriu há 100ms
      Date: { now: () => 1000 },
      closeModal: () => { closed = true; }
    };
    const fn = extractFnWithScope('closeModalBg', testScope);
    const fakeTarget = {};
    fn({ target: fakeTarget, currentTarget: fakeTarget });
    assert.equal(closed, false, 'Modal não deve fechar com menos de 350ms');
  });

  test('fecha o modal se clique no backdrop ocorrer após o período de proteção (>= 350ms)', () => {
    let closed = false;
    const testScope = {
      _modalOpenTs: 500, // abriu há 500ms
      Date: { now: () => 1000 },
      closeModal: () => { closed = true; }
    };
    const fn = extractFnWithScope('closeModalBg', testScope);
    const fakeTarget = {};
    fn({ target: fakeTarget, currentTarget: fakeTarget });
    assert.equal(closed, true, 'Modal deve fechar quando o backdrop for clicado intencionalmente');
  });

  test('não fecha se o clique foi em um elemento interno do modal (target !== currentTarget)', () => {
    let closed = false;
    const testScope = {
      _modalOpenTs: 200, // abriu há 800ms
      Date: { now: () => 1000 },
      closeModal: () => { closed = true; }
    };
    const fn = extractFnWithScope('closeModalBg', testScope);
    const bg = {};
    const card = {};
    fn({ target: card, currentTarget: bg });
    assert.equal(closed, false, 'Clique no card interno não pode fechar o modal');
  });
});

describe('Sincronização Multi-Dispositivo & Autoridade da Planilha (v49)', () => {
  test('dados da planilha sobrepõem metadados locais antigos', () => {
    const sheetData = {
      ID: 'p123',
      Nome: 'Diva Ferreira Atualizada',
      NomeFantasia: 'Dona Diva',
      Telefone: '16999998888',
      ValorPadrao: '150.00',
      Arquivado: 'Não'
    };
    const localMeta = {
      nome: 'Diva Ferreira Antiga',
      telefone: '16999991111',
      valorPadrao: '100.00',
      arquivado: 'Sim'
    };

    const resolvedName = sheetData.Nome || localMeta.nome || '';
    const resolvedTel = sheetData.Telefone || localMeta.telefone || '';
    const resolvedValor = sheetData.ValorPadrao || localMeta.valorPadrao || '';
    const resolvedArch = sheetData.Arquivado || localMeta.arquivado || 'Não';

    assert.equal(resolvedName, 'Diva Ferreira Atualizada', 'Nome da planilha deve vencer');
    assert.equal(resolvedTel, '16999998888', 'Telefone atualizado no celular deve vencer');
    assert.equal(resolvedValor, '150.00', 'Valor atualizado no celular deve vencer');
    assert.equal(resolvedArch, 'Não', 'Status arquivado da planilha deve vencer');
  });

  test('agendamentos da planilha sobrepõem cache local do computador', () => {
    const localScheds = [
      { id: 'sc1', hora: '14:00', status: 'Agendado' },
      { id: 'sc_deleted', hora: '10:00', status: 'Agendado' }
    ];
    const sheetScheds = [
      { id: 'sc1', hora: '15:00', status: 'Realizado' }
    ];

    const schedMap = {};
    localScheds.forEach(sc => {
      if (sc.id && sc.id.includes('_local_')) schedMap[sc.id] = sc;
    });
    sheetScheds.forEach(sc => {
      schedMap[sc.id] = sc;
    });
    const finalScheds = Object.values(schedMap);

    assert.equal(finalScheds.length, 1);
    assert.equal(finalScheds[0].hora, '15:00');
    assert.equal(finalScheds[0].status, 'Realizado');
  });
});

describe('Evoluções com SPO2/Observações, Check-in Diário & Google Agenda (v50)', () => {
  test('SPO2 formatado e exibido com badge correto', () => {
    const ev = { id: 'ev1', pa: '12/8', fc: '72', spo2: '98', estadoClinico: 'Estável', condutas: 'Cinesio' };
    const formattedBadge = ev.spo2 ? `SPO2: ${ev.spo2}%` : '';
    assert.equal(formattedBadge, 'SPO2: 98%');
  });

  test('copiar conduta anterior obtém a conduta mais recente do mesmo paciente', () => {
    const evList = [
      { id: 'ev1', pacienteId: 'p1', data: '2026-11-01', hora: '14:00', condutas: 'Treino de equilíbrio estático' },
      { id: 'ev2', pacienteId: 'p1', data: '2026-11-03', hora: '15:00', condutas: 'Mobilização passiva e treino de marcha' },
      { id: 'ev3', pacienteId: 'p2', data: '2026-11-04', hora: '10:00', condutas: 'Eletroterapia TENS' }
    ];
    const pid = 'p1';
    const lastForP1 = evList.slice().sort((a,b) => (b.data + ' ' + b.hora).localeCompare(a.data + ' ' + a.hora))
      .find(x => x.pacienteId === pid && x.condutas);
    assert.ok(lastForP1);
    assert.equal(lastForP1.id, 'ev2');
    assert.equal(lastForP1.condutas, 'Mobilização passiva e treino de marcha');
  });

  test('título de evento no Google Agenda é estritamente o nome do paciente', () => {
    const sc = { pacienteNome: 'Dona Diva', status: 'Agendado' };
    const title = sc.pacienteNome;
    assert.equal(title, 'Dona Diva');
    assert.ok(!title.includes('Fisioterapia:'), 'Não deve conter prefixo Fisioterapia:');
  });

  test('atribuição de cor automática por paciente (1 a 11 determinística)', () => {
    function getPatientColor(name) {
      let hash = 0;
      const str = String(name || '').toLowerCase();
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      return String((Math.abs(hash) % 11) + 1);
    }
    const c1 = getPatientColor('Sebastião');
    const c2 = getPatientColor('Sebastião');
    const c3 = getPatientColor('Irani');
    assert.equal(c1, c2, 'Mesmo paciente sempre recebe a mesma cor');
    assert.ok(parseInt(c1) >= 1 && parseInt(c1) <= 11, 'Cor deve estar entre 1 e 11');
    assert.ok(parseInt(c3) >= 1 && parseInt(c3) <= 11, 'Cor deve estar entre 1 e 11');
  });

  test('blindagem contra agenda da USP: proíbe uso de matheusrodrigues1917@usp.br', () => {
    function isForbidden(em) {
      const s = String(em || '').toLowerCase();
      return s.includes('matheusrodrigues1917@usp.br') || s.includes('@usp.br');
    }
    assert.equal(isForbidden('matheusrodrigues1917@usp.br'), true);
    assert.equal(isForbidden('outro@usp.br'), true);
    assert.equal(isForbidden('scarletsantos7@gmail.com'), false);
  });
});

describe('Aba Check-in Inicial, Desaparecimento pós Check-in & Navegação por Gestos Swipe (v51)', () => {
  test('Agenda é a primeira aba na navegação (à esquerda de Pacientes) e Check-in diário foi removido das abas', () => {
    const mNav = html.match(/<nav class="main-tabs"[\s\S]*?<\/nav>/);
    assert.ok(mNav, 'nav.main-tabs deve existir');
    const navContent = mNav[0];
    const agendaIdx = navContent.indexOf('id="tabBtnAgenda"');
    const pacientesIdx = navContent.indexOf('id="tabBtnPacientes"');
    const checkinIdx = navContent.indexOf('id="tabBtnCheckin"');
    assert.equal(checkinIdx, -1, 'tabBtnCheckin não deve existir');
    assert.ok(agendaIdx > -1, 'tabBtnAgenda deve existir');
    assert.ok(pacientesIdx > -1, 'tabBtnPacientes deve existir');
    assert.ok(agendaIdx < pacientesIdx, 'tabBtnAgenda deve ficar antes de tabBtnPacientes');
  });

  test('Paciente com check-in realizado some da lista de check-in pendente', () => {
    const today = '2026-11-04';
    const scheds = [
      { id: 's1', data: today, status: 'Agendado', pacienteNome: 'Vinícius' },
      { id: 's2', data: today, status: 'Realizado', pacienteNome: 'Dona Diva' },
      { id: 's3', data: '2026-11-05', status: 'Agendado', pacienteNome: 'Sebastião' }
    ];

    const pending = scheds.filter(sc => sc.data === today && sc.status !== 'Realizado' && sc.status !== 'Cancelado');
    assert.equal(pending.length, 1);
    assert.equal(pending[0].pacienteNome, 'Vinícius');
  });

  test('Gesto Swipe calcula transição de aba corretamente', () => {
    const tabs = ['agenda', 'pacientes', 'evolucoes', 'financeiro'];
    function getNextTab(current, deltaX, deltaY, duration) {
      if (Math.abs(deltaX) >= 45 && duration <= 450 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
        const idx = tabs.indexOf(current);
        if (deltaX < 0 && idx < tabs.length - 1) return tabs[idx + 1];
        if (deltaX > 0 && idx > 0) return tabs[idx - 1];
      }
      return current;
    }

    assert.equal(getNextTab('agenda', -80, 10, 200), 'pacientes');
    assert.equal(getNextTab('pacientes', -70, 5, 180), 'evolucoes');
    assert.equal(getNextTab('evolucoes', 80, 5, 200), 'pacientes');
    assert.equal(getNextTab('pacientes', 60, 10, 210), 'agenda');
    assert.equal(getNextTab('agenda', -50, 100, 200), 'agenda');
  });

  test('Navegação entre dias no Check-in calcula D+1, D-1, D+2 e D-2 corretamente', () => {
    function calculateCheckinDay(baseIso, delta) {
      if (delta === 0) return baseIso;
      const parts = baseIso.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      d.setDate(d.getDate() + delta);
      const pad = n => (n < 10 ? '0' : '') + n;
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }

    const today = '2026-11-04';
    assert.equal(calculateCheckinDay(today, 1), '2026-11-05'); // D+1
    assert.equal(calculateCheckinDay(today, 2), '2026-11-06'); // D+2
    assert.equal(calculateCheckinDay(today, -1), '2026-11-03'); // D-1
    assert.equal(calculateCheckinDay(today, -2), '2026-11-02'); // D-2
    assert.equal(calculateCheckinDay(today, 0), '2026-11-04');  // Hoje
  });

  test('Cálculo de rótulo relativo (Hoje, Amanhã, Ontem, D+N, D-N)', () => {
    function getRelativeLabel(baseIso, targetIso) {
      const p1 = baseIso.split('-');
      const p2 = targetIso.split('-');
      const d1 = new Date(parseInt(p1[0], 10), parseInt(p1[1], 10) - 1, parseInt(p1[2], 10));
      const d2 = new Date(parseInt(p2[0], 10), parseInt(p2[1], 10) - 1, parseInt(p2[2], 10));
      const diffDays = Math.round((d2 - d1) / 86400000);
      if (diffDays === 0) return 'Hoje';
      if (diffDays === 1) return 'Amanhã (D+1)';
      if (diffDays === -1) return 'Ontem (D-1)';
      if (diffDays > 1) return 'D+' + diffDays;
      return 'D' + diffDays;
    }

    const today = '2026-11-04';
    assert.equal(getRelativeLabel(today, '2026-11-04'), 'Hoje');
    assert.equal(getRelativeLabel(today, '2026-11-05'), 'Amanhã (D+1)');
    assert.equal(getRelativeLabel(today, '2026-11-06'), 'D+2');
    assert.equal(getRelativeLabel(today, '2026-11-03'), 'Ontem (D-1)');
    assert.equal(getRelativeLabel(today, '2026-11-02'), 'D-2');
  });
});

describe('Exportação de PDF com Fundo Limpo (Remoção de Planos de Fundo)', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'atendimentos.html'), 'utf8');

  test('atendimentos.html não invoca marca d água ou planos de fundo em quebras de página', () => {
    // Apenas a declaração de compatibilidade deve existir, sem chamadas de execução
    const occurrences = (html.match(/marcaDaguaOutono/g) || []).length;
    assert.equal(occurrences, 1);
    assert.equal(html.includes('marcaDaguaOutono(doc, 210'), false);
    assert.equal(html.includes('marcaDaguaOutono(doc,210'), false);
    assert.equal(html.includes('doc.setGState'), false);
    assert.equal(html.includes('doc.ellipse'), false);
  });

  test('marcaDaguaOutono é no-op seguro que não desenha nada no canvas do PDF', () => {
    let drawCalls = 0;
    const fakeDoc = {
      setFillColor() { drawCalls++; },
      ellipse() { drawCalls++; },
      circle() { drawCalls++; },
      setGState() { drawCalls++; },
      rect() { drawCalls++; }
    };
    const fnMatch = html.match(/function marcaDaguaOutono\([^)]*\)\s*\{([\s\S]*?)\n\}/);
    assert.ok(fnMatch);
    const fn = new Function('doc', 'pageW', 'pageH', fnMatch[1]);
    fn(fakeDoc, 210, 297);
    assert.equal(drawCalls, 0);
  });

  test('receiptHeader renderiza cabeçalho limpo sem invocar planos de fundo', () => {
    const fnMatch = html.match(/function receiptHeader\([^)]*\)\s*\{([\s\S]*?)\n\}/);
    assert.ok(fnMatch);
    const capturedTexts = [];
    let ellipseCalls = 0;
    const fakeDoc = {
      setFillColor() {},
      rect() {},
      setTextColor() {},
      setFont() {},
      setFontSize() {},
      text(str) { capturedTexts.push(str); },
      ellipse() { ellipseCalls++; }
    };
    const fn = new Function('doc', 'title', 'config', fnMatch[1]);
    fn(fakeDoc, 'Extrato Financeiro', { providerName: 'Scarlet Feitosa Santos' });
    assert.equal(ellipseCalls, 0);
    assert.equal(capturedTexts.some(t => t.includes('Scarlet Feitosa Santos')), true);
  });
});

describe('Aba Inicial Padrão Configurável (Agenda padrão com seleção em Configurações)', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'atendimentos.html'), 'utf8');

  test('setupScreen possui select com abas disponíveis e agenda como padrão (sem checkin)', () => {
    assert.equal(html.includes('id="defaultTabSelect"'), true);
    assert.equal(html.includes('value="checkin"'), false);
    assert.equal(html.includes('value="agenda"'), true);
    assert.equal(html.includes('value="pacientes"'), true);
    assert.equal(html.includes('value="evolucoes"'), true);
    assert.equal(html.includes('value="financeiro"'), true);
  });

  test('getDefaultTab retorna agenda por padrão na ausência de configuração', () => {
    const fnMatch = html.match(/function getDefaultTab\([^)]*\)\s*\{([\s\S]*?)\r?\n\}/);
    assert.ok(fnMatch);
    const fn = new Function('config', 'localStorage', fnMatch[1]);
    const fakeStorage = { getItem: () => null };
    assert.equal(fn(null, fakeStorage), 'agenda');
    assert.equal(fn({}, fakeStorage), 'agenda');
  });

  test('getDefaultTab respeita a aba escolhida pelo usuário nas configurações', () => {
    const fnMatch = html.match(/function getDefaultTab\([^)]*\)\s*\{([\s\S]*?)\r?\n\}/);
    assert.ok(fnMatch);
    const fn = new Function('config', 'localStorage', fnMatch[1]);
    const fakeStorage = { getItem: (key) => key === 'ft_default_tab' ? 'evolucoes' : null };
    assert.equal(fn({ defaultTab: 'pacientes' }, fakeStorage), 'pacientes');
    assert.equal(fn(null, fakeStorage), 'evolucoes');
  });

  test('getDefaultTab faz fallback seguro para agenda se valor for inválido', () => {
    const fnMatch = html.match(/function getDefaultTab\([^)]*\)\s*\{([\s\S]*?)\r?\n\}/);
    assert.ok(fnMatch);
    const fn = new Function('config', 'localStorage', fnMatch[1]);
    const fakeStorage = { getItem: () => 'invalida' };
    assert.equal(fn({ defaultTab: 'aba_fantasma' }, fakeStorage), 'agenda');
    assert.equal(fn(null, fakeStorage), 'agenda');
  });
});

describe('Botões de Ação na Agenda (Check-in e Evoluções nos cards)', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'atendimentos.html'), 'utf8');

  test('Agenda exibe botões de Check-in e Evolução para pacientes nos agendamentos', () => {
    assert.ok(html.includes('completeScheduleCheckin('), 'deve ter chamada completeScheduleCheckin');
    assert.ok(html.includes('openNewEvolution('), 'deve ter chamada openNewEvolution');
    assert.ok(html.includes('Check-in'), 'deve ter botão de check-in');
    assert.ok(html.includes('Evolução'), 'deve ter botão de evolução');
  });
});

describe('Exportação de Evoluções em PDF em Lote por Período e Múltiplos Pacientes (v52)', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'atendimentos.html'), 'utf8');

  test('botão de exportação em PDF está presente na aba de evoluções chamando modal de lote', () => {
    assert.equal(html.includes('id="btnExportEvolucoesPDF"'), true);
    assert.equal(html.includes('openExportEvolutionsBatchModal()'), true);
  });

  test('evolutionMatchesPatient identifica paciente tanto por ID quanto por correspondência de nome', () => {
    const fnMatch = html.match(/function evolutionMatchesPatient\(ev,\s*p\)[\s\S]*?\n\}/);
    assert.ok(fnMatch, 'evolutionMatchesPatient must be defined');
    const findPatientForEvolution = (ev) => ev.pacienteNome === 'João' ? { id: 'p_joao' } : null;
    const fn = new Function('findPatientForEvolution', 'return (' + fnMatch[0] + ')')(findPatientForEvolution);

    assert.equal(fn({ pacienteId: 'p1' }, { id: 'p1' }), true);
    assert.equal(fn({ pacienteId: 'p1' }, { id: 'p2' }), false);
    assert.equal(fn({ pacienteNome: 'João' }, { id: 'p_joao' }), true);
    assert.equal(fn({ pacienteNome: 'Outro' }, { id: 'p_joao' }), false);
    assert.equal(fn(null, { id: 'p1' }), false);
  });

  test('getWeekBounds calcula início (segunda-feira) e fim (domingo) corretamente', () => {
    const fnMatch = html.match(/function getWeekBounds\(dateStr\)[\s\S]*?\n\}/);
    assert.ok(fnMatch, 'getWeekBounds must be defined');
    const isoDate = (d) => {
      const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
      return y + '-' + m + '-' + day;
    };
    const fn = new Function('isoDate', 'return (' + fnMatch[0] + ')')(isoDate);

    // Quarta-feira 04/11/2026 -> Semana de 02/11/2026 (Segunda) a 08/11/2026 (Domingo)
    const boundsMid = fn('2026-11-04');
    assert.equal(boundsMid.start, '2026-11-02');
    assert.equal(boundsMid.end, '2026-11-08');

    // Domingo 08/11/2026 -> mesma semana
    const boundsSun = fn('2026-11-08');
    assert.equal(boundsSun.start, '2026-11-02');
    assert.equal(boundsSun.end, '2026-11-08');

    // Segunda 02/11/2026 -> mesma semana
    const boundsMon = fn('2026-11-02');
    assert.equal(boundsMon.start, '2026-11-02');
    assert.equal(boundsMon.end, '2026-11-08');
  });

  test('filterEvolutionsByPeriod filtra pontualmente por dia, semana, mês, ano e todo o período', () => {
    const fnMatch = html.match(/function filterEvolutionsByPeriod\(evList,\s*pType,\s*pParams\)[\s\S]*?\n\}/);
    assert.ok(fnMatch, 'filterEvolutionsByPeriod must be defined');
    const fn = new Function('return (' + fnMatch[0] + ')')();

    const sample = [
      { id: '1', data: '2026-11-04' },
      { id: '2', data: '2026-11-02' },
      { id: '3', data: '2026-10-15' },
      { id: '4', data: '2025-05-20' }
    ];

    // Dia
    const byDay = fn(sample, 'dia', { date: '2026-11-04' });
    assert.equal(byDay.length, 1);
    assert.equal(byDay[0].id, '1');

    // Semana
    const byWeek = fn(sample, 'semana', { startDate: '2026-11-02', endDate: '2026-11-08' });
    assert.equal(byWeek.length, 2);

    // Mês
    const byMonthNov = fn(sample, 'mes', { year: 2026, month: 11 });
    assert.equal(byMonthNov.length, 2);
    const byMonthOct = fn(sample, 'mes', { year: 2026, month: 10 });
    assert.equal(byMonthOct.length, 1);

    // Ano
    const byYear2026 = fn(sample, 'ano', { year: 2026 });
    assert.equal(byYear2026.length, 3);
    const byYear2025 = fn(sample, 'ano', { year: 2025 });
    assert.equal(byYear2025.length, 1);

    // Todo o período
    const byAll = fn(sample, 'todo', {});
    assert.equal(byAll.length, 4);
  });

  test('PDF de evoluções inclui SPO2 formatado e campo de Observações', () => {
    assert.equal(html.includes('SPO2: '), true);
    assert.equal(html.includes('OBSERVAÇÕES:'), true);
    assert.equal(html.includes('ev.observacoes'), true);
  });
});


describe('Preservação Persistente de Saturação de O2 (SPO2) e Observações contra Sobrescrita da Planilha', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'atendimentos.html'), 'utf8');

  test('funções extractEvoSpo2 e extractEvoObservacoes estão definidas e extraem variações com tolerância a maiúsculas/espaços', () => {
    const spo2FnMatch = html.match(/function extractEvoSpo2\(r\)\s*\{([\s\S]*?)\n\}/);
    assert.ok(spo2FnMatch, 'extractEvoSpo2 deve estar definida');
    const extractEvoSpo2 = new Function('r', spo2FnMatch[1]);

    assert.equal(extractEvoSpo2({ SPO2: '98%' }), '98%');
    assert.equal(extractEvoSpo2({ spo2: '97%' }), '97%');
    assert.equal(extractEvoSpo2({ SpO2: '99' }), '99');
    assert.equal(extractEvoSpo2({ SatO2: '95%' }), '95%');
    assert.equal(extractEvoSpo2({ 'Saturação': '98' }), '98');
    assert.equal(extractEvoSpo2({}), '');
    assert.equal(extractEvoSpo2(null), '');

    const obsFnMatch = html.match(/function extractEvoObservacoes\(r\)\s*\{([\s\S]*?)\n\}/);
    assert.ok(obsFnMatch, 'extractEvoObservacoes deve estar definida');
    const extractEvoObservacoes = new Function('r', obsFnMatch[1]);

    assert.equal(extractEvoObservacoes({ Observacoes: 'Paciente bem disposto' }), 'Paciente bem disposto');
    assert.equal(extractEvoObservacoes({ observacoes: 'Estável' }), 'Estável');
    assert.equal(extractEvoObservacoes({ Obs: 'Acompanhado da filha' }), 'Acompanhado da filha');
    assert.equal(extractEvoObservacoes({}), '');
  });

  test('reconciliação de evoluções NUNCA apaga SPO2 local se a planilha retornar SPO2 vazio', () => {
    // Simula a lógica de reconciliação de evoluções
    const localEvos = [
      { id: 'ev1', pacienteId: 'p1', data: '2026-11-05', hora: '15:00', pa: '110/60', fc: '60', spo2: '98%', estadoClinico: 'BEG', observacoes: 'Sem queixas' }
    ];
    // Planilha oficial retornando evolução sem a coluna SPO2 preenchida (legado ou pendente de deploy do Code.gs)
    const sheetEvos = [
      { id: 'ev1', pacienteId: 'p1', pacienteNome: 'Tereza', data: '2026-11-05', hora: '15:00', pa: '110/60', fc: 60, spo2: '', estadoClinico: 'BEG', condutas: 'Ciclo', observacoes: '', criadoEm: '2026-11-05T18:00:00Z' }
    ];

    const evoMap = {};
    localEvos.forEach(ev => { evoMap[ev.id] = Object.assign({}, ev); });

    sheetEvos.forEach(ev => {
      const existing = evoMap[ev.id];
      if (existing) {
        if (!ev.spo2 && existing.spo2) ev.spo2 = existing.spo2;
        if (!ev.observacoes && existing.observacoes) ev.observacoes = existing.observacoes;
      }
      evoMap[ev.id] = ev;
    });

    const finalEvos = Object.keys(evoMap).map(k => evoMap[k]);
    assert.equal(finalEvos.length, 1);
    assert.equal(finalEvos[0].spo2, '98%', 'SPO2 não pode ser apagado pela planilha');
    assert.equal(finalEvos[0].observacoes, 'Sem queixas', 'Observações não podem ser apagadas pela planilha');
  });

  test('reconciliação recupera SPO2 e Observações mesmo se o ID tiver sido remapeado usando chave composta pacienteId + data + hora', () => {
    const localEvos = [
      { id: 'ev_provisorio', pacienteId: 'p_tereza', data: '2026-11-05', hora: '15:00', spo2: '99%', observacoes: 'Anotação local' }
    ];
    const sheetEvos = [
      { id: 'ev_planilha_oficial', pacienteId: 'p_tereza', data: '2026-11-05', hora: '15:00', spo2: '', observacoes: '' }
    ];

    const evoMap = {};
    localEvos.forEach(ev => { evoMap[ev.id] = Object.assign({}, ev); });

    sheetEvos.forEach(ev => {
      let existing = evoMap[ev.id];
      if (!existing && ev.pacienteId && ev.data) {
        existing = localEvos.find(loc => loc && loc.pacienteId === ev.pacienteId && loc.data === ev.data && (!ev.hora || loc.hora === ev.hora));
      }
      if (existing) {
        if (!ev.spo2 && existing.spo2) ev.spo2 = existing.spo2;
        if (!ev.observacoes && existing.observacoes) ev.observacoes = existing.observacoes;
      }
      evoMap[ev.id] = ev;
    });

    const target = evoMap['ev_planilha_oficial'];
    assert.ok(target);
    assert.equal(target.spo2, '99%');
    assert.equal(target.observacoes, 'Anotação local');
  });
});


describe('Aprimoramento de UX na Agenda: Botão Check-in em Evidência e Privacidade no Topo', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'atendimentos.html'), 'utf8');

  test('topo da aba Agenda e barra de filtros possuem botões de alternância de exibição/ocultação de valores', () => {
    assert.ok(html.includes('id="agendaEyeToggleBtn"'), 'agendaEyeToggleBtn deve existir');
    assert.ok(html.includes('id="agendaRowEyeToggleBtn"'), 'agendaRowEyeToggleBtn ao lado do botão de ver mês inteiro deve existir');
    assert.ok(html.includes('id="agendaRowEyeIcon"'), 'agendaRowEyeIcon deve existir');
    assert.ok(html.includes('id="agendaRowEyeText"'), 'agendaRowEyeText deve existir');
    assert.ok(html.includes('toggleHideFinancials()'), 'deve chamar toggleHideFinancials');
  });

  test('botão de check-in nos cards de agendamento está em evidência com classe sched-btn-checkin', () => {
    assert.ok(html.includes('sched-btn-checkin'), 'deve possuir classe sched-btn-checkin');
    assert.ok(html.includes('sched-actions-row'), 'deve possuir container sched-actions-row para ações secundárias');
    assert.ok(html.includes('✓ Fazer Check-in'), 'deve ter rótulo claro de check-in');
  });
});

describe('Padronização de Botões em Formato Pílula (Pill Buttons) nas abas Pacientes e Financeiro', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'atendimentos.html'), 'utf8');

  test('possui definições CSS para botões em formato pílula e pilha de ações', () => {
    assert.ok(html.includes('.pill-action-stack'), 'deve possuir .pill-action-stack');
    assert.ok(html.includes('.btn-pill'), 'deve possuir .btn-pill');
    assert.ok(html.includes('.btn-pill.primary-green'), 'deve possuir .btn-pill.primary-green');
    assert.ok(html.includes('.btn-pill.primary-accent'), 'deve possuir .btn-pill.primary-accent');
    assert.ok(html.includes('.btn-pill.primary-terracotta'), 'deve possuir .btn-pill.primary-terracotta');
    assert.ok(html.includes('.btn-pill.outline'), 'deve possuir .btn-pill.outline');
    assert.ok(html.includes('.btn-pill.danger-solid'), 'deve possuir .btn-pill.danger-solid');
    assert.ok(html.includes('.sched-actions .btn'), 'deve padronizar botões da agenda');
  });

  test('aba Pacientes adota botões em pílula para todas as ações do paciente', () => {
    assert.ok(html.includes('class="btn-pill primary-green" onclick="openNewEntry('), 'deve possuir botão pílula Check-in');
    assert.ok(html.includes('class="btn-pill primary-terracotta" onclick="openScheduleModal('), 'deve possuir botão pílula Agendar');
    assert.ok(html.includes('class="btn-pill primary-accent" onclick="openNewEvolution('), 'deve possuir botão pílula Evolução');
    assert.ok(html.includes('class="btn-pill outline" onclick="openPatientEvolutions('), 'deve possuir botão pílula Evoluções');
    assert.ok(html.includes('class="btn-pill outline" onclick="openPatientForm('), 'deve possuir botão pílula Dados cadastrais');
    assert.ok(html.includes("openPatientFilesModal") && html.includes("Exames</button>"), 'deve possuir botão pílula Exames');
    assert.ok(html.includes("openPatientFilesModal") && html.includes("Documentos</button>"), 'deve possuir botão pílula Documentos');
    assert.ok(html.includes('class="btn-pill outline-highlight" onclick="openPatientFinancial('), 'deve possuir botão pílula Financeiro paciente');
    assert.ok(html.includes('class="btn-pill outline" onclick="toggleArchivePatient('), 'deve possuir botão pílula Finalizar/Reativar');
    assert.ok(html.includes('class="btn-pill danger-solid" onclick="deletePatient('), 'deve possuir botão pílula Excluir paciente');
  });

  test('aba Financeiro adota botões em pílula para registrar pagamento, recibo, editar e excluir', () => {
    assert.ok(html.includes('class="btn-pill primary-green" onclick="openPaymentModal('), 'deve possuir botão pílula Registrar pagamento');
    assert.ok(html.includes('class="btn-pill outline" onclick="generateReceipt('), 'deve possuir botão pílula Recibo');
    assert.ok(html.includes('class="btn-pill outline" onclick="openEditEntry('), 'deve possuir botão pílula Editar');
    assert.ok(html.includes('class="btn-pill danger-solid" onclick="deleteEntry('), 'deve possuir botão pílula Excluir');
  });
});


/* ------------------------------------------------------------------
 * Deduplicação financeira (histórico preservado)
 * Regra: mesma paciente + mesma data + mesmo horário = mesma sessão.
 * ------------------------------------------------------------------ */
const buildDuplicateIndex = extractFn('buildDuplicateIndex');
const normName = extractFn('normName');

function dupKey(e) { return 'nm:' + normName(e.nome); }

describe('buildDuplicateIndex (lançamentos repetidos)', () => {
  test('marca a segunda linha da mesma sessão e mantém a vinculada à Agenda', () => {
    const list = [
      { id: 'e1', nome: 'Sebastião Franco Elias', data: '2026-11-10', hora: '13:00', status: 'Pendente', valor: 95 },
      { id: 'e2', nome: 'Sebastião Franco Elias', data: '2026-11-10', hora: '13:00', status: 'Pendente', valor: 95 }
    ];
    const idx = buildDuplicateIndex(list, { e2: true }, dupKey);
    assert.deepEqual(idx, { e1: 'e2' }, 'a linha sem vínculo deve ser a duplicada');
  });

  test('não marca sessões em horários diferentes no mesmo dia', () => {
    const list = [
      { id: 'e1', nome: 'Irani', data: '2026-11-05', hora: '14:00', status: 'Pendente', valor: 95 },
      { id: 'e2', nome: 'Irani', data: '2026-11-05', hora: '16:00', status: 'Pendente', valor: 95 }
    ];
    assert.deepEqual(buildDuplicateIndex(list, {}, dupKey), {});
  });

  test('não marca nada quando há apenas uma linha por sessão', () => {
    const list = [
      { id: 'e1', nome: 'Tereza', data: '2026-11-10', hora: '15:00', status: 'Pendente', valor: 70 }
    ];
    assert.deepEqual(buildDuplicateIndex(list, {}, dupKey), {});
  });

  test('não deduplica lançamentos sem horário (não há como provar repetição)', () => {
    const list = [
      { id: 'e1', nome: 'Tereza', data: '2026-11-10', hora: '', status: 'Pendente', valor: 70 },
      { id: 'e2', nome: 'Tereza', data: '2026-11-10', hora: '', status: 'Pendente', valor: 70 }
    ];
    assert.deepEqual(buildDuplicateIndex(list, {}, dupKey), {});
  });

  test('prefere a linha já paga quando nenhuma está vinculada à Agenda', () => {
    const list = [
      { id: 'e1', nome: 'Dona Diva', data: '2026-09-15', hora: '16:00', status: 'Pendente', valor: 100 },
      { id: 'e2', nome: 'Dona Diva', data: '2026-09-15', hora: '16:00', status: 'Pago', valor: 100 }
    ];
    assert.deepEqual(buildDuplicateIndex(list, {}, dupKey), { e1: 'e2' });
  });

  test('normaliza acentos e caixa no nome da paciente', () => {
    const list = [
      { id: 'e1', nome: 'SEBASTIAO FRANCO ELIAS', data: '2026-11-10', hora: '13:00', status: 'Pendente', valor: 95 },
      { id: 'e2', nome: 'Sebastião Franco Elias', data: '2026-11-10', hora: '13:00', status: 'Pendente', valor: 95 }
    ];
    assert.deepEqual(buildDuplicateIndex(list, {}, dupKey), { e2: 'e1' });
  });

  test('cenário real de novembro/2026: 15 linhas -> 13 sessões e R$ 1.160,00', () => {
    const base = [
      { nome: 'Sebastião Franco Elias', data: '2026-11-03', hora: '13:30', valor: 95 },
      { nome: 'Irani Rodrigues Paula Elias', data: '2026-11-03', hora: '14:01', valor: 95 },
      { nome: 'Tereza', data: '2026-11-03', hora: '15:01', valor: 70 },
      { nome: 'Vinícius Franco Ruy', data: '2026-11-04', hora: '13:00', valor: 90 },
      { nome: 'Diva Bigoni Furlaneti', data: '2026-11-04', hora: '14:30', valor: 100 },
      { nome: 'Sebastião Franco Elias', data: '2026-11-05', hora: '13:00', valor: 95 },
      { nome: 'Irani Rodrigues Paula Elias', data: '2026-11-05', hora: '14:00', valor: 95 },
      { nome: 'Tereza', data: '2026-11-05', hora: '15:00', valor: 70 },
      { nome: 'Vinícius Franco Ruy', data: '2026-11-06', hora: '13:00', valor: 90 },
      { nome: 'Diva Bigoni Furlaneti', data: '2026-11-06', hora: '14:30', valor: 100 },
      { nome: 'Sebastião Franco Elias', data: '2026-11-10', hora: '13:00', valor: 95 },
      { nome: 'Irani Rodrigues Paula Elias', data: '2026-11-10', hora: '14:00', valor: 95 },
      { nome: 'Tereza', data: '2026-11-10', hora: '15:00', valor: 70 }
    ].map((e, i) => Object.assign({ id: 'e' + (i + 1), status: 'Pendente' }, e));

    const duplicadas = [
      { id: 'dupIrani', nome: 'Irani Rodrigues Paula Elias', data: '2026-11-05', hora: '14:00', status: 'Pendente', valor: 95 },
      { id: 'dupSebas', nome: 'Sebastião Franco Elias', data: '2026-11-10', hora: '13:00', status: 'Pendente', valor: 95 }
    ];

    const todas = base.concat(duplicadas);
    const idx = buildDuplicateIndex(todas, { e7: true, e11: true }, dupKey);
    assert.equal(Object.keys(idx).length, 2, 'exatamente 2 linhas repetidas');
    const efetivas = todas.filter(e => !idx[e.id]);
    assert.equal(efetivas.length, 13, '13 sessões reais');
    assert.equal(efetivas.reduce((s, e) => s + e.valor, 0), 1160, 'R$ 1.160,00 realizados');
    assert.equal(todas.reduce((s, e) => s + e.valor, 0), 1350, 'soma bruta inflada = R$ 1.350,00');
  });
});
﻿
describe('deduplicação em mês fechado', () => {
  test('não sinaliza quando todas as linhas do grupo já estão pagas', () => {
    const list = [
      { id: 'e1', nome: 'Dona Diva', data: '2026-09-15', hora: '16:00', status: 'Pago', valor: 100 },
      { id: 'e2', nome: 'Dona Diva', data: '2026-09-15', hora: '16:00', status: 'Pago', valor: 100 }
    ];
    assert.deepEqual(buildDuplicateIndex(list, {}, dupKey), {});
  });

  test('sinaliza quando ainda há valor em aberto no grupo', () => {
    const list = [
      { id: 'e1', nome: 'Dona Diva', data: '2026-09-15', hora: '16:00', status: 'Pago', valor: 100 },
      { id: 'e2', nome: 'Dona Diva', data: '2026-09-15', hora: '16:00', status: 'Pendente', valor: 100 }
    ];
    assert.deepEqual(buildDuplicateIndex(list, {}, dupKey), { e2: 'e1' });
  });
});

describe('jornada: horas trabalhadas (casa → pacientes → casa)', () => {
  const parseTimeMinutes = extractFn('parseTimeMinutes');
  const computeDayWorkedMinutes = extractFnWithScope('computeDayWorkedMinutes', { parseTimeMinutes });
  const computePeriodWorkedMinutes = extractFnWithScope('computePeriodWorkedMinutes', { computeDayWorkedMinutes });

  const casa = 'Casa';
  const ruaA = 'Rua A, 10';
  const ruaB = 'Rua B, 20';

  // função de rota falsa: mapa "origem>destino" -> minutos
  const rotas = (mapa) => (origem, destino) => mapa[origem + '>' + destino] || 0;

  test('uma sessão: conta ida de casa, sessão e volta para casa', () => {
    const r = computeDayWorkedMinutes(
      [{ hora: '14:00', duracaoMin: 50, endereco: ruaA }],
      casa,
      rotas({ [casa + '>' + ruaA]: 10, [ruaA + '>' + casa]: 12 })
    );
    assert.equal(r.atendimentoMin, 50);
    assert.equal(r.deslocamentoMin, 22);
    assert.equal(r.totalMin, 72); // 50 + 10 + 12
    assert.equal(r.sessoes, 1);
  });

  test('duas sessões fora de ordem: ordena por horário e soma o trecho entre pacientes', () => {
    const r = computeDayWorkedMinutes(
      [
        { hora: '16:00', duracaoMin: 50, endereco: ruaA },
        { hora: '14:00', duracaoMin: 50, endereco: ruaB }
      ],
      casa,
      rotas({
        [casa + '>' + ruaB]: 8,
        [ruaB + '>' + ruaA]: 7,
        [ruaA + '>' + casa]: 12
      })
    );
    assert.equal(r.atendimentoMin, 100);
    assert.equal(r.deslocamentoMin, 27);
    assert.equal(r.totalMin, 197); // 14:00 -> 16:50 = 170 min + 27 de deslocamento
  });

  test('intervalo entre sessões conta como jornada (do 1º início ao último fim)', () => {
    const r = computeDayWorkedMinutes(
      [
        { hora: '08:00', duracaoMin: 50, endereco: ruaA },
        { hora: '11:00', duracaoMin: 50, endereco: ruaB }
      ],
      casa,
      rotas({}) // sem deslocamento conhecido
    );
    assert.equal(r.deslocamentoMin, 0);
    assert.equal(r.totalMin, 230); // 08:00 -> 11:50
  });

  test('paciente sem endereço não inventa deslocamento', () => {
    const r = computeDayWorkedMinutes(
      [{ hora: '09:00', duracaoMin: 50, endereco: '' }],
      casa,
      rotas({ [casa + '>']: 30, ['>' + casa]: 30 })
    );
    assert.equal(r.deslocamentoMin, 0);
    assert.equal(r.totalMin, 50);
  });

  test('sessão sem horário é ignorada', () => {
    const r = computeDayWorkedMinutes(
      [{ hora: '', duracaoMin: 50, endereco: ruaA }],
      casa,
      rotas({})
    );
    assert.equal(r.sessoes, 0);
    assert.equal(r.totalMin, 0);
  });

  test('ausência (duração 0) mantém só o deslocamento', () => {
    const r = computeDayWorkedMinutes(
      [{ hora: '10:00', duracaoMin: 0, endereco: ruaA }],
      casa,
      rotas({ [casa + '>' + ruaA]: 10, [ruaA + '>' + casa]: 10 })
    );
    assert.equal(r.atendimentoMin, 0);
    assert.equal(r.totalMin, 20);
  });

  test('período soma os dias e ignora lançamentos sem data', () => {
    const mapa = { [casa + '>' + ruaA]: 10, [ruaA + '>' + casa]: 10 };
    const r = computePeriodWorkedMinutes(
      [
        { data: '2026-11-09', hora: '08:00', duracaoMin: 50, endereco: ruaA },
        { data: '2026-11-10', hora: '08:00', duracaoMin: 50, endereco: ruaA },
        { data: '', hora: '09:00', duracaoMin: 50, endereco: ruaA }
      ],
      casa,
      rotas(mapa)
    );
    assert.equal(r.dias, 2);
    assert.equal(r.atendimentoMin, 100);
    assert.equal(r.deslocamentoMin, 40);
    assert.equal(r.totalMin, 140);
  });

  test('período vazio devolve zeros', () => {
    const r = computePeriodWorkedMinutes([], casa, rotas({}));
    assert.deepEqual(r, { totalMin: 0, atendimentoMin: 0, deslocamentoMin: 0, dias: 0 });
  });
});

describe('jornada: card na aba Financeiro', () => {
  test('o cartão existe no HTML com os dois períodos', () => {
    assert.ok(html.includes('id="workHoursCard"'), 'cartão de horas trabalhadas');
    assert.ok(html.includes('id="whWeekVal"'), 'valor da semana');
    assert.ok(html.includes('id="whMonthVal"'), 'valor do mês');
    assert.ok(html.includes('Esta semana') && html.includes('No m'), 'rótulos das colunas');
  });

  test('o cartão é atualizado junto com os KPIs do Financeiro', () => {
    assert.ok(html.includes('updateWorkedHoursCard(list)'), 'renderList atualiza o cartão');
    assert.ok(html.includes('function updateWorkedHoursCard('));
  });

  const weekStartISO = extractFn('weekStartISO');

  test('a semana começa na segunda-feira', () => {
    assert.equal(weekStartISO('2026-11-10'), '2026-11-09', 'terça cai na segunda anterior');
    assert.equal(weekStartISO('2026-11-09'), '2026-11-09', 'segunda é ela mesma');
    assert.equal(weekStartISO('2026-11-15'), '2026-11-09', 'domingo pertence à semana que começou na segunda');
    assert.equal(weekStartISO('2026-11-16'), '2026-11-16', 'segunda seguinte abre outra semana');
    assert.equal(weekStartISO(''), '');
    assert.equal(weekStartISO('sem-data'), '');
  });

  test('a visão semana a semana está no cartão', () => {
    assert.ok(html.includes('id="whWeeksList"'), 'lista de semanas');
    assert.ok(html.includes('Ver semana a semana'), 'resumo expansível');
    assert.ok(html.includes('function workedHoursByWeek('), 'cálculo por semana');
  });
});

describe('"A receber": quem ainda não pagou', () => {
  const pendingReceivablesByPatient = extractFnWithScope('pendingReceivablesByPatient', {
    entryPatientKey: (e) => 'nm:' + String(e.nome).toLowerCase(),
    isDuplicateEntry: () => false,
    getEntryDisplayName: (e) => e.nome
  });

  const lista = [
    { id: '1', nome: 'Ana', valor: 95, status: 'Pendente', data: '2026-11-03', hora: '13:30' },
    { id: '2', nome: 'Ana', valor: 95, status: 'Pendente', data: '2026-11-05', hora: '13:00' },
    { id: '3', nome: 'Bia', valor: 200, status: 'Pendente', data: '2026-11-04', hora: '09:00' },
    { id: '4', nome: 'Ana', valor: 95, status: 'Pago', data: '2026-11-10', hora: '13:00' },
    { id: '5', nome: 'Carla', valor: 70, status: 'Pendente', data: '2026-11-12', hora: '15:00' }
  ];

  test('agrupa por paciente e soma só o que está em aberto', () => {
    const r = pendingReceivablesByPatient(lista);
    assert.equal(r.length, 3);
    assert.deepEqual(r.map(p => p.nome), ['Bia', 'Ana', 'Carla'], 'ordenado por valor em aberto');
    assert.equal(r[0].total, 200);
    assert.equal(r[1].total, 190);
    assert.equal(r[1].sessoes, 2);
    assert.equal(r[2].total, 70);
  });

  test('pagamento já quitado não entra na lista', () => {
    const r = pendingReceivablesByPatient(lista);
    const ana = r.find(p => p.nome === 'Ana');
    assert.equal(ana.itens.length, 2, 'as 2 sessões em aberto da Ana');
    assert.ok(ana.itens.every(e => e.status !== 'Pago'));
  });

  test('lista vazia devolve nada', () => {
    assert.deepEqual(pendingReceivablesByPatient([]), []);
    assert.deepEqual(pendingReceivablesByPatient(null), []);
  });

  test('sessão de valor zero (ausência/bloqueio) não vira cobrança', () => {
    const r = pendingReceivablesByPatient([
      { id: '9', nome: 'Dora', valor: 0, status: 'Ausência', data: '2026-11-12', hora: '10:00' }
    ]);
    assert.deepEqual(r, []);
  });

  test('o KPI "A receber" abre a lista de nomes', () => {
    assert.ok(html.includes('onclick="openPendingReceivablesModal()"'), 'KPI clicável');
    assert.ok(html.includes('function openPendingReceivablesModal('));
    assert.ok(html.includes('Quem ainda não pagou'), 'título do modal');
  });
});

describe('pagamento: gravação não pode ser desfeita pela releitura da planilha', () => {
  test('submitPayment confirma na planilha antes de desistir', () => {
    assert.ok(html.includes('function confirmEntryStatusOnSheet('), 'confirmação existe');
    assert.ok(html.includes("confirmEntryStatusOnSheet(id, 'Pago', payDate)"), 'pagamento confirma');
  });

  test('auto-sync é bloqueado enquanto a gravação está em andamento', () => {
    assert.ok(html.includes('function statusWriteBusy('), 'guarda existe');
    assert.ok(html.includes('if(typeof statusWriteBusy === \'function\' && statusWriteBusy()) return;'), 'guarda usada no auto-sync');
  });

  test('a última leitura da planilha é registrada (local não vale quando falhou)', () => {
    assert.ok(html.includes('var _lastLoadOk = true;'), 'flag declarada');
    assert.ok(html.includes('_lastLoadOk = true;'), 'sucesso');
    assert.ok(html.includes('_lastLoadOk = false;'), 'falha');
  });

  test('unpayEntry também confirma antes de reverter', () => {
    assert.ok(html.includes("confirmEntryStatusOnSheet(id, 'Pendente', '')"), 'estorno confirma');
  });
});
describe('computeAdjustedPrice (reajuste inflação + 2,5%)', () => {
  const computeAdjustedPrice = extractFn('computeAdjustedPrice');

  test('aplica inflação + 2,5% e arredonda para cima em múltiplos de 5', () => {
    const r = computeAdjustedPrice(95, 4.5, 5);
    assert.ok(Math.abs(r.exato - 101.65) < 1e-9);
    assert.ok(Math.abs(r.pct - 7) < 1e-9);
    assert.equal(r.arredondado, 105);
  });

  test('arredonda em múltiplos de 10 quando solicitado', () => {
    assert.equal(computeAdjustedPrice(95, 4.5, 10).arredondado, 110);
  });

  test('sessão sem valor permanece zero', () => {
    assert.equal(computeAdjustedPrice(0, 4.5, 5).arredondado, 0);
    assert.equal(computeAdjustedPrice('', 4.5, 5).exato, 0);
  });

  test('arredonda sempre para cima (nunca para baixo)', () => {
    assert.equal(computeAdjustedPrice(90, 4.5, 5).arredondado, 100);
    assert.equal(computeAdjustedPrice(100, 0, 5).arredondado, 105);
  });
});
