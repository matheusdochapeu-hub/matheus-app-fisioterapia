/**
 * Conector entre o app de controle de atendimentos e esta planilha.
 * Cria e gerencia automaticamente as abas "Atendimentos", "Pacientes",
 * "Evolucoes", "Exercicios", "Rotinas", "Agendamentos" e "Configuracoes".
 *
 * Organizadora Principal do Aplicativo: scarletsantos7@gmail.com
 */

var APP_ORGANIZER_EMAIL = 'scarletsantos7@gmail.com';
var DEFAULT_CALENDAR_ID = 'scarletsantos7@gmail.com';

var SHEET_ATEND = 'Atendimentos';
var SHEET_PAC = 'Pacientes';
var SHEET_EVO = 'Evolucoes';
var SHEET_EXE = 'Exercicios';
var SHEET_ROT = 'Rotinas';
var SHEET_AGEND = 'Agendamentos';
var SHEET_CONFIG = 'Configuracoes';

var ATEND_HEADERS = ['ID', 'Paciente', 'Data', 'Hora', 'Valor', 'Status', 'DataPagamento', 'Latitude', 'Longitude', 'CriadoEm'];
var PAC_HEADERS = [
  'ID', 'Nome', 'Telefone', 'ValorPadrao', 'FormaPagamento', 'CriadoEm',
  'Endereco', 'Bairro', 'Cidade', 'DataNascimento', 'Contato02',
  'Documento', 'TCLE', 'Contrato', 'FrequenciaSemanal',
  'DiagClinico', 'DiagFuncional', 'Objetivos', 'Arquivado', 'Foto', 'NomeFantasia', 'OldNome'
];
var EVO_HEADERS = ['ID', 'PacienteID', 'PacienteNome', 'Data', 'Hora', 'PA', 'FC', 'EstadoClinico', 'Condutas', 'CriadoEm'];
var EXE_HEADERS = ['ID', 'Nome', 'Tipo', 'SeriesPadrao', 'RepsPadrao', 'Observacao', 'Imagem', 'CriadoEm'];
var ROT_HEADERS = ['ID', 'PacienteID', 'PacienteNome', 'ExercicioID', 'Ordem', 'Series', 'Reps', 'Observacao', 'CriadoEm', 'Rotulo'];
var AGEND_HEADERS = [
  'ID', 'PacienteID', 'PacienteNome', 'Data', 'Hora', 'DuracaoMin',
  'Valor', 'Status', 'Observacao', 'CalendarEventId', 'CalendarId', 'AtendimentoId', 'CriadoEm'
];
var CONFIG_HEADERS = ['Chave', 'Valor', 'Descricao', 'AtualizadoEm'];

function ensureHeaders_(sheet, expectedHeaders) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(expectedHeaders);
    sheet.setFrozenRows(1);
    return;
  }
  var maxCols = sheet.getMaxColumns();
  if (maxCols < expectedHeaders.length) {
    sheet.insertColumnsAfter(maxCols, expectedHeaders.length - maxCols);
  }
  var currentHeaders = sheet.getRange(1, 1, 1, expectedHeaders.length).getValues()[0];
  var matches = expectedHeaders.every(function(h, i) { return currentHeaders[i] === h; });
  if (!matches) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
  }
}

function getSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  } else {
    ensureHeaders_(sheet, headers);
  }
  return sheet;
}

function getAtendSheet_() { return getSheet_(SHEET_ATEND, ATEND_HEADERS); }
function getPacSheet_()   { return getSheet_(SHEET_PAC, PAC_HEADERS); }
function getEvoSheet_()   { return getSheet_(SHEET_EVO, EVO_HEADERS); }
function getExeSheet_()   { return getSheet_(SHEET_EXE, EXE_HEADERS); }
function getRotSheet_()   { return getSheet_(SHEET_ROT, ROT_HEADERS); }
function getAgendSheet_() { return getSheet_(SHEET_AGEND, AGEND_HEADERS); }

function getConfigSheet_() {
  var sheet = getSheet_(SHEET_CONFIG, CONFIG_HEADERS);
  // Otimização: se a aba de configurações já possui o cabeçalho e as chaves padrão, retorna imediatamente sem escritas ou locks
  if (sheet.getLastRow() >= 7) {
    return sheet;
  }

  var data = sheet.getDataRange().getValues();
  var existingKeys = {};
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) existingKeys[String(data[i][0])] = true;
  }

  var nowIso = new Date().toISOString();
  var defaultConfigs = [
    ['OrganizadorPrincipal', APP_ORGANIZER_EMAIL, 'E-mail da fisioterapeuta proprietária e organizadora do aplicativo', nowIso],
    ['GoogleAgendaID', DEFAULT_CALENDAR_ID, 'ID da agenda onde os atendimentos são gravados diretamente', nowIso],
    ['EnderecoBase', 'Rua Maracaju, 88 - Vila Tibério, Ribeirão Preto - SP', 'Endereço base / residencial para rotas e deslocamento', nowIso],
    ['ConsumoCarroKmL', 14, 'Consumo do carro na cidade (km por litro) para cálculo de deslocamento', nowIso],
    ['PrecoGasolina', 6.10, 'Preço de referência do litro de combustível em R$', nowIso],
    ['NotificacoesPorEmail', 'Desativado (gravação direta)', 'Agendamento direto na agenda sem envio de convites ou emails', nowIso]
  ];

  var toAppend = [];
  defaultConfigs.forEach(function(cfg) {
    if (!existingKeys[cfg[0]]) {
      toAppend.push(cfg);
    }
  });

  if (toAppend.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, toAppend.length, CONFIG_HEADERS.length).setValues(toAppend);
  }

  try {
    sheet.getRange(1, 1, 1, CONFIG_HEADERS.length).setFontWeight('bold');
  } catch (eFmt) {}

  return sheet;
}

/**
 * Menu personalizado na barra do Google Sheets para facilitar a verificação
 * da organizadora Scarlet Santos e testes de autorização.
 */
