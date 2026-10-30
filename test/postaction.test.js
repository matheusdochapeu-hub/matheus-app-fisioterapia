const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

function validateScriptResponse(status, text) {
  if (status !== 200) throw new Error('HTTP ' + status);
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error('Resposta inválida do servidor.');
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Formato inesperado.');
  }
  if (data.handled === false) {
    throw new Error(data.error || 'Ação não reconhecida.');
  }
  if (data.success === false) {
    throw new Error(data.error || 'Erro no script.');
  }
  return data;
}

describe('postAction response validation', () => {
  test('accepts valid success JSON', () => {
    const res = validateScriptResponse(200, JSON.stringify({ success: true, handled: true }));
    assert.equal(res.success, true);
  });

  test('throws on HTML error pages from Google Apps Script', () => {
    assert.throws(() => {
      validateScriptResponse(200, '<!DOCTYPE html><html><body>Error</body></html>');
    }, /Resposta inválida/);
  });

  test('throws when handled is false', () => {
    assert.throws(() => {
      validateScriptResponse(200, JSON.stringify({ success: false, handled: false, error: 'Ação não reconhecida' }));
    }, /Ação não reconhecida/);
  });

  test('throws when success is false', () => {
    assert.throws(() => {
      validateScriptResponse(200, JSON.stringify({ success: false, handled: true, error: 'Falha ao gravar' }));
    }, /Falha ao gravar/);
  });
});
