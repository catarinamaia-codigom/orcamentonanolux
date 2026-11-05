/* Modo demonstração: simula os serviços do Google Apps Script (planilha, segurança, cache)
   dentro do navegador, guardando tudo no localStorage. Assim o MESMO código do servidor
   (backend/Codigo.js) roda aqui para testes, sem precisar da planilha real. */
(function (g) {
  var KEY = 'nx-demo-planilha';
  function carregar() { try { return JSON.parse(localStorage.getItem(KEY)) || { abas: {}, props: {} }; } catch (e) { return { abas: {}, props: {} }; } }
  var db = carregar();
  function persistir() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }

  /* ---- SHA-256 / HMAC síncronos ---- */
  function utf8(s) { return Array.prototype.slice.call(new TextEncoder().encode(String(s))); }
  var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  function sha256(bytes) {
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var m = bytes.slice(), l = bytes.length * 8; m.push(0x80);
    while (m.length % 64 !== 56) m.push(0);
    for (var i = 7; i >= 0; i--) m.push(i > 3 ? 0 : (l >>> (i * 8)) & 0xff);
    var w = new Array(64);
    for (var o = 0; o < m.length; o += 64) {
      for (var t = 0; t < 16; t++) w[t] = (m[o + t * 4] << 24) | (m[o + t * 4 + 1] << 16) | (m[o + t * 4 + 2] << 8) | m[o + t * 4 + 3];
      for (t = 16; t < 64; t++) {
        var s0 = ((w[t - 15] >>> 7) | (w[t - 15] << 25)) ^ ((w[t - 15] >>> 18) | (w[t - 15] << 14)) ^ (w[t - 15] >>> 3);
        var s1 = ((w[t - 2] >>> 17) | (w[t - 2] << 15)) ^ ((w[t - 2] >>> 19) | (w[t - 2] << 13)) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], gg = H[6], h = H[7];
      for (t = 0; t < 64; t++) {
        var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        var ch = (e & f) ^ (~e & gg), t1 = (h + S1 + ch + K[t] + w[t]) | 0;
        var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        var mj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + mj) | 0;
        h = gg; gg = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + gg) | 0; H[7] = (H[7] + h) | 0;
    }
    var out = []; H.forEach(function (x) { out.push((x >>> 24) & 0xff, (x >>> 16) & 0xff, (x >>> 8) & 0xff, x & 0xff); });
    return out;
  }
  function hmac(msg, key) {
    var k = utf8(key); if (k.length > 64) k = sha256(k);
    while (k.length < 64) k.push(0);
    var ip = k.map(function (x) { return x ^ 0x36; }), op = k.map(function (x) { return x ^ 0x5c; });
    return sha256(op.concat(sha256(ip.concat(utf8(msg)))));
  }
  function b64ws(v) {
    var bytes = typeof v === 'string' ? utf8(v) : v, s = '';
    bytes.forEach(function (b) { s += String.fromCharCode(b & 0xff); });
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_');
  }
  function b64wsDecode(s) {
    var bin = atob(s.replace(/-/g, '+').replace(/_/g, '/')), out = [];
    for (var i = 0; i < bin.length; i++) out.push(bin.charCodeAt(i));
    return out;
  }

  /* ---- planilha ---- */
  function Sheet(nome) { this.nome = nome; }
  Sheet.prototype.linhas = function () { return db.abas[this.nome]; };
  Sheet.prototype.appendRow = function (r) { this.linhas().push(r.slice()); persistir(); return this; };
  Sheet.prototype.setFrozenRows = function () { return this; };
  Sheet.prototype.getLastRow = function () { return this.linhas().length; };
  Sheet.prototype.getDataRange = function () { var self = this; return { getValues: function () { return JSON.parse(JSON.stringify(self.linhas())); } }; };
  Sheet.prototype.getRange = function (row, col, nr, nc) {
    var self = this;
    return { setValues: function (vals) { for (var i = 0; i < nr; i++) { var r = self.linhas()[row - 1 + i] || []; for (var j = 0; j < nc; j++) r[col - 1 + j] = vals[i][j]; self.linhas()[row - 1 + i] = r; } persistir(); } };
  };
  g.SpreadsheetApp = {
    getActiveSpreadsheet: function () {
      return {
        getSheetByName: function (n) { return db.abas[n] ? new Sheet(n) : null; },
        insertSheet: function (n) { db.abas[n] = []; persistir(); return new Sheet(n); }
      };
    }
  };
  g.PropertiesService = { getScriptProperties: function () { return { getProperty: function (k) { return db.props[k] || null; }, setProperty: function (k, v) { db.props[k] = v; persistir(); } }; } };
  var cache = {};
  g.CacheService = { getScriptCache: function () { return { get: function (k) { return cache[k] || null; }, put: function (k, v) { cache[k] = v; }, remove: function (k) { delete cache[k]; } }; } };
  g.LockService = { getScriptLock: function () { return { waitLock: function () {}, releaseLock: function () {} }; } };
  g.Utilities = {
    DigestAlgorithm: { SHA_256: 'SHA_256' },
    getUuid: function () { return (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)); },
    computeDigest: function (alg, s) { return sha256(utf8(s)); },
    computeHmacSha256Signature: function (v, k) { return hmac(v, k); },
    base64EncodeWebSafe: b64ws,
    base64DecodeWebSafe: b64wsDecode,
    newBlob: function (bytes) { return { getDataAsString: function () { return new TextDecoder().decode(new Uint8Array(bytes)); } }; }
  };
  g.ContentService = {
    MimeType: { JSON: 'JSON' },
    createTextOutput: function (s) { var o = { c: s, setMimeType: function () { return o; }, getContent: function () { return o.c; } }; return o; }
  };
  g.NX_DEMO = {
    chamar: function (req) { return JSON.parse(g.doPost({ postData: { contents: JSON.stringify(req) } }).getContent()); },
    apagar: function () { db = { abas: {}, props: {} }; persistir(); }
  };
})(window);
