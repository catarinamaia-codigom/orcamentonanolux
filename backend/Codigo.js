/**
 * Gerador de orçamento Nanolux · SOMMAR — servidor (Google Apps Script)
 *
 * COMO INSTALAR (uma vez):
 *  1. Crie uma planilha Google (ex.: "Nanolux · Orçamentos").
 *  2. Na planilha: Extensões → Apps Script. Apague o conteúdo e cole ESTE ARQUIVO INTEIRO. Salve.
 *  3. Implantar → Nova implantação → tipo "App da Web".
 *       Executar como: Eu  ·  Quem pode acessar: Qualquer pessoa
 *     Autorize o acesso quando o Google pedir.
 *  4. Copie a URL do App da Web (termina em /exec) e coloque em config.js no GitHub.
 *  5. Abra o site: no primeiro acesso você cria o usuário Diretor(a).
 *
 * As abas da planilha (Usuarios, Orcamentos, Faturamentos, Config) são criadas sozinhas.
 * A última coluna de cada aba ("json") guarda os dados completos — não edite à mão.
 * Ao alterar este código depois: Implantar → Gerenciar implantações → editar → Nova versão.
 */

/* ===================== CÁLCULOS (compartilhados com o site) ===================== */
var NX_CALC = (function () {
  var FORMAS = ['PIX', 'Cartão 1x', 'Cartão 2x', 'Cartão 3x', 'Cartão 4x', 'Cartão 5x', 'Cartão 6x', 'Cartão 7x', 'Cartão 8x', 'Cartão 9x', 'Cartão 10x', 'Cartão 11x', 'Cartão 12x', 'Boleto', 'Transferência', 'Dinheiro'];
  var CONFIG_PADRAO = {
    comissaoPct: 5,
    modoParcelado: 'integral', // 'integral' = comissão inteira no mês seguinte ao 1º pagamento; 'parcelas' = dividida pelos meses das parcelas
    taxas: { 'PIX': 0, 'Cartão 1x': 3.15, 'Cartão 2x': 4.6, 'Cartão 3x': 5.3, 'Cartão 4x': 6, 'Cartão 5x': 6.7, 'Cartão 6x': 7.4, 'Cartão 7x': 8.1, 'Cartão 8x': 8.8, 'Cartão 9x': 9.5, 'Cartão 10x': 10.2, 'Cartão 11x': 10.9, 'Cartão 12x': 11.6, 'Boleto': 0, 'Transferência': 0, 'Dinheiro': 0 },
    custoFixo: 0,
    descontarForaArea: true,
    validadePadrao: 10,
    textos: {
      intro: 'NANOLUX: Resina líquida transparente de bloqueio solar para vidros | Aplicação Manual | Orçamento para bloqueio de até 99% de proteção UV e até 80% de proteção IR. Garanta 10 anos de eficiência mínima de 80%. O contrato de serviço geral deve ser consultado em www.sommar.eco.br/contratonanolux. Projetos corporativos ou com cláusulas excepcionais exigem contratos dedicados. Orçamentos com áreas enviadas pelo cliente serão atualizados com base na medição oficial no dia da instalação. Acréscimo de R$ 850,00 para aplicação noturna (até 3 dias de serviço) - Limpeza pesada pós-obra: cobrado adicional de R$ 32/m². Orçamento realizado em conformidade com a Tabela de Representação Fixa da SOMMAR.',
      obs: 'As medidas são as enviadas pelo cliente. O orçamento é passível de alteração após a medição no dia do projeto. Tolerância de 3%: Diferenças na área de até 3% (para mais ou para menos) não geram reajuste. Acima de 3%: Diferenças superiores a 3% serão ajustadas com estorno (área menor) ou cobrança de complementação (área maior).',
      pagResumo: 'Cartão em até 3 vezes sem juros',
      pagDetalhe: 'Pagamento em até 3 parcelas no cartão, sujeito à aprovação e à taxa cadastrada.',
      prazo: '1 dia',
      execucao: 'Equipe exclusivamente SOMMAR',
      turnos: ['Manhã', 'Tarde'],
      infos: ['A medição final será conferida antes da execução.', 'Garantia de 10 anos conforme as condições do contrato Nanolux.'],
      exProjeto: 'Ex.: Fachada stand',
      exLocal: 'Cidade/UF',
      exArea: 'Ex.: Fachada',
      exDesconto: 'Ex.: Desconto à vista'
    },
    asanaUrl: 'https://app.asana.com/',
    whatsapp: '558130403895',
    produtos: {
      nanolux: { rotulo: 'Aplicação completa da resina Nanolux', nome: 'Aplicação completa da resina Nanolux', desc: 'Tratamento e esterilização do vidro, isolamento da área e das esquadrias, aplicação do revestimento térmico Nanolux e garantia conforme condições contratuais.', unidade: 'm²', valor: 395, ref: 320, contaArea: true },
      protocolo: { rotulo: 'Protocolo técnico - VT01', nome: 'Protocolo técnico - VT01', desc: 'Preparação, limpeza técnica, esterilização da superfície, proteção das esquadrias e organização da área de aplicação.', unidade: 'protocolo', valor: 480, ref: 0, contaArea: false },
      noturna: { rotulo: 'Adicional - aplicação noturna', nome: 'Adicional - aplicação noturna', desc: 'Acréscimo para aplicação em horário noturno (até 3 dias de serviço).', unidade: 'adicional', valor: 850, ref: 0, contaArea: false },
      limpeza: { rotulo: 'Limpeza pesada pós-obra', nome: 'Limpeza pesada pós-obra', desc: 'Limpeza pesada pós-obra das superfícies antes da aplicação.', unidade: 'm²', valor: 32, ref: 0, contaArea: false },
      outro: { rotulo: 'Outro (personalizado)', nome: '', desc: '', unidade: 'un', valor: 0, ref: 0, contaArea: false }
    }
  };
  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    var s = String(v == null ? '' : v).trim().replace(/[^\d,.\-]/g, '');
    if (!s) return 0;
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    var n = parseFloat(s); return isFinite(n) ? n : 0;
  }
  function r2(v) { return Math.round((v + 1e-9) * 100) / 100; }
  function hojeISO() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function f2s(v) { return (Math.round((num(v) + 1e-9) * 100) / 100).toFixed(2).replace('.', ','); }
  /* Tabelas de taxas da máquina com vigência: cada uma vale a partir de "desde" até a véspera da próxima */
  function normTabelas(cfg) {
    var pctPadrao = cfg.comissaoPct != null ? num(cfg.comissaoPct) : CONFIG_PADRAO.comissaoPct;
    var base = (cfg.tabelasTaxas && cfg.tabelasTaxas.length) ? cfg.tabelasTaxas : [{ desde: '2000-01-01', taxas: cfg.taxas || {} }], porData = {};
    base.forEach(function (t) {
      var tx = JSON.parse(JSON.stringify(CONFIG_PADRAO.taxas)), k;
      for (k in (t.taxas || {})) tx[k] = num(t.taxas[k]);
      var desde = /^\d{4}-\d{2}-\d{2}$/.test(t.desde || '') ? t.desde : '2000-01-01';
      porData[desde] = { desde: desde, taxas: tx, comissaoPct: t.comissaoPct != null && t.comissaoPct !== '' ? num(t.comissaoPct) : pctPadrao };
    });
    return Object.keys(porData).sort().map(function (k) { return porData[k]; });
  }
  function tabelaEm(cfg, data) {
    var tabs = cfg.tabelasTaxas && cfg.tabelasTaxas.length ? cfg.tabelasTaxas : normTabelas(cfg), d = /^\d{4}-\d{2}-\d{2}/.test(data || '') ? String(data).slice(0, 10) : hojeISO(), t = tabs[0];
    tabs.forEach(function (x) { if (x.desde <= d) t = x; });
    return t;
  }
  function mesclar(cfg) {
    var c = JSON.parse(JSON.stringify(CONFIG_PADRAO)), k;
    cfg = cfg || {};
    for (k in cfg) if (k !== 'taxas' && k !== 'produtos' && k !== 'textos' && k !== 'tabelasTaxas') c[k] = cfg[k];
    for (k in (cfg.textos || {})) if (cfg.textos[k] != null) c.textos[k] = cfg.textos[k];
    if (cfg.produtos) c.produtos = cfg.produtos;
    c.tabelasTaxas = normTabelas(cfg);
    var atual = tabelaEm(c, hojeISO());
    c.taxas = atual.taxas; c.comissaoPct = atual.comissaoPct;
    return c;
  }
  function taxa(cfg, forma, data) { return num(tabelaEm(cfg, data).taxas[forma]) / 100; }
  function pctComissao(cfg, data) { return num(tabelaEm(cfg, data).comissaoPct); }
  function parcelas(forma) { var m = /(\d+)x/.exec(forma || ''); return m ? +m[1] : 1; }
  function eCartao(forma) { return /^Cart/.test(forma || ''); }
  function refItem(cfg, it) {
    var p = (cfg.produtos || {})[it.preset];
    if (p && num(p.ref) > 0) return num(p.ref);
    var n = (cfg.produtos || {}).nanolux; return n ? num(n.ref) : 0;
  }
  /* Totais do orçamento: total, área, itens fora da área, desconto e valor final */
  function totais(d, cfg) {
    cfg = cfg || CONFIG_PADRAO;
    var total = 0, area = 0, foraArea = 0, refPond = 0, valorM2Pond = 0;
    (d.itens || []).forEach(function (it) {
      var q = num(it.qtd), v = num(it.valor), s = r2(q * v);
      total += s;
      if (it.contaArea) { area += q; refPond += refItem(cfg, it) * q; valorM2Pond += v * q; }
      else foraArea += s;
    });
    total = r2(total);
    var dv = num(d.descValor), desc = 0;
    if (dv > 0) desc = d.descTipo === 'pct' ? r2(total * Math.min(dv, 100) / 100) : Math.min(dv, total);
    desc = r2(desc);
    var nomeDesc = (d.descNome || '').trim() || 'Desconto';
    if (desc > 0 && d.descTipo === 'pct') nomeDesc += ' (' + String(dv).replace('.', ',') + '%)';
    return { total: total, area: r2(area), foraArea: r2(foraArea), desc: desc, nomeDesc: desc > 0 ? nomeDesc : '', final: r2(total - desc),
             ref: area > 0 ? r2(refPond / area) : 0, valorM2: area > 0 ? r2(valorM2Pond / area) : 0 };
  }
  /* Análise financeira: taxas da máquina, líquido, comissão e m² efetivo.
     pagamentos = [{forma, valor, data}] (faturamento). Sem pagamentos, usa d.simulacao = [{forma, pct}]. */
  function analise(d, cfg, pagamentos) {
    cfg = mesclar(cfg);
    var t = totais(d, cfg), pays;
    if (pagamentos && pagamentos.length) pays = pagamentos.map(function (p) { return { forma: p.forma, valor: r2(num(p.valor)), data: p.data || '' }; });
    else {
      var sim = (d.simulacao || []).filter(function (p) { return p && p.forma; });
      if (!sim.length) sim = [{ forma: 'PIX', pct: 100 }];
      pays = sim.map(function (p) { return { forma: p.forma, pct: num(p.pct), valor: r2(t.final * num(p.pct) / 100) }; });
    }
    var somaPag = 0, taxas = 0;
    pays.forEach(function (p) { var tx = taxa(cfg, p.forma, p.data || d.emissao); p.taxa = r2(p.valor * tx); p.taxaPct = tx * 100; somaPag += p.valor; taxas += p.taxa; });
    somaPag = r2(somaPag); taxas = r2(taxas);
    var liquido = r2(t.final - taxas);
    var fixos = r2((cfg.descontarForaArea !== false ? t.foraArea : 0) + num(cfg.custoFixo));
    var m2ef = t.area > 0 ? r2((t.final - fixos - taxas) / t.area) : 0;
    var comissao = 0;
    pays.forEach(function (p) { p.comissaoPct = pctComissao(cfg, p.data || d.emissao); p.comissao = r2((p.valor - p.taxa) * p.comissaoPct / 100); comissao += p.comissao; });
    comissao = r2(comissao);
    var pcts = pays.map(function (p) { return p.comissaoPct; }).filter(function (v, i, l) { return l.indexOf(v) === i; });
    var pct = pcts.length === 1 ? pcts[0] : (liquido > 0 ? r2(comissao / liquido * 100) : 0);
    return {
      total: t.total, area: t.area, foraArea: t.foraArea, desc: t.desc, nomeDesc: t.nomeDesc, final: t.final, ref: t.ref, valorM2: t.valorM2,
      pagamentos: pays, somaPag: somaPag, taxas: taxas, liquido: liquido, fixos: fixos, m2ef: m2ef, comissaoPct: pct, comissao: comissao,
      precisaAutorizacao: t.area > 0 && t.ref > 0 && m2ef < t.ref - 0.004
    };
  }
  /* Ajustes feitos no faturamento: área a mais (novo item) e desconto a mais (somado ao desconto do orçamento) */
  function temAjustes(aj) { return !!aj && (num(aj.areaQtd) > 0 || num(aj.descExtra) > 0); }
  function aplicarAjustes(d, aj, cfg) {
    d = JSON.parse(JSON.stringify(d || {})); aj = aj || {};
    var area = num(aj.areaQtd), extra = num(aj.descExtra);
    if (area > 0) {
      var base = (d.itens || []).filter(function (it) { return it.contaArea; })[0], p = (cfg && cfg.produtos && cfg.produtos.nanolux) || {};
      var preco = num(aj.areaValor) > 0 ? num(aj.areaValor) : (base ? num(base.valor) : num(p.valor));
      d.itens = (d.itens || []).concat([{ id: 'aj' + Math.random().toString(36).slice(2, 8), preset: base ? base.preset : 'nanolux', nome: base ? base.nome : (p.nome || 'Aplicação completa da resina Nanolux'),
        area: String(aj.areaRef || '').trim() || 'Área adicional (faturamento)', desc: base ? base.desc : (p.desc || ''), qtd: f2s(area), unidade: base ? base.unidade : 'm²', valor: f2s(preco), contaArea: true, ajuste: true }]);
    }
    if (extra > 0) {
      var t = totais(d, cfg);
      d.descTipo = 'valor'; d.descValor = f2s(Math.min(t.total, t.desc + extra));
      if (!String(d.descNome || '').trim()) d.descNome = 'Desconto';
    }
    return d;
  }
  function ym(iso) { return String(iso || '').slice(0, 7); }
  function somaMes(ymStr, n) {
    var y = +ymStr.slice(0, 4), m = +ymStr.slice(5, 7) - 1 + n;
    y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    return y + '-' + (m < 9 ? '0' : '') + (m + 1);
  }
  /* Agenda da comissão: cada pagamento gera comissão paga no mês seguinte ao recebimento.
     Cartão parcelado: inteira (mês seguinte à 1ª parcela) ou dividida pelas parcelas, conforme a Diretoria. */
  function agenda(pagamentos, cfg) {
    cfg = mesclar(cfg);
    var out = [];
    (pagamentos || []).forEach(function (p) {
      if (!p.data) return;
      var c = p.comissao != null ? num(p.comissao) : r2((num(p.valor) - num(p.valor) * taxa(cfg, p.forma, p.data)) * pctComissao(cfg, p.data) / 100);
      var n = (eCartao(p.forma) && cfg.modoParcelado === 'parcelas') ? parcelas(p.forma) : 1;
      var base = ym(p.data), parte = r2(c / n), acum = 0;
      for (var k = 0; k < n; k++) {
        var v = k === n - 1 ? r2(c - acum) : parte; acum = r2(acum + v);
        out.push({ mesRecebimento: somaMes(base, k), mesComissao: somaMes(base, k + 1), valor: v, forma: p.forma });
      }
    });
    return out;
  }
  return { FORMAS: FORMAS, CONFIG_PADRAO: CONFIG_PADRAO, num: num, r2: r2, f2s: f2s, hojeISO: hojeISO, mesclar: mesclar, tabelaEm: tabelaEm, taxa: taxa, pctComissao: pctComissao, totais: totais, analise: analise, agenda: agenda, temAjustes: temAjustes, aplicarAjustes: aplicarAjustes, ym: ym, somaMes: somaMes, parcelas: parcelas, eCartao: eCartao };
})();