function onOpen() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('📅 Fisioterapia (Scarlet)')
      .addItem('👤 Verificar Organizador & Agenda', 'menuVerificarOrganizador')
      .addItem('🔑 Autorizar Google Agenda', 'autorizarGoogleAgenda')
      .addItem('⚙️ Atualizar Aba de Configurações', 'menuAtualizarConfiguracoes')
      .addToUi();
  } catch (e) {}
}

function menuVerificarOrganizador() {
  var ui = SpreadsheetApp.getUi();
  var effectiveEmail = '';
  try { effectiveEmail = Session.getEffectiveUser().getEmail(); } catch (e) {}
  var activeUserEmail = '';
  try { activeUserEmail = Session.getActiveUser().getEmail(); } catch (e2) {}
  var resolved = resolveUserCalendar_(DEFAULT_CALENDAR_ID);

  var msg = '👤 Organizadora Principal: ' + APP_ORGANIZER_EMAIL + '\n' +
    '🔑 Conta executando o script: ' + (effectiveEmail || '(não identificada)') + '\n' +
    '📅 Agenda alvo: ' + DEFAULT_CALENDAR_ID + '\n\n';

  if (effectiveEmail && effectiveEmail.toLowerCase() === APP_ORGANIZER_EMAIL.toLowerCase()) {
    msg += '✅ PERFEITO! O script está rodando nativamente na conta de Scarlet Santos.\n' +
      'Os agendamentos são gravados diretamente na agenda principal sem passar por e-mail nenhum.';
  } else if (resolved.isDirectShared) {
    msg += '✅ COMPARTILHADA! A agenda de Scarlet foi compartilhada com a conta executora.\n' +
      'Os agendamentos são gravados diretamente na agenda de Scarlet sem envio de convites por e-mail.';
  } else {
    msg += 'ℹ️ O script está sendo executado por ' + (effectiveEmail || 'outra conta') + '.\n' +
      'Para que os eventos fiquem nativamente com Scarlet como organizadora direta:\n\n' +
      'Opção 1 (Recomendada): Scarlet abre esta planilha, clica em Extensões > Apps Script > Implantar > Nova Implantação ("Executar como: Eu") e cola a nova URL no app.\n\n' +
      'Opção 2: Scarlet abre calendar.google.com, vai na agenda dela > Compartilhar > adiciona ' + effectiveEmail + ' com permissão "Fazer alterações nos eventos".';
  }

  ui.alert('Status do Organizador & Google Agenda', msg, ui.ButtonSet.OK);
}

function menuAtualizarConfiguracoes() {
  getConfigSheet_();
  SpreadsheetApp.getUi().alert('Configurações atualizadas com sucesso na aba "' + SHEET_CONFIG + '".');
}

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
    if (header === 'Data' || header === 'DataPagamento' || header === 'DataNascimento') {
      return Utilities.formatDate(value, tz, 'yyyy-MM-dd');
    }
    if (header === 'Hora') {
      return Utilities.formatDate(value, tz, 'HH:mm');
    }
    // Protege chaves de configuração numéricas que o Sheets pode converter em data por locale pt-BR (ex: '6.10' virando 06/10)
    if (header === 'Valor' && value.getFullYear && value.getFullYear() > 2000) {
      var d = value.getDate();
      var m = value.getMonth() + 1;
      if (m === 10 && d === 6) return 6.10;
    }
    return Utilities.formatDate(value, tz, "yyyy-MM-dd'T'HH:mm:ss");
  }
  return value;
}

function sheetToObjects_(sheet) {
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = formatCellValue_(headers[j], data[i][j]);
    }
    rows.push(obj);
  }
  return rows;
}

function getRowObjectById_(sheet, id) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;
  var headers = data[0];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        obj[headers[j]] = formatCellValue_(headers[j], data[i][j]);
      }
      return obj;
    }
  }
  return null;
}

function deleteRowById_(sheet, id) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;
  var headers = data[0];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      var rowObj = {};
      for (var h = 0; h < headers.length; h++) {
        rowObj[headers[h]] = data[i][h];
      }
      sheet.deleteRow(i + 1);
      return rowObj;
    }
  }
  return null;
}

/**
 * Atualiza múltiplos campos de uma linha identificada por id em uma única operação de leitura e gravação no Sheets.
 * Reduz N leituras e N gravações a apenas 1 leitura e 1 gravação por linha.
 */
function updateRowObjectById_(sheet, id, fieldsObj) {
  if (!fieldsObj || typeof fieldsObj !== 'object') return null;
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;
  var headers = data[0];
  var colMap = {};
  for (var c = 0; c < headers.length; c++) {
    colMap[headers[c]] = c;
  }
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      var changed = false;
      for (var key in fieldsObj) {
        if (fieldsObj.hasOwnProperty(key)) {
          var colIdx = colMap[key];
          if (colIdx !== undefined && colIdx >= 0) {
            data[i][colIdx] = fieldsObj[key];
            changed = true;
          }
        }
      }
      if (changed) {
        sheet.getRange(i + 1, 1, 1, headers.length).setValues([data[i]]);
      }
      var rowObj = {};
      for (var h = 0; h < headers.length; h++) {
        rowObj[headers[h]] = data[i][h];
      }
      return rowObj;
    }
  }
  return null;
}

/** Remove TODAS as linhas cujo valor na coluna colIndex (0-based) seja igual a value. */
function deleteRowsByField_(sheet, colIndex, value) {
  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][colIndex]) === String(value)) {
      sheet.deleteRow(i + 1);
    }
  }
}

/** Apaga todos os itens de rotina de um paciente num rótulo específico (vazio = "principal"). */
function deleteRoutineByLabel_(pacienteId, rotulo) {
  var sheet = getRotSheet_();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var cPac = headers.indexOf('PacienteID');
  var cRot = headers.indexOf('Rotulo');
  var alvo = String(rotulo || '');
  for (var i = data.length - 1; i >= 1; i--) {
    var rot = cRot > -1 ? String(data[i][cRot] || '') : '';
    if (String(data[i][cPac]) === String(pacienteId) && rot === alvo) {
      sheet.deleteRow(i + 1);
    }
  }
}

