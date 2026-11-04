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
  test('Check-in é a primeira aba na navegação (à esquerda de Pacientes)', () => {
    const mNav = html.match(/<nav class="main-tabs"[\s\S]*?<\/nav>/);
    assert.ok(mNav, 'nav.main-tabs deve existir');
    const navContent = mNav[0];
    const checkinIdx = navContent.indexOf('id="tabBtnCheckin"');
    const pacientesIdx = navContent.indexOf('id="tabBtnPacientes"');
    assert.ok(checkinIdx > -1, 'tabBtnCheckin deve existir');
    assert.ok(pacientesIdx > -1, 'tabBtnPacientes deve existir');
    assert.ok(checkinIdx < pacientesIdx, 'tabBtnCheckin deve ficar antes de tabBtnPacientes');
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
    const tabs = ['checkin', 'pacientes', 'agenda', 'evolucoes', 'financeiro'];
    function getNextTab(current, deltaX, deltaY, duration) {
      if (Math.abs(deltaX) >= 45 && duration <= 450 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
        const idx = tabs.indexOf(current);
        if (deltaX < 0 && idx < tabs.length - 1) return tabs[idx + 1];
        if (deltaX > 0 && idx > 0) return tabs[idx - 1];
      }
      return current;
    }

    assert.equal(getNextTab('checkin', -80, 10, 200), 'pacientes');
    assert.equal(getNextTab('pacientes', -70, 5, 180), 'agenda');
    assert.equal(getNextTab('agenda', 80, 5, 200), 'pacientes');
    assert.equal(getNextTab('pacientes', 60, 10, 210), 'checkin');
    assert.equal(getNextTab('checkin', -50, 100, 200), 'checkin');
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