/* ===================== SERVIDOR ===================== */
var NX_ABAS = {
  Usuarios: ['id', 'nome', 'papel', 'ativo', 'criadoEm', 'json'],
  Orcamentos: ['id', 'grupo', 'versao', 'numero', 'vendedor', 'cliente', 'telefone', 'local', 'status', 'emissao', 'validade', 'total', 'desconto', 'valorFinal', 'area', 'm2Efetivo', 'atualizadoEm', 'json'],
  Faturamentos: ['id', 'orcamento', 'numero', 'vendedor', 'cliente', 'telefone', 'valorFinal', 'comissao', 'primeiroPagamento', 'faturadoEm', 'json'],
  Config: ['chave', 'json']
};

function doGet() {
  return ContentService.createTextOutput('Servidor do Gerador de orçamento Nanolux ativo.');
}
function doPost(e) {
  var res;
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    res = nxRotear(req);
  } catch (err) {
    res = { ok: false, erro: String(err && err.message ? err.message : err) };
  }
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}

function nxRotear(req) {
  var a = req.acao;
  if (a === 'status') return { ok: true, temUsuarios: nxLer('Usuarios').length > 0 };
  if (a === 'primeiroAcesso') return nxPrimeiroAcesso(req);
  if (a === 'login') return nxLogin(req);
  var u = nxAutenticar(req.token);
  if (a === 'carregar') return nxCarregar(u);
  if (a === 'salvarOrcamento') return nxComTrava(function () { return nxSalvarOrcamento(u, req); });
  if (a === 'faturar') return nxComTrava(function () { return nxFaturar(u, req); });
  if (a === 'vincularAsana') return nxComTrava(function () { return nxVincularAsana(u, req); });
  if (a === 'alterarFaturamento') return nxComTrava(function () { return nxAlterarFaturamento(u, req); });
  if (a === 'excluirFaturamento') return nxComTrava(function () { return nxExcluirFaturamento(u, req); });
  if (a === 'salvarConfig') { nxExigirDiretor(u); return nxComTrava(function () { return nxSalvarConfig(req.config); }); }
  if (a === 'salvarUsuario') { nxExigirDiretor(u); return nxComTrava(function () { return nxSalvarUsuario(req.usuario); }); }
  throw new Error('Ação desconhecida: ' + a);
}

