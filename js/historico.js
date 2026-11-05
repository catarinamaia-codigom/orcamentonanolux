/* Sistema Nanolux · SOMMAR — Histórico de orçamentos e faturamento */
(function () {
'use strict';
var NX = window.NX, C = window.NX_CALC, S = NX.S;
var $ = NX.$, $$ = NX.$$, esc = NX.esc, num = NX.num, f2 = NX.f2, brl = NX.brl, pad = NX.pad;
var CORES = [['#079dbb', '#f4fbfd'], ['#55be4b', '#f6fbf4'], ['#7a5fd0', '#f8f6fd'], ['#e08a1e', '#fffaf2'], ['#d2457a', '#fdf5f8'], ['#2f7fd6', '#f4f8fe']];

/* filtros compartilhados (busca + período) */
NX.filtroTexto = function (o, q) {
  if (!q) return true;
  var n = NX.norm(q), d = NX.digitos(q);
  var alvo = NX.norm([o.cliente, o.local, o.projeto, o.numero, o.vendedor].join(' '));
  return alvo.indexOf(n) >= 0 || (d.length >= 3 && NX.digitos(o.telefone).indexOf(d) >= 0);
};
NX.presetsPeriodo = function (sel) {
  var ps = [['todos', 'Tudo'], ['7', '7 dias'], ['30', '30 dias'], ['mes', 'Este mês'], ['mesant', 'Mês passado'], ['ano', 'Este ano']];
  return '<div class="presets">' + ps.map(function (p) { return '<button type="button" data-per="' + p[0] + '"' + (p[0] === sel ? ' class="on"' : '') + '>' + p[1] + '</button>'; }).join('') + '</div>';
};
NX.periodo = function (k) {
  var h = NX.hoje(), ym = NX.ym(h);
  if (k === '7') return [NX.somaDias(h, -7), h];
  if (k === '30') return [NX.somaDias(h, -30), h];
  if (k === 'mes') return [ym + '-01', h];
  if (k === 'mesant') { var a = C.somaMes(ym, -1); return [a + '-01', NX.somaDias(ym + '-01', -1)]; }
  if (k === 'ano') return [h.slice(0, 4) + '-01-01', h];
  return ['', ''];
};

var F = { q: '', de: '', ate: '', per: 'todos', status: '', sit: '', vend: '' };
NX.paginas.historico = function (view) {
  view.innerHTML = '<div class="page"><div class="page-head"><div><h1>Histórico de orçamentos</h1><div class="sub">Versões do mesmo cliente ficam agrupadas no mesmo bloco de cor.</div></div>' +
    '<div class="actions"><button class="btn ghost" id="hRec" type="button">Atualizar lista</button><button class="btn primary" id="hNovo" type="button">+ Novo orçamento</button></div></div>' +
    '<div class="card" style="padding:14px 16px;margin-bottom:14px"><div class="filters">' +
      '<label class="f grow">Buscar<input type="search" id="fq" placeholder="Nome, telefone, cidade ou nº do orçamento" value="' + esc(F.q) + '"></label>' +
      '<label class="f">Emissão de<input type="date" id="fde" value="' + F.de + '"></label><label class="f">até<input type="date" id="fate" value="' + F.ate + '"></label>' +
      '<label class="f">Status<select id="fst"><option value="">Todos</option><option value="rascunho">Rascunho</option><option value="pdf">PDF baixado</option><option value="faturado">Faturado</option></select></label>' +
      '<label class="f">Validade<select id="fsit"><option value="">Todas</option><option value="valido">Válidos</option><option value="vencido">Vencidos</option><option value="invalido">Inválidos (atualizados)</option><option value="faturado">Faturados</option></select></label>' +
      (NX.eDiretor() ? '<label class="f">Vendedor<select id="fv"><option value="">Todos</option>' + S.users.map(function (u) { return '<option value="' + esc(u.id) + '">' + esc(u.nome) + '</option>'; }).join('') + '</select></label>' : '') +
    '</div><div id="fper">' + NX.presetsPeriodo(F.per) + '</div></div>' +
    '<p class="count" id="hCount"></p><div class="tbl-wrap" id="hTbl"></div></div>';
  $('#fst').value = F.status; $('#fsit').value = F.sit; if ($('#fv')) $('#fv').value = F.vend;
  var upd = function () { F.q = $('#fq').value; F.de = $('#fde').value; F.ate = $('#fate').value; F.status = $('#fst').value; F.sit = $('#fsit').value; F.vend = $('#fv') ? $('#fv').value : ''; tabela(); };
  $$('.filters input, .filters select', view).forEach(function (el) { el.addEventListener('input', function () { if (el.type === 'date') { F.per = ''; $$('#fper button').forEach(function (b) { b.classList.remove('on'); }); } upd(); }); });
  $('#fper').addEventListener('click', function (e) {
    var b = e.target.closest('[data-per]'); if (!b) return;
    F.per = b.dataset.per; var p = NX.periodo(F.per); $('#fde').value = p[0]; $('#fate').value = p[1];
    $$('#fper button').forEach(function (x) { x.classList.toggle('on', x === b); }); upd();
  });
  $('#hNovo').onclick = function () { NX.proposta.novo(); };
  $('#hRec').onclick = function () { var b = this; b.disabled = true; NX.recarregar().then(function () { b.disabled = false; tabela(); NX.toast('Lista atualizada'); }).catch(function (e) { b.disabled = false; NX.toast(e.message, true); }); };
  $('#hTbl').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-a]'); if (!b) return;
    var id = b.dataset.id;
    if (b.dataset.a === 'abrir') NX.proposta.abrir(id);
    else if (b.dataset.a === 'atualizar') NX.proposta.atualizar(id);
    else if (b.dataset.a === 'faturar') NX.faturar(id);
    else if (b.dataset.a === 'verfat') NX.verFaturamento(b.dataset.fat);
  });
  tabela();
};

