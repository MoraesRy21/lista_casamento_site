// Google Apps Script — backend simples para a Lista de Casamento
// 1) Crie uma Planilha Google e abra Extensões > Apps Script (o script precisa
//    ser criado a partir da planilha; ele usa a planilha à qual está vinculado).
// 2) Cole este arquivo, salve e recarregue a planilha.
// 3) No menu "Lista de Casamento" da planilha: "Configurar planilha" e, de
//    preferência, "Gerar código do convite".
// 4) Implante como Aplicativo da Web: executar como você; acesso: qualquer pessoa.
// 5) Copie a URL terminada em /exec para CONFIG.appsScriptUrl no index.html.
//
// Os presentes (nome, valor, quantidade) ficam na aba "Catalogo" da planilha.
// As reservas ficam na aba "Presentes". Para cancelar uma reserva, apague a linha.
// Nenhum segredo fica neste arquivo: o código do convite é guardado nas
// Propriedades do Script, então o arquivo pode ir para um repositório público.

const SHEET_GIFTS = "Presentes";
const SHEET_CATALOG = "Catalogo";
const GIFT_HEADERS = [
  "data",
  "itemId",
  "itemName",
  "quantidade",
  "nome",
  "email",
  "mensagem",
];
const CATALOG_HEADERS = [
  "id",
  "nome",
  "categoria",
  "preco",
  "quantidade",
  "emoji",
  "ativo",
  "descricao", // opcional: modelo, cor, voltagem…
  "link", // opcional: página do produto (https://…)
  "imagem", // opcional: endereço da foto (https://…) ou link do Google Drive
];
const INVITE_PROP = "INVITE_CODE";
const MAX_BODY_CHARS = 4000;
const MAX_RESERVATIONS_PER_HOUR = 40; // teto global, contém abuso automatizado
const MAX_RESERVATIONS_PER_EMAIL = 6;

// Usado apenas para preencher a aba "Catalogo" na primeira configuração.
// Depois disso, edite os presentes direto na planilha (nunca reutilize um id).
const DEFAULT_CATALOG = [
  [1, "Air fryer", "Cozinha", 650, 1, "🍟"],
  [2, "Jogo de panelas", "Cozinha", 900, 1, "🍳"],
  [3, "Panela de pressão", "Cozinha", 320, 1, "🥘"],
  [4, "Liquidificador", "Cozinha", 300, 1, "🥤"],
  [5, "Mixer", "Cozinha", 250, 1, "🥣"],
  [6, "Cafeteira", "Cozinha", 450, 1, "☕"],
  [7, "Jogo de facas", "Cozinha", 350, 1, "🔪"],
  [8, "Aparelho de jantar", "Mesa", 750, 2, "🍽️"],
  [9, "Jogo de talheres", "Mesa", 420, 2, "🍴"],
  [10, "Jogo de taças", "Mesa", 280, 2, "🥂"],
  [11, "Jogo de copos", "Mesa", 220, 2, "🥛"],
  [12, "Travessas e refratários", "Mesa", 300, 2, "🥧"],
  [13, "Jogo de cama casal", "Quarto", 380, 3, "🛏️"],
  [14, "Edredom casal", "Quarto", 450, 2, "☁️"],
  [15, "Travesseiros", "Quarto", 180, 4, "🛌"],
  [16, "Jogo de toalhas", "Banho", 260, 3, "🧺"],
  [17, "Aspirador de pó", "Casa", 700, 1, "🧹"],
  [18, "Ferro a vapor", "Casa", 280, 1, "👔"],
  [19, "Kit ferramentas", "Casa", 300, 1, "🧰"],
  [20, "Organizadores", "Casa", 180, 4, "🗃️"],
  [21, "Carrinho de bebê", "Bebê", 1800, 1, "👶"],
  [22, "Bebê conforto", "Bebê", 1100, 1, "🚗"],
  [23, "Babá eletrônica", "Bebê", 700, 1, "📹"],
  [24, "Banheira de bebê", "Bebê", 250, 1, "🛁"],
  [25, "Kit enxoval", "Bebê", 400, 3, "🧸"],
  [26, "Fraldas — cota", "Bebê", 150, 10, "🍼"],
  [27, "Cadeira de alimentação", "Bebê", 600, 1, "🥄"],
  [28, "Mala maternidade", "Bebê", 450, 1, "👜"],
  [29, "Cota lua de mel", "Experiências", 300, 10, "✈️"],
  [30, "Jantar especial", "Experiências", 400, 3, "❤️"],
];

