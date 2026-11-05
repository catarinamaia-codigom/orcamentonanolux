/* Sistema Nanolux · SOMMAR — núcleo: utilidades, sessão, API, menu e página inicial */
(function () {
'use strict';
var NX = window.NX = window.NX || {};
var C = window.NX_CALC;

/* ---------- utilidades ---------- */
NX.$ = function (s, r) { return (r || document).querySelector(s); };
NX.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
NX.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
NX.num = C.num;
NX.f2 = function (v) { return (Math.round((+v || 0) * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
NX.brl = function (v) { return 'R$ ' + NX.f2(v); };
NX.pad = function (n) { return (n < 10 ? '0' : '') + n; };
NX.iso = function (d) { return d.getFullYear() + '-' + NX.pad(d.getMonth() + 1) + '-' + NX.pad(d.getDate()); };
NX.hoje = function () { return NX.iso(new Date()); };
NX.parseISO = function (s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
NX.dataBR = function (s) { var d = typeof s === 'string' ? NX.parseISO(s) : s; return d ? NX.pad(d.getDate()) + '/' + NX.pad(d.getMonth() + 1) + '/' + d.getFullYear() : '—'; };
NX.somaDias = function (iso, n) { var d = NX.parseISO(iso) || new Date(); return NX.iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)); };
NX.dias = function (a, b) { var x = NX.parseISO(a), y = NX.parseISO(b); return x && y ? Math.round((y - x) / 86400000) : null; };
NX.ym = function (iso) { return String(iso || '').slice(0, 7); };
var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
NX.mesNome = function (ym, curto) { var m = +String(ym).slice(5, 7) - 1, y = String(ym).slice(0, 4); if (m < 0) return '—'; var n = MESES[m]; return curto ? n.slice(0, 3) + '/' + y.slice(2) : n + ' de ' + y; };
NX.norm = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
NX.digitos = function (s) { return String(s || '').replace(/\D/g, ''); };
NX.url = function (s) { s = String(s || '').trim(); return /^https?:\/\//i.test(s) ? s : ''; };
NX.clienteRotulo = function (d) { var n = (d.cliente || '').trim() || 'Nome do cliente', t = (d.telefone || '').trim(); return t ? n + ' | ' + t : n; };

NX.toast = function (m, erro) {
  var t = NX.$('#toast'); t.textContent = m; t.classList.toggle('err', !!erro); t.classList.add('on');
  clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('on'); }, erro ? 5000 : 2600);
};
NX.copiar = function (txt, btn) {
  var ok = function () { if (btn) { var o = btn.textContent; btn.textContent = 'Copiado'; btn.classList.add('done'); setTimeout(function () { btn.textContent = o; btn.classList.remove('done'); }, 1400); } else NX.toast('Copiado'); };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).then(ok, function () { fallback(); });
  else fallback();
  function fallback() { var ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ok(); } catch (e) { NX.toast('Não foi possível copiar', true); } document.body.removeChild(ta); }
};
NX.modal = function (html, onMount) {
  var bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + '</div>';
  document.body.appendChild(bg);
  var fechar = function () { if (bg.parentNode) bg.parentNode.removeChild(bg); document.removeEventListener('keydown', esc); };
  var esc = function (e) { if (e.key === 'Escape') fechar(); };
  document.addEventListener('keydown', esc);
  bg.addEventListener('mousedown', function (e) { if (e.target === bg) fechar(); });
  NX.$$('[data-fechar]', bg).forEach(function (b) { b.addEventListener('click', fechar); });
  if (onMount) onMount(bg.firstChild, fechar);
  return fechar;
};

var IC = NX.IC = {
  inicio: '<svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  proposta: '<svg viewBox="0 0 24 24"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M9 13h6M9 17h4"/></svg>',
  historico: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>',
  comissoes: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  diretoria: '<svg viewBox="0 0 24 24"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  asana: '<svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="3.6"/><circle cx="6.2" cy="16" r="3.6"/><circle cx="17.8" cy="16" r="3.6"/></svg>',
  sync: '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/></svg>',
  sair: '<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
  chev: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
  link: '<svg viewBox="0 0 24 24"><path d="M10 14a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 10a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
  alerta: '<svg viewBox="0 0 24 24"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/></svg>',
  ok: '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
  mais: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>'
};

/* ---------- sessão e API ---------- */
var S = NX.S = { token: null, user: null, cfg: C.mesclar({}), orcs: [], fats: [], users: [], demo: false, carregadoEm: 0 };
var API = (window.NX_CONFIG && window.NX_CONFIG.apiUrl || '').trim();
try { if (!API && localStorage.getItem('nx-api')) API = localStorage.getItem('nx-api'); } catch (e) {}
try { S.token = localStorage.getItem('nx-token'); } catch (e) {}
NX.api = function (acao, dados) {
  var req = Object.assign({ acao: acao, token: S.token }, dados || {});
  var p = S.demo
    ? new Promise(function (res) { setTimeout(function () { res(window.NX_DEMO.chamar(req)); }, 120); })
    : fetch(API, { method: 'POST', body: JSON.stringify(req) }).then(function (r) { if (!r.ok) throw new Error('Servidor respondeu ' + r.status); return r.json(); });
  return p.then(function (r) {
    if (!r || !r.ok) {
      var m = (r && r.erro) || 'Erro desconhecido';
      if (/^SESSAO/.test(m)) { NX.sair(true); }
      throw new Error(m.replace(/^SESSAO:\s*/, ''));
    }
    return r;
  });
};
NX.recarregar = function () {
  return NX.api('carregar').then(function (r) {
    S.user = r.usuario; S.cfg = C.mesclar(r.config); S.orcs = r.orcamentos || []; S.fats = r.faturamentos || []; S.users = r.usuarios || []; S.carregadoEm = Date.now();
    return r;
  });
};
NX.eDiretor = function () { return S.user && S.user.papel === 'diretor'; };
NX.sair = function (silencioso) {
  S.token = null; S.user = null; S.orcs = []; S.fats = []; S.users = []; if (NX.proposta && NX.proposta.limpar) NX.proposta.limpar(); try { localStorage.removeItem('nx-token'); } catch (e) {}
  if (!silencioso) NX.telaLogin();
  else setTimeout(NX.telaLogin, 0);
};
NX.atualizarLocal = function (o) {
  var i = S.orcs.findIndex(function (x) { return x.id === o.id; });
  if (i >= 0) S.orcs[i] = o; else S.orcs.push(o);
  if (o.anteriorId) S.orcs.forEach(function (x) { if (x.grupo === o.grupo && x.id !== o.id && !x.substituidoPor && x.status !== 'faturado') x.substituidoPor = o.id; });
};

/* ---------- regras de status ---------- */
NX.situacao = function (o) {
  if (o.status === 'faturado') return { k: 'faturado', t: 'Faturado' };
  if (o.substituidoPor) return { k: 'invalido', t: 'Inválido · atualizado' };
  if (o.validade && o.validade >= NX.hoje()) return { k: 'valido', t: 'Válido' };
  return { k: 'vencido', t: 'Vencido' };
};
NX.statusTag = function (o) {
  var m = { rascunho: ['rascunho', 'Rascunho'], pdf: ['pdf', 'PDF baixado'], faturado: ['faturado', 'Faturado'] }[o.status] || ['rascunho', 'Rascunho'];
  return '<span class="tag ' + m[0] + '">' + m[1] + '</span>';
};
NX.situacaoTag = function (o) { var s = NX.situacao(o); return '<span class="tag ' + s.k + '">' + s.t + '</span>'; };
NX.grupos = function (orcs) {
  var m = {};
  (orcs || S.orcs).forEach(function (o) { (m[o.grupo] = m[o.grupo] || []).push(o); });
  return Object.keys(m).map(function (k) {
    var vs = m[k].sort(function (a, b) { return (b.versao || 1) - (a.versao || 1); });
    var criado = vs.map(function (x) { return x.criadoEm || ''; }).sort()[0];
    var ativo = vs.filter(function (x) { return !x.substituidoPor; })[0] || vs[0];
    return { id: k, versoes: vs, atual: ativo, criadoEm: criado, faturado: vs.some(function (x) { return x.status === 'faturado'; }),
             ultimo: vs.map(function (x) { return x.atualizadoEm || ''; }).sort().pop() };
  });
};
NX.nomeUsuario = function (id) { var u = S.users.filter(function (x) { return x.id === id; })[0]; return u ? u.nome : ''; };

/* ---------- casca ---------- */
var ROTAS = [
  { id: 'inicio', t: 'Início', ic: 'inicio' },
  { id: 'proposta', t: 'Proposta comercial', ic: 'proposta' },
  { id: 'historico', t: 'Histórico de orçamentos', ic: 'historico' },
  { id: 'comissoes', t: 'Comissões', ic: 'comissoes' },
  { id: 'diretoria', t: 'Painel da Diretoria', ic: 'diretoria', dir: true }
];
NX.paginas = {};
function iniciais(n) { return String(n || '?').trim().split(/\s+/).slice(0, 2).map(function (p) { return p[0]; }).join('').toUpperCase(); }
function montarCasca() {
  var asana = NX.url(S.cfg.asanaUrl) || 'https://app.asana.com/';
  var root = NX.$('#root');
  root.innerHTML = (S.demo ? '<div class="demo-band">Modo demonstração — os dados ficam só neste navegador. <button class="btn tiny ghost" id="sairDemo">Sair do modo demonstração</button></div>' : '') +
    '<div class="shell"><aside class="side" id="side">' +
      '<button class="collapse-btn" id="collapse" title="Recolher/expandir menu">' + IC.chev + '</button>' +
      '<div class="brandbox"><div><div class="logo">SOMMAR</div><div class="logo-sub">Nanolux · orçamentos e comissões</div></div></div>' +
      '<nav>' + ROTAS.filter(function (r) { return !r.dir || NX.eDiretor(); }).map(function (r) {
        return '<a class="nav-a" href="#/' + r.id + '" data-rota="' + r.id + '" title="' + r.t + '">' + IC[r.ic] + '<span class="label">' + r.t + '</span></a>';
      }).join('') +
      '<div class="sect">Asana</div>' +
      '<a class="nav-a" href="' + NX.esc(asana) + '" target="_blank" rel="noopener" title="Asana da SOMMAR (vendas)">' + IC.asana + '<span class="label">Asana SOMMAR</span></a>' +
      '<button class="nav-a" disabled title="Em breve: enviar os valores do orçamento para o cliente no Asana">' + IC.sync + '<span class="label">Atualizar Asana</span><span class="soon">em breve</span></button>' +
      '</nav>' +
      '<div class="foot"><div class="avatar">' + NX.esc(iniciais(S.user.nome)) + '</div><div class="who"><b>' + NX.esc(S.user.nome) + '</b><span>' + (NX.eDiretor() ? 'Diretoria' : 'Vendedor(a)') + '</span></div>' +
      '<button class="iconbtn" id="btnSair" title="Sair">' + IC.sair + '</button></div>' +
    '</aside><div class="scrim" id="scrim"></div>' +
    '<div class="main"><div class="topbar"><button class="iconbtn" id="btnMenu" title="Menu">' + IC.menu + '</button><span class="logo">SOMMAR</span><span class="muted" style="font-size:12.5px">Nanolux</span></div>' +
    '<div id="view"></div></div></div>';
  try { if (localStorage.getItem('nx-mini') === '1') document.body.classList.add('mini'); } catch (e) {}
  NX.$('#collapse').onclick = function () { var on = document.body.classList.toggle('mini'); try { localStorage.setItem('nx-mini', on ? '1' : '0'); } catch (e) {} if (NX.aoRedimensionar) setTimeout(NX.aoRedimensionar, 220); };
  NX.$('#btnMenu').onclick = function () { document.body.classList.add('menu'); };
  NX.$('#scrim').onclick = function () { document.body.classList.remove('menu'); };
  NX.$('#btnSair').onclick = function () { if (confirm('Sair da sua conta?')) NX.sair(); };
  var sd = NX.$('#sairDemo'); if (sd) sd.onclick = function () { try { localStorage.removeItem('nx-demo'); localStorage.removeItem('nx-token'); } catch (e) {} location.href = location.pathname; };
}
NX.rotaAtual = function () { var h = (location.hash || '').replace(/^#\/?/, '').split('?')[0]; return ROTAS.some(function (r) { return r.id === h; }) ? h : 'inicio'; };
NX.ir = function (rota) { if (location.hash === '#/' + rota) navegar(); else location.hash = '#/' + rota; };
function navegar() {
  if (!S.user) return;
  var r = NX.rotaAtual(), def = ROTAS.filter(function (x) { return x.id === r; })[0];
  if (def.dir && !NX.eDiretor()) { NX.ir('inicio'); return; }
  document.body.classList.remove('menu');
  NX.$$('.nav-a[data-rota]').forEach(function (a) { a.classList.toggle('on', a.dataset.rota === r); });
  var view = NX.$('#view'); view.innerHTML = '';
  window.scrollTo(0, 0);
  document.title = def.t + ' · Nanolux SOMMAR';
  (NX.paginas[r] || NX.paginas.inicio)(view);
}
window.addEventListener('hashchange', navegar);

/* ---------- entrada ---------- */
NX.iniciar = function () {
  var demo = false;
  try { demo = /[?&]demo=1/.test(location.search) || localStorage.getItem('nx-demo') === '1'; } catch (e) {}
  if (!API && !demo) return telaInstalacao();
  if (demo) {
    S.demo = true; try { localStorage.setItem('nx-demo', '1'); } catch (e) {}
    var s = document.createElement('script'); s.src = 'dev/gas-mock.js'; s.onload = continuar; document.head.appendChild(s);
  } else continuar();
  function continuar() {
    if (!S.token) return NX.telaLogin();
    NX.$('#root').innerHTML = '<div class="gate"><div class="loading"><span class="spinner spin-sm"></span> Carregando seus orçamentos…</div></div>';
    NX.recarregar().then(entrar).catch(function (e) { if (S.token) { NX.$('#root').innerHTML = '<div class="gate"><div class="gate-card"><div class="logo">SOMMAR</div><h1>Não foi possível conectar</h1><p>' + NX.esc(e.message) + '</p><button class="btn primary" onclick="location.reload()">Tentar de novo</button></div></div>'; } });
  }
};
function entrar() { montarCasca(); navegar(); }
function telaInstalacao() {
  NX.$('#root').innerHTML = '<div class="gate"><div class="gate-card wide"><div class="logo">SOMMAR</div><h1>Falta conectar a planilha</h1>' +
    '<p>O site guarda os orçamentos numa planilha Google através de um pequeno servidor (Google Apps Script). Faça uma vez:</p>' +
    '<ol><li>Crie uma planilha Google (ex.: <b>Nanolux · Orçamentos</b>).</li><li>Na planilha: <b>Extensões → Apps Script</b>. Cole todo o conteúdo do arquivo <code>backend/Codigo.js</code> do repositório e salve.</li>' +
    '<li><b>Implantar → Nova implantação → App da Web</b>, com “Executar como: Eu” e “Quem pode acessar: Qualquer pessoa”. Autorize.</li>' +
    '<li>Copie a URL que termina em <code>/exec</code> e coloque em <code>config.js</code> (campo <code>apiUrl</code>).</li></ol>' +
    '<div class="inline" style="margin-bottom:18px"><button class="btn ghost small" id="btnCod" type="button">Copiar código do servidor</button><a class="btn ghost small" href="https://sheets.new" target="_blank" rel="noopener">Criar planilha Google</a></div>' +
    '<label class="f" style="margin-bottom:8px">Já implantou? Cole a URL do App da Web para usar neste navegador<div class="inline"><input type="url" id="apiUrl" placeholder="https://script.google.com/macros/s/…/exec"><button class="btn dark small" id="btnApi" type="button">Conectar</button></div></label>' +
    '<p class="muted" style="font-size:12.5px">Para valer para todos os vendedores, a URL também precisa estar no <code>config.js</code>.</p>' +
    '<p>Quer ver funcionando antes? Use o modo demonstração (os dados ficam só neste navegador).</p>' +
    '<button class="btn primary" id="btnDemo">Testar em modo demonstração</button></div></div>';
  NX.$('#btnDemo').onclick = function () { try { localStorage.setItem('nx-demo', '1'); } catch (e) {} location.reload(); };
  NX.$('#btnCod').onclick = function () { var b = this; fetch('backend/Codigo.js').then(function (r) { return r.text(); }).then(function (t) { NX.copiar(t, b); }).catch(function () { NX.toast('Abra o arquivo backend/Codigo.js no GitHub e copie o conteúdo.', true); }); };
  NX.$('#btnApi').onclick = function () { var u = NX.$('#apiUrl').value.trim(); if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(u)) return NX.toast('A URL deve começar com https://script.google.com/ e terminar em /exec', true); try { localStorage.setItem('nx-api', u); } catch (e) {} location.reload(); };
}
NX.telaLogin = function () {
  document.body.classList.remove('menu');
  NX.$('#root').innerHTML = '<div class="gate"><div class="gate-card"><div class="logo">SOMMAR</div><div class="loading" style="padding:20px 0"><span class="spinner spin-sm"></span> Conectando…</div></div></div>';
  NX.api('status').then(function (r) { form(!r.temUsuarios); }).catch(function (e) {
    NX.$('#root').innerHTML = '<div class="gate"><div class="gate-card"><div class="logo">SOMMAR</div><h1>Não foi possível conectar ao servidor</h1><p>' + NX.esc(e.message) + '</p><p>Confira a URL em <code>config.js</code> e se o App da Web está implantado para “Qualquer pessoa”.</p><button class="btn primary" onclick="location.reload()">Tentar de novo</button></div></div>';
  });
  function form(primeiro) {
    NX.$('#root').innerHTML = (S.demo ? '<div class="demo-band">Modo demonstração — os dados ficam só neste navegador.</div>' : '') +
      '<div class="gate"><div class="gate-card"><div class="logo">SOMMAR</div>' +
      (primeiro ? '<h1>Primeiro acesso</h1><p>Crie o usuário da <b>Diretoria</b>. Depois, no Painel da Diretoria, você cadastra os vendedores.</p>'
                : '<h1>Entrar</h1><p>Orçamentos Nanolux, histórico e comissões.</p>') +
      '<form id="fLogin" autocomplete="on"><label class="f">Nome<input type="text" name="nome" autocomplete="username" required></label>' +
      '<label class="f">PIN <span class="hint">(4 a 8 números)</span><input type="password" name="pin" inputmode="numeric" pattern="\\d{4,8}" autocomplete="current-password" required></label>' +
      (primeiro ? '<label class="f">Repita o PIN<input type="password" name="pin2" inputmode="numeric" required></label>' : '') +
      '<div class="err" id="lErr"></div><button class="btn primary" type="submit">' + (primeiro ? 'Criar e entrar' : 'Entrar') + '</button></form></div></div>';
    NX.$('#fLogin').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, nome = f.nome.value.trim(), pin = f.pin.value.trim(), btn = f.querySelector('button');
      if (primeiro && pin !== f.pin2.value.trim()) { NX.$('#lErr').textContent = 'Os PINs não conferem.'; return; }
      btn.disabled = true; NX.$('#lErr').textContent = '';
      NX.api(primeiro ? 'primeiroAcesso' : 'login', { nome: nome, pin: pin }).then(function (r) {
        S.token = r.token; try { localStorage.setItem('nx-token', r.token); } catch (err) {}
        return NX.recarregar();
      }).then(function () { if (!location.hash) location.hash = '#/inicio'; entrar(); })
        .catch(function (err) { btn.disabled = false; NX.$('#lErr').textContent = err.message; });
    });
    setTimeout(function () { var i = NX.$('#fLogin input'); if (i) i.focus(); }, 50);
  }
};

