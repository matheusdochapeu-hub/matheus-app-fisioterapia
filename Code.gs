/**
 * Conector entre o app de controle de atendimentos e esta planilha.
 * Cria automaticamente as abas "Atendimentos", "Pacientes",
 * "Exercicios" e "Rotinas".
 */

var SHEET_ATEND = 'Atendimentos';
var SHEET_PAC = 'Pacientes';
var SHEET_EXE = 'Exercicios';
var SHEET_ROT = 'Rotinas';

var ATEND_HEADERS = ['ID', 'Paciente', 'Data', 'Hora', 'Valor', 'Status', 'DataPagamento', 'Latitude', 'Longitude', 'CriadoEm'];
var PAC_HEADERS = ['ID', 'Nome', 'Telefone', 'ValorPadrao', 'FormaPagamento', 'CriadoEm'];
var EXE_HEADERS = ['ID', 'Nome', 'Tipo', 'SeriesPadrao', 'RepsPadrao', 'Observacao', 'Imagem', 'CriadoEm'];
var ROT_HEADERS = ['ID', 'PacienteID', 'PacienteNome', 'ExercicioID', 'Ordem', 'Series', 'Reps', 'Observacao', 'CriadoEm', 'Rotulo'];

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
function getExeSheet_()   { return getSheet_(SHEET_EXE, EXE_HEADERS); }
function getRotSheet_()   { return getSheet_(SHEET_ROT, ROT_HEADERS); }

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

function doGet(e) {
  var result = {
    atendimentos: sheetToObjects_(getAtendSheet_()),
    pacientes: sheetToObjects_(getPacSheet_()),
    exercicios: sheetToObjects_(getExeSheet_()),
    rotinas: sheetToObjects_(getRotSheet_())
  };
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var result = { success: true, action: body.action || 'create', handled: true };

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
    // remove também das rotinas que usavam este exercício
    deleteRowsByField_(getRotSheet_(), 3, body.id); // coluna ExercicioID (0-based = 3)

  /* ---------- Rotinas (itens de rotina por paciente, agrupados por Rotulo) ---------- */
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
    // Renomeia o rótulo de todos os itens de um paciente que estejam no rótulo antigo.
    renameRoutineLabel_(body.pacienteId, body.rotuloAntigo, body.rotulo);

  } else if (body.action === 'clear_routine') {
    // apaga todos os itens de UMA rotina (paciente + rótulo) específica
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
    // Ação desconhecida: NÃO grava nada (evita criar lixo). Sinaliza ao app.
    result.success = false;
    result.handled = false;
    result.error = 'Ação não reconhecida pelo script: ' + body.action +
      '. Publique a versão mais recente do Code.gs (Nova versão) no Apps Script.';
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
