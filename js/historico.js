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
    '<div class="tiles mini" id="hResumo"></div><p class="count" id="hCount"></p><div class="tbl-wrap" id="hTbl"></div></div>';
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
    else if (b.dataset.a === 'asana') NX.vincularAsana(id, tabela);
  });
  tabela();
};

function resumo(gs) {
  var at = gs.map(function (g) { return g.atual; }), cont = function (f) { return at.filter(f).length; };
  var fat = gs.filter(function (g) { return g.faturado; }), soma = function (l) { return l.reduce(function (s, o) { return s + (o.valorFinal || 0); }, 0); };
  var vFat = soma(fat.map(function (g) { return g.versoes.filter(function (x) { return x.status === 'faturado'; })[0] || g.atual; }));
  var abertos = at.filter(function (o) { return o.status !== 'faturado'; }), area = at.reduce(function (s, o) { return s + (o.area || 0); }, 0);
  var m2 = area > 0 ? at.reduce(function (s, o) { return s + (o.m2Efetivo || 0) * (o.area || 0); }, 0) / area : 0;
  var t = function (k, v, sub, cls) { return '<div class="tile' + (cls ? ' ' + cls : '') + '"><div class="k">' + k + '</div><div class="v">' + v + '</div>' + (sub ? '<div class="s">' + sub + '</div>' : '') + '</div>'; };
  $('#hResumo').innerHTML = t('Orçamentos', gs.length, gs.reduce(function (s, g) { return s + g.versoes.length; }, 0) + ' versões') +
    t('Em aberto', brl(soma(abertos)), abertos.length + ' orçamento' + (abertos.length === 1 ? '' : 's')) +
    t('Válidos', cont(function (o) { return NX.situacao(o).k === 'valido'; }), 'dentro da validade', 'b-valido') +
    t('Vencidos', cont(function (o) { return NX.situacao(o).k === 'vencido'; }), 'precisam de nova oferta', 'b-vencido') +
    t('Rascunho · PDF', cont(function (o) { return o.status === 'rascunho'; }) + ' · ' + cont(function (o) { return o.status === 'pdf'; }), 'situação da versão atual') +
    t('Faturados', fat.length, brl(vFat), 'b-fat') +
    t('Ticket médio', at.length ? brl(soma(at) / at.length) : '—', 'versão atual de cada cliente') +
    t('m² efetivo médio', area > 0 ? brl(m2) : '—', 'ponderado pela área');
}
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
  resumo(gs);
  if (!gs.length) { $('#hTbl').innerHTML = '<div class="empty">' + (S.orcs.length ? 'Nada encontrado com esses filtros.' : 'Nenhum orçamento salvo ainda. Monte uma proposta e clique em <b>Salvar</b>.') + '</div>'; return; }
  var head = '<thead><tr><th class="stick">Cliente</th><th>Orçamento</th><th>Situação</th><th>Desconto</th><th class="right">Valores</th><th>Simulação</th><th>Ações</th></tr></thead>';
  var corpo = gs.map(function (g, gi) {
    var cor = CORES[gi % CORES.length];
    return '<tbody class="grp" style="--gc:' + cor[0] + ';--gb:' + cor[1] + '">' + g.versoes.map(function (o) {
      var sit = NX.situacao(o), velho = sit.k === 'invalido', fat = S.fats.filter(function (f) { return f.orcamentoId === o.id; })[0];
      var asana = NX.url(o.asanaUrl);
      var acts = '<button class="btn tiny ghost" data-a="abrir" data-id="' + o.id + '">Abrir</button>';
      if (!g.faturado && o === g.atual) acts += '<button class="btn tiny ghost" data-a="atualizar" data-id="' + o.id + '">Atualizar</button><button class="btn tiny dark" data-a="faturar" data-id="' + o.id + '">Faturar</button>';
      if (fat) acts += '<button class="btn tiny ghost" data-a="verfat" data-fat="' + fat.id + '" data-id="' + o.id + '">Ver faturamento</button>';
      var loc = [o.local, o.projeto].filter(Boolean).map(esc).join(' · ');
      return '<tr class="' + (velho ? 'old' : '') + '">' +
        '<td class="stick"><div class="cli">' + (asana ? '<a class="cli-nome" href="' + esc(asana) + '" target="_blank" rel="noopener" title="Abrir este cliente no Asana">' + esc(o.cliente || 'Sem nome') + '</a>'
            : '<button class="cli-nome" type="button" data-a="asana" data-id="' + o.id + '" title="Vincular o link do Asana deste cliente">' + esc(o.cliente || 'Sem nome') + '</button>') +
          '<span class="nowrap">' + esc(o.telefone || 'sem telefone') + '</span>' + (loc ? '<span style="display:block">' + loc + '</span>' : '') +
          '<button class="asana-tag ' + (asana ? 'on' : 'off') + '" type="button" data-a="asana" data-id="' + o.id + '" title="' + (asana ? 'Vinculado ao Asana — clique para trocar o link' : 'Sem link do Asana — clique para vincular') + '">Asana ' + (asana ? 'ON' : 'OFF') + '</button></div></td>' +
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

/* ---------- vínculo com o Asana ---------- */
NX.vincularAsana = function (id, depois) {
  var o = S.orcs.filter(function (x) { return x.id === id; })[0]; if (!o) return;
  var atual = NX.url(o.asanaUrl), base = NX.url(S.cfg.asanaUrl) || 'https://app.asana.com/';
  NX.modal('<div class="modal-h"><div><h2>' + (atual ? 'Link do Asana' : 'Vincular ao Asana') + '</h2><p>' + esc(o.cliente || 'Sem nome') + (o.telefone ? ' · ' + esc(o.telefone) : '') + ' — vale para todas as versões deste orçamento.</p></div><button class="btn ghost small" data-fechar>Fechar</button></div>' +
    '<div class="modal-b"><label class="f">Link do cliente no Asana<input type="url" id="aUrl" placeholder="https://app.asana.com/…" value="' + esc(atual) + '"></label>' +
    '<p class="muted" style="font-size:12.5px;margin:10px 0 0">Não tem o link à mão? <a href="' + esc(base) + '" target="_blank" rel="noopener">Abrir o Asana da SOMMAR</a>, copie o link da tarefa do cliente e cole aqui.</p><div class="err" id="aErr" style="margin-top:8px"></div></div>' +
    '<div class="modal-f">' + (atual ? '<button class="btn danger" id="aDel" type="button" style="margin-right:auto">Remover link</button><a class="btn ghost" href="' + esc(atual) + '" target="_blank" rel="noopener">Abrir no Asana</a>' : '') + '<button class="btn ghost" data-fechar>Cancelar</button><button class="btn primary" id="aOk" type="button">Salvar link</button></div>',
    function (m, fechar) {
      m.style.maxWidth = '560px';
      var inp = $('#aUrl', m); setTimeout(function () { inp.focus(); }, 50);
      var enviar = function (url) {
        if (url && !/^https?:\/\/\S+$/i.test(url)) { $('#aErr', m).textContent = 'Cole um link completo, começando com https://'; return; }
        $('#aOk', m).disabled = true;
        NX.api('vincularAsana', { id: id, url: url }).then(function (r) {
          (r.orcamentos || []).forEach(function (x) { NX.atualizarLocal(x); });
          fechar(); NX.toast(url ? 'Asana vinculado: ON' : 'Link do Asana removido'); if (depois) depois();
        }).catch(function (e) { $('#aOk', m).disabled = false; $('#aErr', m).textContent = e.message; });
      };
      $('#aOk', m).onclick = function () { enviar(inp.value.trim()); };
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') enviar(inp.value.trim()); });
      var del = $('#aDel', m); if (del) del.onclick = function () { if (confirm('Remover o link do Asana deste cliente?')) enviar(''); };
    });
};

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
/* janela de pagamentos — usada para faturar e para alterar um faturamento */
function modalPagamentos(op) {
  var o = op.orc, h = NX.hoje(), pags = op.pags;
  NX.modal('<div class="modal-h"><div><h2>' + op.titulo + '</h2><p>' + esc(o.cliente || 'Sem nome') + (o.telefone ? ' · ' + esc(o.telefone) : '') + ' · ' + esc(o.numero) + ' V' + pad(o.versao || 1) + '</p></div><button class="btn ghost small" data-fechar>Fechar</button></div>' +
    '<div class="modal-b"><div class="fat-grid"><div>' + (op.aviso || '') +
      (op.motivo ? '<label class="f" style="margin-bottom:12px">Motivo da alteração <span style="color:var(--danger)">*</span> <span class="hint">(obrigatório — fica registrado no histórico)</span><textarea id="fMot" rows="2" placeholder="Ex.: cliente mudou a forma de pagamento para PIX"></textarea></label>' : '') +
      '<div class="cbox"><h3>Formas de pagamento <span style="color:var(--danger)">*</span></h3><div class="muted" style="font-size:12px;margin:-4px 0 8px">Obrigatório. A soma precisa ser igual ao valor final de <b>' + brl(o.valorFinal) + '</b>. Data = vencimento/recebimento de cada pagamento (no cartão, a 1ª parcela).</div>' +
        '<div class="payrow fat" style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase"><span>Forma</span><span>Valor (R$)</span><span>Data</span><span></span></div>' +
        '<div id="fRows"></div><div class="inline" style="justify-content:space-between;margin-top:6px"><button class="btn add tiny" id="fAdd" type="button">+ forma de pagamento</button><span class="sumline" id="fSum"></span></div></div>' +
      '<div class="cbox" style="margin-top:12px"><h3>Comissão e m² efetivo</h3><div id="fFin"></div></div>' +
      '<label class="f" style="margin-top:12px">Observações do faturamento <span class="hint">(opcional)</span><textarea id="fObs" rows="2">' + esc(op.obs || '') + '</textarea></label>' +
    '</div><div><div class="wa-box"><div class="hd"><b>Para facilitar colocar no Grupo de Pagamentos</b>, copie e cole cada item separadamente e sem assinatura do WhatsApp:</div><div class="copy-list" id="fWa"></div>' +
      '<button class="btn tiny ghost" id="fWaAll" type="button" style="margin-top:10px">Copiar tudo de uma vez</button></div>' +
      '<div class="cbox" style="margin-top:12px"><h3>PDF de faturamento</h3><p class="muted" style="margin:0;font-size:12.5px">O modelo do PDF de faturamento será adicionado em breve.</p></div></div></div></div>' +
    '<div class="modal-f"><span class="err" id="fErr" style="margin-right:auto;align-self:center"></span><button class="btn ghost" data-fechar>Cancelar</button><button class="btn primary" id="fOk">' + op.botao + '</button></div>',
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
          (op.antes != null ? '<div class="muted" style="font-size:12px">Antes da alteração: ' + brl(op.antes) + '</div>' : '') +
          (Object.keys(porMes).length ? '<div class="muted" style="font-size:12px;margin-top:6px">Recebimento da comissão: ' + Object.keys(porMes).sort().map(function (k) { return '<b>' + brl(porMes[k]) + '</b> em ' + NX.mesNome(k, true); }).join(' · ') + '</div>' : '');
        var itens = textoWhats(o, pags);
        $('#fWa', m).innerHTML = itens.map(function (it, i) { return '<div class="copy-row"><div class="t"><small>' + esc(it[0]) + '</small><span>' + esc(it[1] || '—') + '</span></div><button type="button" data-cp="' + i + '">Copiar</button></div>'; }).join('');
        $('#fWa', m)._itens = itens;
        var mot = $('#fMot', m);
        $('#fOk', m).disabled = !ok || pags.some(function (p) { return !p.data || num(p.valor) <= 0; }) || (mot && mot.value.trim().length < 5);
      }
      rows(); atualizar();
      m.addEventListener('input', function (e) { if (e.target.id === 'fMot') return atualizar(); var r = e.target.closest('[data-p]'); if (!r) return; pags[+r.dataset.p][e.target.dataset.pk] = e.target.value; atualizar(); });
      m.addEventListener('change', function (e) { if (e.target.dataset.pk === 'valor' && String(e.target.value).trim()) { var i = +e.target.closest('[data-p]').dataset.p; pags[i].valor = e.target.value = f2(num(e.target.value)); atualizar(); } });
      m.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        if (b.id === 'fAdd') { var soma = pags.reduce(function (s, p) { return s + num(p.valor); }, 0); pags.push({ forma: 'PIX', valor: f2(Math.max(0, o.valorFinal - soma)), data: NX.somaDias(h, 30) }); rows(); atualizar(); }
        else if (b.dataset.pdel != null) { pags.splice(+b.dataset.pdel, 1); rows(); atualizar(); }
        else if (b.dataset.cp != null) NX.copiar(String($('#fWa', m)._itens[+b.dataset.cp][1] || ''), b);
        else if (b.id === 'fWaAll') NX.copiar($('#fWa', m)._itens.map(function (it) { return it[1]; }).join('\n'), b);
        else if (b.id === 'fOk') {
          b.disabled = true; $('#fErr', m).textContent = '';
          op.confirmar(pags.map(function (p) { return { forma: p.forma, valor: num(p.valor), data: p.data }; }), $('#fObs', m).value, $('#fMot', m) ? $('#fMot', m).value.trim() : '')
            .then(function () { fechar(); })
            .catch(function (err) { b.disabled = false; $('#fErr', m).textContent = err.message; });
        }
      });
    });
}
function reabrirTela(orcId) {
  if (NX.rotaAtual() === 'historico') NX.paginas.historico($('#view'));
  else if (NX.rotaAtual() === 'comissoes') NX.paginas.comissoes($('#view'));
  else if (NX.rotaAtual() === 'proposta' && NX.proposta.meta() && NX.proposta.meta().id === orcId) NX.proposta.abrir(orcId);
}
NX.faturar = function (id) {
  var o = S.orcs.filter(function (x) { return x.id === id; })[0];
  if (!o) return NX.toast('Orçamento não encontrado', true);
  if (o.status === 'faturado') return NX.toast('Este orçamento já foi faturado.', true);
  if (o.substituidoPor) return NX.toast('Existe uma versão mais nova deste orçamento. Fature a versão atual.', true);
  var a0 = C.analise(o.dados, S.cfg), h = NX.hoje();
  modalPagamentos({
    orc: o, titulo: 'Faturar projeto', botao: 'Confirmar faturamento',
    pags: a0.pagamentos.map(function (p) { return { forma: p.forma, valor: f2(p.valor), data: h }; }),
    aviso: o.validade && o.validade < h ? '<div class="verdict no" style="margin-bottom:12px">' + NX.IC.alerta + '<span>A validade deste orçamento venceu em ' + NX.dataBR(o.validade) + '. Confira se as condições ainda valem antes de faturar.</span></div>' : '',
    confirmar: function (pags, obs) {
      return NX.api('faturar', { id: o.id, pagamentos: pags, obs: obs }).then(function (r) {
        NX.atualizarLocal(r.orcamento); S.fats.push(r.faturamento);
        reabrirTela(o.id);
        (NX.festa ? NX.festa(r.faturamento) : Promise.resolve()).then(function () { NX.verFaturamento(r.faturamento.id); });
      });
    }
  });
};
NX.alterarFaturamento = function (fid) {
  var f = S.fats.filter(function (x) { return x.id === fid; })[0]; if (!f) return;
  var o = S.orcs.filter(function (x) { return x.id === f.orcamentoId; })[0];
  if (!o) return NX.toast('Orçamento deste faturamento não encontrado.', true);
  modalPagamentos({
    orc: o, titulo: 'Alterar faturamento', botao: 'Salvar alteração', motivo: true, obs: f.obs, antes: f.comissao,
    pags: (f.pagamentos || []).map(function (p) { return { forma: p.forma, valor: f2(p.valor), data: p.data }; }),
    aviso: '<div class="verdict ok" style="margin-bottom:12px;background:#eef6fb;color:#1c5bb0">' + NX.IC.historico.replace('<svg', '<svg style="stroke:currentColor;fill:none;stroke-width:2"') + '<span>A alteração recalcula taxas e comissão com a configuração atual da Diretoria e fica registrada no histórico deste faturamento.</span></div>',
    confirmar: function (pags, obs, motivo) {
      return NX.api('alterarFaturamento', { id: fid, pagamentos: pags, obs: obs, motivo: motivo }).then(function (r) {
        var i = S.fats.findIndex(function (x) { return x.id === fid; }); S.fats[i] = r.faturamento;
        NX.toast('Faturamento alterado e registrado no histórico');
        reabrirTela(o.id); NX.verFaturamento(fid);
      });
    }
  });
};
NX.verFaturamento = function (fid) {
  var f = S.fats.filter(function (x) { return x.id === fid; })[0]; if (!f) return;
  var itens = textoWhats(f, f.pagamentos || []), porMes = {}, hist = (f.historico || []).slice().reverse();
  (f.agenda || []).forEach(function (x) { porMes[x.mesComissao] = (porMes[x.mesComissao] || 0) + x.valor; });
  var resumoPag = function (l) { return (l || []).map(function (p) { return esc(p.forma) + ' ' + brl(p.valor); }).join(' + '); };
  NX.modal('<div class="modal-h"><div><h2>Faturamento · ' + esc(f.cliente || '') + '</h2><p>' + esc(f.numero || '') + ' V' + pad(f.versao || 1) + ' · faturado em ' + NX.dataBR(String(f.faturadoEm).slice(0, 10)) + (f.faturadoPor ? ' por ' + esc(f.faturadoPor) : '') + (f.alteradoEm ? ' · alterado em ' + NX.dataBR(String(f.alteradoEm).slice(0, 10)) : '') + '</p></div><button class="btn ghost small" data-fechar>Fechar</button></div>' +
    '<div class="modal-b"><div class="fat-grid"><div><div class="cbox"><h3>Pagamentos</h3>' + (f.pagamentos || []).map(function (p, i) {
      return '<div class="kv"><span><b>' + (LETRAS[i] || i + 1) + '.</b> ' + esc(p.forma) + ' · ' + NX.dataBR(p.data) + '</span><b>' + brl(p.valor) + '</b></div>';
    }).join('') + '</div><div class="cbox" style="margin-top:12px"><h3>Comissão</h3>' +
      '<div class="kv"><span>Valor final</span><b>' + brl(f.valorFinal) + '</b></div><div class="kv"><span>Taxas da máquina</span><b>− ' + brl(f.taxas) + '</b></div>' +
      '<div class="kv"><span>Valor líquido</span><b>' + brl(f.liquido) + '</b></div><div class="kv"><span>m² efetivo</span><b>' + (f.area > 0 ? brl(f.m2Efetivo) : '—') + '</b></div>' +
      '<div class="kv"><span><b>Comissão</b> (' + f2(f.comissaoPct) + '%)</span><b style="color:#126e64">' + brl(f.comissao) + '</b></div>' +
      '<div class="muted" style="font-size:12px;margin-top:6px">Recebimento: ' + Object.keys(porMes).sort().map(function (k) { return '<b>' + brl(porMes[k]) + '</b> em ' + NX.mesNome(k, true); }).join(' · ') + '</div></div>' +
      (f.obs ? '<p class="muted" style="font-size:13px">Obs.: ' + esc(f.obs) + '</p>' : '') +
      '<div class="cbox" style="margin-top:12px"><h3>Histórico de alterações</h3>' + (hist.length ? '<div class="hist-list">' + hist.map(function (h) {
        return '<div class="hist-item"><div class="hd"><b>' + NX.dataBR(String(h.em).slice(0, 10)) + ' ' + String(new Date(h.em).toTimeString()).slice(0, 5) + '</b> · ' + esc(h.por || '') + '</div>' +
          '<div class="mot">“' + esc(h.motivo) + '”</div>' +
          '<div class="dif"><span>Antes: ' + resumoPag(h.antes && h.antes.pagamentos) + ' · comissão ' + brl(h.antes && h.antes.comissao) + '</span><span>Depois: ' + resumoPag(h.depois && h.depois.pagamentos) + ' · comissão ' + brl(h.depois && h.depois.comissao) + '</span></div></div>';
      }).join('') + '</div>' : '<p class="muted" style="margin:0;font-size:12.5px">Nenhuma alteração. O faturamento está como foi registrado.</p>') + '</div>' +
    '</div><div><div class="wa-box"><div class="hd"><b>Para facilitar colocar no Grupo de Pagamentos</b>, copie e cole cada item separadamente e sem assinatura do WhatsApp:</div><div class="copy-list">' +
      itens.map(function (it, i) { return '<div class="copy-row"><div class="t"><small>' + esc(it[0]) + '</small><span>' + esc(it[1] || '—') + '</span></div><button type="button" data-cp="' + i + '">Copiar</button></div>'; }).join('') +
      '</div><button class="btn tiny ghost" data-all type="button" style="margin-top:10px">Copiar tudo de uma vez</button></div>' +
      '<div class="cbox" style="margin-top:12px"><h3>PDF de faturamento</h3><button class="btn ghost small" disabled title="O modelo será adicionado em breve">Baixar PDF de faturamento · em breve</button></div></div></div></div>' +
    '<div class="modal-f"><button class="btn ghost" id="vAlt" type="button">Alterar faturamento</button><button class="btn primary" data-fechar>Fechar</button></div>',
    function (m, fechar) {
      m.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        if (b.dataset.cp != null) NX.copiar(String(itens[+b.dataset.cp][1] || ''), b);
        else if (b.hasAttribute('data-all')) NX.copiar(itens.map(function (it) { return it[1]; }).join('\n'), b);
        else if (b.id === 'vAlt') { fechar(); NX.alterarFaturamento(fid); }
      });
    });
};
})();
