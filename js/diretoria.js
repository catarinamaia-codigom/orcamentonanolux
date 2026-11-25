/* Sistema Nanolux · SOMMAR — Painel da Diretoria */
(function () {
'use strict';
var NX = window.NX, C = window.NX_CALC, S = NX.S;
var $ = NX.$, $$ = NX.$$, esc = NX.esc, num = NX.num, f2 = NX.f2;

function slug(s) { return NX.norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'produto'; }
var cfg;
NX.paginas.diretoria = function (view) {
  if (!NX.eDiretor()) return NX.ir('inicio');
  cfg = JSON.parse(JSON.stringify(S.cfg));
  view.innerHTML = '<div class="page"><div class="page-head"><div><h1>Painel da Diretoria</h1><div class="sub">As alterações valem para todos os vendedores a partir do próximo carregamento.</div></div></div>' +
    '<div class="dir-grid"><div style="display:flex;flex-direction:column;gap:16px">' +
      '<div class="card"><h2>Comissão</h2><div class="grid">' +
        '<div class="f full">Cartão parcelado<select id="dModo"><option value="integral">Comissão integral (mês seguinte à 1ª parcela)</option><option value="parcelas">Dividida pelos meses das parcelas</option></select></div>' +
        '<p class="muted full" style="margin:0;font-size:12.5px">A comissão é calculada pelas <b>datas inseridas em cada pagamento</b> do faturamento: a data define qual tabela de vigência vale (% de comissão e taxas da máquina) e o mês de recebimento. A comissão é paga no mês seguinte ao recebimento. Base da comissão = valor do pagamento − taxa daquela forma − custos fixos (VT01 e itens fora da área, rateados entre os pagamentos). Comissão = base × %. A % de comissão fica em cada tabela de vigência abaixo.</p></div></div>' +
      '<div class="card"><h2>Comissão e taxas da máquina por vigência</h2><p class="muted" style="margin:-6px 0 12px;font-size:12.5px">As taxas incidem sobre o valor pago em cada forma (ex.: 50% no PIX e 50% em 12x → a taxa de 12x incide só sobre os 50%). Cada tabela vale <b>a partir da data</b> indicada até a véspera da próxima. Orçamentos usam a tabela da data de emissão; faturamentos usam a da <b>data de cada pagamento</b>. Assim, mudar taxas ou comissão não altera o que já foi feito.</p>' +
        '<div id="dTabs"></div><button class="btn add small" id="dTabAdd" type="button" style="margin-top:10px">+ Nova tabela de taxas (com data de início)</button></div>' +
      '<div class="card"><h2>Custos e m² efetivo</h2><div class="grid">' +
        '<label class="f">Custo fixo por projeto (R$)<input type="text" inputmode="decimal" id="dFixo"></label>' +
        '<label class="f">Validade padrão do orçamento (dias)<input type="number" min="1" id="dVal"></label>' +
        '<label class="chk full"><input type="checkbox" id="dFora"> Descontar os itens que não somam área (ex.: Protocolo técnico) como custo fixo</label>' +
        '<p class="muted full" style="margin:0;font-size:12.5px">m² efetivo = (valor total − custos fixos − desconto − taxas) ÷ área. Abaixo da referência do produto, o vendedor vê o aviso de que precisa de autorização.</p></div></div>' +
      '<div class="card"><h2>Links</h2><div class="grid">' +
        '<label class="f full">Asana da SOMMAR (botão do menu)<input type="url" id="dAsana" placeholder="https://app.asana.com/…"></label>' +
        '<label class="f full">WhatsApp do botão “negociar” no PDF <span class="hint">(só números, com DDI)</span><input type="text" inputmode="numeric" id="dWa"></label></div></div>' +
      '<div class="card"><h2>Textos padrão da proposta</h2><p class="muted" style="margin:-6px 0 12px;font-size:12.5px">Preenchem cada orçamento novo. O vendedor ainda pode ajustar em “Mais opções” e usar “restaurar padrão”.</p><div class="grid">' +
        '<label class="f full">Texto de apresentação (quadro cinza da pág. 1)<textarea id="tIntro" rows="6"></textarea></label>' +
        '<label class="f full">Observações do projeto<textarea id="tObs" rows="5"></textarea></label>' +
        '<label class="f full">Pagamento (resumo)<input type="text" id="tPagR"></label>' +
        '<label class="f full">Pagamento (detalhes)<textarea id="tPagD" rows="2"></textarea></label>' +
        '<label class="f">Prazo estimado<input type="text" id="tPrazo"></label>' +
        '<label class="f">Modalidade de execução<input type="text" id="tExec"></label>' +
        '<div class="f full">Turnos marcados por padrão<div class="chips"><label class="chk"><input type="checkbox" data-tturno="Manhã"> Manhã</label><label class="chk"><input type="checkbox" data-tturno="Tarde"> Tarde</label><label class="chk"><input type="checkbox" data-tturno="Noite"> Noite</label></div></div>' +
        '<label class="f full">Informações gerais da pág. 2 <span class="hint">(uma por linha; a validade, os turnos e a execução entram sozinhos)</span><textarea id="tInfos" rows="3"></textarea></label>' +
        '<div class="full" style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-top:4px">Exemplos que aparecem nos campos vazios</div>' +
        '<label class="f">Projeto<input type="text" id="tExProj"></label><label class="f">Local<input type="text" id="tExLocal"></label>' +
        '<label class="f">Área / referência do item<input type="text" id="tExArea"></label><label class="f">Nome do desconto<input type="text" id="tExDesc"></label>' +
      '</div></div>' +
    '</div><div style="display:flex;flex-direction:column;gap:16px">' +
      '<div class="card"><h2>Catálogo de produtos</h2><p class="muted" style="margin:-6px 0 12px;font-size:12.5px">Aparece na lista de itens da proposta. “Ref. m²” é o valor mínimo do m² efetivo sem autorização.</p><div id="dProd"></div><button class="btn add small" id="dProdAdd" type="button" style="margin-top:10px">+ Produto</button></div>' +
      '<div class="card"><h2>Materiais em PDF</h2>' +
        '<p class="muted" style="margin:-6px 0 12px;font-size:12.5px">Os arquivos ficam numa pasta do seu Google Drive (“Nanolux · Materiais em PDF”). Na proposta, o vendedor escolhe a capa e marca os materiais; eles entram antes do orçamento, nesta ordem.</p>' +
        '<div class="up-box"><div class="grid"><label class="f">Tipo<select id="mTipo"><option value="material">Material</option><option value="capa">Capa</option></select></label>' +
        '<label class="f">Arquivos PDF<input type="file" id="mArq" accept="application/pdf,.pdf" multiple></label></div>' +
        '<div class="inline" style="justify-content:space-between;margin-top:10px"><span class="muted" id="mMsg" style="font-size:12.5px">Até ~25 MB por arquivo.</span><button class="btn dark small" id="mEnviar" type="button" disabled>Enviar</button></div></div>' +
        '<div id="dMats" style="margin-top:12px"></div></div>' +
      '<div class="card"><h2>Correções informadas <span class="opt" id="dCorrN"></span></h2><div id="dCorr"></div></div>' +
      '<div class="card"><h2>Usuários</h2><div id="dUsers"></div>' +
        '<div class="cbox" style="margin-top:12px"><h3 id="uTit">Novo usuário</h3><div class="grid"><input type="hidden" id="uId">' +
          '<label class="f">Nome<input type="text" id="uNome"></label><label class="f">Papel<select id="uPapel"><option value="vendedor">Vendedor(a)</option><option value="diretor">Diretoria</option></select></label>' +
          '<label class="f">PIN <span class="hint" id="uPinHint">(4 a 8 números)</span><input type="password" inputmode="numeric" id="uPin" autocomplete="new-password"></label>' +
          '<label class="chk" style="align-self:end;padding-bottom:10px"><input type="checkbox" id="uAtivo" checked> Ativo</label>' +
          '<div class="full inline" style="justify-content:flex-end"><button class="btn ghost small" id="uLimpar" type="button">Limpar</button><button class="btn dark small" id="uSalvar" type="button">Salvar usuário</button></div>' +
          '<div class="err full" id="uErr"></div></div></div></div>' +
    '</div></div>' +
    '<div class="savebar"><div class="inner"><span class="muted" id="dMsg" style="font-size:12.5px">Alterações de comissão, taxas, custos, catálogo e links.</span><button class="btn primary" id="dSalvar" type="button">Salvar configurações</button></div></div></div>';
  $('#dModo').value = cfg.modoParcelado; $('#dFixo').value = f2(cfg.custoFixo); $('#dVal').value = cfg.validadePadrao;
  $('#dFora').checked = cfg.descontarForaArea !== false; $('#dAsana').value = cfg.asanaUrl || ''; $('#dWa').value = cfg.whatsapp || '';
  var tx = cfg.textos || {};
  $('#tIntro').value = tx.intro || ''; $('#tObs').value = tx.obs || ''; $('#tPagR').value = tx.pagResumo || ''; $('#tPagD').value = tx.pagDetalhe || '';
  $('#tPrazo').value = tx.prazo || ''; $('#tExec').value = tx.execucao || ''; $('#tInfos').value = (tx.infos || []).join('\n');
  $('#tExProj').value = tx.exProjeto || ''; $('#tExLocal').value = tx.exLocal || ''; $('#tExArea').value = tx.exArea || ''; $('#tExDesc').value = tx.exDesconto || '';
  $$('[data-tturno]').forEach(function (c) { c.checked = (tx.turnos || []).indexOf(c.dataset.tturno) >= 0; });
  tabelas = (cfg.tabelasTaxas || []).map(function (t) { return { desde: t.desde, taxas: JSON.parse(JSON.stringify(t.taxas)), comissaoPct: t.comissaoPct != null ? t.comissaoPct : cfg.comissaoPct }; });
  if (!tabelas.length) tabelas = [{ desde: '2000-01-01', taxas: JSON.parse(JSON.stringify(cfg.taxas || {})), comissaoPct: cfg.comissaoPct }];
  desenharTabelas();
  $('#dTabAdd').onclick = function () {
    lerTabelas();
    var ult = tabelas.slice().sort(function (a, b) { return a.desde.localeCompare(b.desde); }).pop(), d = NX.somaDias(NX.hoje(), 1);
    while (tabelas.some(function (t) { return t.desde === d; })) d = NX.somaDias(d, 1);
    tabelas.push({ desde: d, taxas: JSON.parse(JSON.stringify(ult.taxas)), comissaoPct: ult.comissaoPct, nova: true });
    desenharTabelas(); NX.toast('Nova tabela criada a partir de amanhã, com a comissão e as taxas atuais. Ajuste a data e os valores.');
  };
  $('#dTabs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tdel]'); if (!b) return; lerTabelas();
    if (tabelas.length < 2) return NX.toast('Mantenha pelo menos uma tabela de taxas.', true);
    if (confirm('Remover esta tabela de taxas? Orçamentos e faturamentos já salvos não mudam; novos cálculos dessas datas passam a usar a tabela anterior.')) { tabelas.splice(+b.dataset.tdel, 1); desenharTabelas(); }
  });
  $('#dTabs').addEventListener('change', function (e) { if (e.target.dataset.tdesde != null) { lerTabelas(); desenharTabelas(); } });
  produtos(); usuarios(); materiais(); correcoes();
  $('#mArq').onchange = function () { $('#mEnviar').disabled = !this.files.length; $('#mMsg').textContent = this.files.length ? this.files.length + ' arquivo(s) selecionado(s)' : 'Até ~25 MB por arquivo.'; };
  $('#mEnviar').onclick = enviarMateriais;
  $('#dMats').addEventListener('click', acaoMaterial);
  $('#dMats').addEventListener('change', function (e) {
    var row = e.target.closest('[data-mid]'); if (!row) return;
    var id = row.dataset.mid, k = e.target.dataset.mk, v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    var dados = { id: id }; dados[k] = v;
    NX.api('salvarMaterial', dados).then(function (r) { trocarMat(r.material); NX.toast('Material atualizado'); }).catch(function (er) { NX.toast(er.message, true); materiais(); });
  });
  $('#dCorr').addEventListener('click', function (e) {
    var b = e.target.closest('[data-cid]'); if (!b) return; b.disabled = true;
    NX.api('atualizarCorrecao', { id: b.dataset.cid, status: b.dataset.st }).then(function (r) {
      var i = S.correcoes.findIndex(function (x) { return x.id === r.correcao.id; }); S.correcoes[i] = r.correcao; correcoes(); NX.badgeCorrecoes();
    }).catch(function (er) { b.disabled = false; NX.toast(er.message, true); });
  });
  $('#dProdAdd').onclick = function () { lerProdutos(); var k = 'novo-' + Math.random().toString(36).slice(2, 6); cfg.produtos[k] = { rotulo: 'Novo produto', nome: 'Novo produto', desc: '', unidade: 'un', valor: 0, ref: 0, contaArea: false }; produtos(); };
  $('#dProd').addEventListener('click', function (e) { var b = e.target.closest('[data-pdel]'); if (!b) return; lerProdutos(); if (Object.keys(cfg.produtos).length <= 1) return NX.toast('Mantenha pelo menos um produto.', true); if (confirm('Remover este produto do catálogo? Orçamentos já salvos não mudam.')) { delete cfg.produtos[b.dataset.pdel]; produtos(); } });
  $('#dSalvar').onclick = salvarCfg;
  $('#uSalvar').onclick = salvarUsuario;
  $('#uLimpar').onclick = limparU;
  $('#dUsers').addEventListener('click', function (e) { var b = e.target.closest('[data-uedit]'); if (!b) return; var u = S.users.filter(function (x) { return x.id === b.dataset.uedit; })[0]; if (!u) return;
    $('#uId').value = u.id; $('#uNome').value = u.nome; $('#uPapel').value = u.papel; $('#uAtivo').checked = u.ativo !== false; $('#uPin').value = ''; $('#uTit').textContent = 'Editar ' + u.nome; $('#uPinHint').textContent = '(deixe vazio para manter)'; $('#uNome').focus(); });
};
var tabelas = [];
function desenharTabelas() {
  var hoje = NX.hoje(), ord = tabelas.map(function (t, i) { return { t: t, i: i }; }).sort(function (a, b) { return b.t.desde.localeCompare(a.t.desde); });
  var asc = ord.slice().reverse(), vigente = null;
  asc.forEach(function (x) { if (x.t.desde <= hoje) vigente = x; });
  if (!vigente && asc.length) vigente = asc[0];
  $('#dTabs').innerHTML = ord.map(function (x) {
    var pos = asc.indexOf(x), prox = asc[pos + 1], ate = prox ? NX.somaDias(prox.t.desde, -1) : '';
    var st = x === vigente ? '<span class="tag ok">Em vigor</span>' : x.t.desde > hoje ? '<span class="tag valido">Futura</span>' : '<span class="tag invalido">Encerrada</span>';
    var periodo = (x.t.desde <= '2000-01-01' ? 'Desde o início' : 'De ' + NX.dataBR(x.t.desde)) + (ate ? ' até ' + NX.dataBR(ate) : ' em diante') + ' · comissão ' + f2(num(x.t.comissaoPct)) + '%';
    var aberto = x === vigente || x.t.desde > hoje || x.t.nova;
    return '<details class="taxtab"' + (aberto ? ' open' : '') + ' data-ti="' + x.i + '"><summary><span class="tt-per">' + periodo + '</span>' + st + '</summary>' +
      '<div class="tt-head"><label class="f">Vale a partir de<input type="date" data-tdesde="' + x.i + '" value="' + (x.t.desde <= '2000-01-01' ? '' : esc(x.t.desde)) + '"' + (x.t.desde <= '2000-01-01' ? ' placeholder="desde o início"' : '') + '></label>' +
      '<label class="f">Comissão sobre a base (%)<input type="text" inputmode="decimal" data-tpct="' + x.i + '" value="' + f2(num(x.t.comissaoPct)) + '"></label>' +
      '<button class="btn tiny danger" type="button" data-tdel="' + x.i + '">Remover tabela</button></div>' +
      '<div class="taxgrid">' + C.FORMAS.map(function (f) { return '<label class="f">' + esc(f) + '<input type="text" inputmode="decimal" data-tx="' + esc(f) + '" value="' + f2(num(x.t.taxas[f])) + '"></label>'; }).join('') + '</div></details>';
  }).join('');
}
function lerTabelas() {
  $$('#dTabs [data-ti]').forEach(function (el) {
    var t = tabelas[+el.dataset.ti], d = $('[data-tdesde]', el).value;
    t.desde = d || (t.desde <= '2000-01-01' ? '2000-01-01' : '');
    $$('[data-tx]', el).forEach(function (i) { t.taxas[i.dataset.tx] = num(i.value); });
    t.comissaoPct = num($('[data-tpct]', el).value);
  });
}
function produtos() {
  var ks = Object.keys(cfg.produtos);
  $('#dProd').innerHTML = '<div class="tbl-wrap"><table class="t prod-tbl"><thead><tr><th>Nome no orçamento</th><th>Unid.</th><th>Preço padrão</th><th>Ref. m²</th><th>Soma área</th><th></th></tr></thead><tbody>' + ks.map(function (k) {
    var p = cfg.produtos[k];
    return '<tr data-pk="' + esc(k) + '"><td style="min-width:200px"><input type="text" data-pf="nome" value="' + esc(p.nome || p.rotulo || '') + '" placeholder="' + (k === 'outro' ? '(em branco: personalizado)' : '') + '"><textarea data-pf="desc" rows="2" style="margin-top:6px;font-size:12.5px;min-height:0" placeholder="Descrição automática">' + esc(p.desc || '') + '</textarea></td>' +
      '<td style="width:90px"><input type="text" list="unidades" data-pf="unidade" value="' + esc(p.unidade || '') + '"></td>' +
      '<td style="width:110px"><input type="text" inputmode="decimal" data-pf="valor" value="' + f2(num(p.valor)) + '"></td>' +
      '<td style="width:110px"><input type="text" inputmode="decimal" data-pf="ref" value="' + f2(num(p.ref)) + '"></td>' +
      '<td style="width:70px;text-align:center"><input type="checkbox" data-pf="contaArea"' + (p.contaArea ? ' checked' : '') + ' style="width:18px;height:18px;accent-color:var(--teal)"></td>' +
      '<td style="width:40px"><button class="ibtn del" type="button" data-pdel="' + esc(k) + '" title="Remover">✕</button></td></tr>';
  }).join('') + '</tbody></table></div>';
}
function lerProdutos() {
  var novo = {};
  $$('#dProd tr[data-pk]').forEach(function (tr) {
    var k = tr.dataset.pk, g = function (f) { return $('[data-pf="' + f + '"]', tr); };
    var nome = g('nome').value.trim();
    novo[k] = { rotulo: nome || (k === 'outro' ? 'Outro (personalizado)' : 'Produto'), nome: nome, desc: g('desc').value.trim(), unidade: g('unidade').value.trim() || 'un', valor: num(g('valor').value), ref: num(g('ref').value), contaArea: g('contaArea').checked };
  });
  cfg.produtos = novo;
}
function salvarCfg() {
  lerProdutos();
  cfg.modoParcelado = $('#dModo').value; cfg.custoFixo = num($('#dFixo').value);
  cfg.validadePadrao = Math.max(1, Math.round(num($('#dVal').value) || 10)); cfg.descontarForaArea = $('#dFora').checked;
  cfg.asanaUrl = $('#dAsana').value.trim(); cfg.whatsapp = NX.digitos($('#dWa').value);
  lerTabelas();
  var datas = tabelas.map(function (t) { return t.desde; });
  if (datas.some(function (d) { return !/^\d{4}-\d{2}-\d{2}$/.test(d); })) return NX.toast('Preencha a data de início de todas as tabelas de taxas.', true);
  if (datas.some(function (d, i) { return datas.indexOf(d) !== i; })) return NX.toast('Duas tabelas de taxas não podem começar na mesma data.', true);
  cfg.tabelasTaxas = tabelas.map(function (t) { return { desde: t.desde, taxas: t.taxas, comissaoPct: t.comissaoPct }; });
  delete cfg.taxas;
  cfg.textos = { intro: $('#tIntro').value.trim(), obs: $('#tObs').value.trim(), pagResumo: $('#tPagR').value.trim(), pagDetalhe: $('#tPagD').value.trim(),
    prazo: $('#tPrazo').value.trim(), execucao: $('#tExec').value.trim(), infos: $('#tInfos').value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean),
    turnos: $$('[data-tturno]').filter(function (c) { return c.checked; }).map(function (c) { return c.dataset.tturno; }),
    exProjeto: $('#tExProj').value.trim(), exLocal: $('#tExLocal').value.trim(), exArea: $('#tExArea').value.trim(), exDesconto: $('#tExDesc').value.trim() };
  if (tabelas.some(function (t) { return t.comissaoPct < 0 || t.comissaoPct > 100; })) return NX.toast('A comissão de cada tabela deve ficar entre 0% e 100%.', true);
  var b = $('#dSalvar'); b.disabled = true; $('#dMsg').textContent = 'Salvando…';
  NX.api('salvarConfig', { config: cfg }).then(function (r) {
    S.cfg = C.mesclar(r.config); b.disabled = false; $('#dMsg').textContent = 'Salvo às ' + new Date().toTimeString().slice(0, 5) + '.'; NX.toast('Configurações salvas');
  }).catch(function (e) { b.disabled = false; $('#dMsg').textContent = ''; NX.toast(e.message, true); });
}
/* ---------- materiais em PDF ---------- */
function tamTxt(b) { return b > 1048576 ? NX.f2(b / 1048576) + ' MB' : Math.max(1, Math.round((b || 0) / 1024)) + ' KB'; }
function trocarMat(m) { var i = S.materiais.findIndex(function (x) { return x.id === m.id; }); if (m.removido) { if (i >= 0) S.materiais.splice(i, 1); } else if (i >= 0) S.materiais[i] = m; else S.materiais.push(m); S.materiais.sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); }); materiais(); }
function materiais() {
  var ms = S.materiais.slice().sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); });
  $('#dMats').innerHTML = ms.length ? ms.map(function (m, i) {
    return '<div class="mat-row' + (m.ativo === false ? ' off' : '') + '" data-mid="' + esc(m.id) + '"><span class="tag ' + (m.tipo === 'capa' ? 'faturado' : 'valido') + '">' + (m.tipo === 'capa' ? 'Capa' : 'Material') + '</span>' +
      '<input type="text" data-mk="nome" value="' + esc(m.nome) + '" title="Nome que aparece na proposta">' +
      '<small class="muted nowrap">' + (m.paginas ? m.paginas + ' pág. · ' : '') + tamTxt(m.tamanho) + '</small>' +
      '<label class="chk" title="Disponível para os vendedores"><input type="checkbox" data-mk="ativo"' + (m.ativo !== false ? ' checked' : '') + '> ativo</label>' +
      '<button class="ibtn" type="button" data-ma="up"' + (i === 0 ? ' disabled' : '') + ' title="Subir">↑</button><button class="ibtn" type="button" data-ma="down"' + (i === ms.length - 1 ? ' disabled' : '') + ' title="Descer">↓</button>' +
      '<button class="btn tiny ghost" type="button" data-ma="ver">Ver</button><button class="ibtn del" type="button" data-ma="del" title="Remover da biblioteca">✕</button></div>';
  }).join('') : '<p class="muted" style="margin:0">Nenhum PDF enviado ainda.</p>';
}
function acaoMaterial(e) {
  var b = e.target.closest('[data-ma]'); if (!b) return;
  var row = b.closest('[data-mid]'), id = row.dataset.mid, a = b.dataset.ma, ms = S.materiais.slice().sort(function (x, y) { return (x.ordem || 0) - (y.ordem || 0); }), i = ms.findIndex(function (x) { return x.id === id; });
  if (a === 'up' || a === 'down') {
    var j = a === 'up' ? i - 1 : i + 1; if (j < 0 || j >= ms.length) return;
    var oi = ms[i].ordem || i + 1, oj = ms[j].ordem || j + 1; if (oi === oj) { oi = i + 1; oj = j + 1; }
    b.disabled = true;
    Promise.all([NX.api('salvarMaterial', { id: ms[i].id, ordem: oj }), NX.api('salvarMaterial', { id: ms[j].id, ordem: oi })]).then(function (rs) { rs.forEach(function (r) { trocarMat(r.material); }); }).catch(function (er) { NX.toast(er.message, true); materiais(); });
  } else if (a === 'del') {
    if (!confirm('Remover “' + ms[i].nome + '” da biblioteca? O arquivo vai para a lixeira do Google Drive.')) return;
    NX.api('salvarMaterial', { id: id, remover: true }).then(function (r) { trocarMat(r.material); NX.toast('Material removido'); }).catch(function (er) { NX.toast(er.message, true); });
  } else if (a === 'ver') {
    b.disabled = true; b.textContent = 'Abrindo…';
    NX.api('baixarMaterial', { id: id }).then(function (r) {
      var bin = atob(r.base64), u8 = new Uint8Array(bin.length); for (var k = 0; k < bin.length; k++) u8[k] = bin.charCodeAt(k);
      NX.baixarArquivo(u8, r.nome + '.pdf', 'application/pdf'); b.disabled = false; b.textContent = 'Ver';
    }).catch(function (er) { b.disabled = false; b.textContent = 'Ver'; NX.toast(er.message, true); });
  }
}
function lerArquivo(f) { return new Promise(function (ok, erro) { var r = new FileReader(); r.onload = function () { ok(new Uint8Array(r.result)); }; r.onerror = function () { erro(new Error('Não foi possível ler ' + f.name)); }; r.readAsArrayBuffer(f); }); }
function paraB64(u8) { var s = ''; for (var i = 0; i < u8.length; i += 32768) s += String.fromCharCode.apply(null, u8.subarray(i, i + 32768)); return btoa(s); }
async function enviarMateriais() {
  var arqs = Array.prototype.slice.call($('#mArq').files), tipo = $('#mTipo').value, b = $('#mEnviar'), msg = $('#mMsg');
  if (!arqs.length) return;
  b.disabled = true;
  var lib = null; try { await NX.carregarScript('lib/pdf-lib.min.js?v=1.17.1'); lib = window.PDFLib; } catch (e) {}
  for (var i = 0; i < arqs.length; i++) {
    var f = arqs[i];
    msg.textContent = 'Enviando ' + (i + 1) + ' de ' + arqs.length + ': ' + f.name + '…';
    try {
      if (f.size > 26 * 1048576) throw new Error(f.name + ' passa de 25 MB. Comprima o PDF e tente de novo.');
      var u8 = await lerArquivo(f), pags = 0;
      if (String.fromCharCode(u8[0], u8[1], u8[2], u8[3]) !== '%PDF') throw new Error(f.name + ' não é um PDF.');
      if (lib) { try { pags = (await lib.PDFDocument.load(u8, { ignoreEncryption: true })).getPageCount(); } catch (e) {} }
      var r = await NX.api('enviarMaterial', { nome: f.name.replace(/\.pdf$/i, '').replace(/_+/g, ' ').trim(), tipo: tipo, base64: paraB64(u8), paginas: pags });
      trocarMat(r.material);
    } catch (er) { NX.toast(er.message, true); }
  }
  msg.textContent = 'Pronto. Até ~25 MB por arquivo.'; $('#mArq').value = ''; b.disabled = true;
}
/* ---------- correções informadas ---------- */
function correcoes() {
  var cs = S.correcoes.slice().sort(function (a, b) { return (a.status === 'resolvida') - (b.status === 'resolvida') || (b.prioridade === 'alta') - (a.prioridade === 'alta') || String(b.em).localeCompare(String(a.em)); });
  var abertas = cs.filter(function (c) { return c.status !== 'resolvida'; }).length;
  $('#dCorrN').textContent = abertas ? abertas + ' aberta' + (abertas === 1 ? '' : 's') : '';
  $('#dCorr').innerHTML = cs.length ? cs.slice(0, 40).map(function (c) {
    var ok = c.status === 'resolvida';
    return '<div class="corr' + (ok ? ' ok' : '') + '"><div class="hd"><b>' + NX.dataBR(String(c.em).slice(0, 10)) + '</b> · ' + esc(c.por || '') + (c.pagina ? ' · ' + esc(c.pagina) : '') + (c.prioridade === 'alta' && !ok ? ' <span class="tag vencido">alta</span>' : '') + (ok ? ' <span class="tag ok">resolvida</span>' : '') + '</div>' +
      '<div class="tx">' + esc(c.texto) + '</div><button class="btn tiny ' + (ok ? 'ghost' : 'dark') + '" type="button" data-cid="' + esc(c.id) + '" data-st="' + (ok ? 'aberta' : 'resolvida') + '">' + (ok ? 'Reabrir' : 'Marcar resolvida') + '</button></div>';
  }).join('') : '<p class="muted" style="margin:0">Nenhuma correção informada. O botão “Informar correção” fica no menu lateral.</p>';
}
function usuarios() {
  $('#dUsers').innerHTML = S.users.slice().sort(function (a, b) { return a.nome.localeCompare(b.nome); }).map(function (u) {
    return '<div class="user-row"><div class="avatar" style="width:30px;height:30px;font-size:11.5px' + (u.ativo === false ? ';filter:grayscale(1);opacity:.5' : '') + '">' + esc(u.nome.slice(0, 1).toUpperCase()) + '</div><div class="t"><b>' + esc(u.nome) + (u.id === S.user.id ? ' <span class="muted" style="font-weight:500">(você)</span>' : '') + '</b><span>' + (u.papel === 'diretor' ? 'Diretoria' : 'Vendedor(a)') + (u.ativo === false ? ' · inativo' : '') + '</span></div><button class="btn tiny ghost" type="button" data-uedit="' + esc(u.id) + '">Editar</button></div>';
  }).join('') || '<p class="muted">Nenhum usuário.</p>';
}
function limparU() { $('#uId').value = ''; $('#uNome').value = ''; $('#uPin').value = ''; $('#uPapel').value = 'vendedor'; $('#uAtivo').checked = true; $('#uTit').textContent = 'Novo usuário'; $('#uPinHint').textContent = '(4 a 8 números)'; $('#uErr').textContent = ''; }
function salvarUsuario() {
  var id = $('#uId').value, dados = { id: id || undefined, nome: $('#uNome').value.trim(), papel: $('#uPapel').value, ativo: $('#uAtivo').checked, pin: $('#uPin').value.trim() || undefined };
  var b = $('#uSalvar'); b.disabled = true; $('#uErr').textContent = '';
  NX.api('salvarUsuario', { usuario: dados }).then(function (r) {
    var i = S.users.findIndex(function (x) { return x.id === r.usuario.id; }); if (i >= 0) S.users[i] = r.usuario; else S.users.push(r.usuario);
    if (r.usuario.id === S.user.id) S.user = Object.assign(S.user, r.usuario);
    b.disabled = false; usuarios(); limparU(); NX.toast('Usuário salvo: ' + r.usuario.nome);
  }).catch(function (e) { b.disabled = false; $('#uErr').textContent = e.message; });
}
})();