/** Renomeia o rótulo de todos os itens de um paciente que estejam no rótulo antigo. */
function renameRoutineLabel_(pacienteId, rotuloAntigo, rotuloNovo) {
  var sheet = getRotSheet_();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var cPac = headers.indexOf('PacienteID');
  var cRot = headers.indexOf('Rotulo');
  if (cRot === -1) return;
  var de = String(rotuloAntigo || '');
  for (var i = 1; i < data.length; i++) {
    var rot = String(data[i][cRot] || '');
    if (String(data[i][cPac]) === String(pacienteId) && rot === de) {
      sheet.getRange(i + 1, cRot + 1).setValue(rotuloNovo || '');
    }
  }
}

function updateFieldById_(sheet, id, colName, value) {
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var col = headers.indexOf(colName) + 1;
  if (col === 0) return;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.getRange(i + 1, col).setValue(value);
      break;
    }
  }
}

/** Atualiza todas as linhas onde matchColName == matchVal, definindo targetColName = newVal. */
function updateRowsByField_(sheet, matchColName, matchVal, targetColName, newVal) {
  if (!matchVal) return;
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return;
  var headers = data[0];
  var cMatch = headers.indexOf(matchColName);
  var cTarget = headers.indexOf(targetColName);
  if (cMatch === -1 || cTarget === -1) return;
  var targetStr = String(matchVal).trim();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][cMatch] || '').trim() === targetStr) {
      sheet.getRange(i + 1, cTarget + 1).setValue(newVal);
    }
  }
}

function updateAtendField_(id, colName, value) {
  updateFieldById_(getAtendSheet_(), id, colName, value);
}

/* ---------- Integração Google Agenda (CalendarApp) ---------- */
/**
 * Execute esta função uma vez pelo botão "Executar" no editor do Apps Script
 * para autorizar o acesso automático ao Google Agenda (CalendarApp).
 */
function autorizarGoogleAgenda() {
  var cal = CalendarApp.getDefaultCalendar();
  Logger.log('Google Agenda autorizado com sucesso: ' + (cal ? cal.getName() : 'OK'));
}

function pad2_(n) {
  return (n < 10 ? '0' : '') + n;
}

function parseScheduleDates_(dataStr, horaStr, duracaoMin) {
  var dParts = String(dataStr || '').split('-');
  if (dParts.length !== 3) return null;
  var hParts = String(horaStr || '09:00').split(':');
  var y = parseInt(dParts[0], 10);
  var m = parseInt(dParts[1], 10);
  var d = parseInt(dParts[2], 10);
  var hh = parseInt(hParts[0] || '9', 10);
  var mm = parseInt(hParts[1] || '0', 10);
  if (isNaN(y) || isNaN(m) || isNaN(d) || isNaN(hh) || isNaN(mm)) return null;

  var tz = 'America/Sao_Paulo';
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss && ss.getSpreadsheetTimeZone()) {
      tz = ss.getSpreadsheetTimeZone();
    }
  } catch (e) {}

  var dateFormatted = dParts[0] + '-' + pad2_(m) + '-' + pad2_(d) + ' ' + pad2_(hh) + ':' + pad2_(mm) + ':00';
  var start = null;
  try {
    start = Utilities.parseDate(dateFormatted, tz, 'yyyy-MM-dd HH:mm:ss');
  } catch (e2) {}

  if (!start || isNaN(start.getTime())) {
    start = new Date(y, m - 1, d, hh, mm, 0);
  }
  if (!start || isNaN(start.getTime())) return null;

  var dur = parseInt(duracaoMin, 10);
  if (!dur || dur <= 0) dur = 50;
  var end = new Date(start.getTime() + dur * 60000);
  return { start: start, end: end };
}

var _resolvedCalendarCache = {};

function resolveUserCalendar_(calendarId) {
  var cid = String(calendarId || DEFAULT_CALENDAR_ID || '').trim().toLowerCase();
  if (_resolvedCalendarCache[cid]) {
    return _resolvedCalendarCache[cid];
  }

  var defaultCal = null;
  try { defaultCal = CalendarApp.getDefaultCalendar(); } catch (e) {}
  var effectiveEmail = '';
  try { effectiveEmail = Session.getEffectiveUser().getEmail().toLowerCase(); } catch (e2) {}

  // 1. Se executado nativamente pela conta de Scarlet Santos ou pela conta ativa do script
  var isOwner = (effectiveEmail && (effectiveEmail === cid || effectiveEmail === APP_ORGANIZER_EMAIL.toLowerCase())) ||
                (defaultCal && defaultCal.getId().toLowerCase() === cid);
  if (isOwner && defaultCal) {
    var resNative = {
      cal: defaultCal,
      calendarId: cid,
      isOwner: true,
      isDirectShared: false,
      mode: 'direct_native'
    };
    _resolvedCalendarCache[cid] = resNative;
    return resNative;
  }

  // 2. Se for especificada a agenda de Scarlet e ela estiver compartilhada diretamente com permissão de edição
  if (cid && cid !== 'primary') {
    var customCal = null;
    try {
      customCal = CalendarApp.getCalendarById(cid);
    } catch (e3) {}
    if (customCal) {
      var resCustom = {
        cal: customCal,
        calendarId: cid,
        isOwner: false,
        isDirectShared: true,
        mode: 'direct_shared'
      };
      _resolvedCalendarCache[cid] = resCustom;
      return resCustom;
    }

    // Busca inteligente em todas as agendas acessíveis pelo usuário executor (CalendarApp.getAllCalendars)
    try {
      var allCals = CalendarApp.getAllCalendars() || [];
      for (var cIdx = 0; cIdx < allCals.length; cIdx++) {
        var c = allCals[cIdx];
        if (!c) continue;
        var cIdLow = String(c.getId() || '').toLowerCase();
        var cNameLow = String(c.getName() || '').toLowerCase();
        if (cIdLow === cid || cNameLow === cid || cNameLow.indexOf('scarlet') > -1 || cIdLow.indexOf('scarlet') > -1) {
          var resSmart = {
            cal: c,
            calendarId: c.getId(),
            isOwner: false,
            isDirectShared: true,
            mode: 'direct_shared'
          };
          _resolvedCalendarCache[cid] = resSmart;
          return resSmart;
        }
      }
    } catch (eAll) {}
  }

  // 3. Fallback: Grava na agenda padrão ativa SEM NENHUM CONVITE POR E-MAIL
  // O evento é criado diretamente no calendário sem disparar notificações/emails
  var resFallback = {
    cal: defaultCal,
    calendarId: cid || (defaultCal ? defaultCal.getId() : 'primary'),
    isOwner: false,
    isDirectShared: false,
    mode: 'default_no_invite'
  };
  _resolvedCalendarCache[cid] = resFallback;
  return resFallback;
}

