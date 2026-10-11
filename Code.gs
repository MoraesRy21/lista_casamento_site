// Google Apps Script — backend simples para a Lista de Casamento
// 1) Crie uma Planilha Google e abra Extensões > Apps Script.
// 2) Cole este arquivo. Troque SPREADSHEET_ID pelo ID da planilha.
// 3) Implante como Aplicativo da Web: executar como você; acesso: qualquer pessoa.
// 4) Copie a URL terminada em /exec para CONFIG.appsScriptUrl no index.html.

const SPREADSHEET_ID = "COLE_AQUI_O_ID_DA_PLANILHA";
const SHEET_NAME = "Presentes";

function sheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0)
    sh.appendRow([
      "data",
      "itemId",
      "itemName",
      "quantidade",
      "nome",
      "email",
      "mensagem",
    ]);
  return sh;
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
function doGet(e) {
  try {
    const sh = sheet_(),
      values = sh.getDataRange().getValues();
    const gifts = values
      .slice(1)
      .filter((r) => r[1] !== "" && r[1] != null)
      .map((r) => ({
        date: r[0],
        itemId: Number(r[1]),
        itemName: r[2],
        qty: Number(r[3]),
        name: r[4],
        email: r[5],
        message: r[6],
      }));
    return json_({ ok: true, gifts });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const p = JSON.parse(e.postData.contents || "{}");
    if (p.action !== "reserve") throw new Error("Ação inválida.");
    const itemId = Number(p.itemId),
      qty = Number(p.qty);
    if (!itemId || !Number.isInteger(qty) || qty < 1 || !p.name || !p.email)
      throw new Error("Dados obrigatórios inválidos.");
    const limits = {
      1: 1,
      2: 1,
      3: 1,
      4: 1,
      5: 1,
      6: 1,
      7: 1,
      8: 2,
      9: 2,
      10: 2,
      11: 2,
      12: 2,
      13: 3,
      14: 2,
      15: 4,
      16: 3,
      17: 1,
      18: 1,
      19: 1,
      20: 4,
      21: 1,
      22: 1,
      23: 1,
      24: 1,
      25: 3,
      26: 10,
      27: 1,
      28: 1,
      29: 10,
      30: 3,
    };
    if (!limits[itemId]) throw new Error("Presente inválido.");
    const sh = sheet_(),
      rows = sh.getDataRange().getValues().slice(1);
    const used = rows
      .filter((r) => Number(r[1]) === itemId)
      .reduce((s, r) => s + Number(r[3] || 0), 0);
    if (used + qty > limits[itemId])
      throw new Error(
        "Desculpe, essa quantidade não está mais disponível. Atualize a lista e escolha outra opção.",
      );
    sh.appendRow([
      new Date(),
      itemId,
      String(p.itemName || ""),
      qty,
      String(p.name).slice(0, 120),
      String(p.email).slice(0, 160),
      String(p.message || "").slice(0, 500),
    ]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  } finally {
    lock.releaseLock();
  }
}