/* ---------------------------- utilidades ---------------------------- */

function ss_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss)
    throw new Error(
      "Script não vinculado a uma planilha (crie-o em Extensões > Apps Script).",
    );
  return ss;
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
// Erros com mensagem segura para exibir ao convidado. Qualquer outro erro vira
// uma mensagem genérica, sem expor detalhes internos.
function userError_(message, code) {
  const err = new Error(message);
  err.userFacing = true;
  err.code = code || "invalid";
  return err;
}
function fail_(err) {
  if (err && err.userFacing)
    return json_({ ok: false, error: err.message, code: err.code });
  console.error(err);
  return json_({
    ok: false,
    error: "Erro interno. Tente novamente em instantes.",
    code: "internal",
  });
}
function inviteCode_() {
  return (
    PropertiesService.getScriptProperties().getProperty(INVITE_PROP) || ""
  ).trim();
}
function safeEqual_(a, b) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < b.length; i++)
    diff |= (a.charCodeAt(i % (a.length || 1)) || 0) ^ b.charCodeAt(i);
  return diff === 0;
}
function clean_(value, max) {
  return String(value == null ? "" : value)
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .trim()
    .slice(0, max);
}
// Impede que um texto enviado pelo convidado seja interpretado como fórmula.
function safeCell_(text) {
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}
function isInactive_(value) {
  return ["nao", "não", "n", "false", "0", "no"].includes(
    String(value).trim().toLowerCase(),
  );
}

/* ----------------------------- planilha ----------------------------- */