function linhaSim(o) {
  var sim = (o.simulacao || []).filter(function (p) { return num(p.pct) > 0; });
  if (!sim.length) return '<span class="muted">—</span>';
  return '<div class="stk">' + sim.map(function (p) { return '<span>' + esc(String(p.pct).replace('.', ',')) + '% ' + esc(p.forma) + '</span>'; }).join('') +
    '<small>comissão ≈ ' + brl(o.comissaoSimulada) + '</small></div>';
}
function tabela() {
  var gs = NX.grupos(), dir = NX.eDiretor();
  var passa = function (o) {
    if (!NX.filtroTexto(o, F.q)) return false;
    if (F.de && (o.emissao || '') < F.de) return false;
    if (F.ate && (o.emissao || '') > F.ate) return false;
    if (F.status && o.status !== F.status) return false;
    if (F.sit && NX.situacao(o).k !== F.sit) return false;
    if (F.vend && o.vendedorId !== F.vend) return false;
    return true;
  };
  gs = gs.filter(function (g) { return g.versoes.some(passa); }).sort(function (a, b) { return (b.ultimo || '').localeCompare(a.ultimo || ''); });
  var nOrc = gs.reduce(function (s, g) { return s + g.versoes.length; }, 0);
  $('#hCount').textContent = gs.length + ' cliente' + (gs.length === 1 ? '' : 's') + ' / orçamento' + (gs.length === 1 ? '' : 's') + ' · ' + nOrc + ' vers' + (nOrc === 1 ? 'ão' : 'ões');
  if (!gs.length) { $('#hTbl').innerHTML = '<div class="empty">' + (S.orcs.length ? 'Nada encontrado com esses filtros.' : 'Nenhum orçamento salvo ainda. Monte uma proposta e clique em <b>Salvar</b>.') + '</div>'; return; }
  var head = '<thead><tr><th>Cliente</th><th>Orçamento</th><th>Situação</th><th>Desconto</th><th class="right">Valores</th><th>Simulação</th><th>Ações</th></tr></thead>';
  var corpo = gs.map(function (g, gi) {
    var cor = CORES[gi % CORES.length];
    return '<tbody class="grp" style="--gc:' + cor[0] + ';--gb:' + cor[1] + '">' + g.versoes.map(function (o) {
      var sit = NX.situacao(o), velho = sit.k === 'invalido', fat = S.fats.filter(function (f) { return f.orcamentoId === o.id; })[0];
      var asana = NX.url(o.asanaUrl);
      var acts = (asana ? '<a class="ico-link" href="' + esc(asana) + '" target="_blank" rel="noopener" title="Abrir cliente no Asana">' + NX.IC.link + '</a>' : '') +
        '<button class="btn tiny ghost" data-a="abrir" data-id="' + o.id + '">Abrir</button>';
      if (!g.faturado && o === g.atual) acts += '<button class="btn tiny ghost" data-a="atualizar" data-id="' + o.id + '">Atualizar</button><button class="btn tiny dark" data-a="faturar" data-id="' + o.id + '">Faturar</button>';
      if (fat) acts += '<button class="btn tiny ghost" data-a="verfat" data-fat="' + fat.id + '" data-id="' + o.id + '">Ver faturamento</button>';
      var loc = [o.local, o.projeto].filter(Boolean).map(esc).join(' · ');
      return '<tr class="' + (velho ? 'old' : '') + '">' +
        '<td style="min-width:170px"><div class="cli"><b>' + esc(o.cliente || 'Sem nome') + '</b><span class="nowrap">' + esc(o.telefone || 'sem telefone') + '</span>' + (loc ? '<span style="display:block">' + loc + '</span>' : '') + '</div></td>' +
        '<td><div class="stk"><span class="nowrap">' + esc(o.numero || '') + '<span class="vtag">V' + pad(o.versao || 1) + '</span></span><small class="nowrap">emissão ' + NX.dataBR(o.emissao) + '</small>' + (dir && o.vendedor ? '<small>' + esc(o.vendedor) + '</small>' : '') + '</div></td>' +
        '<td><div class="stk" style="gap:4px;align-items:flex-start">' + NX.statusTag(o) + (o.status === 'faturado' ? '' : NX.situacaoTag(o)) + '<small class="nowrap">validade ' + NX.dataBR(o.validade) + '</small></div></td>' +
        '<td>' + (o.desconto > 0 ? '<div class="stk"><span>' + esc(o.nomeDesconto || 'Desconto') + '</span><b class="nowrap">− ' + brl(o.desconto) + '</b></div>' : '<span class="muted">Sem desconto</span>') + '</td>' +
        '<td class="right"><div class="stk"><b class="nowrap">' + brl(o.valorFinal) + '</b>' + (o.area > 0 ? '<small class="nowrap">' + brl(o.valorM2) + '/m² · ' + f2(o.area) + ' m²</small><small class="nowrap">efetivo ' + brl(o.m2Efetivo) + '/m²</small>' + (o.precisaAutorizacao ? '<small style="color:#9a4b00;font-weight:700">precisa de autorização</small>' : '') : '') + '</div></td>' +
        '<td>' + linhaSim(o) + '</td>' +
        '<td><div class="acts">' + acts + '</div></td></tr>';
    }).join('') + '</tbody>';
  }).join('');
  $('#hTbl').innerHTML = '<table class="t">' + head + corpo + '</table>';
}

