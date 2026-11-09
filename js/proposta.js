/* Sistema Nanolux · SOMMAR — Proposta comercial: formulário, calculadora, pré-visualização e PDF */
(function () {
'use strict';
var NX = window.NX, C = window.NX_CALC, S = NX.S;
var $ = NX.$, $$ = NX.$$, esc = NX.esc, num = NX.num, f2 = NX.f2, brl = NX.brl, pad = NX.pad;
var I = window.NX_IMG || {};
var CONTRATO = 'https://www.sommar.eco.br/contratonanolux';
function whats() { return NX.digitos(S.cfg.whatsapp) || '558130403895'; }
function T() { var t = (S.cfg && S.cfg.textos) || {}, d = C.CONFIG_PADRAO.textos, o = {}, k; for (k in d) o[k] = t[k] != null ? t[k] : d[k]; return o; }

function PRESETS() { return S.cfg.produtos || C.CONFIG_PADRAO.produtos; }
function rnd() { var a = new Uint8Array(3); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (x) { return (x < 16 ? '0' : '') + x.toString(16); }).join('').toUpperCase(); }
function novoNumero(iso) { return 'ORC-' + String(iso || NX.hoje()).replace(/-/g, '') + '-' + rnd(); }
function uid() { return Math.random().toString(36).slice(2, 9); }
function item(preset, extra) {
  var p = PRESETS()[preset] || PRESETS().outro || { nome: '', desc: '', unidade: 'un', valor: 0, contaArea: false };
  var it = { id: uid(), preset: preset, nome: p.nome, area: '', desc: p.desc, qtd: '1', unidade: p.unidade, valor: f2(num(p.valor)), contaArea: !!p.contaArea };
  for (var k in (extra || {})) it[k] = extra[k];
  return it;
}
function padrao() {
  var e = NX.hoje();
  return {
    cliente: '', telefone: '', projeto: '', local: '', asanaUrl: '', numero: novoNumero(e), emissao: e, validadeDias: String(S.cfg.validadePadrao || 10),
    representante: (S.user && S.user.nome) || 'Equipe SOMMAR', versao: 'V01', anteriores: 'Primeira proposta',
    prazo: T().prazo, pagResumo: T().pagResumo, pagDetalhe: T().pagDetalhe,
    turnos: (T().turnos || []).slice(), execucao: T().execucao, obs: T().obs, intro: T().intro,
    descNome: '', descTipo: 'valor', descValor: '',
    simulacao: [{ forma: 'PIX', pct: '100' }],
    itens: [item('protocolo', { area: '' }), item('nanolux', { area: '', qtd: '10' })]
  };
}
function completar(d) { var p = padrao(), k; d = JSON.parse(JSON.stringify(d || {})); for (k in p) if (d[k] === undefined) d[k] = p[k]; (d.itens || []).forEach(function (it) { if (!it.id) it.id = uid(); }); return d; }

/* estado da tela: dados do orçamento + metadados do registro salvo */
var state, meta;
function chaveLocal() { return 'nx-proposta-' + (S.user ? S.user.id : 'x') + (S.demo ? '-demo' : ''); }
function salvarLocal() { try { localStorage.setItem(chaveLocal(), JSON.stringify({ state: state, meta: meta })); } catch (e) {} }
function carregarLocal() {
  try { var r = JSON.parse(localStorage.getItem(chaveLocal()) || 'null'); if (r && r.state) { state = completar(r.state); meta = r.meta || {}; return; } } catch (e) {}
  state = padrao(); meta = {};
}
var P = NX.proposta = {};
P.novo = function () {
  if (state && meta && meta.sujo && !confirm('Há alterações não salvas neste orçamento. Começar um novo mesmo assim?')) return;
  state = padrao(); meta = {}; salvarLocal(); NX.ir('proposta');
};
function reg(id) { return S.orcs.filter(function (x) { return x.id === id; })[0]; }
P.abrir = function (id) {
  var o = reg(id); if (!o) return NX.toast('Orçamento não encontrado', true);
  if (state && meta && meta.sujo && meta.id !== id && !confirm('Há alterações não salvas no orçamento aberto. Abrir outro mesmo assim?')) return;
  state = completar(o.dados);
  meta = { id: o.id, status: o.status, versaoN: o.versao || 1, grupo: o.grupo, vendedor: o.vendedor, ro: o.status === 'faturado' || !!o.substituidoPor, salvoEm: o.atualizadoEm };
  salvarLocal(); NX.ir('proposta');
};
P.atualizar = function (id, semConfirmar) {
  var o = reg(id); if (!o) return NX.toast('Orçamento não encontrado', true);
  var g = NX.grupos().filter(function (x) { return x.id === o.grupo; })[0];
  if (g.faturado) return NX.toast('Este orçamento já foi faturado.', true);
  if (!semConfirmar && state && meta && meta.sujo && !confirm('Há alterações não salvas no orçamento aberto. Continuar mesmo assim?')) return;
  var atual = g.atual, n = Math.max.apply(null, g.versoes.map(function (x) { return x.versao || 1; })) + 1;
  state = completar(atual.dados);
  state.emissao = NX.hoje(); state.versao = 'V' + pad(n);
  state.anteriores = g.versoes.slice().reverse().map(function (x) { return 'V' + pad(x.versao || 1); }).join(', ');
  meta = { id: null, atualizaDe: atual.id, status: null, versaoN: n, grupo: g.id, vendedor: atual.vendedor, ro: false, sujo: true };
  salvarLocal(); NX.ir('proposta');
  NX.toast('Nova versão V' + pad(n) + ' — ajuste e salve. A anterior ficará inválida.');
};
P.estado = function () { return state; };
P.limpar = function () { state = null; meta = null; preview = null; };
P.meta = function () { return meta; };

/* ---------- cálculos locais da pré-visualização ---------- */
function calc() {
  var linhas = state.itens.map(function (it) { var q = num(it.qtd), v = num(it.valor); return { it: it, q: q, v: v, sub: Math.round(q * v * 100) / 100 }; });
  var t = C.totais(state, S.cfg);
  var em = NX.parseISO(state.emissao) || new Date(), vd = Math.max(0, Math.round(num(state.validadeDias)));
  var val = new Date(em.getFullYear(), em.getMonth(), em.getDate() + vd);
  return { linhas: linhas, total: t.total, area: t.area, desc: t.desc, nomeDesc: t.nomeDesc, final: t.final, emissao: NX.dataBR(em), validade: NX.dataBR(val), vd: vd, turnos: (state.turnos || []).join(', ') };
}
function fq(l) { return f2(l.q) + (l.it.unidade ? ' ' + l.it.unidade : ''); }

/* ---------- páginas ---------- */
var I = window.NX_IMG || {};
function header(){
  return '<div class="a topbar"></div>' +
    '<div class="a b" style="left:68px;top:42.2px;font-size:31.3px;color:#17a8c2">SOMMAR</div>' +
    '<div class="a b" style="left:260px;top:34.1px;font-size:15.2px;color:#111719">SOMMAR Soluções Sustentáveis LTDA.</div>' +
    '<div class="a" style="left:260px;top:66.3px;font-size:12.1px;color:#64757d;white-space:pre">28.222.310/0001-70   •   (81) 3040-3895   •   contato@sommar.eco.br   •   www.sommar.eco.br</div>' +
    '<div class="a b" style="left:985px;top:21.4px;font-size:11px;color:#52646d">REFERÊNCIAS TÉCNICAS</div>' +
    '<img class="a" src="' + I.nfrc + '" style="left:978.1px;top:37.5px;width:50px;height:50px">' +
    '<img class="a" src="' + I.gbc + '" style="left:1045.8px;top:37.5px;width:52.1px;height:52.1px">' +
    '<img class="a" src="' + I.ashrae + '" style="left:1117.3px;top:37.5px;width:82px;height:45.8px">' +
    '<img class="a" src="' + I.berkeley + '" style="left:1218.8px;top:37.7px;width:81.3px;height:45.4px">' +
    '<div class="a" style="left:1287.5px;top:25px;width:158.3px;height:37.5px;border-radius:6.3px;background:#f2f7f8"></div>' +
    '<div class="a b c" style="left:1287.5px;width:158.3px;top:36.2px;font-size:13.3px;color:#078ead">VERSÃO ' + esc(state.versao) + '</div>' +
    '<div class="a c" style="left:1257.5px;width:218.3px;top:79.4px;font-size:9.8px;color:#64757d">Anteriores: ' + esc(state.anteriores) + '</div>' +
    '<div class="a" style="left:54.2px;top:104.2px;width:1391.7px;height:2.1px;background:#d9e4e7"></div>';
}
function pnum(i, n){ return '<div class="a pnum">' + pad(i) + ' / ' + pad(n) + '   |   ' + esc(state.numero) + '</div>'; }
function rowsHTML(ls){
  return ls.map(function(l){
    return '<div class="tr row"><div class="td c1">' + esc(l.it.nome) + '</div><div class="td c2">' + esc(l.it.area) + '</div><div class="td c3">' + esc(l.it.desc) +
      '</div><div class="td c4">' + esc(fq(l)) + '</div><div class="td c5">' + brl(l.v) + '</div><div class="td c6">' + brl(l.sub) + '</div></div>';
  }).join('');
}
function tableHTML(ls){
  return '<div class="tbl"><div class="tr th"><div class="td c1">Produto / serviço</div><div class="td c2">Área / referência</div><div class="td c3">Descrição</div><div class="td c4">Quantidade</div><div class="td c5">Valor unitário</div><div class="td c6">Subtotal</div></div><div class="tbody">' + rowsHTML(ls) + '</div></div>';
}
function invBox(c){
  if (c.desc > 0) {
    return '<div class="a inv">' +
      '<div class="il">INVESTIMENTO TOTAL</div>' +
      '<div class="ir"><span>Valor total</span><span class="strike">' + brl(c.total) + '<i></i></span></div>' +
      '<div class="ir d"><span>' + esc(c.nomeDesc) + '</span><span>− ' + brl(c.desc) + '</span></div>' +
      '<div class="sep"></div>' +
      '<div class="ir t"><span>Valor atualizado:</span><span class="v">' + brl(c.final) + '</span></div></div>';
  }
  return '<div class="a inv"><div class="il">INVESTIMENTO TOTAL</div><div class="iv">' + brl(c.total) + '</div></div>';
}
function infoCol(x, w, lab, val){
  return '<div class="a lbl" style="left:' + x + 'px;top:209.4px">' + lab + '</div>' +
    '<div class="a b wrap" style="left:' + x + 'px;top:229.2px;width:' + w + 'px;font-size:12.9px;line-height:15px;color:#22313a">' + esc(val) + '</div>';
}
function page1(c, ls, i, n){
  var obs = [];
  if (c.turnos) obs.push('Turnos autorizados para execução: ' + c.turnos + '.');
  if ((state.execucao || '').trim()) obs.push('Modalidade de execução prevista: ' + state.execucao.trim().replace(/\.$/, '') + '.');
  if ((state.obs || '').trim()) obs.push(state.obs.trim());
  var pag = [state.pagResumo, state.pagDetalhe].filter(function(s){ return (s || '').trim(); }).join(': ');
  return '<div class="pg" data-kind="p1">' + header() +
    '<div class="a b" style="left:68px;top:118.2px;font-size:12.9px;color:#079dbb">PROPOSTA PERSONALIZADA</div>' +
    '<div class="a b" style="left:68px;top:140.2px;font-size:47.9px;color:#111719">Proposta comercial</div>' +
    infoCol(89, 205, 'CLIENTE', NX.clienteRotulo(state)) + '<div class="a vline" style="left:302.1px;top:208.3px;height:39.6px"></div>' +
    infoCol(337, 320, 'PROJETO', state.projeto) + '<div class="a vline" style="left:670.8px;top:208.3px;height:39.6px"></div>' +
    infoCol(706, 170, 'LOCAL', state.local) + '<div class="a vline" style="left:887.5px;top:208.3px;height:39.6px"></div>' +
    infoCol(922, 245, 'REPRESENTANTE', state.representante) + '<div class="a vline" style="left:1177.1px;top:208.3px;height:39.6px"></div>' +
    infoCol(1212, 225, 'ORÇAMENTO', state.numero) +
    '<div class="flow">' + ((state.intro || '').trim() ? '<div class="intro">' + esc(state.intro.trim()) + '</div>' : '') + tableHTML(ls) + '</div>' +
    '<div class="a slbl" style="left:85px">ÁREA TOTAL</div><div class="a sval" style="left:85px">' + f2(c.area) + ' m²</div>' +
    '<div class="a vline" style="left:283.3px;top:593.8px;height:52.1px"></div>' +
    '<div class="a slbl" style="left:310px">PRAZO ESTIMADO</div><div class="a sval" style="left:310px">' + esc(state.prazo) + '</div>' +
    '<div class="a vline" style="left:508.3px;top:593.8px;height:52.1px"></div>' +
    '<div class="a slbl" style="left:535px">EMISSÃO</div><div class="a sval" style="left:535px">' + c.emissao + '</div>' +
    '<div class="a vline" style="left:733.3px;top:593.8px;height:52.1px"></div>' +
    '<div class="a slbl" style="left:760px">VALIDADE</div><div class="a sval" style="left:760px">' + c.validade + '</div>' +
    (pag ? '<div class="a note" style="left:85px">Condição de pagamento: ' + esc(pag) + '</div>' : '') +
    (obs.length ? '<div class="a note" style="left:531px">Observações do projeto: ' + esc(obs.join(' • ')) + '</div>' : '') +
    invBox(c) + pnum(i, n) + '</div>';
}
function pageCont(ls, i, n){
  return '<div class="pg" data-kind="cont">' + header() +
    '<div class="a b" style="left:68px;top:118.2px;font-size:12.9px;color:#079dbb">PROPOSTA PERSONALIZADA · CONTINUAÇÃO</div>' +
    '<div class="a b" style="left:68px;top:140.2px;font-size:47.9px;color:#111719">Itens da proposta</div>' +
    '<div class="flow" style="top:215px">' + tableHTML(ls) + '</div>' + pnum(i, n) + '</div>';
}
function kcard(x, color, lab, val, big){
  return '<div class="a kc" style="left:' + x + 'px"><div class="bar" style="background:' + color + '"></div><div class="kl">' + lab + '</div><div class="kv ' + (big ? 'big' : 'sm') + '">' + esc(val) + '</div></div>';
}
function page2(c, i, n){
  var wa = 'https://wa.me/' + whats() + '?text=' + encodeURIComponent('Meu orçamento é o nº ' + state.numero + ', quero negociar.');
  var infos = ['Validade desta proposta: ' + c.vd + ' dias a partir da data de emissão.'].concat((T().infos || []).filter(function (x) { return String(x).trim(); }));
  if (c.turnos) infos.push('Turnos autorizados para execução: ' + c.turnos + '.');
  if ((state.execucao || '').trim()) infos.push('Modalidade de execução prevista: ' + state.execucao.trim().replace(/\.$/, '') + '.');
  infos = infos.slice(0, 7);
  var passo = infos.length > 5 ? Math.max(30, 227 / (infos.length - 1)) : 45.4;
  var li = infos.map(function(t, k){
    var y = 522.9 + k * passo;
    return '<div class="a dot" style="left:118.8px;top:' + y + 'px"><img src="' + I.check + '"></div><div class="a itx" style="top:' + (y + 1.8).toFixed(1) + 'px">' + esc(t) + '</div>';
  }).join('');
  return '<div class="pg" data-kind="p2">' + header() +
    '<div class="a b" style="left:68px;top:124.3px;font-size:45.8px;color:#111719">Resumo e próximos passos</div>' +
    '<div class="a dpan"></div><div class="a dbar"></div>' +
    '<div class="a b" style="left:102px;top:202.4px;font-size:10px;color:#147d70">PAINEL DE DECISÃO</div>' +
    '<div class="a" style="left:102px;top:234.4px;font-size:11px;color:#53636b">Dados consolidados para validação comercial e continuidade do projeto.</div>' +
    '<div class="a dlbl" style="left:587px">ÁREA TOTAL</div><div class="a dval" style="left:587px">' + f2(c.area) + ' m²</div>' +
    '<div class="a vline" style="left:770.8px;top:197.9px;height:52.1px;background:#d9e5e8"></div>' +
    '<div class="a dlbl" style="left:802px">' + (c.desc > 0 ? 'INVESTIMENTO (COM DESCONTO)' : 'INVESTIMENTO') + '</div><div class="a dval" style="left:802px">' + brl(c.final) + '</div>' +
    '<div class="a vline" style="left:985.4px;top:197.9px;height:52.1px;background:#d9e5e8"></div>' +
    '<div class="a dlbl" style="left:1016px">PRAZO</div><div class="a dval" style="left:1016px">' + esc(state.prazo) + '</div>' +
    '<div class="a vline" style="left:1200px;top:197.9px;height:52.1px;background:#d9e5e8"></div>' +
    '<div class="a dlbl" style="left:1231px">PAGAMENTO</div><div class="a dval wrap" style="left:1231px;top:225px;width:200px;font-size:10.4px;line-height:12px">' + esc(state.pagResumo) + '</div>' +
    '<div class="a tpan"></div>' +
    '<div class="a b" style="left:102px;top:313.9px;font-size:18.8px;color:#1f2e35">Painel técnico do projeto</div>' +
    '<div class="a" style="left:739.6px;top:304.2px;width:191.7px;height:33.3px;border-radius:5.6px;background:#e2f5f2;display:flex;align-items:center;justify-content:center;font-size:9.4px;font-weight:700;color:#147d70">PRONTO PARA REVISÃO</div>' +
    kcard(87.5, '#079dbb', 'ÁREA', f2(c.area) + ' m²', true) + kcard(303.1, '#55be4b', 'PRAZO', state.prazo, true) +
    kcard(518.8, '#079dbb', 'PAGAMENTO', state.pagResumo, false) + kcard(734.4, '#55be4b', 'EXECUÇÃO', state.execucao, false) +
    '<div class="a icard"></div>' +
    '<div class="a b" style="left:131px;top:486px;font-size:16.3px;color:#26343b">Informações gerais deste orçamento</div>' + li +
    '<div class="a ccard"><img class="bg" src="' + I.cardbg + '"><div class="white"></div>' +
      '<div class="a b c" style="left:0;width:302.7px;top:37.9px;font-size:12.1px;color:#e8fbff">Acesse o contrato padrão</div>' +
      '<div class="a c wrap" style="left:22px;width:258.7px;top:68px;font-size:9.8px;line-height:12px;color:#f4ffff">Use o QR Code para consultar o contrato padrão Nanolux antes da aprovação do projeto.</div></div>' +
    '<img class="a" data-href="' + CONTRATO + '" src="' + I.qr + '" style="left:1102.1px;top:456.3px;width:229.2px;height:229.2px">' +
    '<div class="a wa" data-href="' + esc(wa) + '">Clique para negociar no WhatsApp</div>' +
    '<div class="a fbox" data-href="https://www.sommar.eco.br" style="left:75px">www.sommar.eco.br</div>' +
    '<div class="a vline" style="left:514.6px;top:802.1px;height:22.9px"></div>' +
    '<div class="a fbox" data-href="https://wa.me/' + whats() + '" style="left:537.5px">(81) 3040-3895</div>' +
    '<div class="a vline" style="left:979.2px;top:802.1px;height:22.9px"></div>' +
    '<div class="a fbox" data-href="mailto:contato@sommar.eco.br" style="left:1000px">contato@sommar.eco.br</div>' +
    pnum(i, n) + '</div>';
}


/* ---------- pré-visualização com quebra automática de página ---------- */
var preview;
function escala() { return Math.max(0.1, (preview.clientWidth || 800) / 1500); }
function box(html) { return '<div class="pgbox">' + html + '</div>'; }
function cabem(pgEl, limite) {
  var pr = pgEl.getBoundingClientRect(), s = pr.width / 1500, rows = $$('.tbody .row', pgEl), k = 0;
  for (; k < rows.length; k++) { var r = rows[k].getBoundingClientRect(); if ((r.bottom - pr.top) / s > limite) break; }
  return k;
}
function aplicarEscala() {
  if (!preview) return;
  var s = escala();
  $$('.pgbox', preview).forEach(function (b) { b.style.width = (1500 * s) + 'px'; b.style.height = (844 * s) + 'px'; b.firstChild.style.transform = 'scale(' + s + ')'; });
}
NX.aoRedimensionar = aplicarEscala;
function render() {
  if (!preview || !document.body.contains(preview)) return;
  var c = calc(), resto = c.linhas.slice(), grupos = [], k;
  preview.innerHTML = box(page1(c, resto, 1, 2)); aplicarEscala();
  k = resto.length ? Math.max(1, cabem(preview.querySelector('.pg'), 583)) : 0;
  grupos.push(resto.splice(0, k));
  while (resto.length) {
    preview.innerHTML = box(pageCont(resto, 2, 3)); aplicarEscala();
    k = Math.max(1, cabem(preview.querySelector('.pg'), 790));
    grupos.push(resto.splice(0, k));
  }
  var n = grupos.length + 1, html = box(page1(c, grupos[0], 1, n));
  for (var g = 1; g < grupos.length; g++) html += box(pageCont(grupos[g], g + 1, n));
  html += box(page2(c, n, n));
  preview.innerHTML = html; aplicarEscala();
  $('#pgcount').textContent = n + ' páginas';
  $('#areaCalc').value = f2(c.area) + ' m²';
  $('#totals').innerHTML = c.desc > 0
    ? '<div class="r old"><span>Valor total</span><span>' + brl(c.total) + '</span></div><div class="r"><span>' + esc(c.nomeDesc) + '</span><span>− ' + brl(c.desc) + '</span></div><div class="r big"><span>Valor atualizado</span><span>' + brl(c.final) + '</span></div>'
    : '<div class="r big" style="border:0;padding:0;margin:0"><span>Investimento total</span><span>' + brl(c.total) + '</span></div>';
  c.linhas.forEach(function (l) { var el = document.querySelector('[data-sub="' + l.it.id + '"]'); if (el) el.textContent = brl(l.sub); });
}
var tmr;
function agendar(semCalc) { if (meta) { meta.sujo = true; } clearTimeout(tmr); tmr = setTimeout(function () { salvarLocal(); render(); barra(); }, 130); if (!semCalc) calculadora(); }

/* ---------- página ---------- */
NX.paginas.proposta = function (view) {
  if (!state) carregarLocal();
  view.innerHTML = '<div class="page">' +
    '<div class="page-head"><div><h1>Proposta comercial</h1><div class="sub">Monte o orçamento, simule o pagamento e baixe o PDF.</div></div>' +
      '<div class="actions"><button class="btn ghost" id="pNovo" type="button">Novo orçamento</button>' +
      '<button class="btn ghost" id="pSalvar" type="button"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg> Salvar</button>' +
      '<button class="btn primary" id="pPdf" type="button"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0l-5-5m5 5l5-5M4 19h16"/></svg> Baixar PDF</button></div></div>' +
    '<div class="status-bar" id="pStatus"></div><div id="pAnt"></div>' +
    '<details class="card calc" id="calc" open><summary><span class="n" style="display:inline-grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--grad);color:#fff;font-size:12px">R$</span> Calculadora de m² e comissão <span class="hint" style="font-size:12.5px">simule as formas de pagamento — fica salva com o orçamento</span></summary>' +
      '<div class="calc-grid">' +
        '<div class="cbox"><h3>Formas de pagamento (simulação)</h3><div id="simRows"></div>' +
          '<div class="inline" style="justify-content:space-between;margin-top:6px"><button class="btn add tiny" id="simAdd" type="button">+ forma de pagamento</button><span class="sumline" id="simSum"></span></div>' +
          '<div class="muted" id="simTab" style="font-size:11.5px;margin-top:8px"></div>' +
          '<button class="linkbtn" id="simPag" type="button" style="margin-top:8px">usar esta simulação na “Condição de pagamento” do PDF</button></div>' +
        '<div class="cbox"><h3>m² efetivo</h3><div class="sim-bar" id="simBar" hidden><span>Simulando nas barras — ainda não está no orçamento</span><span class="inline" style="gap:6px"><button class="btn tiny primary" id="simTudo" type="button">Aplicar tudo</button><button class="linkbtn" id="simReset" type="button">descartar</button></span></div>' +
          '<div class="m2big"><div class="v" id="m2v">—</div><div class="r" id="m2r"></div></div><div id="verdict"></div>' +
          '<div class="slider-box" id="slBox"><div class="top"><span>Valor do m² no orçamento</span><b id="slV"></b></div><input type="range" id="sl" min="0" max="1000" step="1" aria-label="Valor do m²"><div class="range-scale"><span id="slMin"></span><span id="slMax"></span></div>' +
          '<div class="minline"><span id="minTxt" class="muted"></span><span class="inline" style="gap:6px"><button class="btn tiny dark" id="slApl" type="button" hidden>Aplicar</button><button class="btn tiny ghost" id="minApl" type="button">Aplicar mínimo</button></span></div></div>' +
          '<div class="slider-box" id="sdBox"><div class="top"><span id="sdLbl">Desconto</span><b id="sdV"></b></div><input type="range" id="sd" min="0" max="100" step="1" aria-label="Desconto"><div class="range-scale"><span id="sdMin"></span><span id="sdMax"></span></div>' +
          '<div class="minline"><span id="maxTxt" class="muted"></span><span class="inline" style="gap:6px"><button class="btn tiny dark" id="sdApl" type="button" hidden>Aplicar</button><button class="btn tiny ghost" id="maxApl" type="button">Aplicar máximo</button></span></div></div></div>' +
        '<div class="cbox"><h3>Resumo financeiro</h3><div id="fin"></div></div>' +
      '</div></details>' +
    '<div class="app-grid"><section class="form" id="form">' +
      '<div class="card"><h2><span class="n">1</span>Dados do orçamento</h2><div class="grid">' +
        '<label class="f">Cliente<input type="text" data-f="cliente" placeholder="Nome do cliente"></label>' +
        '<label class="f">Telefone do cliente<input type="tel" data-f="telefone" placeholder="(81) 90000-0000"></label>' +
        '<label class="f">Projeto<input type="text" data-f="projeto" placeholder="' + esc(T().exProjeto) + '"></label>' +
        '<label class="f">Local<input type="text" data-f="local" placeholder="' + esc(T().exLocal) + '"></label>' +
        '<label class="f full">Link do cliente no Asana <span class="hint">(fica salvo no histórico)</span><input type="url" data-f="asanaUrl" placeholder="https://app.asana.com/…"></label>' +
        '<label class="f full">Nº do orçamento<div class="inline"><input type="text" data-f="numero"><button class="btn ghost small" id="btnNum" type="button" title="Gerar outro número aleatório">🎲 Gerar novo</button></div></label>' +
        '<label class="f">Emissão<input type="date" data-f="emissao"></label>' +
        '<label class="f">Validade <span class="hint">(dias após a emissão)</span><input type="number" min="1" step="1" data-f="validadeDias"></label>' +
      '</div></div>' +
      '<div class="card"><h2><span class="n">2</span>Itens do orçamento</h2><div id="itens"></div><div class="add-row">' +
        '<button class="btn add small" type="button" data-add="nanolux">+ Aplicação Nanolux</button><button class="btn add small" type="button" data-add="protocolo">+ Protocolo técnico</button><button class="btn add small" type="button" data-add="outro">+ Outro item</button></div></div>' +
      '<div class="card"><h2><span class="n">3</span>Resumo e investimento</h2><div class="grid">' +
        '<label class="f">Prazo estimado<input type="text" data-f="prazo" placeholder="Ex.: 1 dia"></label>' +
        '<label class="f">Área total <span class="hint">(automática)</span><input type="text" id="areaCalc" readonly></label></div>' +
        '<div class="disc"><div class="ttl">Desconto <span class="hint" style="font-weight:400">opcional — deixe o valor vazio para não aplicar</span></div><div class="grid">' +
          '<label class="f full">Nome do desconto<input type="text" data-f="descNome" placeholder="' + esc(T().exDesconto) + '"></label>' +
          '<div class="f">Tipo<div class="seg" id="descTipo"><button type="button" data-v="valor">R$</button><button type="button" data-v="pct">%</button></div></div>' +
          '<label class="f">Valor do desconto<input type="text" inputmode="decimal" data-f="descValor" placeholder="0,00"></label></div></div>' +
        '<div class="totals" id="totals"></div></div>' +
      '<details class="card" id="more"><summary>Mais opções <span class="hint" style="font-size:12px;margin-left:auto;margin-right:10px">condições, observações, cabeçalho</span></summary><div class="grid">' +
        '<label class="f">Representante<input type="text" data-f="representante"></label><label class="f">Versão<input type="text" data-f="versao"></label>' +
        '<label class="f full">Versões anteriores<input type="text" data-f="anteriores"></label>' +
        '<label class="f full">Pagamento (resumo)<input type="text" data-f="pagResumo"></label>' +
        '<label class="f full">Pagamento (detalhes)<textarea data-f="pagDetalhe" rows="2"></textarea></label>' +
        '<div class="f full">Turnos autorizados<div class="chips"><label class="chk"><input type="checkbox" data-turno="Manhã"> Manhã</label><label class="chk"><input type="checkbox" data-turno="Tarde"> Tarde</label><label class="chk"><input type="checkbox" data-turno="Noite"> Noite</label></div></div>' +
        '<label class="f full">Modalidade de execução<input type="text" data-f="execucao"></label>' +
        '<label class="f full"><span class="lab-row">Observações do projeto <button class="linkbtn" type="button" data-reset="obs">restaurar padrão</button></span><textarea data-f="obs" rows="5"></textarea></label>' +
        '<label class="f full"><span class="lab-row">Texto de apresentação (quadro cinza) <button class="linkbtn" type="button" data-reset="intro">restaurar padrão</button></span><textarea data-f="intro" rows="6"></textarea></label>' +
      '</div></details>' +
    '</section><section class="preview-col"><div class="prev-head"><span>Pré-visualização</span><span id="pgcount"></span></div><div id="preview"></div></section></div></div>';
  preview = $('#preview');
  ligar(view);
  preencher();
  barra();
  calculadora();
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(render);
  render();
};
if (window.ResizeObserver) new ResizeObserver(function () { aplicarEscala(); }).observe(document.documentElement);
window.addEventListener('resize', aplicarEscala);

/* ---------- cliente repetido e orçamentos anteriores ---------- */
function fonePar(a, b) { var x = NX.digitos(a), y = NX.digitos(b); if (x.length < 8 || y.length < 8) return false; var n = Math.min(9, x.length, y.length); return x.slice(-n) === y.slice(-n); }
function gruposDoCliente() {
  var n = NX.norm((state.cliente || '').trim()), t = state.telefone || '';
  if (!n && NX.digitos(t).length < 8) return [];
  return NX.grupos().filter(function (g) {
    if (meta && meta.grupo && g.id === meta.grupo) return false;
    return g.versoes.some(function (o) { return (n && NX.norm((o.cliente || '').trim()) === n) || fonePar(o.telefone, t); });
  }).sort(function (a, b) { return (b.ultimo || '').localeCompare(a.ultimo || ''); });
}
function linhaAnt(o) {
  return '<div class="ant-row"><span class="nowrap"><b>' + esc(o.numero || '') + '</b><span class="vtag">V' + pad(o.versao || 1) + '</span></span><span class="muted nowrap">' + NX.dataBR(o.emissao) + '</span>' +
    '<span class="nowrap"><b>' + brl(o.valorFinal) + '</b>' + (o.area > 0 ? ' <small class="muted">· ' + f2(o.area) + ' m² · ' + brl(o.valorM2) + '/m²</small>' : '') + '</span>' +
    '<span class="ant-tags">' + NX.statusTag(o) + (o.status === 'faturado' ? '' : NX.situacaoTag(o)) + '</span>' +
    (o.id === (meta && meta.id) ? '<span class="muted" style="font-size:12px">aberto agora</span>' : '<button class="btn tiny ghost" type="button" data-antabrir="' + o.id + '">Abrir</button>') + '</div>';
}
function renderAnteriores() {
  var el = $('#pAnt'); if (!el) return;
  var mesmo = meta && meta.grupo ? (NX.grupos().filter(function (g) { return g.id === meta.grupo; })[0] || { versoes: [] }).versoes.filter(function (o) { return o.id !== meta.id; }) : [];
  var outros = gruposDoCliente(), nOut = outros.reduce(function (s, g) { return s + g.versoes.length; }, 0);
  if (!mesmo.length && !outros.length) { el.innerHTML = ''; return; }
  var tot = outros.concat(mesmo.length ? [{ versoes: mesmo }] : []).reduce(function (s, g) { return s + g.versoes.length; }, 0);
  var fat = outros.filter(function (g) { return g.faturado; }).length;
  el.innerHTML = '<details class="card ant" ' + (el.dataset.fechado ? '' : 'open') + '><summary>Orçamentos anteriores de ' + esc(state.cliente || 'este cliente') + ' <span class="hint" style="font-size:12.5px;margin-left:8px">' + tot + ' registro' + (tot === 1 ? '' : 's') + (fat ? ' · ' + fat + ' faturado' + (fat === 1 ? '' : 's') : '') + '</span></summary>' +
    (mesmo.length ? '<div class="ant-sec">Versões anteriores deste orçamento</div>' + mesmo.map(linhaAnt).join('') : '') +
    (outros.length ? '<div class="ant-sec">Outros orçamentos do mesmo cliente (nome ou telefone)</div>' + outros.map(function (g) { return g.versoes.slice(0, 4).map(linhaAnt).join(''); }).join('') : '') + '</details>';
  var d = $('details', el); d.addEventListener('toggle', function () { el.dataset.fechado = d.open ? '' : '1'; });
  $$('[data-antabrir]', el).forEach(function (b) { b.onclick = function () { P.abrir(b.dataset.antabrir); }; });
}
function perguntarCliente(gs, seguir, cancelar) {
  var decidiu = false;
  NX.modal('<div class="modal-h"><div><h2>Esse cliente já tem orçamento</h2><p>Encontrei ' + (gs.length === 1 ? 'um orçamento' : gs.length + ' orçamentos') + ' com o mesmo nome ou telefone. É um projeto novo ou a atualização de um orçamento antigo?</p></div><button class="btn ghost small" data-fechar>Fechar</button></div>' +
    '<div class="modal-b"><div class="dup-list">' + gs.slice(0, 6).map(function (g) {
      var o = g.atual, n = Math.max.apply(null, g.versoes.map(function (x) { return x.versao || 1; })) + 1;
      return '<div class="dup-item"><div class="t"><b>' + esc(o.cliente || 'Sem nome') + '</b><span>' + esc(o.telefone || 'sem telefone') + (o.local ? ' · ' + esc(o.local) : '') + '</span>' +
        '<span>' + esc(o.numero) + ' V' + pad(o.versao || 1) + ' · ' + NX.dataBR(o.emissao) + ' · <b>' + brl(o.valorFinal) + '</b></span><span class="ant-tags">' + NX.statusTag(o) + (o.status === 'faturado' ? '' : NX.situacaoTag(o)) + '</span></div>' +
        (g.faturado ? '<span class="muted" style="font-size:12px;max-width:150px;text-align:right">Já faturado: crie como projeto novo</span>' : '<button class="btn dark small" type="button" data-dupatual="' + o.id + '">Atualizar este (V' + pad(n) + ')</button>') + '</div>';
    }).join('') + '</div><p class="muted" style="font-size:12.5px;margin:12px 0 0">Atualizar carrega o orçamento antigo como nova versão, com o mesmo número; a versão anterior fica inválida.</p></div>' +
    '<div class="modal-f"><button class="btn ghost" data-fechar>Decidir depois</button><button class="btn primary" id="dupNovo" type="button">É um projeto novo</button></div>',
    function (m, fechar) {
      m.style.maxWidth = '720px';
      $('#dupNovo', m).onclick = function () { decidiu = true; meta.novoProjeto = true; salvarLocal(); fechar(); if (seguir) seguir(); };
      $$('[data-dupatual]', m).forEach(function (b) { b.onclick = function () { decidiu = true; fechar(); P.atualizar(b.dataset.dupatual, true); }; });
      var obs = new MutationObserver(function () { if (!document.body.contains(m)) { obs.disconnect(); if (!decidiu && cancelar) cancelar(); } });
      obs.observe(document.body, { childList: true });
    });
}
function checarCliente() {
  if (!meta || meta.id || meta.atualizaDe || meta.novoProjeto || meta.ro) return;
  var gs = gruposDoCliente(); if (gs.length) perguntarCliente(gs);
}

function barra() {
  var el = $('#pStatus'); if (!el) return;
  var o = meta.id ? reg(meta.id) : null, h = '', ro = !!meta.ro;
  if (meta.atualizaDe) {
    var ant = reg(meta.atualizaDe);
    h = '<span class="tag rascunho">Nova versão V' + pad(meta.versaoN) + '</span><span>Atualizando <b>' + esc(state.numero) + '</b>' + (ant ? ' (V' + pad(ant.versao || 1) + ')' : '') + '. Ao salvar, a versão anterior fica <b>inválida</b>.</span>';
  } else if (o) {
    h = NX.statusTag(o) + NX.situacaoTag(o) + '<span><b>V' + pad(o.versao || 1) + '</b> · salvo em ' + NX.dataBR(String(o.atualizadoEm).slice(0, 10)) + ' ' + String(new Date(o.atualizadoEm).toTimeString()).slice(0, 5) + (NX.eDiretor() && o.vendedor ? ' · ' + esc(o.vendedor) : '') + '</span>';
    if (ro) h += '<span class="muted">' + (o.status === 'faturado' ? 'Faturado: só leitura.' : 'Existe uma versão mais nova: só leitura.') + '</span>';
  } else h = '<span class="tag invalido">Novo</span><span class="muted">Ainda não salvo.</span>';
  if (meta.sujo && !ro) h += '<span class="tag alerta">alterações não salvas</span>';
  h += '<span class="sp"></span>';
  if (o && !meta.atualizaDe && o.status !== 'faturado') h += '<button class="btn tiny ghost" id="sbAtual" type="button">Atualizar (nova versão)</button>';
  if (o && !ro && o.status !== 'faturado') h += '<button class="btn tiny ghost" id="sbFat" type="button">Faturar</button>';
  el.innerHTML = h; el.classList.toggle('ro', ro);
  renderAnteriores();
  var a = $('#sbAtual'); if (a) a.onclick = function () { P.atualizar(o.id); };
  var f = $('#sbFat'); if (f) f.onclick = function () { if (meta.sujo) return NX.toast('Salve as alterações antes de faturar.', true); NX.faturar(o.id); };
  var form = $('#form'); if (form) form.classList.toggle('ro', ro);
  $('#pSalvar').disabled = ro; $$('#calc input, #calc select, #calc button').forEach(function (x) { x.disabled = ro; });
}

function preencher() {
  var form = $('#form');
  $$('[data-f]', form).forEach(function (el) { el.value = state[el.dataset.f] == null ? '' : state[el.dataset.f]; });
  $$('[data-turno]', form).forEach(function (el) { el.checked = (state.turnos || []).indexOf(el.dataset.turno) >= 0; });
  $$('#descTipo button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === state.descTipo); });
  renderItens(); renderSim();
}
function presetOpts(sel) {
  var ps = PRESETS(), ks = Object.keys(ps);
  if (sel && ks.indexOf(sel) < 0) ks.push(sel);
  return ks.map(function (k) { return '<option value="' + esc(k) + '"' + (k === sel ? ' selected' : '') + '>' + esc((ps[k] && ps[k].rotulo) || k) + '</option>'; }).join('');
}
function renderItens() {
  var n = state.itens.length;
  $('#itens').innerHTML = state.itens.map(function (it, i) {
    return '<div class="item" data-i="' + i + '"><div class="item-head"><span class="tagn">Item ' + (i + 1) + '</span><select data-k="preset" title="Tipo de produto">' + presetOpts(it.preset) + '</select>' +
      '<button class="ibtn" type="button" data-act="up" title="Subir"' + (i === 0 ? ' disabled' : '') + '>↑</button><button class="ibtn" type="button" data-act="down" title="Descer"' + (i === n - 1 ? ' disabled' : '') + '>↓</button>' +
      '<button class="ibtn" type="button" data-act="dup" title="Duplicar">⧉</button><button class="ibtn del" type="button" data-act="del" title="Remover">✕</button></div>' +
      '<div class="stack"><div class="grid"><label class="f">Produto / serviço<input type="text" data-k="nome" value="' + esc(it.nome) + '"></label>' +
      '<label class="f">Área / referência<input type="text" data-k="area" value="' + esc(it.area) + '" placeholder="' + esc(T().exArea) + '"></label></div>' +
      '<label class="f"><span class="lab-row">Descrição <button class="linkbtn" type="button" data-act="rdesc">usar texto automático</button></span><textarea data-k="desc" rows="3">' + esc(it.desc) + '</textarea></label>' +
      '<div class="grid3"><label class="f">Quantidade<input type="text" inputmode="decimal" data-k="qtd" value="' + esc(it.qtd) + '"></label>' +
      '<label class="f">Unidade<input type="text" list="unidades" data-k="unidade" value="' + esc(it.unidade) + '"></label>' +
      '<label class="f">Valor unitário (R$)<input type="text" inputmode="decimal" data-k="valor" value="' + esc(it.valor) + '"></label></div>' +
      '<div class="item-foot"><label class="chk"><input type="checkbox" data-k="contaArea"' + (it.contaArea ? ' checked' : '') + '> Somar na área total</label>' +
      '<span class="sub">Subtotal: <b data-sub="' + it.id + '">' + brl(num(it.qtd) * num(it.valor)) + '</b></span></div></div></div>';
  }).join('') || '<p class="sub" style="margin:0 0 12px">Nenhum item. Adicione abaixo.</p>';
}
function formasOpts(sel) { return C.FORMAS.map(function (f) { return '<option' + (f === sel ? ' selected' : '') + '>' + esc(f) + '</option>'; }).join(''); }
function renderSim() {
  if (!state.simulacao || !state.simulacao.length) state.simulacao = [{ forma: 'PIX', pct: '100' }];
  $('#simRows').innerHTML = state.simulacao.map(function (p, i) {
    return '<div class="payrow" data-s="' + i + '"><select data-sk="forma">' + formasOpts(p.forma) + '</select><div class="pct-wrap"><input type="text" inputmode="decimal" data-sk="pct" value="' + esc(p.pct) + '"></div>' +
      '<span class="v" data-sv="' + i + '"></span><button class="ibtn del" type="button" data-sdel="' + i + '" title="Remover"' + (state.simulacao.length < 2 ? ' disabled' : '') + '>✕</button></div>';
  }).join('');
}

/* ---------- calculadora ---------- */
/* sim = valores simulados nas barras (ainda não aplicados ao orçamento) */
var sim = { preco: null, desc: null };
function comSim(over) {
  over = over || {};
  var d = JSON.parse(JSON.stringify(state)), preco = over.preco !== undefined ? over.preco : sim.preco, desc = over.desc !== undefined ? over.desc : sim.desc;
  if (preco != null) d.itens.forEach(function (it) { if (it.contaArea) it.valor = preco; });
  if (desc != null) d.descValor = desc;
  return C.analise(d, S.cfg);
}
function precoMinimo(ref) {
  var lo = 0, hi = 1e6;
  if (comSim({ preco: hi }).m2ef < ref) return null;
  for (var i = 0; i < 60; i++) { var mid = (lo + hi) / 2; if (comSim({ preco: mid }).m2ef >= ref) hi = mid; else lo = mid; }
  return Math.ceil(hi * 100) / 100;
}
function descontoMaximo(ref) {
  var pct = state.descTipo === 'pct', hi = pct ? 100 : comSim({ desc: 0 }).total;
  if (comSim({ desc: 0 }).m2ef < ref) return null;
  if (comSim({ desc: hi }).m2ef >= ref) return hi;
  var lo = 0;
  for (var i = 0; i < 60; i++) { var mid = (lo + hi) / 2; if (comSim({ desc: mid }).m2ef >= ref) lo = mid; else hi = mid; }
  return pct ? Math.floor(lo * 10) / 10 : Math.floor(lo * 100) / 100;
}
function fmtDesc(v) { return state.descTipo === 'pct' ? String(Math.round(v * 10) / 10).replace('.', ',') + '%' : brl(v); }
function calculadora() {
  if (!$('#fin')) return;
  var a = comSim(), temArea = a.area > 0, simulando = sim.preco != null || sim.desc != null;
  a.pagamentos.forEach(function (p, i) { var el = $('[data-sv="' + i + '"]'); if (el) el.innerHTML = brl(p.valor) + (p.taxaPct ? '<br><small>taxa ' + f2(p.taxaPct) + '%</small>' : ''); });
  var soma = state.simulacao.reduce(function (s, p) { return s + num(p.pct); }, 0), sOk = Math.abs(soma - 100) < 0.01;
  var tab = C.tabelaEm(S.cfg, state.emissao), st = $('#simTab');
  if (st) st.textContent = 'Simulação com a tabela de comissão e taxas ' + (tab.desde <= '2000-01-01' ? 'inicial' : 'vigente desde ' + NX.dataBR(tab.desde)) + ' (data de emissão ' + NX.dataBR(state.emissao) + '). No faturamento, valem as datas de cada pagamento.';
  var ss = $('#simSum'); ss.textContent = 'Total: ' + String(Math.round(soma * 100) / 100).replace('.', ',') + '%' + (sOk ? '' : ' (precisa somar 100%)'); ss.classList.toggle('bad', !sOk);
  $('#fin').innerHTML = (simulando ? '<div class="sim-tag">Valores com a simulação das barras</div>' : '') +
    '<div class="kv"><span>Valor final ao cliente</span><b>' + brl(a.final) + '</b></div>' +
    (a.desc > 0 ? '<div class="kv"><span>Desconto</span><b>− ' + brl(a.desc) + '</b></div>' : '') +
    '<div class="kv"><span>Taxas da máquina</span><b>− ' + brl(a.taxas) + '</b></div>' +
    '<div class="kv"><span>Valor líquido SOMMAR</span><b>' + brl(a.liquido) + '</b></div>' +
    '<div class="kv"><span>Custos fixos <small class="muted">(itens fora da área + fixo)</small></span><b>− ' + brl(a.fixos) + '</b></div>' +
    '<div class="kv" style="font-size:14px"><span><b>Sua comissão</b> <small class="muted">(' + f2(a.comissaoPct) + '% do líquido)</small></span><b style="color:#126e64;font-size:16px">' + brl(a.comissao) + '</b></div>';
  $('#m2v').textContent = temArea ? brl(a.m2ef) : '—';
  $('#m2r').innerHTML = temArea ? 'referência<br><b>' + brl(a.ref) + '</b>' : '';
  var v = $('#verdict');
  if (!temArea) v.innerHTML = '<div class="verdict ok" style="background:var(--soft);color:var(--muted)">Adicione um item que some na área total para calcular o m² efetivo.</div>';
  else if (!a.ref) v.innerHTML = '<div class="verdict ok">' + NX.IC.ok + '<span>Sem valor de referência cadastrado para este produto na Diretoria.</span></div>';
  else if (a.precisaAutorizacao) v.innerHTML = '<div class="verdict no">' + NX.IC.alerta + '<span>m² efetivo abaixo da referência: <b>este valor precisa de autorização da Diretoria</b> para ser ofertado ao cliente.</span></div>';
  else v.innerHTML = '<div class="verdict ok">' + NX.IC.ok + '<span>Dentro da referência — pode ofertar sem autorização.</span></div>';
  $('#simBar').hidden = !simulando;
  var areaItens = state.itens.filter(function (it) { return it.contaArea; });
  $('#slBox').hidden = $('#sdBox').hidden = !areaItens.length;
  if (!areaItens.length) return;
  /* barra do m² */
  var aplicado = num(areaItens[0].valor), p = sim.preco != null ? sim.preco : aplicado, min = a.ref ? precoMinimo(a.ref) : null, sl = $('#sl');
  if (sim.preco == null) {
    var lo = Math.max(0, Math.floor(Math.min(p, a.ref || p, min || p) * 0.6 / 5) * 5), hi = Math.ceil(Math.max(p * 1.4, (a.ref || 0) * 1.6, (min || 0) * 1.3, 100) / 5) * 5;
    sl.min = lo; sl.max = hi; sl.value = p; $('#slMin').textContent = brl(lo); $('#slMax').textContent = brl(hi);
  }
  $('#slV').innerHTML = brl(p) + '/m²' + (sim.preco != null && Math.abs(p - aplicado) > 0.004 ? ' <small class="muted" style="font-weight:500">(no orçamento: ' + brl(aplicado) + ')</small>' : '');
  var sa = $('#slApl'); sa.hidden = sim.preco == null || Math.abs(p - aplicado) < 0.005; sa.textContent = 'Aplicar ' + brl(p) + '/m²';
  var mt = $('#minTxt'), mb = $('#minApl');
  if (min != null) { mt.innerHTML = 'Mínimo sem autorização: <b>' + brl(min) + '/m²</b>'; mb.hidden = Math.abs(aplicado - min) < 0.005 && sim.preco == null; mb.dataset.v = min; }
  else { mt.textContent = a.ref ? 'Nem com m² alto sai da autorização: revise o desconto ou a forma de pagamento.' : ''; mb.hidden = true; }
  /* barra do desconto */
  var pct = state.descTipo === 'pct', dAplic = num(state.descValor), dv = sim.desc != null ? sim.desc : dAplic, dmax = a.ref ? descontoMaximo(a.ref) : null, sd = $('#sd');
  if (sim.desc == null) {
    var totalSemDesc = comSim({ desc: 0 }).total, dhi = pct ? Math.min(100, Math.max(30, dv * 1.5, (dmax || 0) * 1.4)) : Math.ceil(Math.max(totalSemDesc * 0.3, dv * 1.5, (dmax || 0) * 1.4, 100) / 10) * 10;
    sd.min = 0; sd.max = Math.round(dhi * 10) / 10; sd.step = pct ? 0.5 : 1; sd.value = dv; $('#sdMin').textContent = pct ? '0%' : brl(0); $('#sdMax').textContent = fmtDesc(+sd.max);
  }
  $('#sdLbl').textContent = 'Desconto' + ((state.descNome || '').trim() ? ' · ' + state.descNome.trim() : '') + (pct ? ' (%)' : ' (R$)');
  $('#sdV').innerHTML = fmtDesc(dv) + (pct && dv > 0 ? ' <small class="muted" style="font-weight:500">= ' + brl(a.desc) + '</small>' : '') + (sim.desc != null && Math.abs(dv - dAplic) > 0.004 ? ' <small class="muted" style="font-weight:500">(no orçamento: ' + fmtDesc(dAplic) + ')</small>' : '');
  var da = $('#sdApl'); da.hidden = sim.desc == null || Math.abs(dv - dAplic) < 0.005; da.textContent = dv > 0 ? 'Aplicar desconto de ' + fmtDesc(dv) : 'Remover desconto';
  var xt = $('#maxTxt'), xb = $('#maxApl');
  if (dmax != null) { xt.innerHTML = 'Desconto máximo sem autorização: <b>' + fmtDesc(dmax) + '</b>'; xb.hidden = Math.abs(dAplic - dmax) < 0.005 && sim.desc == null; xb.dataset.v = dmax; }
  else { xt.textContent = a.ref ? 'Mesmo sem desconto, precisa de autorização: suba o m².' : ''; xb.hidden = true; }
}
function definirPrecoArea(v) {
  state.itens.forEach(function (it, i) {
    if (!it.contaArea) return;
    it.valor = f2(v);
    var inp = $('.item[data-i="' + i + '"] [data-k="valor"]'); if (inp) inp.value = it.valor;
  });
}
function definirDesconto(v) {
  state.descValor = v > 0 ? (state.descTipo === 'pct' ? String(Math.round(v * 10) / 10).replace('.', ',') : f2(v)) : '';
  var inp = $('[data-f="descValor"]'); if (inp) inp.value = state.descValor;
}

/* ---------- eventos ---------- */
function ligar(view) {
  var form = $('#form', view);
  $('#pNovo').onclick = function () { P.novo(); };
  $('#pSalvar').onclick = function () { salvar(false).catch(function () {}); };
  $('#pPdf').onclick = baixarPDF;
  form.addEventListener('input', function (e) {
    sim = { preco: null, desc: null };
    var t = e.target, f = t.dataset.f, k = t.dataset.k;
    if (f) { state[f] = t.value; agendar(); return; }
    if (t.dataset.turno) { state.turnos = $$('[data-turno]', form).filter(function (x) { return x.checked; }).map(function (x) { return x.dataset.turno; }); agendar(); return; }
    if (k) {
      var it = state.itens[+t.closest('.item').dataset.i];
      if (k === 'preset') { var p = PRESETS()[t.value] || {}; it.preset = t.value; it.nome = p.nome || ''; it.desc = p.desc || ''; it.unidade = p.unidade || 'un'; it.valor = f2(num(p.valor)); it.contaArea = !!p.contaArea; renderItens(); }
      else if (k === 'contaArea') it.contaArea = t.checked;
      else it[k] = t.value;
      agendar();
    }
  });
  form.addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset.k === 'qtd' || t.dataset.k === 'valor') { var it = state.itens[+t.closest('.item').dataset.i]; if (String(t.value).trim()) { it[t.dataset.k] = t.value = f2(num(t.value)); agendar(); } }
    if (t.dataset.f === 'cliente' || t.dataset.f === 'telefone') { renderAnteriores(); checarCliente(); }
    if (t.dataset.f === 'descValor' && String(t.value).trim()) { state.descValor = t.value = state.descTipo === 'pct' ? String(num(t.value)).replace('.', ',') : f2(num(t.value)); agendar(); }
  });
  form.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.add) {
      state.itens.push(item(b.dataset.add, { area: state.projeto || '' })); renderItens(); agendar();
      var last = $('#itens .item:last-child'); if (last) { last.scrollIntoView({ behavior: 'smooth', block: 'center' }); var inp = last.querySelector(b.dataset.add === 'nanolux' ? '[data-k="qtd"]' : '[data-k="nome"]'); if (inp) setTimeout(function () { inp.focus(); if (inp.select) inp.select(); }, 250); }
      return;
    }
    if (b.dataset.reset) { state[b.dataset.reset] = T()[b.dataset.reset]; $('[data-f="' + b.dataset.reset + '"]').value = state[b.dataset.reset]; agendar(); return; }
    if (b.parentNode.id === 'descTipo') { sim.desc = null; state.descTipo = b.dataset.v; $$('#descTipo button').forEach(function (x) { x.classList.toggle('on', x === b); }); agendar(); return; }
    if (b.id === 'btnNum') { state.numero = novoNumero(state.emissao); $('[data-f="numero"]').value = state.numero; agendar(); NX.toast('Novo número: ' + state.numero); return; }
    var act = b.dataset.act; if (!act) return;
    var i = +b.closest('.item').dataset.i, arr = state.itens;
    if (act === 'del') arr.splice(i, 1);
    else if (act === 'dup') { var cp = JSON.parse(JSON.stringify(arr[i])); cp.id = uid(); arr.splice(i + 1, 0, cp); }
    else if (act === 'up' && i > 0) arr.splice(i - 1, 0, arr.splice(i, 1)[0]);
    else if (act === 'down' && i < arr.length - 1) arr.splice(i + 1, 0, arr.splice(i, 1)[0]);
    else if (act === 'rdesc') { var p = PRESETS()[arr[i].preset]; if (p && p.desc) arr[i].desc = p.desc; }
    renderItens(); agendar();
  });
  var calcEl = $('#calc', view);
  calcEl.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'sl') { sim.preco = +t.value; calculadora(); return; }
    if (t.id === 'sd') { sim.desc = +t.value; calculadora(); return; }
    var row = t.closest('[data-s]'); if (!row) return;
    var p = state.simulacao[+row.dataset.s]; p[t.dataset.sk] = t.value; agendar();
  });
  calcEl.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.id === 'simAdd') {
      var soma = state.simulacao.reduce(function (s, p) { return s + num(p.pct); }, 0);
      state.simulacao.push({ forma: 'Cartão 3x', pct: String(Math.max(0, Math.round((100 - soma) * 100) / 100)).replace('.', ',') }); renderSim(); agendar();
    } else if (b.dataset.sdel != null) { state.simulacao.splice(+b.dataset.sdel, 1); renderSim(); agendar(); }
    else if (b.id === 'minApl') { definirPrecoArea(+b.dataset.v); sim.preco = null; agendar(); NX.toast('m² mínimo aplicado ao orçamento'); }
    else if (b.id === 'slApl') { definirPrecoArea(sim.preco); sim.preco = null; agendar(); NX.toast('Valor do m² aplicado ao orçamento'); }
    else if (b.id === 'maxApl') { definirDesconto(+b.dataset.v); sim.desc = null; agendar(); NX.toast('Desconto máximo aplicado ao orçamento'); }
    else if (b.id === 'sdApl') { definirDesconto(sim.desc); sim.desc = null; agendar(); NX.toast('Desconto aplicado ao orçamento'); }
    else if (b.id === 'simTudo') { if (sim.preco != null) definirPrecoArea(sim.preco); if (sim.desc != null) definirDesconto(sim.desc); sim = { preco: null, desc: null }; agendar(); NX.toast('Simulação aplicada ao orçamento'); }
    else if (b.id === 'simReset') { sim = { preco: null, desc: null }; calculadora(); }
    else if (b.id === 'simPag') {
      var a = C.analise(state, S.cfg);
      state.pagResumo = a.pagamentos.map(function (p) { return (state.simulacao.length > 1 ? String(p.pct).replace('.', ',') + '% ' : '') + p.forma; }).join(' + ');
      state.pagDetalhe = a.pagamentos.map(function (p) { return p.forma + ': ' + brl(p.valor); }).join(' · ') + '.';
      $('[data-f="pagResumo"]').value = state.pagResumo; $('[data-f="pagDetalhe"]').value = state.pagDetalhe; agendar();
      NX.toast('Condição de pagamento atualizada no PDF');
    }
  });
}

