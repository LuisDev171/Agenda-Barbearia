/* =====================================================
   Agenda Barber | camada de dados e regras de horário
   Modo atual: dados salvos no navegador (localStorage).
   Para a nuvem (várias barbearias, clientes em outros aparelhos),
   veja supabase.sql e o README.
   ===================================================== */
var Agenda = (function () {
  var K = "agenda-barber-v1";
  var KMEUS = "agenda-barber-meus-v1";
  var DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  var DIAS_CURTO = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  var MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function pad(n) { return String(n).padStart(2, "0"); }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function hoje() { return iso(new Date()); }
  function parse(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDias(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return iso(d); }
  function toMin(h) { var p = h.split(":"); return +p[0] * 60 + +p[1]; }
  function fromMin(m) { return pad(Math.floor(m / 60)) + ":" + pad(m % 60); }
  function money(n) { return "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmtData(s) { var p = s.split("-"); return p[2] + "/" + p[1] + "/" + p[0]; }
  function nomeDia(s) { var d = parse(s); return DIAS[d.getDay()]; }
  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function digitos(t) { return String(t || "").replace(/\D/g, ""); }
  function foneWa(t) { var d = digitos(t); if (d.length <= 11) d = "55" + d; return d; }
  function maskFone(v) {
    var d = digitos(v).slice(0, 11), o = "";
    if (d.length > 0) o = "(" + d.slice(0, 2);
    if (d.length >= 3) o += ") " + d.slice(2, d.length > 10 ? 7 : 6);
    if (d.length > (d.length > 10 ? 7 : 6)) o += "-" + d.slice(d.length > 10 ? 7 : 6);
    return o;
  }

  function seed() {
    return {
      shop: { nome: "Barbearia Demo", whats: "5512992498702", abre: "09:00", fecha: "19:00", dias: [1, 2, 3, 4, 5, 6], passo: 30, pausaDe: "12:00", pausaAte: "13:00", pin: null },
      servicos: [
        { id: "s1", nome: "Corte", min: 30, preco: 40 },
        { id: "s2", nome: "Barba", min: 30, preco: 30 },
        { id: "s3", nome: "Corte + barba", min: 60, preco: 65 },
        { id: "s4", nome: "Sobrancelha", min: 15, preco: 15 }
      ],
      equipe: [{ id: "p1", nome: "Rafa" }, { id: "p2", nome: "Diego" }],
      ag: []
    };
  }

  var db;
  function load() {
    try { db = JSON.parse(localStorage.getItem(K)); } catch (e) { db = null; }
    if (!db || !db.shop) db = seed();
    return db;
  }
  function save() { try { localStorage.setItem(K, JSON.stringify(db)); } catch (e) {} }
  load();

  /* ---------- dia aberto? ---------- */
  function aberto(data) { return db.shop.dias.indexOf(parse(data).getDay()) > -1; }

  /* ---------- horários ---------- */
  function ocupa(profId, data) {
    return db.ag.filter(function (a) { return a.data === data && a.profId === profId && a.status !== "cancelado"; });
  }
  function livre(profId, data, ini, dur, ignorarId) {
    var fim = ini + dur;
    return ocupa(profId, data).every(function (a) {
      if (a.id === ignorarId) return true;
      var s = toMin(a.hora), e = s + a.dur;
      return fim <= s || ini >= e;
    });
  }
  function slots(data, profId, dur, ignorarId) {
    // profId = id ou "any"
    var s = db.shop, out = [];
    if (!aberto(data)) return out;
    var ini = toMin(s.abre), fim = toMin(s.fecha), passo = s.passo || 30;
    var pd = s.pausaDe ? toMin(s.pausaDe) : null, pa = s.pausaAte ? toMin(s.pausaAte) : null;
    var agora = new Date(), eHoje = data === hoje(), minAgora = agora.getHours() * 60 + agora.getMinutes();
    for (var m = ini; m + dur <= fim; m += passo) {
      if (eHoje && m <= minAgora) continue;
      if (pd != null && pa != null && m < pa && m + dur > pd) continue;
      var profs = profId === "any" ? db.equipe.map(function (p) { return p.id; }) : [profId], livreCom = null;
      for (var i = 0; i < profs.length; i++) { if (livre(profs[i], data, m, dur, ignorarId)) { livreCom = profs[i]; break; } }
      if (livreCom) out.push({ h: fromMin(m), profId: livreCom });
    }
    return out;
  }
  function temVaga(data, profId, dur) { return slots(data, profId, dur).length > 0; }

  /* ---------- agendamentos ---------- */
  function nomeProf(id) { var p = db.equipe.filter(function (x) { return x.id === id; })[0]; return p ? p.nome : "Profissional"; }
  function criar(o) {
    if (!livre(o.profId, o.data, toMin(o.hora), o.dur)) throw new Error("Esse horário acabou de ser ocupado. Escolha outro.");
    var a = {
      id: uid(), data: o.data, hora: o.hora, dur: o.dur, servId: o.servId || null, servNome: o.servNome || "",
      preco: o.preco || 0, profId: o.profId, profNome: nomeProf(o.profId), nome: o.nome || "", tel: o.tel || "",
      status: o.bloqueio ? "bloqueio" : "confirmado", criado: Date.now()
    };
    db.ag.push(a); save(); return a;
  }
  function achar(id) { return db.ag.filter(function (a) { return a.id === id; })[0]; }
  function status(id, st) { var a = achar(id); if (a) { a.status = st; save(); } return a; }
  function apagar(id) { db.ag = db.ag.filter(function (a) { return a.id !== id; }); save(); }
  function doDia(data) {
    return db.ag.filter(function (a) { return a.data === data; }).sort(function (a, b) { return a.hora < b.hora ? -1 : a.hora > b.hora ? 1 : 0; });
  }

  /* meus agendamentos neste aparelho (lado do cliente) */
  function meus() { try { return JSON.parse(localStorage.getItem(KMEUS) || "[]"); } catch (e) { return []; } }
  function lembrar(id) { var l = meus(); l.push(id); try { localStorage.setItem(KMEUS, JSON.stringify(l)); } catch (e) {} }

  /* ---------- exemplo para demonstração ---------- */
  function demo() {
    var h = hoje(), ontem = addDias(h, -1), amanha = addDias(h, 1);
    var nomes = ["Carlos Silva", "Marcos Lima", "Bruno Costa", "João Pedro", "André Souza", "Felipe Rocha", "Thiago Alves", "Lucas Martins", "Gustavo Dias", "Rodrigo Nunes"];
    db.ag = db.ag.filter(function (a) { return !a.demo; });
    function put(data, hora, servIdx, profIdx, nome, st) {
      var s = db.servicos[servIdx % db.servicos.length], p = db.equipe[profIdx % db.equipe.length];
      if (!livre(p.id, data, toMin(hora), s.min)) return;
      db.ag.push({ id: uid(), data: data, hora: hora, dur: s.min, servId: s.id, servNome: s.nome, preco: s.preco, profId: p.id, profNome: p.nome, nome: nome, tel: "(12) 99" + Math.floor(1000 + Math.random() * 8999) + "-" + Math.floor(1000 + Math.random() * 8999), status: st, criado: Date.now(), demo: true });
    }
    for (var d = -13; d <= 0; d++) {
      var dia = addDias(h, d), wd = parse(dia).getDay();
      if (db.shop.dias.indexOf(wd) < 0) continue;
      var n = 4 + ((d * d + 3) % 5);
      var horas = ["09:00", "09:30", "10:00", "10:30", "11:00", "13:00", "14:00", "14:30", "15:00", "16:00", "17:00", "18:00"];
      for (var i = 0; i < n; i++) put(dia, horas[(i * 2 + (d + 20)) % horas.length], i + d + 20, i, nomes[(i + d + 20) % nomes.length], d < 0 ? (i === 3 && d % 4 === 0 ? "cancelado" : "concluido") : "confirmado");
    }
    put(h, "15:30", 2, 0, nomes[0], "confirmado"); put(h, "16:30", 0, 1, nomes[2], "confirmado"); put(h, "17:30", 1, 0, nomes[5], "confirmado"); put(h, "18:00", 2, 1, nomes[7], "confirmado");
    put(amanha, "10:00", 0, 0, nomes[1], "confirmado"); put(amanha, "11:00", 2, 1, nomes[3], "confirmado");
    save();
  }

  /* ---------- hash da senha do painel ---------- */
  function sha(s) {
    if (!window.crypto || !crypto.subtle) return Promise.resolve("x" + btoa(unescape(encodeURIComponent(s))));
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode("agenda|" + s)).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return pad(x.toString(16)); }).join("");
    });
  }

  function ics(a) {
    var d = a.data.replace(/-/g, ""), ini = a.hora.replace(":", "") + "00", fm = toMin(a.hora) + a.dur, fim = fromMin(fm).replace(":", "") + "00";
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Agenda Barber//PT", "BEGIN:VEVENT", "UID:" + a.id + "@agenda-barber",
      "DTSTAMP:" + d + "T" + ini, "DTSTART:" + d + "T" + ini, "DTEND:" + d + "T" + fim,
      "SUMMARY:" + a.servNome + " - " + db.shop.nome, "DESCRIPTION:Com " + a.profNome, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  }

  return {
    get db() { return db; }, load: load, save: save, seed: seed,
    reset: function () { db = seed(); save(); },
    DIAS: DIAS, DIAS_CURTO: DIAS_CURTO, MESES: MESES,
    uid: uid, pad: pad, iso: iso, hoje: hoje, parse: parse, addDias: addDias, toMin: toMin, fromMin: fromMin,
    money: money, esc: esc, fmtData: fmtData, nomeDia: nomeDia, cap: cap, digitos: digitos, foneWa: foneWa, maskFone: maskFone,
    aberto: aberto, slots: slots, temVaga: temVaga, livre: livre, criar: criar, achar: achar, status: status, apagar: apagar,
    doDia: doDia, meus: meus, lembrar: lembrar, demo: demo, sha: sha, ics: ics, nomeProf: nomeProf
  };
})();