/* ---------- dados derivados ---------- */
NX.agendaTotal = function (fats) {
  var out = [];
  (fats || S.fats).forEach(function (f) { (f.agenda || []).forEach(function (a) { out.push(Object.assign({ fat: f }, a)); }); });
  return out;
};
NX.proximoMes = function () { return C.somaMes(NX.ym(NX.hoje()), 1); };

/* ---------- página inicial ---------- */
NX.paginas.inicio = function (view) {
  var hoje = NX.hoje(), gs = NX.grupos(), d30 = NX.somaDias(hoje, -30), d7 = NX.somaDias(hoje, -7), mes = NX.ym(hoje);
  var criado = function (g) { return String(g.criadoEm || '').slice(0, 10); };
  var total = gs.length, ult30 = gs.filter(function (g) { return criado(g) >= d30; }).length, ult7 = gs.filter(function (g) { return criado(g) >= d7; }).length;
  var doMes = gs.filter(function (g) { return NX.ym(criado(g)) === mes; }).length, fatur = gs.filter(function (g) { return g.faturado; }).length;
  var conv = total ? Math.round(fatur / total * 1000) / 10 : 0;
  var tempos = S.fats.map(function (f) { return NX.dias(String(f.orcCriadoEm || '').slice(0, 10), f.primeiroPagamento); }).filter(function (x) { return x != null && x >= 0; });
  var tmed = tempos.length ? Math.round(tempos.reduce(function (a, b) { return a + b; }, 0) / tempos.length) : null;
  var prox = NX.proximoMes(), ag = NX.agendaTotal();
  var comProx = ag.filter(function (a) { return a.mesComissao === prox; }).reduce(function (s, a) { return s + a.valor; }, 0);
  var comMes = ag.filter(function (a) { return a.mesComissao === mes; }).reduce(function (s, a) { return s + a.valor; }, 0);
  var alertas = [];
  gs.forEach(function (g) {
    var o = g.atual; if (!o || g.faturado || o.substituidoPor || !o.validade) return;
    var dd = NX.dias(hoje, o.validade);
    if (dd >= 0 && dd <= 3) alertas.push({ o: o, d: dd, t: dd === 0 ? 'vence hoje' : dd === 1 ? 'vence amanhã' : 'vence em ' + dd + ' dias' });
    else if (dd < 0 && dd >= -7) alertas.push({ o: o, d: dd, t: 'venceu há ' + (-dd) + (dd === -1 ? ' dia' : ' dias') });
  });
  alertas.sort(function (a, b) { return Math.abs(a.d) - Math.abs(b.d) || a.d - b.d; });
  var nome = (S.user.nome || '').split(' ')[0];
  var h = new Date().getHours(), saud = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  var tile = function (k, v, s, hero) { return '<div class="tile' + (hero ? ' hero' : '') + '"><div class="k">' + k + '</div><div class="v">' + v + '</div>' + (s ? '<div class="s">' + s + '</div>' : '') + '</div>'; };
  view.innerHTML = '<div class="page">' +
    '<div class="hello"><div><h1>' + saud + ', ' + NX.esc(nome) + '!</h1><p>' + (NX.eDiretor() ? 'Resumo de toda a equipe.' : 'Seu resumo de orçamentos e comissões.') + '</p></div>' +
      '<div class="actions" style="display:flex;gap:10px"><button class="btn ghost" id="hRef">' + IC.sync.replace('<svg', '<svg width="16" height="16" style="stroke:currentColor;fill:none;stroke-width:2"') + ' Atualizar dados</button><button class="btn primary" id="hNovo">+ Novo orçamento</button></div></div>' +
    '<div class="tiles">' +
      tile('Comissão a receber em ' + NX.mesNome(prox).split(' de ')[0], NX.brl(comProx), comMes > 0 ? NX.brl(comMes) + ' a receber neste mês' : 'pago no mês seguinte ao recebimento', true) +
      tile('Total de orçamentos', total, fatur + ' faturado' + (fatur === 1 ? '' : 's')) +
      tile('Últimos 30 dias', ult30) + tile('Este mês', doMes, NX.mesNome(mes).split(' de ')[0]) + tile('Última semana', ult7) +
      tile('Conversão', String(conv).replace('.', ',') + '%', 'faturados ÷ orçamentos') +
      tile('Tempo médio de conversão', tmed == null ? '—' : tmed + (tmed === 1 ? ' dia' : ' dias'), 'da criação ao 1º pagamento') +
    '</div>' +
    '<div class="home-grid"><div class="card alert-card"><h2>' + IC.alerta.replace('<svg', '<svg width="18" height="18" style="stroke:currentColor;fill:none;stroke-width:2"') + ' Alertas de validade</h2>' +
      (alertas.length ? '<p style="margin:-6px 0 12px;color:#8a4600;font-size:13px">Hein! Será que esqueceu de cutucar esses clientes para fazer novas ofertas?</p><div class="alert-list">' + alertas.slice(0, 8).map(function (a) {
        return '<div class="alert-item"><div class="t"><b>' + NX.esc(a.o.cliente || 'Sem nome') + '</b><span>' + NX.esc(a.o.numero || '') + ' · ' + NX.brl(a.o.valorFinal) + ' · ' + a.t + '</span></div>' +
          '<span class="tag ' + (a.d < 0 ? 'vencido' : 'alerta') + '">' + NX.dataBR(a.o.validade) + '</span>' +
          '<button class="btn tiny ghost" data-abrir="' + a.o.id + '">Abrir</button><button class="btn tiny warn" data-atualizar="' + a.o.id + '">Nova oferta</button></div>';
      }).join('') + '</div>' : '<p class="muted" style="margin:0">Nenhum orçamento perto de vencer. Tudo em dia!</p>') +
    '</div><div class="card"><h2>Atalhos</h2><div class="quick">' +
      '<a class="qbtn" href="#/proposta" data-novo="1">' + IC.proposta + 'Nova proposta<small>Montar orçamento e PDF</small></a>' +
      '<a class="qbtn" href="#/historico">' + IC.historico + 'Histórico<small>Orçamentos feitos</small></a>' +
      '<a class="qbtn" href="#/comissoes">' + IC.comissoes + 'Comissões<small>Faturados e previsão</small></a>' +
      (NX.eDiretor() ? '<a class="qbtn" href="#/diretoria">' + IC.diretoria + 'Diretoria<small>Taxas, comissão, usuários</small></a>' : '') +
      '<a class="qbtn" href="' + NX.esc(NX.url(S.cfg.asanaUrl) || 'https://app.asana.com/') + '" target="_blank" rel="noopener">' + IC.asana + 'Asana SOMMAR<small>Informações de vendas</small></a>' +
      '<button class="qbtn" disabled title="Em breve">' + IC.sync + 'Atualizar Asana<small>Em breve</small></button>' +
    '</div></div></div></div>';
  NX.$('#hNovo').onclick = function () { NX.proposta.novo(); };
  NX.$('[data-novo]', view).onclick = function (e) { e.preventDefault(); NX.proposta.novo(); };
  NX.$('#hRef').onclick = function () { var b = this; b.disabled = true; NX.recarregar().then(function () { NX.paginas.inicio(view); NX.toast('Dados atualizados'); }).catch(function (e) { b.disabled = false; NX.toast(e.message, true); }); };
  NX.$$('[data-abrir]', view).forEach(function (b) { b.onclick = function () { NX.proposta.abrir(b.dataset.abrir); }; });
  NX.$$('[data-atualizar]', view).forEach(function (b) { b.onclick = function () { NX.proposta.atualizar(b.dataset.atualizar); }; });
};
})();
