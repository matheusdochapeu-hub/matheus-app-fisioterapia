/**
 * Conector entre o app de controle de atendimentos e esta planilha.
 * Cria automaticamente as abas "Atendimentos" e "Pacientes".
 */

var SHEET_ATEND = 'Atendimentos';
var SHEET_PAC = 'Pacientes';
var ATEND_HEADERS = ['ID', 'Paciente', 'Data', 'Hora', 'Valor', 'Status', 'DataPagamento', 'Latitude', 'Longitude', 'CriadoEm'];
var PAC_HEADERS = ['ID', 'Nome', 'Telefone', 'ValorPadrao', 'FormaPagamento', 'CriadoEm'];

function ensureHeaders_(sheet, expectedHeaders) {
  var currentHeaders = sheet.getRange(1, 1, 1, expectedHeaders.length).getValues()[0];
  var matches = expectedHeaders.every(function(h, i) { return currentHeaders[i] === h; });
  if (!matches) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
  }
}

function getAtendSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_ATEND);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_ATEND);
    sheet.appendRow(ATEND_HEADERS);
    sheet.setFrozenRows(1);
  } else {
    ensureHeaders_(sheet, ATEND_HEADERS);
  }
  return sheet;
}

function getPacSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_PAC);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_PAC);
    sheet.appendRow(PAC_HEADERS);
    sheet.setFrozenRows(1);
  } else {
    ensureHeaders_(sheet, PAC_HEADERS);
  }
  return sheet;
}

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

function updateAtendField_(id, colName, value) {
  var sheet = getAtendSheet_();
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

function doGet(e) {
  var result = {
    atendimentos: sheetToObjects_(getAtendSheet_()),
    pacientes: sheetToObjects_(getPacSheet_())
  };
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var result = { success: true };

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

  } else {
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
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