/** Preenche automaticamente endereço, telefone e NomeFantasia do paciente caso não venham no payload. */
function enrichScheduleItemWithPatient_(item) {
  if (!item) return item;
  if ((!item.endereco || !item.telefone || !item.pacienteDisplay) && item.pacienteId) {
    try {
      var pRow = getRowObjectById_(getPacSheet_(), item.pacienteId);
      if (pRow) {
        if (!item.pacienteDisplay) {
          item.pacienteDisplay = pRow.NomeFantasia || pRow.Nome || item.pacienteNome || 'Paciente';
        }
        if (!item.telefone && pRow.Telefone) {
          item.telefone = String(pRow.Telefone);
        }
        if (!item.endereco) {
          var locParts = [pRow.Endereco, pRow.Bairro, pRow.Cidade].filter(function(x) { return !!x; });
          item.endereco = locParts.join(', ');
        }
      }
    } catch (e) {}
  }
  return item;
}

function createCalendarEventForSchedule_(item) {
  try {
    enrichScheduleItemWithPatient_(item);
    var dates = parseScheduleDates_(item.data, item.hora, item.duracaoMin);
    if (!dates) return { eventId: '', warning: 'Data/hora inválida para o Google Agenda.' };
    var resolved = resolveUserCalendar_(item.calendarId);
    if (!resolved.cal) return { eventId: '', warning: 'Agenda não encontrada.' };

    var prefix = item.status === 'Realizado' ? '✓ ' : '';
    var title = prefix + 'Fisioterapia: ' + (item.pacienteDisplay || item.pacienteNome || 'Paciente');
    var descLines = [
      'Paciente: ' + (item.pacienteNome || item.pacienteDisplay || ''),
      'Organizadora: ' + APP_ORGANIZER_EMAIL
    ];
    if (item.telefone) descLines.push('Telefone: ' + item.telefone);
    if (item.observacao) descLines.push('Observações: ' + item.observacao);
    descLines.push('Sincronizado diretamente pelo App Fisioterapia (sem envio de e-mails).');

    var opts = {
      location: item.endereco || '',
      description: descLines.join('\n'),
      sendInvites: false
    };

    var ev = null;
    try {
      ev = resolved.cal.createEvent(title, dates.start, dates.end, opts);
    } catch (writeErr) {
      // Se não conseguiu escrever diretamente na agenda informada, grava na agenda padrão sem convidar
      var defCal = CalendarApp.getDefaultCalendar();
      if (defCal && defCal.getId() !== resolved.cal.getId()) {
        ev = defCal.createEvent(title, dates.start, dates.end, opts);
      } else {
        throw writeErr;
      }
    }

    if (ev) {
      try { ev.addPopupReminder(30); } catch (remErr) {}
      return { eventId: ev.getId(), warning: '' };
    }
    return { eventId: '', warning: 'Não foi possível gerar evento no Google Agenda.' };
  } catch (err) {
    return { eventId: '', warning: err.message || String(err) };
  }
}

function updateCalendarEventForSchedule_(item) {
  try {
    enrichScheduleItemWithPatient_(item);
    if (item.status === 'Cancelado') {
      if (item.calendarEventId) {
        deleteCalendarEventForSchedule_(item.calendarEventId, item.calendarId);
      }
      return { eventId: '', warning: '' };
    }
    if (!item.calendarEventId) {
      return createCalendarEventForSchedule_(item);
    }
    var dates = parseScheduleDates_(item.data, item.hora, item.duracaoMin);
    if (!dates) return { eventId: item.calendarEventId, warning: '' };
    var resolved = resolveUserCalendar_(item.calendarId);
    var ev = null;
    if (resolved.cal) {
      try { ev = resolved.cal.getEventById(item.calendarEventId); } catch (e) {}
    }
    if (!ev) {
      try { ev = CalendarApp.getDefaultCalendar().getEventById(item.calendarEventId); } catch (e2) {}
    }
    if (!ev) {
      return createCalendarEventForSchedule_(item);
    }

    var prefix = item.status === 'Realizado' ? '✓ ' : '';
    var title = prefix + 'Fisioterapia: ' + (item.pacienteDisplay || item.pacienteNome || 'Paciente');
    var descLines = [
      'Paciente: ' + (item.pacienteNome || item.pacienteDisplay || ''),
      'Organizadora: ' + APP_ORGANIZER_EMAIL
    ];
    if (item.telefone) descLines.push('Telefone: ' + item.telefone);
    if (item.observacao) descLines.push('Observações: ' + item.observacao);
    descLines.push('Sincronizado diretamente pelo App Fisioterapia (sem envio de e-mails).');

    ev.setTitle(title);
    ev.setTime(dates.start, dates.end);
    if (item.endereco !== undefined) ev.setLocation(item.endereco || '');
    ev.setDescription(descLines.join('\n'));
    return { eventId: ev.getId(), warning: '' };
  } catch (err) {
    return { eventId: item.calendarEventId || '', warning: err.message || String(err) };
  }
}

