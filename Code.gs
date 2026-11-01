/**
 * Conector entre o app de controle de atendimentos e esta planilha.
 * Cria e gerencia automaticamente as abas "Atendimentos", "Pacientes",
 * "Evolucoes", "Exercicios" e "Rotinas".
 */

var SHEET_ATEND = 'Atendimentos';
var SHEET_PAC = 'Pacientes';
var SHEET_EVO = 'Evolucoes';
var SHEET_EXE = 'Exercicios';
var SHEET_ROT = 'Rotinas';
var SHEET_AGEND = 'Agendamentos';

var ATEND_HEADERS = ['ID', 'Paciente', 'Data', 'Hora', 'Valor', 'Status', 'DataPagamento', 'Latitude', 'Longitude', 'CriadoEm'];
var PAC_HEADERS = [
  'ID', 'Nome', 'Telefone', 'ValorPadrao', 'FormaPagamento', 'CriadoEm',
  'Endereco', 'Bairro', 'Cidade', 'DataNascimento', 'Contato02',
  'Documento', 'TCLE', 'Contrato', 'FrequenciaSemanal',
  'DiagClinico', 'DiagFuncional', 'Objetivos', 'Arquivado', 'Foto', 'NomeFantasia'
];
var EVO_HEADERS = ['ID', 'PacienteID', 'PacienteNome', 'Data', 'Hora', 'PA', 'FC', 'EstadoClinico', 'Condutas', 'CriadoEm'];
var EXE_HEADERS = ['ID', 'Nome', 'Tipo', 'SeriesPadrao', 'RepsPadrao', 'Observacao', 'Imagem', 'CriadoEm'];
var ROT_HEADERS = ['ID', 'PacienteID', 'PacienteNome', 'ExercicioID', 'Ordem', 'Series', 'Reps', 'Observacao', 'CriadoEm', 'Rotulo'];
var AGEND_HEADERS = [
  'ID', 'PacienteID', 'PacienteNome', 'Data', 'Hora', 'DuracaoMin',
  'Valor', 'Status', 'Observacao', 'CalendarEventId', 'CalendarId', 'AtendimentoId', 'CriadoEm'
];

