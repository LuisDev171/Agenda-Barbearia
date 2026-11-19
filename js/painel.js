/* =====================================================
   Agenda Barber | painel do dono
   Abas: Agenda, Resumo, Serviços, Equipe, Ajustes
   ===================================================== */
(function () {
  var A = Agenda, db = A.db, $ = function (id) { return document.getElementById(id); }, esc = A.esc;
  var st = { tab: "agenda", data: A.hoje(), ym: A.hoje().slice(0, 7), sheet: null, modo: "cli" };
  var ICON = {
    agenda: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    resumo: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
    servicos: '<circle cx="6" cy="7" r="2.6"/><circle cx="6" cy="17" r="2.6"/><path d="M8 8.6L20 18M8 15.4L20 6"/>',
    equipe: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.6 3-5.4 6-5.4s5.4 1.8 6 5.4"/><path d="M16 5.2a3 3 0 010 5.6M18 14.8c1.7.6 2.7 2.3 3 5.2"/>',
    ajustes: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>'
  };
  var NOMES = { agenda: "Agenda", resumo: "Resumo", servicos: "Serviços", equipe: "Equipe", ajustes: "Ajustes" };
  function ico(k) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[k] + "</svg>"; }
  function toast(m) { var t = $("toast"); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, 2600); }
  function logado() { try { return sessionStorage.getItem("agenda-auth") === "1"; } catch (e) { return false; } }
  function setLogado(v) { try { if (v) sessionStorage.setItem("agenda-auth", "1"); else sessionStorage.removeItem("agenda-auth"); } catch (e) {} }
  function corProf(id) { var i = db.equipe.map(function (p) { return p.id; }).indexOf(id); return "var(--p" + (((i < 0 ? 0 : i) % 4) + 1) + ")"; }
  function opts(list, sel, val, lab) { return list.map(function (x) { var v = val(x); return '<option value="' + esc(v) + '"' + (v === sel ? " selected" : "") + ">" + esc(lab(x)) + "</option>"; }).join(""); }
  function linkCliente() { return location.href.replace(/painel\.html.*$/, "").replace(/[?#].*$/, "") + "index.html"; }

  /* ---------- entrada com senha ---------- */
  function auth() {
    var novo = !db.shop.pin;
    $("root").innerHTML = '<div class="pole" aria-hidden="true"></div><form class="auth" id="af" novalidate><div><h1 style="font-size:30px">' + esc(db.shop.nome) + '</h1><p class="muted">' + (novo ? "Primeiro acesso. Crie uma senha para proteger o painel." : "Painel do dono. Digite a sua senha.") + '</p></div>' +
      '<div class="card"><div class="field"><label for="pw">' + (novo ? "Nova senha (mínimo 4 caracteres)" : "Senha") + '</label><input id="pw" type="password" autocomplete="' + (novo ? "new-password" : "current-password") + '"></div>' +
      '<div class="err" id="ae" role="alert"></div><button type="submit" class="btn primary block">' + (novo ? "Criar senha e entrar" : "Entrar") + '</button></div>' +
      '<a class="muted" href="index.html" style="text-align:center;font-weight:600">Ir para a página do cliente</a></form>';
  }

  /* ---------- estrutura ---------- */
  function render() {
    if (!logado()) { auth(); return; }
    var corpo = { agenda: vAgenda, resumo: vResumo, servicos: vServicos, equipe: vEquipe, ajustes: vAjustes }[st.tab]();
    $("root").innerHTML = '<header class="top"><div class="top-in"><div class="brand">' + esc(db.shop.nome) + '<small>Painel do dono</small></div><div><a href="index.html">Página do cliente</a> <button type="button" class="ghost" id="sair">Sair</button></div></div></header><div class="pole" aria-hidden="true"></div>' +
      '<div class="shell"><nav class="nav" role="tablist" aria-label="Seções">' + Object.keys(NOMES).map(function (k) { return '<button type="button" role="tab" data-tab="' + k + '" aria-selected="' + (st.tab === k) + '">' + ico(k) + NOMES[k] + "</button>"; }).join("") + '</nav><main class="panel-body">' + corpo + "</main></div>" +
      (st.tab === "agenda" ? '<button type="button" class="btn primary fab" id="novo">+ Novo horário</button>' : "");
  }

  /* ---------- agenda ---------- */
  function vAgenda() {
    var l = A.doDia(st.data), ativos = l.filter(function (a) { return a.status === "confirmado" || a.status === "concluido"; });
    var prev = ativos.reduce(function (s, a) { return s + a.preco; }, 0), feito = l.filter(function (a) { return a.status === "concluido"; }).reduce(function (s, a) { return s + a.preco; }, 0);
    var agora = new Date(), mAgora = agora.getHours() * 60 + agora.getMinutes(), hojeEh = st.data === A.hoje(), marcou = false;
    var cards = l.map(function (a) {
      var fim = A.toMin(a.hora) + a.dur, now = false;
      if (hojeEh && !marcou && a.status === "confirmado" && fim > mAgora) { now = true; marcou = true; }
      var info = a.status === "bloqueio" ? '<span class="nm">Horário bloqueado</span>' : '<span class="nm">' + esc(a.nome) + '</span>';
      var tag = a.status === "concluido" ? '<span class="tag ok">Concluído</span>' : a.status === "cancelado" ? '<span class="tag bad">Cancelado</span>' : a.status === "bloqueio" ? '<span class="tag">Bloqueio</span>' : now ? '<span class="tag blue">Próximo</span>' : "";
      var acts = a.status === "confirmado" ? '<button type="button" class="btn small primary" data-done="' + a.id + '">Concluir</button><button type="button" class="btn small" data-wa="' + a.id + '">Lembrar</button><button type="button" class="btn small danger" data-cancel="' + a.id + '">Cancelar</button>'
        : a.status === "concluido" ? '<button type="button" class="btn small" data-undo="' + a.id + '">Desfazer</button>'
        : '<button type="button" class="btn small danger" data-del="' + a.id + '">' + (a.status === "bloqueio" ? "Remover bloqueio" : "Apagar") + "</button>";
      return '<div class="slot"><div class="t num">' + a.hora + '</div><div class="ag ' + a.status + (now ? " now" : "") + '" style="--pc:' + corProf(a.profId) + '"><div class="ag-top">' + info + (a.status === "bloqueio" ? "" : '<span class="pr num">' + A.money(a.preco) + "</span>") + "</div>" +
        '<div class="sv">' + (a.status === "bloqueio" ? a.dur + " min · " + esc(a.profNome) : esc(a.servNome) + " · " + esc(a.profNome) + " · " + a.dur + " min") + "</div>" + (tag ? "<div>" + tag + "</div>" : "") + '<div class="acts">' + acts + "</div></div></div>";
    }).join("");
    var d = A.parse(st.data);
    return '<div class="datebar"><button type="button" class="arrow" data-d="-1" aria-label="Dia anterior">‹</button><div class="dt">' + (hojeEh ? "Hoje" : A.cap(A.nomeDia(st.data))) + "<small>" + d.getDate() + " de " + A.MESES[d.getMonth()] + " de " + d.getFullYear() + '</small></div><button type="button" class="arrow" data-d="1" aria-label="Próximo dia">›</button></div>' +
      (hojeEh ? "" : '<button type="button" class="btn small" data-d="0" style="align-self:flex-start">Voltar para hoje</button>') +
      (A.aberto(st.data) ? "" : '<div class="resumo">A barbearia está fechada neste dia da semana. Mude em Ajustes, se quiser abrir.</div>') +
      '<div class="pills"><div class="pill"><b class="num">' + ativos.length + "</b><span>Clientes</span></div><div class=\"pill\"><b class=\"num\">" + A.money(prev) + "</b><span>Previsto</span></div><div class=\"pill\"><b class=\"num\">" + A.money(feito) + "</b><span>Já recebido</span></div></div>" +
      (cards ? '<div style="display:flex;flex-direction:column;gap:10px">' + cards + "</div>" : '<div class="empty">Nenhum horário neste dia.<br>Toque em “Novo horário” para marcar um cliente.</div>');
  }

  /* ---------- resumo ---------- */
  function vResumo() {
    var p = st.ym.split("-"), mes = db.ag.filter(function (a) { return a.data.slice(0, 7) === st.ym; });
    var conc = mes.filter(function (a) { return a.status === "concluido"; }), sum = function (l) { return l.reduce(function (s, a) { return s + a.preco; }, 0); };
    var fat = sum(conc), areceber = sum(mes.filter(function (a) { return a.status === "confirmado"; })), canc = mes.filter(function (a) { return a.status === "cancelado"; }).length;
    var dias = [], h = A.hoje(), max = 1, i;
    for (i = 6; i >= 0; i--) { var dd = A.addDias(h, -i), v = sum(db.ag.filter(function (a) { return a.data === dd && a.status === "concluido"; })); max = Math.max(max, v); dias.push({ d: dd, v: v }); }
    function rank(map, cor) {
      var k = Object.keys(map).sort(function (a, b) { return map[b] - map[a]; }), t = k.reduce(function (s, x) { return s + map[x]; }, 0);
      return k.length ? '<div class="rank">' + k.map(function (x, n) { return "<div><span>" + esc(x) + '</span><b class="num">' + A.money(map[x]) + '</b><span class="bar"><i style="width:' + (t ? map[x] / t * 100 : 0).toFixed(1) + "%;--c:" + (cor ? cor(x, n) : "var(--blue)") + '"></i></span></div>'; }).join("") + "</div>" : '<p class="muted">Sem atendimentos concluídos neste mês.</p>';
    }
    var porProf = {}, porServ = {};
    conc.forEach(function (a) { porProf[a.profNome] = (porProf[a.profNome] || 0) + a.preco; porServ[a.servNome] = (porServ[a.servNome] || 0) + a.preco; });
    return '<div class="datebar"><button type="button" class="arrow" data-m="-1" aria-label="Mês anterior">‹</button><div class="dt">' + A.cap(A.MESES[+p[1] - 1]) + " de " + p[0] + '</div><button type="button" class="arrow" data-m="1" aria-label="Próximo mês">›</button></div>' +
      '<div class="pills four"><div class="pill"><b class="num">' + A.money(fat) + '</b><span>Faturado</span></div><div class="pill"><b class="num">' + A.money(areceber) + '</b><span>A receber</span></div><div class="pill"><b class="num">' + conc.length + '</b><span>Atendimentos</span></div><div class="pill"><b class="num">' + A.money(conc.length ? fat / conc.length : 0) + '</b><span>Ticket médio</span></div></div>' +
      '<section class="card"><h2 style="font-size:17px">Faturamento dos últimos 7 dias</h2><div class="bars" role="img" aria-label="Faturamento por dia">' + dias.map(function (x) { return '<div class="b' + (x.d === h ? " today" : "") + '"><small class="num">' + (x.v ? Math.round(x.v) : "") + '</small><i style="height:' + Math.max(2, x.v / max * 100) + '%"></i><small>' + A.DIAS_CURTO[A.parse(x.d).getDay()] + "</small></div>"; }).join("") + "</div></section>" +
      '<section class="card"><h2 style="font-size:17px">Por profissional</h2>' + rank(porProf, function (x) { var i = db.equipe.map(function (p) { return p.nome; }).indexOf(x); return "var(--p" + (((i < 0 ? 0 : i) % 4) + 1) + ")"; }) + "</section>" +
      '<section class="card"><h2 style="font-size:17px">Por serviço</h2>' + rank(porServ, null) + "</section>" +
      '<p class="muted" style="font-size:14px">' + canc + (canc === 1 ? " horário cancelado" : " horários cancelados") + " neste mês. O faturamento conta só os atendimentos marcados como concluídos.</p>";
  }

  /* ---------- serviços e equipe ---------- */
  function vServicos() {
    return '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h1 style="font-size:24px">Serviços</h1><button type="button" class="btn primary small" id="novoServ">+ Novo serviço</button></div>' +
      '<section class="card"><div class="list">' + (db.servicos.length ? db.servicos.map(function (s) { return '<div class="li"><div><b>' + esc(s.nome) + "</b><small>" + s.min + " min · " + A.money(s.preco) + '</small></div><button type="button" class="btn small" data-edserv="' + s.id + '">Editar</button></div>'; }).join("") : '<div class="empty">Nenhum serviço. Toque em “Novo serviço”.</div>') + "</div></section>";
  }
  function vEquipe() {
    return '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h1 style="font-size:24px">Equipe</h1><button type="button" class="btn primary small" id="novoProf">+ Novo profissional</button></div>' +
      '<section class="card"><div class="list">' + db.equipe.map(function (p) { return '<div class="li" style="border-left:6px solid ' + corProf(p.id) + ';padding-left:12px"><b>' + esc(p.nome) + '</b><button type="button" class="btn small" data-edprof="' + p.id + '">Editar</button></div>'; }).join("") + "</div></section>" +
      '<p class="muted" style="font-size:14px">Cada profissional tem a sua própria agenda. O cliente escolhe com quem quer cortar ou deixa em “Sem preferência”.</p>';
  }

  /* ---------- ajustes ---------- */
  function vAjustes() {
    var s = db.shop;
    return '<h1 style="font-size:24px">Ajustes</h1>' +
      '<form class="card" id="fAj" novalidate><h2 style="font-size:17px">Barbearia</h2>' +
      '<div class="field"><label for="a-n">Nome</label><input id="a-n" value="' + esc(s.nome) + '"></div><div class="field"><label for="a-w">WhatsApp que recebe os avisos</label><input id="a-w" inputmode="tel" value="' + esc(A.maskFone(s.whats.replace(/^55/, ""))) + '"></div>' +
      '<h2 style="font-size:17px;margin-top:6px">Horário de funcionamento</h2><div class="row"><div class="field"><label for="a-a">Abre</label><input id="a-a" type="time" value="' + s.abre + '"></div><div class="field"><label for="a-f">Fecha</label><input id="a-f" type="time" value="' + s.fecha + '"></div></div>' +
      '<div class="row"><div class="field"><label for="a-pd">Pausa de</label><input id="a-pd" type="time" value="' + (s.pausaDe || "") + '"></div><div class="field"><label for="a-pa">Pausa até</label><input id="a-pa" type="time" value="' + (s.pausaAte || "") + '"></div></div>' +
      '<div class="field"><label for="a-p">Intervalo entre horários</label><select id="a-p">' + [15, 30, 60].map(function (n) { return '<option value="' + n + '"' + (s.passo === n ? " selected" : "") + ">" + n + " minutos</option>"; }).join("") + "</select></div>" +
      '<div class="field"><span class="lbl">Dias que abre</span><div class="sw" id="a-d">' + A.DIAS_CURTO.map(function (n, i) { return '<button type="button" class="chip" data-wd="' + i + '" aria-pressed="' + (s.dias.indexOf(i) > -1) + '">' + n + "</button>"; }).join("") + "</div></div>" +
      '<div class="err" id="a-e" role="alert"></div><button type="submit" class="btn primary block">Salvar ajustes</button></form>' +
      '<section class="card"><h2 style="font-size:17px">Link para os clientes</h2><p class="muted" style="font-size:14px">Mande no WhatsApp, ponha no Instagram ou imprima o QR Code no balcão.</p><div class="linkbox" id="lk">' + esc(linkCliente()) + '</div><div class="qrbox">' + QR.svg(linkCliente(), 180) + '</div><div class="row"><button type="button" class="btn" id="copiar">Copiar link</button><button type="button" class="btn" id="cartazBtn">Imprimir cartaz</button></div></section>' +
      '<section class="card"><h2 style="font-size:17px">Segurança</h2><button type="button" class="btn" id="trocaPin">Trocar a senha do painel</button></section>' +
      '<section class="card"><h2 style="font-size:17px">Demonstração</h2><p class="muted" style="font-size:14px">Preenche a agenda com clientes de exemplo, para você mostrar o sistema. Os exemplos podem ser apagados sem perder os seus dados.</p><button type="button" class="btn" id="demo">Carregar dados de exemplo</button><button type="button" class="btn" id="limpaDemo">Remover dados de exemplo</button><button type="button" class="btn danger" id="zera">Apagar tudo e recomeçar</button></section>';
  }

  /* ---------- janela ---------- */
  function abrir(html, foco) { $("sheet").innerHTML = html; $("scrim").hidden = false; st.sheet = true; var f = foco && $("sheet").querySelector(foco); if (f) f.focus(); }
  function fechar() { $("scrim").hidden = true; $("sheet").innerHTML = ""; st.sheet = null; }

  function sheetNovo() {
    var cli = st.modo === "cli";
    abrir('<h2 id="sh-t">Novo horário</h2><form id="fNovo" novalidate><div class="sw" role="group" aria-label="Tipo" style="margin-bottom:12px"><button type="button" class="chip" data-modo="cli" aria-pressed="' + cli + '">Cliente</button><button type="button" class="chip" data-modo="blq" aria-pressed="' + !cli + '">Bloquear horário</button></div>' +
      '<div style="display:flex;flex-direction:column;gap:12px"><div class="field"><label for="n-d">Dia</label><input id="n-d" type="date" value="' + st.data + '"></div>' +
      (cli ? '<div class="field"><label for="n-s">Serviço</label><select id="n-s">' + opts(db.servicos, db.servicos[0] && db.servicos[0].id, function (s) { return s.id; }, function (s) { return s.nome + " · " + s.min + " min · " + A.money(s.preco); }) + "</select></div>"
        : '<div class="field"><label for="n-s">Duração</label><select id="n-s">' + [30, 60, 90, 120, 180, 240].map(function (m) { return '<option value="' + m + '">' + m + " min</option>"; }).join("") + "</select></div>") +
      '<div class="field"><label for="n-p">Profissional</label><select id="n-p">' + opts(db.equipe, db.equipe[0] && db.equipe[0].id, function (p) { return p.id; }, function (p) { return p.nome; }) + "</select></div>" +
      '<div class="field"><label for="n-h">Horário</label><select id="n-h"></select></div>' +
      (cli ? '<div class="field"><label for="n-n">Nome do cliente</label><input id="n-n" autocomplete="off"></div><div class="field"><label for="n-t">WhatsApp (opcional)</label><input id="n-t" inputmode="tel" autocomplete="off"></div>' : "") +
      '<div class="err" id="n-e" role="alert"></div><button type="submit" class="btn primary block">' + (cli ? "Marcar horário" : "Bloquear horário") + '</button><button type="button" class="btn block" data-fecha>Cancelar</button></div></form>', cli ? "#n-n" : "#n-s");
    horas();
  }
  function durNovo() { var v = $("n-s").value; if (st.modo === "blq") return +v; var s = db.servicos.filter(function (x) { return x.id === v; })[0]; return s ? s.min : 30; }
  function horas() {
    var d = $("n-d").value, p = $("n-p").value, sl = d ? A.slots(d, p, durNovo()) : [];
    $("n-h").innerHTML = sl.length ? sl.map(function (x) { return "<option>" + x.h + "</option>"; }).join("") : '<option value="">Sem horário livre neste dia</option>';
  }
  function sheetServ(id) {
    var s = id ? db.servicos.filter(function (x) { return x.id === id; })[0] : { nome: "", min: 30, preco: "" };
    var mins = []; for (var m = 15; m <= 180; m += 15) mins.push(m);
    abrir('<h2 id="sh-t">' + (id ? "Editar serviço" : "Novo serviço") + '</h2><form id="fServ" data-id="' + (id || "") + '" novalidate style="display:flex;flex-direction:column;gap:12px"><div class="field"><label for="s-n">Nome</label><input id="s-n" value="' + esc(s.nome) + '"></div>' +
      '<div class="field"><label for="s-m">Duração</label><select id="s-m">' + mins.map(function (m) { return '<option value="' + m + '"' + (m === s.min ? " selected" : "") + ">" + m + " min</option>"; }).join("") + '</select></div>' +
      '<div class="field"><label for="s-p">Preço (R$)</label><input id="s-p" inputmode="decimal" placeholder="0,00" value="' + (s.preco === "" ? "" : String(s.preco).replace(".", ",")) + '"></div><div class="err" id="s-e" role="alert"></div>' +
      '<button type="submit" class="btn primary block">Salvar</button>' + (id ? '<button type="button" class="btn danger block" data-delserv="' + id + '">Apagar serviço</button>' : "") + '<button type="button" class="btn block" data-fecha>Cancelar</button></form>', "#s-n");
  }
  function sheetProf(id) {
    var p = id ? db.equipe.filter(function (x) { return x.id === id; })[0] : { nome: "" };
    abrir('<h2 id="sh-t">' + (id ? "Editar profissional" : "Novo profissional") + '</h2><form id="fProf" data-id="' + (id || "") + '" novalidate style="display:flex;flex-direction:column;gap:12px"><div class="field"><label for="pf-n">Nome</label><input id="pf-n" value="' + esc(p.nome) + '"></div><div class="err" id="pf-e" role="alert"></div>' +
      '<button type="submit" class="btn primary block">Salvar</button>' + (id && db.equipe.length > 1 ? '<button type="button" class="btn danger block" data-delprof="' + id + '">Remover da equipe</button>' : "") + '<button type="button" class="btn block" data-fecha>Cancelar</button></form>', "#pf-n");
  }
  function sheetPin() {
    abrir('<h2 id="sh-t">Trocar senha</h2><form id="fPin" novalidate style="display:flex;flex-direction:column;gap:12px"><div class="field"><label for="p-a">Senha atual</label><input id="p-a" type="password" autocomplete="current-password"></div><div class="field"><label for="p-n">Nova senha (mínimo 4 caracteres)</label><input id="p-n" type="password" autocomplete="new-password"></div><div class="err" id="p-e" role="alert"></div><button type="submit" class="btn primary block">Trocar senha</button><button type="button" class="btn block" data-fecha>Cancelar</button></form>', "#p-a");
  }
  function lembrete(a) {
    var m = "Olá, " + a.nome.split(" ")[0] + "! Lembrete do seu horário na " + db.shop.nome + ": " + a.servNome + " com " + a.profNome + ", " + A.nomeDia(a.data) + " (" + A.fmtData(a.data).slice(0, 5) + ") às " + a.hora + ". Se não puder vir, é só avisar por aqui. Até já!";
    return "https://wa.me/" + A.foneWa(a.tel) + "?text=" + encodeURIComponent(m);
  }

  /* ---------- eventos ---------- */
  document.addEventListener("click", function (e) {
    if (e.target === $("scrim")) { fechar(); return; }
    var t = e.target.closest("button"); if (!t) return;
    var d = t.dataset;
    if (d.tab) { st.tab = d.tab; render(); window.scrollTo(0, 0); return; }
    if (d.d !== undefined) { st.data = d.d === "0" ? A.hoje() : A.addDias(st.data, +d.d); render(); return; }
    if (d.m) { var p = st.ym.split("-"), dt = new Date(+p[0], +p[1] - 1 + +d.m, 1); st.ym = dt.getFullYear() + "-" + A.pad(dt.getMonth() + 1); render(); return; }
    if (t.id === "sair") { setLogado(false); render(); return; }
    if (t.id === "novo") { st.modo = "cli"; sheetNovo(); return; }
    if (d.modo) { st.modo = d.modo; sheetNovo(); return; }
    if (d.fecha !== undefined) { fechar(); return; }
    if (d.done) { A.status(d.done, "concluido"); toast("Atendimento concluído"); render(); return; }
    if (d.undo) { A.status(d.undo, "confirmado"); render(); return; }
    if (d.cancel) { if (confirm("Cancelar este horário? O cliente precisa ser avisado.")) { A.status(d.cancel, "cancelado"); toast("Horário cancelado"); render(); } return; }
    if (d.del) { A.apagar(d.del); toast("Removido"); render(); return; }
    if (d.wa) { var a = A.achar(d.wa); if (!A.digitos(a.tel)) { toast("Este cliente não tem WhatsApp cadastrado"); return; } window.open(lembrete(a), "_blank", "noopener"); return; }
    if (t.id === "novoServ") { sheetServ(); return; }
    if (d.edserv) { sheetServ(d.edserv); return; }
    if (d.delserv) { if (confirm("Apagar este serviço? Os horários já marcados continuam na agenda.")) { db.servicos = db.servicos.filter(function (s) { return s.id !== d.delserv; }); A.save(); fechar(); toast("Serviço apagado"); render(); } return; }
    if (t.id === "novoProf") { sheetProf(); return; }
    if (d.edprof) { sheetProf(d.edprof); return; }
    if (d.delprof) { if (confirm("Remover este profissional? Os horários já marcados continuam na agenda.")) { db.equipe = db.equipe.filter(function (x) { return x.id !== d.delprof; }); A.save(); fechar(); toast("Profissional removido"); render(); } return; }
    if (d.wd !== undefined) { t.setAttribute("aria-pressed", String(t.getAttribute("aria-pressed") !== "true")); return; }
    if (t.id === "copiar") { var l = linkCliente(); (navigator.clipboard ? navigator.clipboard.writeText(l) : Promise.reject()).then(function () { toast("Link copiado"); }, function () { toast("Copie o link na caixa acima"); }); return; }
    if (t.id === "cartazBtn") { $("cartaz").innerHTML = "<h1>" + esc(db.shop.nome) + "</h1><p>Agende o seu horário pelo celular</p>" + QR.svg(linkCliente(), 320) + "<p>Aponte a câmera para o QR Code</p>"; window.print(); return; }
    if (t.id === "trocaPin") { sheetPin(); return; }
    if (t.id === "demo") { A.demo(); toast("Dados de exemplo carregados"); st.tab = "agenda"; render(); return; }
    if (t.id === "limpaDemo") { db.ag = db.ag.filter(function (a) { return !a.demo; }); A.save(); toast("Exemplos removidos"); return; }
    if (t.id === "zera") { if (confirm("Apagar TUDO (serviços, equipe, agenda e senha)? Não dá para desfazer.")) { A.reset(); db = A.db; setLogado(false); render(); } return; }
  });
  document.addEventListener("change", function (e) { if (["n-d", "n-s", "n-p"].indexOf(e.target.id) > -1) horas(); });
  document.addEventListener("input", function (e) { if (e.target.id === "n-t" || e.target.id === "a-w") e.target.value = A.maskFone(e.target.value); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && st.sheet) fechar(); });

  document.addEventListener("submit", function (e) {
    e.preventDefault(); var f = e.target.id;
    if (f === "af") {
      var pw = $("pw").value;
      if (!db.shop.pin) {
        if (pw.length < 4) { $("ae").textContent = "A senha precisa ter pelo menos 4 caracteres."; return; }
        A.sha(pw).then(function (h) { db.shop.pin = h; A.save(); setLogado(true); render(); });
      } else A.sha(pw).then(function (h) { if (h === db.shop.pin) { setLogado(true); render(); } else $("ae").textContent = "Senha incorreta. Tente de novo."; });
    } else if (f === "fNovo") {
      var cli = st.modo === "cli", h = $("n-h").value, er = $("n-e");
      if (!h) { er.textContent = "Escolha um dia com horário livre."; return; }
      var o = { data: $("n-d").value, hora: h, profId: $("n-p").value, dur: durNovo() };
      if (cli) {
        var n = $("n-n").value.trim(); if (n.length < 2) { er.textContent = "Digite o nome do cliente."; $("n-n").focus(); return; }
        var s = db.servicos.filter(function (x) { return x.id === $("n-s").value; })[0]; o.servId = s.id; o.servNome = s.nome; o.preco = s.preco; o.nome = n; o.tel = $("n-t").value;
      } else o.bloqueio = true;
      try { A.criar(o); } catch (x) { er.textContent = x.message; return; }
      st.data = o.data; fechar(); toast(cli ? "Horário marcado" : "Horário bloqueado"); render();
    } else if (f === "fServ") {
      var nm = $("s-n").value.trim(), pr = parseFloat($("s-p").value.replace(/\./g, "").replace(",", "."));
      if (nm.length < 2) { $("s-e").textContent = "Digite o nome do serviço."; return; }
      if (!(pr >= 0)) { $("s-e").textContent = "Digite o preço, por exemplo 40,00."; return; }
      var id = e.target.dataset.id;
      if (id) { var s2 = db.servicos.filter(function (x) { return x.id === id; })[0]; s2.nome = nm; s2.min = +$("s-m").value; s2.preco = Math.round(pr * 100) / 100; }
      else db.servicos.push({ id: A.uid(), nome: nm, min: +$("s-m").value, preco: Math.round(pr * 100) / 100 });
      A.save(); fechar(); toast("Serviço salvo"); render();
    } else if (f === "fProf") {
      var pn = $("pf-n").value.trim(); if (pn.length < 2) { $("pf-e").textContent = "Digite o nome."; return; }
      var pid = e.target.dataset.id;
      if (pid) db.equipe.filter(function (x) { return x.id === pid; })[0].nome = pn; else db.equipe.push({ id: A.uid(), nome: pn });
      A.save(); fechar(); toast("Profissional salvo"); render();
    } else if (f === "fPin") {
      var nv = $("p-n").value; if (nv.length < 4) { $("p-e").textContent = "A nova senha precisa ter pelo menos 4 caracteres."; return; }
      A.sha($("p-a").value).then(function (h) { if (h !== db.shop.pin) { $("p-e").textContent = "A senha atual não confere."; return; } return A.sha(nv).then(function (n2) { db.shop.pin = n2; A.save(); fechar(); toast("Senha trocada"); }); });
    } else if (f === "fAj") {
      var s3 = db.shop, nome = $("a-n").value.trim(), w = A.digitos($("a-w").value);
      if (nome.length < 2) { $("a-e").textContent = "Digite o nome da barbearia."; return; }
      if (w.length < 10) { $("a-e").textContent = "Digite o WhatsApp com DDD."; return; }
      if (A.toMin($("a-f").value) <= A.toMin($("a-a").value)) { $("a-e").textContent = "O horário de fechar precisa ser depois do de abrir."; return; }
      var dias = []; Array.prototype.forEach.call(document.querySelectorAll("[data-wd]"), function (b) { if (b.getAttribute("aria-pressed") === "true") dias.push(+b.dataset.wd); });
      if (!dias.length) { $("a-e").textContent = "Marque pelo menos um dia de funcionamento."; return; }
      s3.nome = nome; s3.whats = A.foneWa(w); s3.abre = $("a-a").value; s3.fecha = $("a-f").value; s3.pausaDe = $("a-pd").value; s3.pausaAte = $("a-pa").value; s3.passo = +$("a-p").value; s3.dias = dias;
      A.save(); toast("Ajustes salvos"); render();
    }
  });

  render();
  if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) navigator.serviceWorker.register("sw.js").catch(function () {});
})();