/* ---------- faturamento ---------- */
function formasOpts(sel) { return C.FORMAS.map(function (f) { return '<option' + (f === sel ? ' selected' : '') + '>' + esc(f) + '</option>'; }).join(''); }
var LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function textoWhats(o, pags) {
  var itens = [['Nome', o.cliente || ''], ['Telefone', o.telefone || ''], ['Valor total', brl(o.valorFinal)]];
  pags.forEach(function (p, i) {
    var L = LETRAS[i] || String(i + 1);
    itens.push(['Valor de pagamento ' + L, brl(num(p.valor))], ['Forma de pagamento ' + L, p.forma], ['Validade final ' + L, NX.dataBR(p.data)]);
  });
  return itens;
}
NX.faturar = function (id) {
  var o = S.orcs.filter(function (x) { return x.id === id; })[0];
  if (!o) return NX.toast('Orçamento não encontrado', true);
  if (o.status === 'faturado') return NX.toast('Este orçamento já foi faturado.', true);
  if (o.substituidoPor) return NX.toast('Existe uma versão mais nova deste orçamento. Fature a versão atual.', true);
  var a0 = C.analise(o.dados, S.cfg), h = NX.hoje();
  var pags = a0.pagamentos.map(function (p) { return { forma: p.forma, valor: f2(p.valor), data: h }; });
  var vencido = o.validade && o.validade < h;
  NX.modal('<div class="modal-h"><div><h2>Faturar projeto</h2><p>' + esc(o.cliente || 'Sem nome') + (o.telefone ? ' · ' + esc(o.telefone) : '') + ' · ' + esc(o.numero) + ' V' + pad(o.versao || 1) + '</p></div><button class="btn ghost small" data-fechar>Fechar</button></div>' +
    '<div class="modal-b"><div class="fat-grid"><div>' +
      (vencido ? '<div class="verdict no" style="margin-bottom:12px">' + NX.IC.alerta + '<span>A validade deste orçamento venceu em ' + NX.dataBR(o.validade) + '. Confira se as condições ainda valem antes de faturar.</span></div>' : '') +
      '<div class="cbox"><h3>Formas de pagamento <span style="color:var(--danger)">*</span></h3><div class="muted" style="font-size:12px;margin:-4px 0 8px">Obrigatório. A soma precisa ser igual ao valor final de <b>' + brl(o.valorFinal) + '</b>. Data = vencimento/recebimento de cada pagamento (no cartão, a 1ª parcela).</div>' +
        '<div class="payrow fat" style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase"><span>Forma</span><span>Valor (R$)</span><span>Data</span><span></span></div>' +
        '<div id="fRows"></div><div class="inline" style="justify-content:space-between;margin-top:6px"><button class="btn add tiny" id="fAdd" type="button">+ forma de pagamento</button><span class="sumline" id="fSum"></span></div></div>' +
      '<div class="cbox" style="margin-top:12px"><h3>Comissão e m² efetivo</h3><div id="fFin"></div></div>' +
      '<label class="f" style="margin-top:12px">Observações do faturamento <span class="hint">(opcional)</span><textarea id="fObs" rows="2"></textarea></label>' +
    '</div><div><div class="wa-box"><div class="hd"><b>Para facilitar colocar no Grupo de Pagamentos</b>, copie e cole cada item separadamente e sem assinatura do WhatsApp:</div><div class="copy-list" id="fWa"></div>' +
      '<button class="btn tiny ghost" id="fWaAll" type="button" style="margin-top:10px">Copiar tudo de uma vez</button></div>' +
      '<div class="cbox" style="margin-top:12px"><h3>PDF de faturamento</h3><p class="muted" style="margin:0;font-size:12.5px">O modelo do PDF de faturamento será adicionado em breve.</p></div></div></div></div>' +
    '<div class="modal-f"><span class="err" id="fErr" style="margin-right:auto;align-self:center"></span><button class="btn ghost" data-fechar>Cancelar</button><button class="btn primary" id="fOk">Confirmar faturamento</button></div>',
    function (m, fechar) {
      function rows() {
        $('#fRows', m).innerHTML = pags.map(function (p, i) {
          return '<div class="payrow fat" data-p="' + i + '"><select data-pk="forma">' + formasOpts(p.forma) + '</select><input type="text" inputmode="decimal" data-pk="valor" value="' + esc(p.valor) + '"><input type="date" data-pk="data" value="' + esc(p.data) + '">' +
            '<button class="ibtn del" type="button" data-pdel="' + i + '"' + (pags.length < 2 ? ' disabled' : '') + ' title="Remover">✕</button></div>';
        }).join('');
      }
      function atualizar() {
        var a = C.analise(o.dados, S.cfg, pags.map(function (p) { return { forma: p.forma, valor: num(p.valor), data: p.data }; }));
        var dif = Math.round((a.final - a.somaPag) * 100) / 100, ok = Math.abs(dif) < 0.01;
        var s = $('#fSum', m); s.textContent = 'Soma: ' + brl(a.somaPag) + (ok ? ' ✓' : dif > 0 ? ' · faltam ' + brl(dif) : ' · passou ' + brl(-dif)); s.classList.toggle('bad', !ok);
        var ag = C.agenda(a.pagamentos, S.cfg), porMes = {};
        ag.forEach(function (x) { porMes[x.mesComissao] = (porMes[x.mesComissao] || 0) + x.valor; });
        $('#fFin', m).innerHTML =
          '<div class="kv"><span>Taxas da máquina</span><b>− ' + brl(a.taxas) + '</b></div><div class="kv"><span>Valor líquido SOMMAR</span><b>' + brl(a.liquido) + '</b></div>' +
          '<div class="kv"><span>m² efetivo <small class="muted">(ref. ' + brl(a.ref) + ')</small></span><b>' + (a.area > 0 ? brl(a.m2ef) : '—') + '</b></div>' +
          (a.precisaAutorizacao ? '<div class="verdict no" style="margin:6px 0">' + NX.IC.alerta + '<span>m² efetivo abaixo da referência — confirme a autorização da Diretoria.</span></div>' : '') +
          '<div class="kv" style="font-size:14px"><span><b>Comissão</b> <small class="muted">(' + f2(a.comissaoPct) + '% do líquido)</small></span><b style="color:#126e64;font-size:16px">' + brl(a.comissao) + '</b></div>' +
          (Object.keys(porMes).length ? '<div class="muted" style="font-size:12px;margin-top:6px">Recebimento da comissão: ' + Object.keys(porMes).sort().map(function (k) { return '<b>' + brl(porMes[k]) + '</b> em ' + NX.mesNome(k, true); }).join(' · ') + '</div>' : '');
        var itens = textoWhats(o, pags);
        $('#fWa', m).innerHTML = itens.map(function (it, i) { return '<div class="copy-row"><div class="t"><small>' + esc(it[0]) + '</small><span>' + esc(it[1] || '—') + '</span></div><button type="button" data-cp="' + i + '">Copiar</button></div>'; }).join('');
        $('#fWa', m)._itens = itens;
        $('#fOk', m).disabled = !ok || pags.some(function (p) { return !p.data || num(p.valor) <= 0; });
      }
      rows(); atualizar();
      m.addEventListener('input', function (e) { var r = e.target.closest('[data-p]'); if (!r) return; pags[+r.dataset.p][e.target.dataset.pk] = e.target.value; atualizar(); });
      m.addEventListener('change', function (e) { if (e.target.dataset.pk === 'valor' && String(e.target.value).trim()) { var i = +e.target.closest('[data-p]').dataset.p; pags[i].valor = e.target.value = f2(num(e.target.value)); atualizar(); } });
      m.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        if (b.id === 'fAdd') { var soma = pags.reduce(function (s, p) { return s + num(p.valor); }, 0); pags.push({ forma: 'PIX', valor: f2(Math.max(0, o.valorFinal - soma)), data: NX.somaDias(h, 30) }); rows(); atualizar(); }
        else if (b.dataset.pdel != null) { pags.splice(+b.dataset.pdel, 1); rows(); atualizar(); }
        else if (b.dataset.cp != null) NX.copiar(String($('#fWa', m)._itens[+b.dataset.cp][1] || ''), b);
        else if (b.id === 'fWaAll') NX.copiar($('#fWa', m)._itens.map(function (it) { return it[1]; }).join('\n'), b);
        else if (b.id === 'fOk') {
          b.disabled = true; $('#fErr', m).textContent = '';
          NX.api('faturar', { id: o.id, pagamentos: pags.map(function (p) { return { forma: p.forma, valor: num(p.valor), data: p.data }; }), obs: $('#fObs', m).value })
            .then(function (r) {
              NX.atualizarLocal(r.orcamento); S.fats.push(r.faturamento);
              fechar(); NX.toast('Projeto faturado! Comissão de ' + brl(r.faturamento.comissao));
              if (NX.rotaAtual() === 'historico') NX.paginas.historico($('#view'));
              else if (NX.rotaAtual() === 'proposta' && NX.proposta.meta().id === o.id) NX.proposta.abrir(o.id);
              NX.verFaturamento(r.faturamento.id);
            })
            .catch(function (err) { b.disabled = false; $('#fErr', m).textContent = err.message; });
        }
      });
    });
};
NX.verFaturamento = function (fid) {
  var f = S.fats.filter(function (x) { return x.id === fid; })[0]; if (!f) return;
  var itens = textoWhats(f, f.pagamentos || []), porMes = {};
  (f.agenda || []).forEach(function (x) { porMes[x.mesComissao] = (porMes[x.mesComissao] || 0) + x.valor; });
  NX.modal('<div class="modal-h"><div><h2>Faturamento · ' + esc(f.cliente || '') + '</h2><p>' + esc(f.numero || '') + ' V' + pad(f.versao || 1) + ' · faturado em ' + NX.dataBR(String(f.faturadoEm).slice(0, 10)) + (f.faturadoPor ? ' por ' + esc(f.faturadoPor) : '') + '</p></div><button class="btn ghost small" data-fechar>Fechar</button></div>' +
    '<div class="modal-b"><div class="fat-grid"><div><div class="cbox"><h3>Pagamentos</h3>' + (f.pagamentos || []).map(function (p, i) {
      return '<div class="kv"><span><b>' + (LETRAS[i] || i + 1) + '.</b> ' + esc(p.forma) + ' · ' + NX.dataBR(p.data) + '</span><b>' + brl(p.valor) + '</b></div>';
    }).join('') + '</div><div class="cbox" style="margin-top:12px"><h3>Comissão</h3>' +
      '<div class="kv"><span>Valor final</span><b>' + brl(f.valorFinal) + '</b></div><div class="kv"><span>Taxas da máquina</span><b>− ' + brl(f.taxas) + '</b></div>' +
      '<div class="kv"><span>Valor líquido</span><b>' + brl(f.liquido) + '</b></div><div class="kv"><span>m² efetivo</span><b>' + (f.area > 0 ? brl(f.m2Efetivo) : '—') + '</b></div>' +
      '<div class="kv"><span><b>Comissão</b> (' + f2(f.comissaoPct) + '%)</span><b style="color:#126e64">' + brl(f.comissao) + '</b></div>' +
      '<div class="muted" style="font-size:12px;margin-top:6px">Recebimento: ' + Object.keys(porMes).sort().map(function (k) { return '<b>' + brl(porMes[k]) + '</b> em ' + NX.mesNome(k, true); }).join(' · ') + '</div></div>' +
      (f.obs ? '<p class="muted" style="font-size:13px">Obs.: ' + esc(f.obs) + '</p>' : '') +
    '</div><div><div class="wa-box"><div class="hd"><b>Para facilitar colocar no Grupo de Pagamentos</b>, copie e cole cada item separadamente e sem assinatura do WhatsApp:</div><div class="copy-list">' +
      itens.map(function (it, i) { return '<div class="copy-row"><div class="t"><small>' + esc(it[0]) + '</small><span>' + esc(it[1] || '—') + '</span></div><button type="button" data-cp="' + i + '">Copiar</button></div>'; }).join('') +
      '</div><button class="btn tiny ghost" data-all type="button" style="margin-top:10px">Copiar tudo de uma vez</button></div>' +
      '<div class="cbox" style="margin-top:12px"><h3>PDF de faturamento</h3><button class="btn ghost small" disabled title="O modelo será adicionado em breve">Baixar PDF de faturamento · em breve</button></div></div></div></div>',
    function (m) {
      m.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        if (b.dataset.cp != null) NX.copiar(String(itens[+b.dataset.cp][1] || ''), b);
        else if (b.hasAttribute('data-all')) NX.copiar(itens.map(function (it) { return it[1]; }).join('\n'), b);
      });
    });
};
})();