/* ---------- salvar ---------- */
function salvar(pdf) {
  if (!meta.id && !meta.atualizaDe && !meta.novoProjeto && !meta.ro) {
    var gs = gruposDoCliente();
    if (gs.length) return new Promise(function (res, rej) { perguntarCliente(gs, function () { salvarDeFato(pdf).then(res, rej); }, function () { NX.toast('Salvamento cancelado: escolha se é projeto novo ou atualização.', true); rej(new Error('cancelado')); }); });
  }
  return salvarDeFato(pdf);
}
function salvarDeFato(pdf) {
  if (meta.ro) { NX.toast('Este orçamento é só leitura. Use "Atualizar" para criar uma nova versão.', true); return Promise.reject(new Error('ro')); }
  var btn = $('#pSalvar'); if (btn) btn.disabled = true;
  clearTimeout(tmr);
  return NX.api('salvarOrcamento', { id: meta.id || undefined, atualizaDe: meta.atualizaDe || undefined, dados: state, pdf: !!pdf }).then(function (r) {
    var o = r.orcamento;
    meta = { id: o.id, status: o.status, versaoN: o.versao, grupo: o.grupo, vendedor: o.vendedor, ro: false, sujo: false, salvoEm: o.atualizadoEm };
    NX.atualizarLocal(o); salvarLocal(); barra();
    if (!pdf) NX.toast('Salvo no histórico como Rascunho');
    return o;
  }).catch(function (e) { NX.toast('Não foi possível salvar: ' + e.message, true); throw e; })
    .then(function (o) { if (btn) btn.disabled = !!meta.ro; return o; }, function (e) { if (btn) btn.disabled = !!meta.ro; throw e; });
}
P.salvar = salvar;