function ensureHeaders_(sheet, expectedHeaders) {
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
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
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

function parseScheduleDates_(dataStr, horaStr, duracaoMin) {
  var dParts = String(dataStr || '').split('-');
  if (dParts.length !== 3) return null;
  var hParts = String(horaStr || '09:00').split(':');
  var y = parseInt(dParts[0], 10);
  var m = parseInt(dParts[1], 10) - 1;
  var d = parseInt(dParts[2], 10);
  var hh = parseInt(hParts[0] || '9', 10);
  var mm = parseInt(hParts[1] || '0', 10);
  var start = new Date(y, m, d, hh, mm, 0);
  if (isNaN(start.getTime())) return null;
  var dur = parseInt(duracaoMin, 10);
  if (!dur || dur <= 0) dur = 50;
  var end = new Date(start.getTime() + dur * 60000);
  return { start: start, end: end };
}

function resolveUserCalendar_(calendarId) {
  var cid = String(calendarId || '').trim();
  if (cid && cid !== 'primary') {
    var customCal = null;
    try {
      customCal = CalendarApp.getCalendarById(cid);
    } catch (e) {}
    if (customCal) {
      return { cal: customCal, guestEmail: null, calendarId: cid };
    }
    // Se a agenda pertence a outro Gmail ainda não compartilhado diretamente, envia convite automático para a agenda do usuário
    return { cal: CalendarApp.getDefaultCalendar(), guestEmail: cid.indexOf('@') > -1 ? cid : null, calendarId: cid };
  }
  return { cal: CalendarApp.getDefaultCalendar(), guestEmail: null, calendarId: 'primary' };
}

function createCalendarEventForSchedule_(item) {
  try {
    var dates = parseScheduleDates_(item.data, item.hora, item.duracaoMin);
    if (!dates) return { eventId: '', warning: 'Data/hora inválida para o Google Agenda.' };
    var resolved = resolveUserCalendar_(item.calendarId);
    if (!resolved.cal) return { eventId: '', warning: 'Agenda não encontrada.' };

    var prefix = item.status === 'Realizado' ? '✓ ' : '';
    var title = prefix + 'Fisioterapia: ' + (item.pacienteDisplay || item.pacienteNome || 'Paciente');
    var descLines = ['Paciente: ' + (item.pacienteNome || item.pacienteDisplay || '')];
    if (item.telefone) descLines.push('Telefone: ' + item.telefone);
    if (item.observacao) descLines.push('Observações: ' + item.observacao);
    descLines.push('Sincronizado pelo App Fisioterapia.');

    var opts = {
      location: item.endereco || '',
      description: descLines.join('\n')
    };
    if (resolved.guestEmail) {
      opts.guests = resolved.guestEmail;
      opts.sendInvites = true;
    }

    var ev = null;
    try {
      ev = resolved.cal.createEvent(title, dates.start, dates.end, opts);
    } catch (writeErr) {
      // Fallback caso o usuário tenha compartilhado a agenda apenas como leitura: cria na agenda principal e convida o e-mail dele
      if (item.calendarId && String(item.calendarId).indexOf('@') > -1) {
        opts.guests = String(item.calendarId).trim();
        opts.sendInvites = true;
        ev = CalendarApp.getDefaultCalendar().createEvent(title, dates.start, dates.end, opts);
      } else {
        throw writeErr;
      }
    }

    try { ev.addPopupReminder(30); } catch (remErr) {}
    return { eventId: ev.getId(), warning: '' };
  } catch (err) {
    return { eventId: '', warning: err.message || String(err) };
  }
}

function updateCalendarEventForSchedule_(item) {
  try {
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
    var descLines = ['Paciente: ' + (item.pacienteNome || item.pacienteDisplay || '')];
    if (item.telefone) descLines.push('Telefone: ' + item.telefone);
    if (item.observacao) descLines.push('Observações: ' + item.observacao);
    descLines.push('Sincronizado pelo App Fisioterapia.');

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
    agendamentos: sheetToObjects_(getAgendSheet_())
  };
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var lockAcquired = false;
  var result = { success: true, action: 'unknown', handled: true };

  try {
    // Tenta adquirir o lock por até 30 segundos para evitar concorrência
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

    /* ---------- Atendimentos ---------- */
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
      if (body.status !== undefined) updateAtendField_(body.id, 'Status', body.status);
      if (body.paymentDate !== undefined) updateAtendField_(body.id, 'DataPagamento', body.paymentDate);

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
        body.nomeFantasia || ''
      ]);

    } else if (body.action === 'update_patient') {
      var pacSheet = getPacSheet_();
      if (body.nome !== undefined) updateFieldById_(pacSheet, body.id, 'Nome', body.nome);
      if (body.nomeFantasia !== undefined) updateFieldById_(pacSheet, body.id, 'NomeFantasia', body.nomeFantasia);
      if (body.telefone !== undefined) updateFieldById_(pacSheet, body.id, 'Telefone', body.telefone);
      if (body.valorPadrao !== undefined) updateFieldById_(pacSheet, body.id, 'ValorPadrao', body.valorPadrao);
      if (body.formaPagamento !== undefined) updateFieldById_(pacSheet, body.id, 'FormaPagamento', body.formaPagamento);
      if (body.endereco !== undefined) updateFieldById_(pacSheet, body.id, 'Endereco', body.endereco);
      if (body.bairro !== undefined) updateFieldById_(pacSheet, body.id, 'Bairro', body.bairro);
      if (body.cidade !== undefined) updateFieldById_(pacSheet, body.id, 'Cidade', body.cidade);
      if (body.dataNascimento !== undefined) updateFieldById_(pacSheet, body.id, 'DataNascimento', body.dataNascimento);
      if (body.contato02 !== undefined) updateFieldById_(pacSheet, body.id, 'Contato02', body.contato02);
      if (body.documento !== undefined) updateFieldById_(pacSheet, body.id, 'Documento', body.documento);
      if (body.tcle !== undefined) updateFieldById_(pacSheet, body.id, 'TCLE', body.tcle);
      if (body.contrato !== undefined) updateFieldById_(pacSheet, body.id, 'Contrato', body.contrato);
      if (body.frequenciaSemanal !== undefined) updateFieldById_(pacSheet, body.id, 'FrequenciaSemanal', body.frequenciaSemanal);
      if (body.diagClinico !== undefined) updateFieldById_(pacSheet, body.id, 'DiagClinico', body.diagClinico);
      if (body.diagFuncional !== undefined) updateFieldById_(pacSheet, body.id, 'DiagFuncional', body.diagFuncional);
      if (body.objetivos !== undefined) updateFieldById_(pacSheet, body.id, 'Objetivos', body.objetivos);
      if (body.arquivado !== undefined) updateFieldById_(pacSheet, body.id, 'Arquivado', body.arquivado);
      if (body.foto !== undefined) updateFieldById_(pacSheet, body.id, 'Foto', body.foto);

    } else if (body.action === 'delete_patient') {
      deleteRowById_(getPacSheet_(), body.id);
      // Remove em cascata rotinas, evoluções e agendamentos vinculados à paciente (coluna PacienteID = índice 1)
      deleteRowsByField_(getRotSheet_(), 1, body.id);
      deleteRowsByField_(getEvoSheet_(), 1, body.id);
      deleteRowsByField_(getAgendSheet_(), 1, body.id);

    /* ---------- Agendamentos & Google Agenda (CalendarApp) ---------- */
    } else if (body.action === 'test_calendar') {
      var resolvedTest = resolveUserCalendar_(body.calendarId);
      if (!resolvedTest.cal) {
        result.success = false;
        result.error = 'Não foi possível acessar o Google Agenda. Autorize o CalendarApp no editor do Apps Script.';
      } else {
        result.calendarName = resolvedTest.cal.getName();
        result.mode = resolvedTest.guestEmail ? 'invite' : 'direct';
        result.calendarId = resolvedTest.calendarId;
      }

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
        body.calendarId || 'primary',
        body.atendimentoId || '',
        new Date().toISOString()
      ]);
      result.calendarEventId = evId;
      if (calRes.warning) result.calendarWarning = calRes.warning;

    } else if (body.action === 'create_schedules_batch') {
      var items = Array.isArray(body.items) ? body.items : [];
      var nowBatch = new Date().toISOString();
      var eventIds = {};
      var warnings = [];
      var rowsToAdd = items.map(function(it) {
        var cRes = createCalendarEventForSchedule_(it);
        var cId = cRes.eventId || '';
        eventIds[it.id] = cId;
        if (cRes.warning && warnings.indexOf(cRes.warning) === -1) warnings.push(cRes.warning);
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
          it.calendarId || 'primary',
          it.atendimentoId || '',
          nowBatch
        ];
      });
      if (rowsToAdd.length > 0) {
        var sAg = getAgendSheet_();
        sAg.getRange(sAg.getLastRow() + 1, 1, rowsToAdd.length, AGEND_HEADERS.length).setValues(rowsToAdd);
      }
      result.eventIds = eventIds;
      if (warnings.length > 0) result.calendarWarning = warnings.join('; ');

    } else if (body.action === 'update_schedule') {
      var sAgUpd = getAgendSheet_();
      var existingRow = getRowObjectById_(sAgUpd, body.id) || {};
      if (body.pacienteId !== undefined) updateFieldById_(sAgUpd, body.id, 'PacienteID', body.pacienteId);
      if (body.pacienteNome !== undefined) updateFieldById_(sAgUpd, body.id, 'PacienteNome', body.pacienteNome);
      if (body.data !== undefined) updateFieldById_(sAgUpd, body.id, 'Data', body.data);
      if (body.hora !== undefined) updateFieldById_(sAgUpd, body.id, 'Hora', body.hora);
      if (body.duracaoMin !== undefined) updateFieldById_(sAgUpd, body.id, 'DuracaoMin', body.duracaoMin);
      if (body.valor !== undefined) updateFieldById_(sAgUpd, body.id, 'Valor', body.valor);
      if (body.status !== undefined) updateFieldById_(sAgUpd, body.id, 'Status', body.status);
      if (body.observacao !== undefined) updateFieldById_(sAgUpd, body.id, 'Observacao', body.observacao);
      if (body.atendimentoId !== undefined) updateFieldById_(sAgUpd, body.id, 'AtendimentoId', body.atendimentoId);
      if (body.calendarId !== undefined) updateFieldById_(sAgUpd, body.id, 'CalendarId', body.calendarId);

      var mergedItem = {
        id: body.id,
        pacienteNome: body.pacienteNome !== undefined ? body.pacienteNome : existingRow.PacienteNome,
        pacienteDisplay: body.pacienteDisplay || body.pacienteNome || existingRow.PacienteNome,
        data: body.data !== undefined ? body.data : existingRow.Data,
        hora: body.hora !== undefined ? body.hora : existingRow.Hora,
        duracaoMin: body.duracaoMin !== undefined ? body.duracaoMin : existingRow.DuracaoMin,
        status: body.status !== undefined ? body.status : existingRow.Status,
        observacao: body.observacao !== undefined ? body.observacao : existingRow.Observacao,
        endereco: body.endereco || '',
        telefone: body.telefone || '',
        calendarEventId: body.calendarEventId || existingRow.CalendarEventId || '',
        calendarId: body.calendarId || existingRow.CalendarId || 'primary'
      };
      var updCal = updateCalendarEventForSchedule_(mergedItem);
      if (updCal.eventId && updCal.eventId !== existingRow.CalendarEventId) {
        updateFieldById_(sAgUpd, body.id, 'CalendarEventId', updCal.eventId);
      }
      result.calendarEventId = updCal.eventId || '';
      if (updCal.warning) result.calendarWarning = updCal.warning;

    } else if (body.action === 'delete_schedule') {
      var sAgDel = getAgendSheet_();
      var rowDel = getRowObjectById_(sAgDel, body.id);
      var evIdToDel = body.calendarEventId || (rowDel && rowDel.CalendarEventId) || '';
      var calIdToDel = body.calendarId || (rowDel && rowDel.CalendarId) || 'primary';
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
      if (body.data !== undefined) updateFieldById_(sEvo, body.id, 'Data', body.data);
      if (body.hora !== undefined) updateFieldById_(sEvo, body.id, 'Hora', body.hora);
      if (body.pa !== undefined) updateFieldById_(sEvo, body.id, 'PA', body.pa);
      if (body.fc !== undefined) updateFieldById_(sEvo, body.id, 'FC', body.fc);
      if (body.estadoClinico !== undefined) updateFieldById_(sEvo, body.id, 'EstadoClinico', body.estadoClinico);
      if (body.condutas !== undefined) updateFieldById_(sEvo, body.id, 'Condutas', body.condutas);

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
            p.nomeFantasia || ''
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

      // 4. Exercícios
      if (Array.isArray(body.exercicios) && body.exercicios.length > 0) {
        var eRows = body.exercicios.map(function(x) {
          return [x.id, x.nome, x.tipo || '', x.seriesPadrao || '', x.repsPadrao || '', x.observacao || '', x.imagem || '', x.criadoEm || nowIso];
        });
        var sE = getExeSheet_();
        sE.getRange(sE.getLastRow() + 1, 1, eRows.length, EXE_HEADERS.length).setValues(eRows);
      }

      // 5. Rotinas
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