// Idempotente. Quem chama deve estar com o lock do script.
function setupSheets_() {
  const ss = ss_();
  let gifts = ss.getSheetByName(SHEET_GIFTS);
  if (!gifts) gifts = ss.insertSheet(SHEET_GIFTS);
  if (gifts.getLastRow() === 0) {
    gifts.appendRow(GIFT_HEADERS);
    gifts.setFrozenRows(1);
  }
  let catalog = ss.getSheetByName(SHEET_CATALOG);
  if (!catalog) catalog = ss.insertSheet(SHEET_CATALOG);
  if (catalog.getLastRow() === 0) {
    const rows = DEFAULT_CATALOG.map((r) => r.concat(["sim", "", "", ""]));
    catalog
      .getRange(1, 1, 1, CATALOG_HEADERS.length)
      .setValues([CATALOG_HEADERS]);
    catalog
      .getRange(2, 1, rows.length, CATALOG_HEADERS.length)
      .setValues(rows);
    catalog.setFrozenRows(1);
  } else {
    // Planilhas criadas por versões anteriores: acrescenta os cabeçalhos novos
    // depois da última coluna usada, sem mexer nas colunas existentes.
    const head = catalog.getDataRange().getValues()[0];
    let next = head.length + 1;
    ["descricao", "link", "imagem"].forEach((h) => {
      if (headerIndex_(head, h) < 0) catalog.getRange(1, next++).setValue(h);
    });
  }
}
// As colunas opcionais são localizadas pelo nome do cabeçalho, não pela posição.
function headerIndex_(head, name) {
  return head.findIndex(
    (h) =>
      String(h)
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "") === name,
  );
}
function safeLink_(value) {
  const url = clean_(value, 500);
  return /^https:\/\/[^\s<>"'`]+$/i.test(url) ? url : "";
}
// Links de compartilhamento do Google Drive abrem uma página, não a imagem;
// converte para o endereço que devolve a imagem em si.
function imageUrl_(value) {
  const url = safeLink_(value);
  const m = url.match(
    /^https:\/\/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^#]*&)?id=)([\w-]{10,})/i,
  );
  return m ? "https://drive.google.com/thumbnail?sz=w1000&id=" + m[1] : url;
}
function readCatalog_() {
  const sh = ss_().getSheetByName(SHEET_CATALOG);
  if (!sh || sh.getLastRow() < 2) return [];
  const seen = {};
  const items = [];
  const values = sh.getDataRange().getValues();
  const descCol = headerIndex_(values[0], "descricao"),
    linkCol = headerIndex_(values[0], "link"),
    imgCol = headerIndex_(values[0], "imagem");
  values
    .slice(1)
    .forEach((r) => {
      const id = Number(r[0]),
        qty = Number(r[4]),
        price = Number(r[3]);
      const name = clean_(r[1], 80);
      if (!Number.isInteger(id) || id < 1 || seen[id] || !name) return;
      if (!Number.isInteger(qty) || qty < 0 || isInactive_(r[6])) return;
      seen[id] = true;
      items.push({
        id,
        name,
        cat: clean_(r[2], 40) || "Outros",
        price: isFinite(price) && price > 0 ? price : 0,
        qty,
        emoji: clean_(r[5], 8) || "🎁",
        desc: descCol < 0 ? "" : clean_(r[descCol], 200),
        link: linkCol < 0 ? "" : safeLink_(r[linkCol]),
        image: imgCol < 0 ? "" : imageUrl_(r[imgCol]),
      });
    });
  return items;
}
function giftRows_() {
  const sh = ss_().getSheetByName(SHEET_GIFTS);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh
    .getDataRange()
    .getValues()
    .slice(1)
    .filter((r) => r[1] !== "" && r[1] != null);
}
function reservedTotals_(rows) {
  const totals = {};
  rows.forEach((r) => {
    const id = Number(r[1]),
      qty = Number(r[3]);
    if (id && qty > 0) totals[id] = (totals[id] || 0) + qty;
  });
  return totals;
}

/* ------------------------------- API -------------------------------- */

// Devolve apenas o catálogo e os totais reservados. Nome, e-mail e mensagem
// dos convidados nunca saem da planilha.
function doGet() {
  try {
    const ss = ss_();
    if (!ss.getSheetByName(SHEET_CATALOG) || !ss.getSheetByName(SHEET_GIFTS)) {
      const lock = LockService.getScriptLock();
      if (!lock.tryLock(10000))
        throw userError_("Servidor ocupado. Tente novamente.", "busy");
      try {
        setupSheets_();
      } finally {
        lock.releaseLock();
      }
    }
    const used = reservedTotals_(giftRows_());
    const items = readCatalog_().map((i) => ({
      id: i.id,
      name: i.name,
      cat: i.cat,
      price: i.price,
      qty: i.qty,
      emoji: i.emoji,
      desc: i.desc,
      link: i.link,
      image: i.image,
      reserved: Math.min(i.qty, used[i.id] || 0),
    }));
    return json_({ ok: true, items, inviteRequired: !!inviteCode_() });
  } catch (err) {
    return fail_(err);
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  let locked = false;
  try {
    const raw = (e && e.postData && e.postData.contents) || "";
    if (!raw || raw.length > MAX_BODY_CHARS)
      throw userError_("Requisição inválida.");
    let p;
    try {
      p = JSON.parse(raw);
    } catch (_) {
      throw userError_("Requisição inválida.");
    }
    if (!p || typeof p !== "object" || p.action !== "reserve")
      throw userError_("Ação inválida.");
    // Campo-isca invisível no formulário: só robôs preenchem.
    if (p.hp) return json_({ ok: true });

    const expected = inviteCode_();
    if (expected && !safeEqual_(clean_(p.code, 100), expected))
      throw userError_(
        "Código do convite inválido. Use o link que você recebeu do casal.",
        "invite",
      );

    const itemId = Number(p.itemId),
      qty = Number(p.qty);
    const name = clean_(p.name, 120),
      email = clean_(p.email, 160).toLowerCase(),
      message = clean_(p.message, 500);
    if (!Number.isInteger(itemId) || itemId < 1)
      throw userError_("Presente inválido.");
    if (!Number.isInteger(qty) || qty < 1)
      throw userError_("Quantidade inválida.");
    if (name.length < 2) throw userError_("Informe seu nome.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw userError_("Informe um e-mail válido.");

    locked = lock.tryLock(10000);
    if (!locked)
      throw userError_(
        "Muitas pessoas reservando agora. Tente novamente em instantes.",
        "busy",
      );
    setupSheets_();

    const item = readCatalog_().find((i) => i.id === itemId);
    if (!item) throw userError_("Presente inválido.");

    const rows = giftRows_();
    const used = reservedTotals_(rows)[itemId] || 0;
    if (used + qty > item.qty)
      throw userError_(
        "Desculpe, essa quantidade não está mais disponível. Atualize a lista e escolha outra opção.",
        "unavailable",
      );
    const sameEmail = rows.filter(
      (r) => String(r[5]).replace(/^'/, "").toLowerCase() === email,
    ).length;
    if (sameEmail >= MAX_RESERVATIONS_PER_EMAIL)
      throw userError_(
        "Você atingiu o limite de reservas por pessoa. Fale com o casal se quiser presentear mais.",
        "limit",
      );

    const cache = CacheService.getScriptCache();
    const bucket = "rate_" + Math.floor(Date.now() / 3600000);
    const count = Number(cache.get(bucket) || 0);
    if (count >= MAX_RESERVATIONS_PER_HOUR)
      throw userError_(
        "Muitas reservas em pouco tempo. Tente novamente mais tarde.",
        "busy",
      );

    ss_()
      .getSheetByName(SHEET_GIFTS)
      .appendRow([
        new Date(),
        item.id,
        item.name, // sempre do catálogo, nunca do que o cliente enviou
        qty,
        safeCell_(name),
        safeCell_(email),
        safeCell_(message),
      ]);
    cache.put(bucket, String(count + 1), 3600);
    return json_({ ok: true });
  } catch (err) {
    return fail_(err);
  } finally {
    if (locked) lock.releaseLock();
  }
}

/* ------------------------- menu da planilha ------------------------- */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Lista de Casamento")
    .addItem("Configurar planilha", "configurar")
    .addSeparator()
    .addItem("Gerar código do convite", "gerarCodigoConvite")
    .addItem("Ver código do convite", "verCodigoConvite")
    .addItem("Remover código do convite", "removerCodigoConvite")
    .addToUi();
}
function configurar() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    setupSheets_();
  } finally {
    lock.releaseLock();
  }
  SpreadsheetApp.getUi().alert(
    'Planilha pronta. Edite os presentes na aba "' + SHEET_CATALOG + '".',
  );
}
function gerarCodigoConvite() {
  const ui = SpreadsheetApp.getUi();
  if (
    inviteCode_() &&
    ui.alert(
      "Já existe um código. Gerar outro invalida os links já enviados. Continuar?",
      ui.ButtonSet.YES_NO,
    ) !== ui.Button.YES
  )
    return;
  const code = Utilities.getUuid().replace(/-/g, "").slice(0, 12);
  PropertiesService.getScriptProperties().setProperty(INVITE_PROP, code);
  ui.alert(
    "Código do convite: " +
      code +
      "\n\nEnvie aos convidados o link do site terminado em  #c=" +
      code,
  );
}
function verCodigoConvite() {
  const code = inviteCode_();
  SpreadsheetApp.getUi().alert(
    code
      ? "Código do convite: " + code + "\n\nFinal do link:  #c=" + code
      : "Nenhum código definido: qualquer pessoa com o link do site pode reservar.",
  );
}
function removerCodigoConvite() {
  PropertiesService.getScriptProperties().deleteProperty(INVITE_PROP);
  SpreadsheetApp.getUi().alert(
    "Código removido: qualquer pessoa com o link do site pode reservar.",
  );
}
