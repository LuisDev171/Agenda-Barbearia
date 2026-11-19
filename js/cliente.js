/* =====================================================
   Agenda Barber | página do cliente (agendar horário)
   Passos: serviço > profissional > dia e hora > dados > comanda
   ===================================================== */
(function () {
  var A = Agenda, $ = function (id) { return document.getElementById(id); };
  var app = $("app");
  var st = { passo: 1, serv: null, prof: null, data: null, hora: null, profReal: null, nome: "", tel: "", ag: null };
  var db = A.db;

  function toast(m) { var t = $("toast"); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, 2600); }
  function titulo() {
    $("brand").innerHTML = A.esc(db.shop.nome) + "<small>Agende o seu horário</small>";
    document.title = "Agendar · " + db.shop.nome;
  }
  function barra(n) { var s = ""; for (var i = 1; i <= 4; i++) s += '<i class="' + (i <= n ? "on" : "") + '"></i>'; return '<div class="steps" role="img" aria-label="Passo ' + n + ' de 4">' + s + "</div>"; }
  function voltar(p) { return '<button type="button" class="back" data-go="' + p + '">‹ Voltar</button>'; }
  function servico() { return db.servicos.filter(function (s) { return s.id === st.serv; })[0]; }
  function diaCurto(d) { var dt = A.parse(d); return { sem: A.DIAS_CURTO[dt.getDay()], n: dt.getDate() }; }

  /* ---------- 1: serviço ---------- */
  function p1() {
    var meus = A.meus().map(A.achar).filter(function (a) { return a && a.status === "confirmado" && (a.data > A.hoje() || (a.data === A.hoje() && a.hora > A.fromMin(new Date().getHours() * 60 + new Date().getMinutes()))); });
    app.innerHTML = barra(1) + '<h1 class="q">O que vamos fazer hoje?</h1>' +
      (db.servicos.length ? '<div class="list" style="gap:10px">' + db.servicos.map(function (s) {
        return '<button type="button" class="opt" data-serv="' + s.id + '"><b>' + A.esc(s.nome) + "</b><small>" + s.min + " min</small><span class=\"v num\">" + A.money(s.preco) + "</span></button>";
      }).join("") + "</div>" : '<div class="empty">Esta barbearia ainda não cadastrou serviços.</div>') +
      (meus.length ? '<section class="card"><h2 style="font-size:17px">Seus horários marcados</h2>' + meus.map(function (a) {
        return '<div class="mine"><div><b>' + A.fmtData(a.data).slice(0, 5) + " às " + a.hora + "</b><br><small class=\"muted\">" + A.esc(a.servNome) + " com " + A.esc(a.profNome) + '</small></div><button type="button" class="btn small danger" data-cancel="' + a.id + '">Cancelar</button></div>';
      }).join("") + "</section>" : "");
  }

  /* ---------- 2: profissional ---------- */
  function p2() {
    var s = servico();
    app.innerHTML = barra(2) + voltar(1) + '<h1 class="q">Com quem você quer cortar?</h1><div class="list" style="gap:10px">' +
      '<button type="button" class="opt" data-prof="any"><b>Sem preferência</b><small>O primeiro horário livre</small><span class="av" aria-hidden="true">★</span></button>' +
      db.equipe.map(function (p) { return '<button type="button" class="opt" data-prof="' + p.id + '"><b>' + A.esc(p.nome) + '</b><small>' + A.esc(s.nome) + '</small><span class="av" aria-hidden="true">' + A.esc(p.nome.charAt(0).toUpperCase()) + "</span></button>"; }).join("") + "</div>";
  }

  /* ---------- 3: dia e hora ---------- */
  function dias14() { var l = [], h = A.hoje(); for (var i = 0; i < 14; i++) l.push(A.addDias(h, i)); return l; }
  function p3() {
    var s = servico(), lista = dias14();
    if (!st.data || lista.indexOf(st.data) < 0 || !A.temVaga(st.data, st.prof, s.min)) {
      st.data = lista.filter(function (d) { return A.temVaga(d, st.prof, s.min); })[0] || lista[0]; st.hora = null;
    }
    var sl = A.slots(st.data, st.prof, s.min);
    app.innerHTML = barra(3) + voltar(2) + '<h1 class="q">Quando fica bom para você?</h1>' +
      '<div class="days" role="group" aria-label="Dia">' + lista.map(function (d) {
        var c = diaCurto(d), ok = A.temVaga(d, st.prof, s.min);
        return '<button type="button" class="day" data-dia="' + d + '" aria-pressed="' + (d === st.data) + '"' + (ok ? "" : " disabled") + '><small>' + (d === A.hoje() ? "hoje" : c.sem) + "</small><b>" + c.n + "</b></button>";
      }).join("") + "</div>" +
      '<h2 style="font-size:17px">' + A.cap(A.nomeDia(st.data)) + ", " + A.fmtData(st.data).slice(0, 5) + "</h2>" +
      (sl.length ? '<div class="hours" role="group" aria-label="Horário">' + sl.map(function (x) { return '<button type="button" class="hr" data-hora="' + x.h + '" data-pr="' + x.profId + '" aria-pressed="' + (x.h === st.hora) + '">' + x.h + "</button>"; }).join("") + "</div>"
        : '<div class="empty">Sem horários livres neste dia. Escolha outro dia acima.</div>') +
      '<button type="button" class="btn dark block" id="seguir"' + (st.hora ? "" : " disabled") + ">Continuar</button>";
  }

  /* ---------- 4: dados ---------- */
  function p4() {
    var s = servico();
    app.innerHTML = barra(4) + voltar(3) + '<h1 class="q">Quase lá. Quem vai ser atendido?</h1>' +
      '<div class="resumo"><b>' + A.esc(s.nome) + " · " + A.money(s.preco) + "</b><span>" + A.cap(A.nomeDia(st.data)) + ", " + A.fmtData(st.data) + " às " + st.hora + " com " + A.esc(A.nomeProf(st.profReal)) + "</span></div>" +
      '<form id="f" class="card" novalidate><div class="field"><label for="n">Seu nome</label><input id="n" autocomplete="name" value="' + A.esc(st.nome) + '"></div>' +
      '<div class="field"><label for="t">Seu WhatsApp</label><input id="t" inputmode="tel" autocomplete="tel" placeholder="(12) 99999-9999" value="' + A.esc(st.tel) + '"></div>' +
      '<div class="err" id="e" role="alert"></div><button type="submit" class="btn primary block">Confirmar horário</button></form>';
  }

  /* ---------- 5: comanda ---------- */
  function p5() {
    var a = st.ag, ag = db.shop;
    var msg = "Olá! Aqui é " + a.nome + ". Marquei " + a.servNome + " com " + a.profNome + " para " + A.nomeDia(a.data) + ", " + A.fmtData(a.data).slice(0, 5) + " às " + a.hora + ".";
    app.innerHTML = '<div class="ticket pop"><div class="pole move" aria-hidden="true"></div><div class="ticket-in">' +
      '<div><span class="tag ok">Horário confirmado</span></div><div class="when num">' + A.cap(A.nomeDia(a.data)) + "<br>" + A.fmtData(a.data).slice(0, 5) + " às " + a.hora + "</div>" +
      "<dl><dt>Serviço</dt><dd>" + A.esc(a.servNome) + "</dd><dt>Profissional</dt><dd>" + A.esc(a.profNome) + "</dd><dt>Valor</dt><dd>" + A.money(a.preco) + "</dd><dt>Em nome de</dt><dd>" + A.esc(a.nome) + "</dd></dl></div></div>" +
      '<a class="btn primary block" target="_blank" rel="noopener" href="https://wa.me/' + A.digitos(ag.whats) + "?text=" + encodeURIComponent(msg) + '">Avisar a barbearia no WhatsApp</a>' +
      '<button type="button" class="btn block" id="ics">Salvar no calendário</button>' +
      '<button type="button" class="btn block danger" data-cancel="' + a.id + '">Cancelar este horário</button>' +
      '<button type="button" class="back" style="align-self:center" data-go="1">Marcar outro horário</button>';
  }

  function ir(n) { st.passo = n; ({ 1: p1, 2: p2, 3: p3, 4: p4, 5: p5 })[n](); window.scrollTo(0, 0); }

  document.addEventListener("click", function (e) {
    var t = e.target.closest("button"); if (!t) return;
    if (t.dataset.go) { if (t.dataset.go === "1" && st.passo === 5) { st = { passo: 1, nome: st.nome, tel: st.tel }; } ir(+t.dataset.go); return; }
    if (t.dataset.serv) { st.serv = t.dataset.serv; ir(2); return; }
    if (t.dataset.prof) { st.prof = t.dataset.prof; st.hora = null; ir(3); return; }
    if (t.dataset.dia) { st.data = t.dataset.dia; st.hora = null; p3(); return; }
    if (t.dataset.hora) { st.hora = t.dataset.hora; st.profReal = t.dataset.pr; Array.prototype.forEach.call(document.querySelectorAll(".hr"), function (b) { b.setAttribute("aria-pressed", String(b === t)); }); $("seguir").disabled = false; return; }
    if (t.id === "seguir") { ir(4); return; }
    if (t.dataset.cancel) {
      if (!confirm("Cancelar este horário?")) return;
      A.status(t.dataset.cancel, "cancelado"); toast("Horário cancelado"); ir(1); return;
    }
    if (t.id === "ics") {
      var b = new Blob([A.ics(st.ag)], { type: "text/calendar" }), u = URL.createObjectURL(b), l = document.createElement("a");
      l.href = u; l.download = "horario.ics"; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 500);
    }
  });
  document.addEventListener("input", function (e) { if (e.target.id === "t") e.target.value = A.maskFone(e.target.value); });
  document.addEventListener("submit", function (e) {
    e.preventDefault();
    var n = $("n").value.trim(), t = $("t").value;
    if (n.length < 2) { $("e").textContent = "Digite o seu nome."; $("n").focus(); return; }
    if (A.digitos(t).length < 10) { $("e").textContent = "Digite o WhatsApp com DDD, para a barbearia poder falar com você."; $("t").focus(); return; }
    st.nome = n; st.tel = t; var s = servico();
    try {
      st.ag = A.criar({ data: st.data, hora: st.hora, dur: s.min, servId: s.id, servNome: s.nome, preco: s.preco, profId: st.profReal, nome: n, tel: t });
    } catch (er) { $("e").textContent = er.message; st.hora = null; setTimeout(function () { ir(3); toast(er.message); }, 900); return; }
    A.lembrar(st.ag.id); ir(5);
  });

  titulo(); ir(1);
  if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) navigator.serviceWorker.register("sw.js").catch(function () {});
})();