/* ---------- PDF ---------- */
function nomeArquivo() {
  var cli = (state.cliente || 'Cliente').trim();
  return ('NANOLUX_ORCAMENTO - ' + cli + ' - ' + (state.versao || 'V01') + ' - ' + state.numero).replace(/[\\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ') + '.pdf';
}
/* Desenha cada página no PDF a partir do layout real da pré-visualização:
   textos como texto de verdade (fonte embutida), caixas, gradientes e imagens nas mesmas posições. */
var K = 720 / 1500;
function cor(str){
  var m = /rgba?\(([^)]+)\)/.exec(str || ''); if (!m) return null;
  var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
  return {r:p[0], g:p[1], b:p[2], a:p.length > 3 ? p[3] : 1};
}
function raios(cs, w, h){
  var lim = Math.min(w, h) / 2;
  return [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(function(v){ return Math.min(parseFloat(v) || 0, lim); });
}
function caminho(pdf, r, rr){
  var x = r.x * K, y = r.y * K, w = r.w * K, h = r.h * K, k = 0.5523;
  var tl = rr[0] * K, tr = rr[1] * K, br = rr[2] * K, bl = rr[3] * K;
  pdf.moveTo(x + tl, y);
  pdf.lineTo(x + w - tr, y);
  if (tr) pdf.curveTo(x + w - tr + tr * k, y, x + w, y + tr - tr * k, x + w, y + tr);
  pdf.lineTo(x + w, y + h - br);
  if (br) pdf.curveTo(x + w, y + h - br + br * k, x + w - br + br * k, y + h, x + w - br, y + h);
  pdf.lineTo(x + bl, y + h);
  if (bl) pdf.curveTo(x + bl - bl * k, y + h, x, y + h - bl + bl * k, x, y + h - bl);
  pdf.lineTo(x, y + tl);
  if (tl) pdf.curveTo(x, y + tl - tl * k, x + tl - tl * k, y, x + tl, y);
  pdf.close();
}
function gradienteJPG(css, w, h){
  var cores = (css.match(/rgba?\([^)]+\)/g) || []).map(cor).filter(Boolean);
  if (cores.length < 2) return null;
  var ang = /(-?[\d.]+)deg/.exec(css), deg = ang ? parseFloat(ang[1]) : 180;
  var f = 3, c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(w * f)); c.height = Math.max(2, Math.round(h * f));
  var ctx = c.getContext('2d'), g = (Math.round(deg) % 180 === 90) ? ctx.createLinearGradient(0, 0, c.width, 0) : ctx.createLinearGradient(0, 0, 0, c.height);
  cores.forEach(function(k, i){ g.addColorStop(i / (cores.length - 1), 'rgb(' + k.r + ',' + k.g + ',' + k.b + ')'); });
  ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.95);
}
function desenharPagina(pdf, pg, cache){
  var pr = pg.getBoundingClientRect(), s = pr.width / 1500;
  function R(rc){ return {x:(rc.left - pr.left) / s, y:(rc.top - pr.top) / s, w:rc.width / s, h:rc.height / s}; }
  var range = document.createRange();
  function texto(node, cs){
    var t = node.data; if (!/\S/.test(t)) return;
    var c = cor(cs.color) || {r:0, g:0, b:0}, px = parseFloat(cs.fontSize) || 12;
    pdf.setFont('NX', (parseInt(cs.fontWeight, 10) || 400) >= 600 ? 'bold' : 'normal');
    pdf.setFontSize(px * K); pdf.setTextColor(c.r, c.g, c.b);
    function pinta(str, rc){
      var r = R(rc); if (r.w <= 0) return;
      pdf.text(str, r.x * K, (r.y + r.h * 0.8102) * K);
    }
    var re = /\S+/g, m;
    while ((m = re.exec(t))) {
      range.setStart(node, m.index); range.setEnd(node, m.index + m[0].length);
      var rs = range.getClientRects();
      if (rs.length === 1) pinta(m[0], rs[0]);
      else for (var i = 0; i < m[0].length; i++) {
        range.setStart(node, m.index + i); range.setEnd(node, m.index + i + 1);
        var r1 = range.getClientRects(); if (r1.length) pinta(m[0][i], r1[0]);
      }
    }
  }
  function caixa(el, cs, r){
    if (r.w <= 0 || r.h <= 0) return;
    var rr = raios(cs, r.w, r.h), bg = cor(cs.backgroundColor), gi = cs.backgroundImage || '';
    if (gi.indexOf('linear-gradient') >= 0) {
      var img = gradienteJPG(gi, r.w, r.h);
      if (img) {
        pdf.saveGraphicsState(); caminho(pdf, r, rr); pdf.clip(); pdf.discardPath();
        pdf.addImage(img, 'JPEG', r.x * K, r.y * K, r.w * K, r.h * K, undefined, 'FAST');
        pdf.restoreGraphicsState();
        return;
      }
    }
    if (bg && bg.a > 0.01) {
      var semi = bg.a < 0.999;
      if (semi) { pdf.saveGraphicsState(); pdf.setGState(new pdf.GState({opacity:bg.a})); }
      pdf.setFillColor(bg.r, bg.g, bg.b);
      caminho(pdf, r, rr); pdf.fill();
      if (semi) pdf.restoreGraphicsState();
    }
  }
  function imagem(el, r){
    var src = el.getAttribute('src') || '';
    if (src === I.check) {
      pdf.setDrawColor(12, 169, 138); pdf.setLineWidth(r.w * 0.15 * K); pdf.setLineCap('round'); pdf.setLineJoin('round');
      var p = function(a, b){ return [(r.x + r.w * a / 20) * K, (r.y + r.h * b / 20) * K]; };
      var a = p(4, 10.6), b = p(8.2, 14.6), c = p(16.4, 5.2);
      pdf.moveTo(a[0], a[1]); pdf.lineTo(b[0], b[1]); pdf.lineTo(c[0], c[1]); pdf.stroke();
      return;
    }
    if (!cache[src]) cache[src] = 'img' + Object.keys(cache).length;
    pdf.addImage(src, src.indexOf('image/png') >= 0 ? 'PNG' : 'JPEG', r.x * K, r.y * K, r.w * K, r.h * K, cache[src], 'FAST');
  }
  function percorre(el, raiz){
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    var r = R(el.getBoundingClientRect());
    if (el.tagName === 'IMG') { imagem(el, r); return; }
    if (!raiz) caixa(el, cs, r);
    var corta = !raiz && cs.overflow === 'hidden' && raios(cs, r.w, r.h).some(function(v){ return v > 0; });
    if (corta) { pdf.saveGraphicsState(); caminho(pdf, r, raios(cs, r.w, r.h)); pdf.clip(); pdf.discardPath(); }
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) texto(n, cs);
      else if (n.nodeType === 1) percorre(n, false);
    }
    if (corta) pdf.restoreGraphicsState();
  }
  pdf.setFillColor(255, 255, 255); pdf.rect(0, 0, 720, 405, 'F');
  percorre(pg, true);
  $$('[data-href]', pg).forEach(function(el){
    var r = R(el.getBoundingClientRect());
    pdf.link(r.x * K, r.y * K, r.w * K, r.h * K, {url:el.getAttribute('data-href')});
  });
}
async function baixarPDF() {
  var btn = $('#pPdf'), ov = $('#overlay'), stage = $('#stage');
  if (!window.jspdf || !window.NX_FONT) { alert('A biblioteca de PDF não carregou. Recarregue a página.'); return; }
  btn.disabled = true; ov.classList.add('on'); $('#ovtxt').textContent = 'Gerando PDF…';
  var gerou = false;
  try {
    clearTimeout(tmr); salvarLocal(); render();
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    var pages = $$('#preview .pg');
    var pdf = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'pt', format: [720, 405], compress: true, putOnlyUsedFonts: true });
    pdf.addFileToVFS('NX-Regular.ttf', NX_FONT.r); pdf.addFont('NX-Regular.ttf', 'NX', 'normal');
    pdf.addFileToVFS('NX-Bold.ttf', NX_FONT.b); pdf.addFont('NX-Bold.ttf', 'NX', 'bold');
    var cache = {};
    for (var i = 0; i < pages.length; i++) {
      $('#ovtxt').textContent = 'Gerando PDF… página ' + (i + 1) + ' de ' + pages.length;
      var cl = pages[i].cloneNode(true); cl.style.transform = 'none'; cl.style.position = 'relative';
      stage.innerHTML = ''; stage.appendChild(cl);
      await new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); });
      if (i > 0) pdf.addPage([720, 405], 'landscape');
      desenharPagina(pdf, cl, cache);
    }
    pdf.setProperties({ title: state.numero + ' - Apresentação Nanolux e proposta - ' + (state.cliente || 'Cliente'), subject: 'Proposta comercial Nanolux', author: 'SOMMAR Soluções Sustentáveis LTDA.', creator: 'Sistema Nanolux SOMMAR' });
    if (window.NX_NO_SAVE) window.NX_LAST_PDF = pdf; else pdf.save(nomeArquivo());
    gerou = true;
  } catch (err) {
    console.error(err); alert('Não foi possível gerar o PDF: ' + (err && err.message ? err.message : err));
  } finally {
    stage.innerHTML = ''; ov.classList.remove('on'); btn.disabled = false;
  }
  if (!gerou) return;
  if (meta.ro) { NX.toast('PDF baixado (orçamento só leitura, status não alterado)'); return; }
  $('#ovtxt').textContent = 'Salvando…';
  salvar(true).then(function () { NX.toast('PDF baixado · status: PDF baixado'); }, function () {});
}
P.baixarPDF = baixarPDF;
})();