/* ---------- planilha ---------- */
function nxAba(nome) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(nome);
  if (!sh) {
    sh = ss.insertSheet(nome);
    sh.appendRow(NX_ABAS[nome]);
    sh.setFrozenRows(1);
  }
  return sh;
}
function nxLer(nome) {
  var sh = nxAba(nome), vals = sh.getDataRange().getValues(), col = NX_ABAS[nome].length - 1, out = [];
  for (var i = 1; i < vals.length; i++) {
    var j = vals[i][col];
    if (!j) continue;
    try { var o = JSON.parse(j); o._linha = i + 1; out.push(o); } catch (err) {}
  }
  return out;
}
function nxLinha(nome, o) {
  var h = NX_ABAS[nome], limpo = {}, k;
  for (k in o) if (k !== '_linha') limpo[k] = o[k];
  return h.map(function (c) { return c === 'json' ? JSON.stringify(limpo) : (o[c] == null ? '' : o[c]); });
}
function nxGravar(nome, o) {
  var sh = nxAba(nome), linha = nxLinha(nome, o);
  if (o._linha) sh.getRange(o._linha, 1, 1, linha.length).setValues([linha]);
  else { sh.appendRow(linha); o._linha = sh.getLastRow(); }
  return o;
}
function nxComTrava(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/* ---------- segurança ---------- */
function nxSegredo() {
  var p = PropertiesService.getScriptProperties(), s = p.getProperty('NX_SEGREDO');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('NX_SEGREDO', s); }
  return s;
}
function nxB64(bytes) { return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, ''); }
function nxHashPin(id, pin) {
  return nxB64(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, nxSegredo() + '|' + id + '|' + String(pin)));
}
function nxToken(u) {
  var corpo = nxB64(JSON.stringify({ u: u.id, e: Date.now() + 30 * 24 * 3600 * 1000 }));
  return corpo + '.' + nxB64(Utilities.computeHmacSha256Signature(corpo, nxSegredo()));
}
function nxAutenticar(token) {
  var p = String(token || '').split('.');
  if (p.length !== 2 || nxB64(Utilities.computeHmacSha256Signature(p[0], nxSegredo())) !== p[1]) throw new Error('SESSAO: faça login novamente.');
  var dados = JSON.parse(nxDecodificar(p[0]));
  if (dados.e < Date.now()) throw new Error('SESSAO: sua sessão expirou, faça login novamente.');
  var u = nxLer('Usuarios').filter(function (x) { return x.id === dados.u; })[0];
  if (!u || !u.ativo) throw new Error('SESSAO: usuário inativo.');
  return u;
}
function nxDecodificar(s) {
  while (s.length % 4) s += '=';
  return Utilities.newBlob(Utilities.base64DecodeWebSafe(s)).getDataAsString();
}
function nxPublico(u) { return { id: u.id, nome: u.nome, papel: u.papel, ativo: u.ativo }; }
function nxExigirDiretor(u) { if (u.papel !== 'diretor') throw new Error('Apenas a Diretoria pode fazer isso.'); }
function nxNormNome(s) { return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

function nxPrimeiroAcesso(req) {
  return nxComTrava(function () {
    if (nxLer('Usuarios').length) throw new Error('O primeiro acesso já foi feito. Entre com seu nome e PIN.');
    nxValidarPin(req.pin);
    if (!String(req.nome || '').trim()) throw new Error('Informe o nome.');
    var u = { id: Utilities.getUuid(), nome: String(req.nome).trim(), papel: 'diretor', ativo: true, criadoEm: new Date().toISOString() };
    u.pinHash = nxHashPin(u.id, req.pin);
    nxGravar('Usuarios', u);
    return nxLogin(req);
  });
}
function nxValidarPin(pin) { if (!/^\d{4,8}$/.test(String(pin || ''))) throw new Error('O PIN deve ter de 4 a 8 números.'); }
function nxLogin(req) {
  var cache = CacheService.getScriptCache(), chave = 'tent_' + nxNormNome(req.nome).slice(0, 80), tent = +(cache.get(chave) || 0);
  if (tent >= 5) throw new Error('Muitas tentativas. Aguarde 10 minutos.');
  var u = nxLer('Usuarios').filter(function (x) { return x.ativo && nxNormNome(x.nome) === nxNormNome(req.nome); })[0];
  if (!u || u.pinHash !== nxHashPin(u.id, req.pin)) {
    cache.put(chave, String(tent + 1), 600);
    throw new Error('Nome ou PIN incorretos.');
  }
  cache.remove(chave);
  return { ok: true, token: nxToken(u), usuario: nxPublico(u) };
}

/* ---------- dados ---------- */
function nxConfig() {
  var c = nxLer('Config').filter(function (x) { return x.chave === 'config'; })[0];
  return NX_CALC.mesclar(c ? c.valor : {});
}
function nxCarregar(u) {
  var dir = u.papel === 'diretor';
  var orcs = nxLer('Orcamentos').filter(function (o) { return dir || o.vendedorId === u.id; });
  var fats = nxLer('Faturamentos').filter(function (f) { return !f.excluido && (dir || f.vendedorId === u.id); });
  var usuarios = dir ? nxLer('Usuarios').map(nxPublico) : [nxPublico(u)];
  return { ok: true, usuario: nxPublico(u), config: nxConfig(), orcamentos: orcs, faturamentos: fats, usuarios: usuarios, agora: new Date().toISOString() };
}
function nxResumo(o, cfg) {
  var d = o.dados || {}, a = NX_CALC.analise(d, cfg);
  o.numero = d.numero; o.cliente = d.cliente || ''; o.telefone = d.telefone || ''; o.local = d.local || ''; o.projeto = d.projeto || '';
  o.emissao = d.emissao || ''; o.validadeDias = NX_CALC.num(d.validadeDias);
  var em = String(d.emissao || '').split('-');
  if (em.length === 3) { var v = new Date(+em[0], +em[1] - 1, +em[2] + o.validadeDias); o.validade = v.getFullYear() + '-' + ('0' + (v.getMonth() + 1)).slice(-2) + '-' + ('0' + v.getDate()).slice(-2); }
  o.total = a.total; o.desconto = a.desc; o.nomeDesconto = a.nomeDesc; o.valorFinal = a.final; o.area = a.area; o.valorM2 = a.valorM2;
  o.m2Efetivo = a.m2ef; o.ref = a.ref; o.comissaoSimulada = a.comissao; o.precisaAutorizacao = a.precisaAutorizacao; o.asanaUrl = d.asanaUrl || '';
  o.simulacao = (d.simulacao || []).filter(function (p) { return p && p.forma; });
  return o;
}
function nxSalvarOrcamento(u, req) {
  var cfg = nxConfig(), d = req.dados || {}, todos = nxLer('Orcamentos'), agora = new Date().toISOString(), o;
  var dono = function (x) { return u.papel === 'diretor' || x.vendedorId === u.id; };
  if (req.id) {
    o = todos.filter(function (x) { return x.id === req.id; })[0];
    if (!o || !dono(o)) throw new Error('Orçamento não encontrado.');
    if (o.status === 'faturado' || o.substituidoPor) throw new Error('Este orçamento já foi ' + (o.status === 'faturado' ? 'faturado' : 'atualizado') + ' e não pode mais ser alterado. Use "Atualizar".');
  } else {
    o = { id: Utilities.getUuid(), criadoEm: agora, vendedorId: u.id, vendedor: u.nome, versao: 1 };
    if (req.atualizaDe) {
      var ant = todos.filter(function (x) { return x.id === req.atualizaDe; })[0];
      if (!ant || !dono(ant)) throw new Error('Orçamento anterior não encontrado.');
      if (ant.status === 'faturado') throw new Error('Esse orçamento já foi faturado.');
      var grupo = todos.filter(function (x) { return x.grupo === ant.grupo; });
      o.grupo = ant.grupo; o.vendedorId = ant.vendedorId; o.vendedor = ant.vendedor;
      o.versao = Math.max.apply(null, grupo.map(function (x) { return x.versao || 1; })) + 1;
      o.anteriorId = ant.id;
      grupo.forEach(function (x) { if (!x.substituidoPor && x.status !== 'faturado') { x.substituidoPor = o.id; x.substituidoEm = agora; nxGravar('Orcamentos', x); } });
    } else o.grupo = o.id;
  }
  o.dados = d; o.atualizadoEm = agora;
  if (req.pdf) { o.status = 'pdf'; o.pdfEm = agora; } else o.status = 'rascunho';
  nxResumo(o, cfg);
  nxGravar('Orcamentos', o);
  return { ok: true, orcamento: o };
}
function nxFaturar(u, req) {
  var cfg = nxConfig(), todos = nxLer('Orcamentos'), o = todos.filter(function (x) { return x.id === req.id; })[0];
  if (!o || (u.papel !== 'diretor' && o.vendedorId !== u.id)) throw new Error('Orçamento não encontrado.');
  if (o.status === 'faturado') throw new Error('Este orçamento já foi faturado.');
  if (o.substituidoPor) throw new Error('Este orçamento foi atualizado por uma versão mais nova. Fature a versão atual.');
  var pags = nxPagamentosValidos(req.pagamentos), aj = nxAjustes(req.ajustes, u), agora = new Date().toISOString();
  var dados = aj ? NX_CALC.aplicarAjustes(o.dados, aj, cfg) : o.dados;
  var a = NX_CALC.analise(dados, cfg, pags);
  if (Math.abs(a.somaPag - a.final) > 0.009) throw new Error('A soma dos pagamentos (' + a.somaPag.toFixed(2) + ') precisa ser igual ao valor final (' + a.final.toFixed(2) + ').');
  var datas = a.pagamentos.map(function (p) { return p.data; }).sort();
  var f = {
    id: Utilities.getUuid(), orcamentoId: o.id, grupo: o.grupo, orcamento: o.id, numero: o.numero, versao: o.versao, vendedorId: o.vendedorId, vendedor: o.vendedor,
    cliente: o.cliente, telefone: o.telefone, local: o.local, projeto: o.projeto, orcCriadoEm: (todos.filter(function (x) { return x.grupo === o.grupo; }).map(function (x) { return x.criadoEm; }).sort()[0] || o.criadoEm),
    total: a.total, desconto: a.desc, nomeDesconto: a.nomeDesc, valorFinal: a.final, area: a.area, valorM2: a.valorM2, m2Efetivo: a.m2ef, ref: a.ref,
    taxas: a.taxas, liquido: a.liquido, comissaoPct: a.comissaoPct, comissao: a.comissao, pagamentos: a.pagamentos,
    agenda: NX_CALC.agenda(a.pagamentos, cfg), modoParcelado: cfg.modoParcelado, primeiroPagamento: datas[0], faturadoEm: agora, faturadoPor: u.nome, obs: String(req.obs || ''),
    ajustes: aj ? [aj] : []
  };
  nxGravar('Faturamentos', f);
  nxAtualizarOrcDoFaturamento(o, dados, a, aj, cfg, u, 'Faturado');
  o.status = 'faturado'; o.faturamentoId = f.id; o.faturadoEm = agora;
  nxGravar('Orcamentos', o);
  return { ok: true, faturamento: f, orcamento: o };
}
function nxSalvarConfig(cfg) {
  var linha = nxLer('Config').filter(function (x) { return x.chave === 'config'; })[0] || { chave: 'config' };
  linha.valor = NX_CALC.mesclar(cfg); linha.atualizadoEm = new Date().toISOString();
  nxGravar('Config', linha);
  return { ok: true, config: linha.valor };
}
function nxSalvarUsuario(dados) {
  var todos = nxLer('Usuarios'), u;
  var nome = String(dados.nome || '').trim();
  if (!nome) throw new Error('Informe o nome.');
  var igual = todos.filter(function (x) { return nxNormNome(x.nome) === nxNormNome(nome) && x.id !== dados.id; })[0];
  if (igual) throw new Error('Já existe um usuário com esse nome.');
  if (dados.id) { u = todos.filter(function (x) { return x.id === dados.id; })[0]; if (!u) throw new Error('Usuário não encontrado.'); }
  else { nxValidarPin(dados.pin); u = { id: Utilities.getUuid(), criadoEm: new Date().toISOString() }; }
  u.nome = nome; u.papel = dados.papel === 'diretor' ? 'diretor' : 'vendedor'; u.ativo = dados.ativo !== false;
  if (dados.pin) { nxValidarPin(dados.pin); u.pinHash = nxHashPin(u.id, dados.pin); }
  var diretores = todos.filter(function (x) { return x.id !== u.id && x.papel === 'diretor' && x.ativo; });
  if (!diretores.length && (u.papel !== 'diretor' || !u.ativo)) throw new Error('É preciso manter pelo menos um(a) diretor(a) ativo(a).');
  nxGravar('Usuarios', u);
  return { ok: true, usuario: nxPublico(u) };
}

function nxVincularAsana(u, req) {
  var url = String(req.url || '').trim();
  if (url && !/^https?:\/\/\S+$/i.test(url)) throw new Error('O link precisa começar com https://');
  var todos = nxLer('Orcamentos'), o = todos.filter(function (x) { return x.id === req.id; })[0];
  if (!o || (u.papel !== 'diretor' && o.vendedorId !== u.id)) throw new Error('Orçamento não encontrado.');
  var alterados = [];
  todos.forEach(function (x) {
    if (x.grupo !== o.grupo) return;
    x.asanaUrl = url; x.dados = x.dados || {}; x.dados.asanaUrl = url;
    nxGravar('Orcamentos', x); alterados.push(x);
  });
  return { ok: true, orcamentos: alterados };
}
function nxPagamentosValidos(pagamentos) {
  var pags = (pagamentos || []).filter(function (p) { return p && p.forma && NX_CALC.num(p.valor) > 0; });
  if (!pags.length) throw new Error('Informe pelo menos uma forma de pagamento.');
  pags.forEach(function (p) { if (!/^\d{4}-\d{2}-\d{2}$/.test(p.data || '')) throw new Error('Informe a data de cada pagamento.'); });
  return pags;
}
function nxAlterarFaturamento(u, req) {
  var motivo = String(req.motivo || '').trim();
  if (motivo.length < 5) throw new Error('Escreva o motivo da alteração.');
  var cfg = nxConfig(), fats = nxLer('Faturamentos'), f = fats.filter(function (x) { return x.id === req.id; })[0];
  if (!f || (u.papel !== 'diretor' && f.vendedorId !== u.id)) throw new Error('Faturamento não encontrado.');
  var o = nxLer('Orcamentos').filter(function (x) { return x.id === f.orcamentoId; })[0];
  if (!o) throw new Error('Orçamento do faturamento não encontrado.');
  var pags = nxPagamentosValidos(req.pagamentos), aj = nxAjustes(req.ajustes, u);
  var dados = aj ? NX_CALC.aplicarAjustes(o.dados, aj, cfg) : o.dados, a = NX_CALC.analise(dados, cfg, pags);
  if (Math.abs(a.somaPag - a.final) > 0.009) throw new Error('A soma dos pagamentos (' + a.somaPag.toFixed(2) + ') precisa ser igual ao valor final (' + a.final.toFixed(2) + ').');
  var antes = { pagamentos: f.pagamentos, taxas: f.taxas, liquido: f.liquido, comissao: f.comissao, comissaoPct: f.comissaoPct, m2Efetivo: f.m2Efetivo, obs: f.obs, valorFinal: f.valorFinal, area: f.area, desconto: f.desconto };
  var datas = a.pagamentos.map(function (p) { return p.data; }).sort();
  f.total = a.total; f.desconto = a.desc; f.nomeDesconto = a.nomeDesc; f.valorFinal = a.final; f.area = a.area; f.valorM2 = a.valorM2; f.ref = a.ref;
  f.pagamentos = a.pagamentos; f.taxas = a.taxas; f.liquido = a.liquido; f.comissaoPct = a.comissaoPct; f.comissao = a.comissao; f.m2Efetivo = a.m2ef;
  if (aj) { f.ajustes = f.ajustes || []; f.ajustes.push(aj); }
  f.agenda = NX_CALC.agenda(a.pagamentos, cfg); f.modoParcelado = cfg.modoParcelado; f.primeiroPagamento = datas[0];
  if (req.obs != null) f.obs = String(req.obs);
  f.historico = f.historico || [];
  f.historico.push({ em: new Date().toISOString(), por: u.nome, porId: u.id, motivo: motivo, antes: antes, ajuste: aj || null,
    depois: { pagamentos: f.pagamentos, taxas: f.taxas, liquido: f.liquido, comissao: f.comissao, comissaoPct: f.comissaoPct, m2Efetivo: f.m2Efetivo, obs: f.obs, valorFinal: f.valorFinal, area: f.area, desconto: f.desconto } });
  f.alteradoEm = new Date().toISOString();
  nxGravar('Faturamentos', f);
  nxAtualizarOrcDoFaturamento(o, dados, a, aj, cfg, u, 'Faturamento alterado: ' + motivo);
  nxGravar('Orcamentos', o);
  return { ok: true, faturamento: f, orcamento: o };
}

/* valida os ajustes do faturamento; exige observação interna quando houver área ou desconto a mais */
function nxAjustes(aj, u) {
  if (!NX_CALC.temAjustes(aj)) return null;
  var obs = String(aj.obsInterna || '').trim();
  if (obs.length < 5) throw new Error('Escreva a observação interna explicando a área ou o desconto a mais (o orçamento não foi alterado antes).');
  if (NX_CALC.num(aj.areaQtd) < 0 || NX_CALC.num(aj.descExtra) < 0) throw new Error('Os ajustes não podem ser negativos.');
  return { em: new Date().toISOString(), por: u.nome, areaQtd: NX_CALC.num(aj.areaQtd), areaValor: NX_CALC.num(aj.areaValor), areaRef: String(aj.areaRef || '').trim(), descExtra: NX_CALC.num(aj.descExtra), obsInterna: obs };
}
/* leva para o orçamento o que mudou no faturamento: itens/desconto ajustados e as formas de pagamento reais */
function nxAtualizarOrcDoFaturamento(o, dados, a, aj, cfg, u, nota) {
  var d = JSON.parse(JSON.stringify(dados || {}));
  if (a.final > 0) d.simulacao = a.pagamentos.map(function (p) { return { forma: p.forma, pct: String(Math.round(p.valor / a.final * 10000) / 100).replace('.', ',') }; });
  o.dados = d; nxResumo(o, cfg); o.atualizadoEm = new Date().toISOString();
  o.historicoFaturamento = o.historicoFaturamento || [];
  o.historicoFaturamento.push({ em: o.atualizadoEm, por: u.nome, nota: nota, ajuste: aj || null, valorFinal: a.final });
}
function nxExcluirFaturamento(u, req) {
  var motivo = String(req.motivo || '').trim();
  if (motivo.length < 5) throw new Error('Escreva o motivo da exclusão.');
  var f = nxLer('Faturamentos').filter(function (x) { return x.id === req.id; })[0];
  if (!f || f.excluido || (u.papel !== 'diretor' && f.vendedorId !== u.id)) throw new Error('Faturamento não encontrado.');
  var agora = new Date().toISOString();
  f.excluido = true; f.excluidoEm = agora; f.excluidoPor = u.nome; f.motivoExclusao = motivo;
  nxGravar('Faturamentos', f);
  var o = nxLer('Orcamentos').filter(function (x) { return x.id === f.orcamentoId; })[0];
  if (o && o.faturamentoId === f.id) {
    o.status = o.pdfEm ? 'pdf' : 'rascunho'; o.faturamentoId = ''; o.faturadoEm = ''; o.atualizadoEm = agora;
    o.historicoFaturamento = o.historicoFaturamento || [];
    o.historicoFaturamento.push({ em: agora, por: u.nome, nota: 'Faturamento excluído: ' + motivo, valorFinal: f.valorFinal });
    nxGravar('Orcamentos', o);
  }
  return { ok: true, faturamentoId: f.id, orcamento: o || null };
}
