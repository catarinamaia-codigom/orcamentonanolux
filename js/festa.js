/* Sistema Nanolux · SOMMAR — comemoração de venda faturada (uma animação diferente a cada vez) */
(function () {
'use strict';
var NX = window.NX, S = NX.S, brl = NX.brl, esc = NX.esc;
var CORES = ['#14a8c2', '#60c24b', '#ffd23f', '#ff5d8f', '#8b6cf0', '#ffffff', '#ff9f1c'];
var VARIANTES = ['confete', 'foguete', 'dinheiro', 'fogos', 'carimbo'];
var FRASES = {
  confete: ['BORA PORRA!!!!', 'ISSO AEEE!'],
  foguete: ['VENDAAA! 🚀', 'PRO ESPAÇO!'],
  dinheiro: ['TU AHAZA, CARAI!', 'CHOVEU DINHEIRO!'],
  fogos: ['ISSO AEEE!', 'É DE MILHÕES!'],
  carimbo: ['FECHOU, VISSE?!', 'MÁQUINA DE VENDAS!']
};
function rnd(a, b) { return a + Math.random() * (b - a); }
function pega(l) { return l[Math.floor(Math.random() * l.length)]; }

/* fatos do dia para o subtítulo */
function fatos(f) {
  var meus = S.fats.filter(function (x) { return x.vendedorId === f.vendedorId && x.id !== f.id; });
  var hoje = NX.hoje(), sem = NX.somaDias(hoje, -7), mes = NX.ym(hoje), out = [];
  var daSemana = meus.filter(function (x) { return String(x.faturadoEm).slice(0, 10) >= sem && x.area > 0; });
  var doMes = meus.filter(function (x) { return NX.ym(String(x.faturadoEm).slice(0, 10)) === mes; });
  if (f.area > 0 && daSemana.length && daSemana.every(function (x) { return f.m2Efetivo > x.m2Efetivo; })) out.push('Essa venda foi teu melhor m² da semana! (' + brl(f.m2Efetivo) + '/m²)');
  else if (doMes.length && doMes.every(function (x) { return f.valorFinal > x.valorFinal; })) out.push('Maior venda do mês até agora! 🏆');
  else if (!meus.length) out.push('Primeira venda no sistema. Que comece a sequência!');
  else out.push((doMes.length + 1) + 'ª venda de ' + NX.mesNome(mes).split(' de ')[0] + '. Segue o baile!');
  out.push(brl(f.comissao) + ' de comissão no bolso 💸');
  if (f.area > 0) out.push(NX.f2(f.area) + ' m² de vidro protegido ☀️');
  return out;
}

NX.festa = function (f) {
  return new Promise(function (resolve) {
    var reduz = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var ult = ''; try { ult = localStorage.getItem('nx-festa') || ''; } catch (e) {}
    var opcoes = VARIANTES.filter(function (v) { return v !== ult; }), v = window.NX_FESTA_FIXA || pega(opcoes);
    try { localStorage.setItem('nx-festa', v); } catch (e) {}
    var fs = fatos(f), titulo = pega(FRASES[v]);
    var el = document.createElement('div');
    el.className = 'festa festa-' + v;
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Venda faturada');
    el.innerHTML = '<canvas></canvas>' +
      (v === 'foguete' ? '<div class="festa-rocket">🚀</div>' : '') +
      (v === 'carimbo' ? '<div class="festa-stamp"><span>VENDIDO</span></div>' : '') +
      '<div class="festa-box"><div class="festa-t">' + esc(titulo) + '</div>' +
      '<div class="festa-cli">' + esc(f.cliente || '') + ' · <b>' + brl(f.valorFinal) + '</b></div>' +
      '<div class="festa-s">' + fs.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>' +
      '<div class="festa-hint">clique para continuar</div></div>';
    document.body.appendChild(el);
    var cv = el.querySelector('canvas'), ctx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1), W, H;
    function tam() { W = window.innerWidth; H = window.innerHeight; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    tam(); window.addEventListener('resize', tam);
    var ps = [], t0 = performance.now(), raf, fim = false, agenda = [];
    function quando(ms, fn) { agenda.push({ ms: ms, fn: fn }); }

    /* ---- partículas ---- */
    function confete(x, y, n, ang, abre, vel) {
      for (var i = 0; i < n; i++) {
        var a = ang + rnd(-abre, abre), s = rnd(vel * 0.55, vel);
        ps.push({ k: 'c', x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: rnd(0, 6.28), vr: rnd(-0.3, 0.3), w: rnd(6, 11), h: rnd(9, 16), c: pega(CORES), g: 0.32, d: 0.985, vida: rnd(2600, 3800), t: 0 });
      }
    }
    function estouro(x, y, n, cor, vel) {
      for (var i = 0; i < n; i++) {
        var a = Math.PI * 2 * i / n + rnd(-0.05, 0.05), s = rnd(vel * 0.4, vel);
        ps.push({ k: 'f', x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, c: cor || pega(CORES), g: 0.06, d: 0.965, vida: rnd(900, 1500), t: 0, rr: rnd(1.6, 3) });
      }
    }
    function nota(x) {
      var coin = Math.random() < 0.35;
      ps.push({ k: coin ? 'm' : 'n', x: x, y: -40, vx: 0, vy: rnd(2.2, 4.4), r: rnd(-0.6, 0.6), vr: rnd(-0.05, 0.05), fase: rnd(0, 6.28), amp: rnd(0.6, 1.8), g: 0.02, d: 1, vida: 6000, t: 0, s: rnd(0.8, 1.25) });
    }
    function fumaca(x, y) { ps.push({ k: 's', x: x + rnd(-8, 8), y: y, vx: rnd(-0.6, 0.6), vy: rnd(1, 2.5), g: -0.01, d: 0.98, vida: rnd(700, 1100), t: 0, rr: rnd(8, 16) }); }
    function poeira(x, y) { for (var i = 0; i < 46; i++) { var a = rnd(0, 6.28), s = rnd(3, 9); ps.push({ k: 's', x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.45, g: 0, d: 0.93, vida: rnd(600, 1000), t: 0, rr: rnd(6, 14) }); } }

    /* ---- roteiros ---- */
    if (!reduz) {
      if (v === 'confete') {
        quando(0, function () { confete(0, H, 110, -Math.PI / 3.2, 0.42, 21); confete(W, H, 110, -Math.PI + Math.PI / 3.2, 0.42, 21); });
        quando(850, function () { confete(W / 2, H + 10, 140, -Math.PI / 2, 0.55, 24); });
        quando(1700, function () { confete(0, H * 0.7, 60, -Math.PI / 4, 0.35, 17); confete(W, H * 0.7, 60, -Math.PI * 3 / 4, 0.35, 17); });
      } else if (v === 'foguete') {
        var rk = el.querySelector('.festa-rocket');
        for (var k = 0; k < 28; k++) (function (k) { quando(k * 40, function () { var r = rk.getBoundingClientRect(); fumaca(r.left + r.width * 0.3, r.bottom - 6); }); })(k);
        quando(1150, function () { estouro(W / 2, H * 0.22, 130, null, 9); confete(W / 2, H * 0.22, 80, -Math.PI / 2, Math.PI, 12); });
        quando(1700, function () { estouro(W * 0.25, H * 0.3, 70, '#ffd23f', 7); estouro(W * 0.75, H * 0.28, 70, '#60c24b', 7); });
      } else if (v === 'dinheiro') {
        for (var j = 0; j < 70; j++) (function (j) { quando(j * 45, function () { nota(rnd(0, W)); }); })(j);
      } else if (v === 'fogos') {
        for (var q = 0; q < 9; q++) (function (q) { quando(q * 360, function () { estouro(rnd(W * 0.15, W * 0.85), rnd(H * 0.12, H * 0.45), 80, pega(CORES.slice(0, 5)), rnd(6, 9)); }); })(q);
      } else if (v === 'carimbo') {
        quando(430, function () { var st = el.querySelector('.festa-stamp').getBoundingClientRect(); poeira(st.left + st.width / 2, st.top + st.height / 2); el.classList.add('treme'); });
        quando(1100, function () { confete(W / 2, H + 10, 90, -Math.PI / 2, 0.6, 20); });
      }
    }
    function quadro(agora) {
      var t = agora - t0;
      while (agenda.length && agenda[0].ms <= t) agenda.shift().fn();
      ctx.clearRect(0, 0, W, H);
      for (var i = ps.length - 1; i >= 0; i--) {
        var p = ps[i]; p.t += 16;
        if (p.t > p.vida || p.y > H + 80) { ps.splice(i, 1); continue; }
        p.vx *= p.d; p.vy = p.vy * p.d + p.g; p.x += p.vx; p.y += p.vy;
        var al = Math.max(0, 1 - Math.max(0, p.t - p.vida * 0.7) / (p.vida * 0.3));
        ctx.globalAlpha = al;
        if (p.k === 'c') { p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(1, Math.cos(p.t / 90)); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); }
        else if (p.k === 'f') { ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.rr, 0, 6.28); ctx.fill(); ctx.globalAlpha = al * 0.25; ctx.beginPath(); ctx.arc(p.x - p.vx * 2, p.y - p.vy * 2, p.rr * 0.8, 0, 6.28); ctx.fill(); }
        else if (p.k === 's') { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.globalAlpha = al * 0.55; ctx.beginPath(); ctx.arc(p.x, p.y, p.rr * (1 + p.t / 900), 0, 6.28); ctx.fill(); }
        else if (p.k === 'n' || p.k === 'm') {
          p.x += Math.sin(p.t / 260 + p.fase) * p.amp; p.r += p.vr;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r + Math.sin(p.t / 300 + p.fase) * 0.4); ctx.scale(p.s, p.s);
          if (p.k === 'n') { ctx.fillStyle = '#2f9e44'; ctx.fillRect(-26, -13, 52, 26); ctx.strokeStyle = '#b8f2c6'; ctx.lineWidth = 2; ctx.strokeRect(-22, -9, 44, 18); ctx.fillStyle = '#e9ffe9'; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('R$', 0, 1); }
          else { ctx.fillStyle = '#ffcf33'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, 6.28); ctx.fill(); ctx.strokeStyle = '#e0a800'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#9a6b00'; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, 1); }
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      if (!fim) raf = requestAnimationFrame(quadro);
    }
    agenda.sort(function (a, b) { return a.ms - b.ms; });
    raf = requestAnimationFrame(quadro);
    requestAnimationFrame(function () { el.classList.add('on'); });
    function fechar() {
      if (fim) return; fim = true; cancelAnimationFrame(raf);
      el.classList.add('sai'); window.removeEventListener('resize', tam); document.removeEventListener('keydown', tecla);
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); resolve(); }, 320);
    }
    function tecla(e) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') fechar(); }
    el.addEventListener('click', fechar); document.addEventListener('keydown', tecla);
    setTimeout(fechar, reduz ? 3000 : 5600);
  });
};
})();
