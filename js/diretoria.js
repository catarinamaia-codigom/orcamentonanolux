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
        '<label class="f">% sobre o valor líquido da SOMMAR<input type="text" inputmode="decimal" id="dPct"></label>' +
        '<div class="f">Cartão parcelado<select id="dModo"><option value="integral">Comissão integral (mês seguinte à 1ª parcela)</option><option value="parcelas">Dividida pelos meses das parcelas</option></select></div>' +
        '<p class="muted full" style="margin:0;font-size:12.5px">Valor líquido = valor final − taxas da máquina de cada forma de pagamento. A comissão é paga no mês seguinte ao recebimento.</p></div></div>' +
      '<div class="card"><h2>Taxas da máquina (%)</h2><p class="muted" style="margin:-6px 0 12px;font-size:12.5px">Aplicadas sobre o valor pago em cada forma (ex.: 50% no PIX e 50% em 12x → a taxa de 12x incide só sobre os 50%).</p><div class="taxgrid" id="dTaxas"></div></div>' +
      '<div class="card"><h2>Custos e m² efetivo</h2><div class="grid">' +
        '<label class="f">Custo fixo por projeto (R$)<input type="text" inputmode="decimal" id="dFixo"></label>' +
        '<label class="f">Validade padrão do orçamento (dias)<input type="number" min="1" id="dVal"></label>' +
        '<label class="chk full"><input type="checkbox" id="dFora"> Descontar os itens que não somam área (ex.: Protocolo técnico) como custo fixo</label>' +
        '<p class="muted full" style="margin:0;font-size:12.5px">m² efetivo = (valor final − custos fixos − taxas) ÷ área. Abaixo da referência do produto, o vendedor vê o aviso de que precisa de autorização.</p></div></div>' +
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
      '<div class="card"><h2>Usuários</h2><div id="dUsers"></div>' +
        '<div class="cbox" style="margin-top:12px"><h3 id="uTit">Novo usuário</h3><div class="grid"><input type="hidden" id="uId">' +
          '<label class="f">Nome<input type="text" id="uNome"></label><label class="f">Papel<select id="uPapel"><option value="vendedor">Vendedor(a)</option><option value="diretor">Diretoria</option></select></label>' +
          '<label class="f">PIN <span class="hint" id="uPinHint">(4 a 8 números)</span><input type="password" inputmode="numeric" id="uPin" autocomplete="new-password"></label>' +
          '<label class="chk" style="align-self:end;padding-bottom:10px"><input type="checkbox" id="uAtivo" checked> Ativo</label>' +
          '<div class="full inline" style="justify-content:flex-end"><button class="btn ghost small" id="uLimpar" type="button">Limpar</button><button class="btn dark small" id="uSalvar" type="button">Salvar usuário</button></div>' +
          '<div class="err full" id="uErr"></div></div></div></div>' +
    '</div></div>' +
    '<div class="savebar"><div class="inner"><span class="muted" id="dMsg" style="font-size:12.5px">Alterações de comissão, taxas, custos, catálogo e links.</span><button class="btn primary" id="dSalvar" type="button">Salvar configurações</button></div></div></div>';
  $('#dPct').value = f2(cfg.comissaoPct); $('#dModo').value = cfg.modoParcelado; $('#dFixo').value = f2(cfg.custoFixo); $('#dVal').value = cfg.validadePadrao;
  $('#dFora').checked = cfg.descontarForaArea !== false; $('#dAsana').value = cfg.asanaUrl || ''; $('#dWa').value = cfg.whatsapp || '';
  var tx = cfg.textos || {};
  $('#tIntro').value = tx.intro || ''; $('#tObs').value = tx.obs || ''; $('#tPagR').value = tx.pagResumo || ''; $('#tPagD').value = tx.pagDetalhe || '';
  $('#tPrazo').value = tx.prazo || ''; $('#tExec').value = tx.execucao || ''; $('#tInfos').value = (tx.infos || []).join('\n');
  $('#tExProj').value = tx.exProjeto || ''; $('#tExLocal').value = tx.exLocal || ''; $('#tExArea').value = tx.exArea || ''; $('#tExDesc').value = tx.exDesconto || '';
  $$('[data-tturno]').forEach(function (c) { c.checked = (tx.turnos || []).indexOf(c.dataset.tturno) >= 0; });
  $('#dTaxas').innerHTML = C.FORMAS.map(function (f) { return '<label class="f">' + esc(f) + '<input type="text" inputmode="decimal" data-tx="' + esc(f) + '" value="' + f2(num(cfg.taxas[f])) + '"></label>'; }).join('');
  produtos(); usuarios();
  $('#dProdAdd').onclick = function () { lerProdutos(); var k = 'novo-' + Math.random().toString(36).slice(2, 6); cfg.produtos[k] = { rotulo: 'Novo produto', nome: 'Novo produto', desc: '', unidade: 'un', valor: 0, ref: 0, contaArea: false }; produtos(); };
  $('#dProd').addEventListener('click', function (e) { var b = e.target.closest('[data-pdel]'); if (!b) return; lerProdutos(); if (Object.keys(cfg.produtos).length <= 1) return NX.toast('Mantenha pelo menos um produto.', true); if (confirm('Remover este produto do catálogo? Orçamentos já salvos não mudam.')) { delete cfg.produtos[b.dataset.pdel]; produtos(); } });
  $('#dSalvar').onclick = salvarCfg;
  $('#uSalvar').onclick = salvarUsuario;
  $('#uLimpar').onclick = limparU;
  $('#dUsers').addEventListener('click', function (e) { var b = e.target.closest('[data-uedit]'); if (!b) return; var u = S.users.filter(function (x) { return x.id === b.dataset.uedit; })[0]; if (!u) return;
    $('#uId').value = u.id; $('#uNome').value = u.nome; $('#uPapel').value = u.papel; $('#uAtivo').checked = u.ativo !== false; $('#uPin').value = ''; $('#uTit').textContent = 'Editar ' + u.nome; $('#uPinHint').textContent = '(deixe vazio para manter)'; $('#uNome').focus(); });
};
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
  cfg.comissaoPct = num($('#dPct').value); cfg.modoParcelado = $('#dModo').value; cfg.custoFixo = num($('#dFixo').value);
  cfg.validadePadrao = Math.max(1, Math.round(num($('#dVal').value) || 10)); cfg.descontarForaArea = $('#dFora').checked;
  cfg.asanaUrl = $('#dAsana').value.trim(); cfg.whatsapp = NX.digitos($('#dWa').value);
  cfg.taxas = {}; $$('[data-tx]').forEach(function (i) { cfg.taxas[i.dataset.tx] = num(i.value); });
  cfg.textos = { intro: $('#tIntro').value.trim(), obs: $('#tObs').value.trim(), pagResumo: $('#tPagR').value.trim(), pagDetalhe: $('#tPagD').value.trim(),
    prazo: $('#tPrazo').value.trim(), execucao: $('#tExec').value.trim(), infos: $('#tInfos').value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean),
    turnos: $$('[data-tturno]').filter(function (c) { return c.checked; }).map(function (c) { return c.dataset.tturno; }),
    exProjeto: $('#tExProj').value.trim(), exLocal: $('#tExLocal').value.trim(), exArea: $('#tExArea').value.trim(), exDesconto: $('#tExDesc').value.trim() };
  if (cfg.comissaoPct < 0 || cfg.comissaoPct > 100) return NX.toast('A comissão deve ficar entre 0% e 100%.', true);
  var b = $('#dSalvar'); b.disabled = true; $('#dMsg').textContent = 'Salvando…';
  NX.api('salvarConfig', { config: cfg }).then(function (r) {
    S.cfg = C.mesclar(r.config); b.disabled = false; $('#dMsg').textContent = 'Salvo às ' + new Date().toTimeString().slice(0, 5) + '.'; NX.toast('Configurações salvas');
  }).catch(function (e) { b.disabled = false; $('#dMsg').textContent = ''; NX.toast(e.message, true); });
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
