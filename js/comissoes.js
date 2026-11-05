/* Sistema Nanolux · SOMMAR — Comissões: faturados, gráficos e previsão de recebimento */
(function () {
'use strict';
var NX = window.NX, C = window.NX_CALC, S = NX.S;
var $ = NX.$, $$ = NX.$$, esc = NX.esc, num = NX.num, f2 = NX.f2, brl = NX.brl, pad = NX.pad;
var F = { q: '', de: '', ate: '', per: 'todos', vend: '' };

function niceMax(v) { if (v <= 0) return 1; var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
function kfmt(v) { return v >= 1000 ? 'R$ ' + (Math.round(v / 100) / 10).toString().replace('.', ',') + ' mil' : 'R$ ' + Math.round(v); }
/* gráfico de barras (uma série): marcas finas, topo arredondado de 4px, grade discreta, dica ao passar o mouse */
function barras(el, dados) {
  if (!dados.length) { el.innerHTML = '<div class="empty" style="padding:30px">Sem comissões no período.</div>'; return; }
  var W = 720, H = 250, ml = 62, mr = 10, mt = 12, mb = 30, iw = W - ml - mr, ih = H - mt - mb;
  var max = niceMax(Math.max.apply(null, dados.map(function (d) { return d.v; }))), band = iw / dados.length, bw = Math.min(46, Math.max(6, band - 2 - band * 0.3));
  var y = function (v) { return mt + ih - v / max * ih; }, svg = '';
  for (var t = 0; t <= 4; t++) { var v = max * t / 4, yy = y(v); svg += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + yy + '" y2="' + yy + '" stroke="#e6eef1" stroke-width="1"/><text x="' + (ml - 8) + '" y="' + (yy + 4) + '" text-anchor="end" font-size="11" fill="#7a8a91">' + kfmt(v) + '</text>'; }
  var cada = Math.ceil(dados.length / 12);
  dados.forEach(function (d, i) {
    var x = ml + band * i + (band - bw) / 2, h = Math.max(0, y(0) - y(d.v)), r = Math.min(4, h, bw / 2), top = y(0) - h;
    if (h > 0) svg += '<path d="M' + x + ',' + y(0) + 'V' + (top + r) + 'Q' + x + ',' + top + ' ' + (x + r) + ',' + top + 'H' + (x + bw - r) + 'Q' + (x + bw) + ',' + top + ' ' + (x + bw) + ',' + (top + r) + 'V' + y(0) + 'Z" fill="' + (d.futuro ? '#8fd0de' : '#078ead') + '" data-b="' + i + '"/>';
    if (i % cada === 0) svg += '<text x="' + (ml + band * i + band / 2) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="11" fill="#7a8a91">' + esc(d.l) + '</text>';
    svg += '<rect x="' + (ml + band * i) + '" y="' + mt + '" width="' + band + '" height="' + ih + '" fill="transparent" data-h="' + i + '"/>';
  });
  svg += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y(0) + '" y2="' + y(0) + '" stroke="#c9d6da" stroke-width="1"/>';
  el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Comissões por mês">' + svg + '</svg><div class="tip"></div>';
  var tip = $('.tip', el), sv = $('svg', el);
  sv.addEventListener('mousemove', function (e) {
    var h = e.target.getAttribute && e.target.getAttribute('data-h'); if (h == null) { tip.classList.remove('on'); return; }
    var d = dados[+h], r = sv.getBoundingClientRect(), s = r.width / W;
    tip.innerHTML = '<b>' + esc(d.t) + '</b><br>' + brl(d.v) + (d.sub ? '<br><span style="opacity:.8">' + esc(d.sub) + '</span>' : '');
    tip.style.left = ((ml + band * (+h) + band / 2) * s) + 'px'; tip.style.top = (y(d.v) * s) + 'px'; tip.classList.add('on');
    $$('path[data-b]', sv).forEach(function (p) { p.setAttribute('opacity', p.getAttribute('data-b') === h ? '1' : '.55'); });
  });
  sv.addEventListener('mouseleave', function () { tip.classList.remove('on'); $$('path[data-b]', sv).forEach(function (p) { p.setAttribute('opacity', '1'); }); });
}

NX.paginas.comissoes = function (view) {
  var dir = NX.eDiretor();
  view.innerHTML = '<div class="page"><div class="page-head"><div><h1>Comissões</h1><div class="sub">' + (dir ? 'Todos os vendedores.' : 'Seus projetos faturados.') + ' A comissão é paga no mês seguinte ao recebimento.</div></div>' +
    '<div class="actions"><button class="btn ghost" id="cRec" type="button">Atualizar dados</button></div></div>' +
    '<div class="card" style="padding:14px 16px;margin-bottom:14px"><div class="filters">' +
      '<label class="f grow">Buscar<input type="search" id="cq" placeholder="Nome, telefone, cidade ou nº" value="' + esc(F.q) + '"></label>' +
      '<label class="f">Faturado de<input type="date" id="cde" value="' + F.de + '"></label><label class="f">até<input type="date" id="cate" value="' + F.ate + '"></label>' +
      (dir ? '<label class="f">Vendedor<select id="cv"><option value="">Todos</option>' + S.users.map(function (u) { return '<option value="' + esc(u.id) + '">' + esc(u.nome) + '</option>'; }).join('') + '</select></label>' : '') +
    '</div><div id="cper">' + NX.presetsPeriodo(F.per) + '</div></div><div id="cBody"></div></div>';
  if ($('#cv')) $('#cv').value = F.vend;
  var upd = function () { F.q = $('#cq').value; F.de = $('#cde').value; F.ate = $('#cate').value; F.vend = $('#cv') ? $('#cv').value : ''; corpo(); };
  $$('.filters input, .filters select', view).forEach(function (el) { el.addEventListener('input', function () { if (el.type === 'date') { F.per = ''; $$('#cper button').forEach(function (b) { b.classList.remove('on'); }); } upd(); }); });
  $('#cper').addEventListener('click', function (e) { var b = e.target.closest('[data-per]'); if (!b) return; F.per = b.dataset.per; var p = NX.periodo(F.per); $('#cde').value = p[0]; $('#cate').value = p[1]; $$('#cper button').forEach(function (x) { x.classList.toggle('on', x === b); }); upd(); });
  $('#cRec').onclick = function () { var b = this; b.disabled = true; NX.recarregar().then(function () { b.disabled = false; corpo(); NX.toast('Dados atualizados'); }).catch(function (e) { b.disabled = false; NX.toast(e.message, true); }); };
  view.addEventListener('click', function (e) { var b = e.target.closest('[data-verfat]'); if (b) NX.verFaturamento(b.dataset.verfat); });
  corpo();
};

function corpo() {
  var dir = NX.eDiretor(), hoje = NX.hoje(), mes = NX.ym(hoje), prox = C.somaMes(mes, 1);
  var doVend = S.fats.filter(function (f) { return !F.vend || f.vendedorId === F.vend; });
  var fats = doVend.filter(function (f) {
    var d = String(f.faturadoEm || '').slice(0, 10);
    return NX.filtroTexto(f, F.q) && (!F.de || d >= F.de) && (!F.ate || d <= F.ate);
  }).sort(function (a, b) { return String(b.faturadoEm).localeCompare(String(a.faturadoEm)); });
  var agTodos = NX.agendaTotal(doVend), ag = NX.agendaTotal(fats);
  var somaMes = function (lista, k, m) { return lista.filter(function (a) { return a[k] === m; }).reduce(function (s, a) { return s + a.valor; }, 0); };
  var aReceberProx = somaMes(agTodos, 'mesComissao', prox), aReceberMes = somaMes(agTodos, 'mesComissao', mes);
  var totCom = fats.reduce(function (s, f) { return s + (f.comissao || 0); }, 0);
  var areaTot = fats.reduce(function (s, f) { return s + (f.area || 0); }, 0);
  var m2med = areaTot > 0 ? fats.reduce(function (s, f) { return s + (f.m2Efetivo || 0) * (f.area || 0); }, 0) / areaTot : 0;
  var areaMed = fats.length ? areaTot / fats.length : 0;
  var tempos = fats.map(function (f) { return NX.dias(String(f.orcCriadoEm || '').slice(0, 10), f.primeiroPagamento); }).filter(function (x) { return x != null && x >= 0; });
  var tmed = tempos.length ? Math.round(tempos.reduce(function (a, b) { return a + b; }, 0) / tempos.length) : null;
  var tile = function (k, v, s, hero) { return '<div class="tile' + (hero ? ' hero' : '') + '"><div class="k">' + k + '</div><div class="v">' + v + '</div>' + (s ? '<div class="s">' + s + '</div>' : '') + '</div>'; };

  /* série mensal por mês de recebimento do pagamento (faturamento) */
  var porMes = {};
  ag.forEach(function (a) { porMes[a.mesRecebimento] = (porMes[a.mesRecebimento] || 0) + a.valor; });
  var meses = Object.keys(porMes).sort(), serie = [];
  if (meses.length) { var m = meses[0], fim = meses[meses.length - 1], guard = 0; while (m <= fim && guard++ < 60) { serie.push({ l: NX.mesNome(m, true), t: NX.mesNome(m), v: Math.round((porMes[m] || 0) * 100) / 100, sub: 'paga em ' + NX.mesNome(C.somaMes(m, 1)), futuro: m > mes }); m = C.somaMes(m, 1); } }
  if (serie.length > 24) serie = serie.slice(-24);

  /* formas de pagamento */
  var formas = {}, totPag = 0;
  fats.forEach(function (f) { (f.pagamentos || []).forEach(function (p) { var k = C.eCartao(p.forma) ? (C.parcelas(p.forma) > 1 ? 'Cartão parcelado' : 'Cartão 1x') : p.forma; formas[k] = formas[k] || { v: 0, n: 0, det: {} }; formas[k].v += p.valor; formas[k].n++; formas[k].det[p.forma] = (formas[k].det[p.forma] || 0) + 1; totPag += p.valor; }); });
  var fl = Object.keys(formas).map(function (k) { return { k: k, v: formas[k].v, n: formas[k].n, det: formas[k].det }; }).sort(function (a, b) { return b.v - a.v; });

  /* previsão: do mês atual em diante */
  var prev = {};
  agTodos.forEach(function (a) { if (a.mesComissao >= mes) { prev[a.mesComissao] = prev[a.mesComissao] || { v: 0, ref: {} }; prev[a.mesComissao].v += a.valor; prev[a.mesComissao].ref[a.mesRecebimento] = 1; } });
  var pk = Object.keys(prev).sort();

  var h = '<div class="tiles">' +
    tile('A receber em ' + NX.mesNome(prox).split(' de ')[0], brl(aReceberProx), aReceberMes > 0 ? brl(aReceberMes) + ' a receber em ' + NX.mesNome(mes).split(' de ')[0] : 'referente a faturamentos de ' + NX.mesNome(mes).split(' de ')[0], true) +
    tile('Comissão no período', brl(totCom), fats.length + ' projeto' + (fats.length === 1 ? '' : 's') + ' faturado' + (fats.length === 1 ? '' : 's')) +
    tile('Média do m² real', areaTot > 0 ? brl(m2med) : '—', 'm² efetivo, ponderado pela área') +
    tile('Área média', fats.length ? f2(areaMed) + ' m²' : '—', 'dos projetos fechados') +
    tile('Tempo médio', tmed == null ? '—' : tmed + (tmed === 1 ? ' dia' : ' dias'), 'do orçamento ao 1º pagamento') +
  '</div>' +
  '<div class="chart-grid"><div class="card"><h2>Comissões por mês de faturamento</h2><div class="muted" style="font-size:12.5px;margin:-8px 0 10px">Mês em que o pagamento foi recebido. Barras claras: meses futuros (parcelas e pagamentos agendados).</div><div class="chart" id="cChart"></div></div>' +
  '<div class="card"><h2>Formas de pagamento adotadas</h2><div class="muted" style="font-size:12.5px;margin:-8px 0 10px">Participação no valor faturado.</div>' +
    (fl.length ? fl.map(function (x) {
      var p = totPag ? x.v / totPag * 100 : 0, det = Object.keys(x.det).length > 1 || x.k === 'Cartão parcelado' ? Object.keys(x.det).map(function (k) { return k.replace('Cartão ', '') + ' (' + x.det[k] + ')'; }).join(', ') : '';
      return '<div class="hbar" title="' + esc(x.k + ': ' + brl(x.v) + ' em ' + x.n + ' pagamento(s)' + (det ? ' · ' + det : '')) + '"><span>' + esc(x.k) + (det ? '<br><small class="muted">' + esc(det) + '</small>' : '') + '</span><div class="track"><div class="fill" style="width:' + Math.max(1, p).toFixed(1) + '%"></div></div><span class="val">' + String(Math.round(p * 10) / 10).replace('.', ',') + '% <small>· ' + x.n + '</small></span></div>';
    }).join('') : '<div class="empty" style="padding:30px">Sem pagamentos no período.</div>') + '</div></div>' +
  '<div class="chart-grid"><div class="card"><h2>Previsão de recebimento da comissão</h2>' +
    (pk.length ? '<div class="prev-list">' + pk.map(function (k) {
      return '<div class="prev-item' + (k === prox ? ' next' : '') + '"><div><b>' + brl(prev[k].v) + '</b><br><span>comissão a ser recebida em <b>' + NX.mesNome(k) + '</b></span></div><span>referente a faturamentos de ' + Object.keys(prev[k].ref).sort().map(function (r) { return NX.mesNome(r, true); }).join(', ') + '</span></div>';
    }).join('') + '</div>' : '<p class="muted" style="margin:0">Nenhuma comissão prevista a partir deste mês.</p>') +
    '<p class="muted" style="font-size:12px;margin:10px 0 0">Cartão parcelado: ' + (S.cfg.modoParcelado === 'parcelas' ? 'comissão dividida pelos meses das parcelas' : 'comissão integral no mês seguinte à 1ª parcela') + ' (definido pela Diretoria).</p></div>';
  if (dir) {
    var porV = {};
    doVend.forEach(function (f) { var k = f.vendedorId; porV[k] = porV[k] || { nome: f.vendedor || NX.nomeUsuario(k), n: 0, com: 0, prox: 0 }; });
    fats.forEach(function (f) { var v = porV[f.vendedorId]; v.n++; v.com += f.comissao || 0; });
    agTodos.forEach(function (a) { if (a.mesComissao === prox) porV[a.fat.vendedorId].prox += a.valor; });
    var vs = Object.keys(porV).map(function (k) { return porV[k]; }).sort(function (a, b) { return b.com - a.com; });
    h += '<div class="card"><h2>Por vendedor</h2>' + (vs.length ? '<table class="t"><thead><tr><th>Vendedor</th><th class="right">Projetos</th><th class="right">Comissão no período</th><th class="right">A receber em ' + esc(NX.mesNome(prox, true)) + '</th></tr></thead><tbody>' +
      vs.map(function (v) { return '<tr><td><b>' + esc(v.nome) + '</b></td><td class="right">' + v.n + '</td><td class="right">' + brl(v.com) + '</td><td class="right"><b>' + brl(v.prox) + '</b></td></tr>'; }).join('') + '</tbody></table>' : '<p class="muted">Sem faturamentos.</p>') + '</div>';
  } else h += '<div></div>';
  h += '</div>';
  h += '<div class="card" style="padding:0;overflow:hidden"><div style="padding:16px 18px 8px"><h2 style="margin:0">Projetos faturados</h2></div>' +
    (fats.length ? '<div class="tbl-wrap" style="border:0;border-radius:0"><table class="t"><thead><tr><th>Faturado em</th><th>Cliente</th><th>Local</th>' + (dir ? '<th>Vendedor</th>' : '') + '<th class="right">Valor final</th><th>Pagamentos</th><th class="right">Líquido</th><th class="right">m² efetivo</th><th class="right">Comissão</th><th></th></tr></thead><tbody>' +
      fats.map(function (f) {
        return '<tr><td class="nowrap">' + NX.dataBR(String(f.faturadoEm).slice(0, 10)) + '<div class="muted" style="font-size:12px">1º pgto ' + NX.dataBR(f.primeiroPagamento) + '</div></td>' +
          '<td><div class="cli"><b>' + esc(f.cliente || '') + '</b><span>' + esc(f.telefone || '') + '</span></div></td><td>' + esc(f.local || '—') + '</td>' + (dir ? '<td>' + esc(f.vendedor || '') + '</td>' : '') +
          '<td class="right nowrap"><b>' + brl(f.valorFinal) + '</b>' + (f.desconto > 0 ? '<div class="muted" style="font-size:12px">' + esc(f.nomeDesconto) + ' −' + brl(f.desconto) + '</div>' : '') + '</td>' +
          '<td><div class="stk">' + (f.pagamentos || []).map(function (p) { return '<span class="nowrap">' + esc(p.forma) + ' · ' + brl(p.valor) + '</span>'; }).join('') + '</div></td>' +
          '<td class="right nowrap">' + brl(f.liquido) + '</td><td class="right nowrap">' + (f.area > 0 ? brl(f.m2Efetivo) : '—') + '</td>' +
          '<td class="right nowrap"><b style="color:#126e64">' + brl(f.comissao) + '</b><div class="muted" style="font-size:12px">' + f2(f.comissaoPct) + '%</div></td>' +
          '<td><button class="btn tiny ghost" data-verfat="' + f.id + '">Ver</button></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty">Nenhum projeto faturado' + (S.fats.length ? ' com esses filtros.' : ' ainda. Fature pelo Histórico de orçamentos.') + '</div>') + '</div>';
  $('#cBody').innerHTML = h;
  barras($('#cChart'), serie);
}
})();