function deleteCalendarEventForSchedule_(eventId, calendarId) {
  if (!eventId) return;
  try {
    var resolved = resolveUserCalendar_(calendarId);
    var ev = null;
    if (resolved.cal) {
      try { ev = resolved.cal.getEventById(eventId); } catch (e) {}
    }
    if (!ev) {
      try { ev = CalendarApp.getDefaultCalendar().getEventById(eventId); } catch (e2) {}
    }
    if (ev) ev.deleteEvent();
  } catch (err) {}
}

function doGet(e) {
  var result = {
    atendimentos: sheetToObjects_(getAtendSheet_()),
    pacientes: sheetToObjects_(getPacSheet_()),
    evolucoes: sheetToObjects_(getEvoSheet_()),
    exercicios: sheetToObjects_(getExeSheet_()),
    rotinas: sheetToObjects_(getRotSheet_()),
    agendamentos: sheetToObjects_(getAgendSheet_()),
    config: sheetToObjects_(getConfigSheet_()),
    organizer: APP_ORGANIZER_EMAIL
  };
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var result = { success: true, action: 'unknown', handled: true };
  var body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (parseErr) {
    result.success = false;
    result.error = 'Payload JSON inválido: ' + parseErr.message;
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  result.action = body.action || 'create';

  /* ---------- Ações de leitura / cálculo externo (executam sem lock de escrita na planilha) ---------- */
  if (body.action === 'calc_routes_batch') {
    var pairs = Array.isArray(body.pairs) ? body.pairs : [];
    var routesOut = {};
    for (var rIdx = 0; rIdx < pairs.length; rIdx++) {
      var pair = pairs[rIdx];
      if (!pair || !pair.key || !pair.origin || !pair.destination) continue;
      try {
        var finder = Maps.newDirectionFinder()
          .setLanguage('pt-BR')
          .setOrigin(String(pair.origin))
          .setDestination(String(pair.destination))
          .setMode(Maps.DirectionFinder.Mode.DRIVING);
        var dirs = finder.getDirections();
        if (dirs && dirs.routes && dirs.routes.length > 0 && dirs.routes[0].legs && dirs.routes[0].legs.length > 0) {
          var leg = dirs.routes[0].legs[0];
          var distMeters = (leg.distance && typeof leg.distance.value === 'number') ? leg.distance.value : 0;
          var durSeconds = (leg.duration && typeof leg.duration.value === 'number') ? leg.duration.value : 0;
          routesOut[pair.key] = {
            ok: true,
            distanceKm: Math.round((distMeters / 1000) * 10) / 10,
            durationMin: Math.max(1, Math.round(durSeconds / 60)),
            distanceText: (leg.distance && leg.distance.text) || '',
            durationText: (leg.duration && leg.duration.text) || '',
            startAddress: leg.start_address || pair.origin,
            endAddress: leg.end_address || pair.destination
          };
        } else {
          routesOut[pair.key] = { ok: false, error: 'Rota não encontrada' };
        }
      } catch (mapErr) {
        routesOut[pair.key] = { ok: false, error: mapErr.message || String(mapErr) };
      }
    }
    result.routes = routesOut;
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (body.action === 'test_calendar') {
    var resolvedTest = resolveUserCalendar_(body.calendarId);
    if (!resolvedTest.cal) {
      result.success = false;
      result.error = 'Não foi possível acessar o Google Agenda. Autorize o CalendarApp no editor do Apps Script executando a função autorizarGoogleAgenda.';
    } else {
      var effectiveEmail = '';
      try { effectiveEmail = Session.getEffectiveUser().getEmail(); } catch (eEff) {}
      result.calendarName = resolvedTest.cal.getName();
      result.mode = resolvedTest.mode;
      result.calendarId = resolvedTest.calendarId;
      result.organizer = APP_ORGANIZER_EMAIL;
      result.effectiveUser = effectiveEmail;
      result.sendInvites = false;

      if (resolvedTest.mode === 'direct_native') {
        result.message = 'Conectado nativamente à conta organizadora (' + APP_ORGANIZER_EMAIL + '). Os agendamentos são gravados diretamente na agenda sem envio de e-mails.';
      } else if (resolvedTest.mode === 'direct_shared') {
        result.message = 'Conectado diretamente à agenda compartilhada de Scarlet Santos (' + (resolvedTest.cal.getName() || APP_ORGANIZER_EMAIL) + ') sem envio de convites por e-mail.';
      } else {
        result.message = 'Conectado à agenda ativa (' + (resolvedTest.cal.getName() || effectiveEmail) + '). Agendamentos são gravados diretamente sem envio de convites por e-mail. Para que gravem nativamente na agenda de Scarlet Santos (' + APP_ORGANIZER_EMAIL + '), compartilhe-a com ' + (effectiveEmail || 'esta conta') + ' no Google Calendar.';
      }
    }
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  /* ---------- Ações com escrita na planilha (usam ScriptLock) ---------- */
  var lock = LockService.getScriptLock();
  var lockAcquired = false;

  try {
    lockAcquired = lock.tryLock(20000);
    if (!lockAcquired) {
      result.success = false;
      result.error = 'O servidor da planilha está ocupado. Tente novamente em instantes.';
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    /* ---------- Atendimentos ---------- */
    if (body.action === 'delete') {
      deleteRowById_(getAtendSheet_(), body.id);

    } else if (body.action === 'update_status') {
      updateRowObjectById_(getAtendSheet_(), body.id, {
        Status: body.status,
        DataPagamento: body.paymentDate || ''
      });

    } else if (body.action === 'update') {
      var atendFields = {};
      if (body.nome !== undefined) atendFields['Paciente'] = body.nome;
      if (body.data !== undefined) atendFields['Data'] = body.data;
      if (body.hora !== undefined) atendFields['Hora'] = body.hora;
      if (body.valor !== undefined) atendFields['Valor'] = body.valor;
      if (body.status !== undefined) atendFields['Status'] = body.status;
      if (body.paymentDate !== undefined) atendFields['DataPagamento'] = body.paymentDate;
      updateRowObjectById_(getAtendSheet_(), body.id, atendFields);

    /* ---------- Pacientes ---------- */
    } else if (body.action === 'create_patient') {
      getPacSheet_().appendRow([
        body.id,
        body.nome,
        body.telefone || '',
        body.valorPadrao || '',
        body.formaPagamento || '',
        new Date().toISOString(),
        body.endereco || '',
        body.bairro || '',
        body.cidade || '',
        body.dataNascimento || '',
        body.contato02 || '',
        body.documento || '',
        body.tcle || '',
        body.contrato || '',
        body.frequenciaSemanal || '',
        body.diagClinico || '',
        body.diagFuncional || '',
        body.objetivos || '',
        body.arquivado || 'Não',
        body.foto || '',
        body.nomeFantasia || '',
        body.oldNome || ''
      ]);

    } else if (body.action === 'update_patient') {
      var pacSheet = getPacSheet_();
      var existingPac = getRowObjectById_(pacSheet, body.id) || {};
      var oldNomeRef = body.oldNome || existingPac.Nome || '';

      var pacFields = {};
      var pacMap = {
        nome: 'Nome',
        nomeFantasia: 'NomeFantasia',
        oldNome: 'OldNome',
        telefone: 'Telefone',
        valorPadrao: 'ValorPadrao',
        formaPagamento: 'FormaPagamento',
        endereco: 'Endereco',
        bairro: 'Bairro',
        cidade: 'Cidade',
        dataNascimento: 'DataNascimento',
        contato02: 'Contato02',
        documento: 'Documento',
        tcle: 'TCLE',
        contrato: 'Contrato',
        frequenciaSemanal: 'FrequenciaSemanal',
        diagClinico: 'DiagClinico',
        diagFuncional: 'DiagFuncional',
        objetivos: 'Objetivos',
        arquivado: 'Arquivado',
        foto: 'Foto'
      };
      for (var fKey in pacMap) {
        if (body[fKey] !== undefined) {
          pacFields[pacMap[fKey]] = body[fKey];
        }
      }
      updateRowObjectById_(pacSheet, body.id, pacFields);

      // Se o nome completo foi alterado, propaga para Evolucoes, Agendamentos e Atendimentos
      if (body.nome && oldNomeRef && body.nome !== oldNomeRef) {
        updateRowsByField_(getEvoSheet_(), 'PacienteID', body.id, 'PacienteNome', body.nome);
        updateRowsByField_(getAgendSheet_(), 'PacienteID', body.id, 'PacienteNome', body.nome);
        updateRowsByField_(getAtendSheet_(), 'Paciente', oldNomeRef, 'Paciente', body.nome);
      }

    } else if (body.action === 'delete_patient') {
      // Antes de apagar os agendamentos da planilha, remove os eventos correspondentes do Google Agenda
      try {
        var allAgends = sheetToObjects_(getAgendSheet_());
        for (var aIdx = 0; aIdx < allAgends.length; aIdx++) {
          var agItem = allAgends[aIdx];
          if (String(agItem.PacienteID) === String(body.id) && agItem.CalendarEventId) {
            deleteCalendarEventForSchedule_(agItem.CalendarEventId, agItem.CalendarId || DEFAULT_CALENDAR_ID);
          }
        }
      } catch (calCleanErr) {}

      deleteRowById_(getPacSheet_(), body.id);
      // Remove em cascata rotinas, evoluções e agendamentos vinculados à paciente (coluna PacienteID = índice 1)
      deleteRowsByField_(getRotSheet_(), 1, body.id);
      deleteRowsByField_(getEvoSheet_(), 1, body.id);
      deleteRowsByField_(getAgendSheet_(), 1, body.id);

    /* ---------- Agendamentos & Google Agenda (CalendarApp) ---------- */
    } else if (body.action === 'create_schedule') {
      var calRes = createCalendarEventForSchedule_(body);
      var evId = calRes.eventId || '';
      getAgendSheet_().appendRow([
        body.id,
        body.pacienteId || '',
        body.pacienteNome || '',
        body.data || '',
        body.hora || '',
        body.duracaoMin || 50,
        body.valor !== undefined ? body.valor : '',
        body.status || 'Agendado',
        body.observacao || '',
        evId,
        body.calendarId || DEFAULT_CALENDAR_ID || 'primary',
        body.atendimentoId || '',
        new Date().toISOString()
      ]);
      result.calendarEventId = evId;
      if (calRes.warning) result.calendarWarning = calRes.warning;

    } else if (body.action === 'create_schedules_batch') {
      var items = Array.isArray(body.items) ? body.items : [];
      var nowBatch = new Date().toISOString();
      var eventIds = {};
      var syncedCount = 0;
      var warnings = [];

      // Otimização: pré-carrega os dados do paciente apenas uma vez para o lote
      var cachedPatient = null;
      if (items.length > 0 && items[0].pacienteId) {
        try {
          cachedPatient = getRowObjectById_(getPacSheet_(), items[0].pacienteId);
        } catch (ePac) {}
      }

      var defaultCalendarTarget = body.calendarId || (items.length > 0 ? items[0].calendarId : '') || DEFAULT_CALENDAR_ID;
      var resolvedCal = resolveUserCalendar_(defaultCalendarTarget);
      var defCalFallback = null;

      var rowsToAdd = items.map(function(it) {
        if (!it.calendarId) it.calendarId = defaultCalendarTarget;

        if (cachedPatient) {
          if (!it.pacienteDisplay) it.pacienteDisplay = cachedPatient.NomeFantasia || cachedPatient.Nome || it.pacienteNome || 'Paciente';
          if (!it.telefone && cachedPatient.Telefone) it.telefone = String(cachedPatient.Telefone);
          if (!it.endereco) {
            var loc = [cachedPatient.Endereco, cachedPatient.Bairro, cachedPatient.Cidade].filter(Boolean).join(', ');
            it.endereco = loc;
          }
        }

        var cId = '';
        try {
          var dates = parseScheduleDates_(it.data, it.hora, it.duracaoMin);
          if (dates && resolvedCal && resolvedCal.cal) {
            var prefix = it.status === 'Realizado' ? '✓ ' : '';
            var title = prefix + 'Fisioterapia: ' + (it.pacienteDisplay || it.pacienteNome || 'Paciente');
            var descLines = [
              'Paciente: ' + (it.pacienteNome || it.pacienteDisplay || ''),
              'Organizadora: ' + APP_ORGANIZER_EMAIL
            ];
            if (it.telefone) descLines.push('Telefone: ' + it.telefone);
            if (it.observacao) descLines.push('Observações: ' + it.observacao);
            descLines.push('Sincronizado diretamente pelo App Fisioterapia (sem envio de e-mails).');

            var opts = {
              location: it.endereco || '',
              description: descLines.join('\n'),
              sendInvites: false
            };

            var ev = null;
            try {
              ev = resolvedCal.cal.createEvent(title, dates.start, dates.end, opts);
            } catch (wErr) {
              if (!defCalFallback) {
                try { defCalFallback = CalendarApp.getDefaultCalendar(); } catch (eDef) {}
              }
              if (defCalFallback && defCalFallback.getId() !== resolvedCal.cal.getId()) {
                try {
                  ev = defCalFallback.createEvent(title, dates.start, dates.end, opts);
                } catch (defErr) {}
              }
            }
            if (ev) {
              try { ev.addPopupReminder(30); } catch (rErr) {}
              cId = ev.getId();
              syncedCount++;
            }
          }
        } catch (itemErr) {
          if (warnings.indexOf(itemErr.message) === -1) warnings.push(itemErr.message);
        }

        eventIds[it.id] = cId;

        return [
          it.id,
          it.pacienteId || '',
          it.pacienteNome || '',
          it.data || '',
          it.hora || '',
          it.duracaoMin || 50,
          it.valor !== undefined ? it.valor : '',
          it.status || 'Agendado',
          it.observacao || '',
          cId,
          it.calendarId || DEFAULT_CALENDAR_ID || 'primary',
          it.atendimentoId || '',
          nowBatch
        ];
      });

      if (rowsToAdd.length > 0) {
        var sAg = getAgendSheet_();
        sAg.getRange(sAg.getLastRow() + 1, 1, rowsToAdd.length, AGEND_HEADERS.length).setValues(rowsToAdd);
      }
      result.eventIds = eventIds;
      result.eventMap = eventIds;
      result.calendarSyncedCount = syncedCount;
      if (warnings.length > 0) result.calendarWarning = warnings.join('; ');

    } else if (body.action === 'update_schedule') {
      var sAgUpd = getAgendSheet_();
      var fieldsToUpdate = {};
      if (body.pacienteId !== undefined) fieldsToUpdate['PacienteID'] = body.pacienteId;
      if (body.pacienteNome !== undefined) fieldsToUpdate['PacienteNome'] = body.pacienteNome;
      if (body.data !== undefined) fieldsToUpdate['Data'] = body.data;
      if (body.hora !== undefined) fieldsToUpdate['Hora'] = body.hora;
      if (body.duracaoMin !== undefined) fieldsToUpdate['DuracaoMin'] = body.duracaoMin;
      if (body.valor !== undefined) fieldsToUpdate['Valor'] = body.valor;
      if (body.status !== undefined) fieldsToUpdate['Status'] = body.status;
      if (body.observacao !== undefined) fieldsToUpdate['Observacao'] = body.observacao;
      if (body.atendimentoId !== undefined) fieldsToUpdate['AtendimentoId'] = body.atendimentoId;
      if (body.calendarId !== undefined) fieldsToUpdate['CalendarId'] = body.calendarId;

      var updatedRow = updateRowObjectById_(sAgUpd, body.id, fieldsToUpdate);

      var mergedItem = {
        id: body.id,
        pacienteId: updatedRow ? updatedRow.PacienteID : body.pacienteId,
        pacienteNome: updatedRow ? updatedRow.PacienteNome : body.pacienteNome,
        pacienteDisplay: body.pacienteDisplay || (updatedRow ? updatedRow.PacienteNome : '') || body.pacienteNome,
        data: updatedRow ? updatedRow.Data : body.data,
        hora: updatedRow ? updatedRow.Hora : body.hora,
        duracaoMin: updatedRow ? updatedRow.DuracaoMin : body.duracaoMin,
        status: updatedRow ? updatedRow.Status : body.status,
        observacao: updatedRow ? updatedRow.Observacao : body.observacao,
        endereco: body.endereco || '',
        telefone: body.telefone || '',
        calendarEventId: body.calendarEventId || (updatedRow ? updatedRow.CalendarEventId : '') || '',
        calendarId: body.calendarId || (updatedRow ? updatedRow.CalendarId : '') || DEFAULT_CALENDAR_ID || 'primary'
      };

      var updCal = updateCalendarEventForSchedule_(mergedItem);
      if (updCal.eventId !== undefined && (!updatedRow || updCal.eventId !== updatedRow.CalendarEventId)) {
        updateRowObjectById_(sAgUpd, body.id, { CalendarEventId: updCal.eventId || '' });
      }
      result.calendarEventId = updCal.eventId || '';
      if (updCal.warning) result.calendarWarning = updCal.warning;

    } else if (body.action === 'delete_schedule') {
      var sAgDel = getAgendSheet_();
      var deletedRow = deleteRowById_(sAgDel, body.id);
      var evIdToDel = body.calendarEventId || (deletedRow && deletedRow.CalendarEventId) || '';
      var calIdToDel = body.calendarId || (deletedRow && deletedRow.CalendarId) || DEFAULT_CALENDAR_ID || 'primary';
      if (evIdToDel) {
        deleteCalendarEventForSchedule_(evIdToDel, calIdToDel);
      }
      deleteRowById_(sAgDel, body.id);

    /* ---------- Evoluções Clínicas ---------- */
    } else if (body.action === 'create_evolution') {
      getEvoSheet_().appendRow([
        body.id,
        body.pacienteId || '',
        body.pacienteNome || '',
        body.data || '',
        body.hora || '',
        body.pa || '',
        body.fc || '',
        body.estadoClinico || '',
        body.condutas || '',
        new Date().toISOString()
      ]);

    } else if (body.action === 'update_evolution') {
      var sEvo = getEvoSheet_();
      var evoFields = {};
      if (body.data !== undefined) evoFields['Data'] = body.data;
      if (body.hora !== undefined) evoFields['Hora'] = body.hora;
      if (body.pa !== undefined) evoFields['PA'] = body.pa;
      if (body.fc !== undefined) evoFields['FC'] = body.fc;
      if (body.estadoClinico !== undefined) evoFields['EstadoClinico'] = body.estadoClinico;
      if (body.condutas !== undefined) evoFields['Condutas'] = body.condutas;
      updateRowObjectById_(sEvo, body.id, evoFields);

    } else if (body.action === 'delete_evolution') {
      deleteRowById_(getEvoSheet_(), body.id);

    /* ---------- Exercícios ---------- */
    } else if (body.action === 'create_exercise') {
      getExeSheet_().appendRow([
        body.id, body.nome, body.tipo || '', body.seriesPadrao || '', body.repsPadrao || '',
        body.observacao || '', body.imagem || '', new Date().toISOString()
      ]);

    } else if (body.action === 'update_exercise') {
      var exe = getExeSheet_();
      var exeFields = {};
      if (body.nome !== undefined) exeFields['Nome'] = body.nome;
      if (body.tipo !== undefined) exeFields['Tipo'] = body.tipo;
      if (body.seriesPadrao !== undefined) exeFields['SeriesPadrao'] = body.seriesPadrao;
      if (body.repsPadrao !== undefined) exeFields['RepsPadrao'] = body.repsPadrao;
      if (body.observacao !== undefined) exeFields['Observacao'] = body.observacao;
      if (body.imagem !== undefined) exeFields['Imagem'] = body.imagem;
      updateRowObjectById_(exe, body.id, exeFields);

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
      var rotFields = {};
      if (body.ordem !== undefined) rotFields['Ordem'] = body.ordem;
      if (body.series !== undefined) rotFields['Series'] = body.series;
      if (body.reps !== undefined) rotFields['Reps'] = body.reps;
      if (body.observacao !== undefined) rotFields['Observacao'] = body.observacao;
      updateRowObjectById_(rot, body.id, rotFields);

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

    } else if (body.action === 'bulk_import') {
      var nowIso = new Date().toISOString();

      // 1. Pacientes
      if (Array.isArray(body.pacientes) && body.pacientes.length > 0) {
        var pRows = body.pacientes.map(function(p) {
          return [
            p.id,
            p.nome,
            p.telefone || '',
            p.valorPadrao || '',
            p.formaPagamento || '',
            p.criadoEm || nowIso,
            p.endereco || '',
            p.bairro || '',
            p.cidade || '',
            p.dataNascimento || '',
            p.contato02 || '',
            p.documento || '',
            p.tcle || '',
            p.contrato || '',
            p.frequenciaSemanal || '',
            p.diagClinico || '',
            p.diagFuncional || '',
            p.objetivos || '',
            p.arquivado || 'Não',
            p.foto || '',
            p.nomeFantasia || '',
            p.oldNome || ''
          ];
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

      // 3. Evoluções
      if (Array.isArray(body.evolucoes) && body.evolucoes.length > 0) {
        var evoRows = body.evolucoes.map(function(ev) {
          return [
            ev.id,
            ev.pacienteId || '',
            ev.pacienteNome || '',
            ev.data || '',
            ev.hora || '',
            ev.pa || '',
            ev.fc || '',
            ev.estadoClinico || '',
            ev.condutas || '',
            ev.criadoEm || nowIso
          ];
        });
        var sEvoSheet = getEvoSheet_();
        sEvoSheet.getRange(sEvoSheet.getLastRow() + 1, 1, evoRows.length, EVO_HEADERS.length).setValues(evoRows);
      }

      // 4. Agendamentos
      if (Array.isArray(body.agendamentos) && body.agendamentos.length > 0) {
        var agRows = body.agendamentos.map(function(ag) {
          return [
            ag.id,
            ag.pacienteId || '',
            ag.pacienteNome || '',
            ag.data || '',
            ag.hora || '',
            ag.duracaoMin || 50,
            ag.valor !== undefined ? ag.valor : '',
            ag.status || 'Agendado',
            ag.observacao || '',
            ag.calendarEventId || '',
            ag.calendarId || DEFAULT_CALENDAR_ID || 'primary',
            ag.atendimentoId || '',
            ag.criadoEm || nowIso
          ];
        });
        var sAgSheet = getAgendSheet_();
        sAgSheet.getRange(sAgSheet.getLastRow() + 1, 1, agRows.length, AGEND_HEADERS.length).setValues(agRows);
      }

      // 5. Exercícios
      if (Array.isArray(body.exercicios) && body.exercicios.length > 0) {
        var eRows = body.exercicios.map(function(x) {
          return [x.id, x.nome, x.tipo || '', x.seriesPadrao || '', x.repsPadrao || '', x.observacao || '', x.imagem || '', x.criadoEm || nowIso];
        });
        var sE = getExeSheet_();
        sE.getRange(sE.getLastRow() + 1, 1, eRows.length, EXE_HEADERS.length).setValues(eRows);
      }

      // 6. Rotinas
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
        evolucoes: (body.evolucoes || []).length,
        agendamentos: (body.agendamentos || []).length,
        exercicios: (body.exercicios || []).length,
        rotinas: (body.rotinas || []).length
      };

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
