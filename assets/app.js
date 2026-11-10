(function(){
"use strict";
var ROOT = document.getElementById("mapa-alocacao");
if (!ROOT || ROOT.getAttribute("data-init")) return;   // evita rodar 2x (editor do Elementor)
ROOT.setAttribute("data-init","1");

/* ===================== SUPABASE ===================== *
 * Em branco = registro desligado, ferramenta funciona igual. */
var SUPABASE_URL = ""; /* clone standalone: sem telemetria */
var SUPABASE_KEY = "";

/* não registra eventos enquanto você edita no Elementor */
var NO_EDITOR = /elementor-preview|action=elementor/.test(location.search) ||
  (document.body && document.body.classList.contains("elementor-editor-active"));

var SESSAO = (function(){
  try { return crypto.randomUUID(); }
  catch(e){
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c){
      var r = Math.random()*16|0, v = c==="x" ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  }
})();
var DISPOSITIVO = (window.innerWidth < 820 ? "mobile" : "desktop");

function track(evento, dados){
  if (!SUPABASE_URL || !SUPABASE_KEY || NO_EDITOR) return;
  try{
    var corpo = Object.assign({
      sessao: SESSAO, ferramenta: "mapa", evento: evento, dispositivo: DISPOSITIVO
    }, dados || {});
    fetch(SUPABASE_URL + "/rest/v1/%5BSDI-C01-2026-JUL%5D%20%5BFERRAMENTAS%5D", {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(corpo),
      keepalive: true
    }).catch(function(){});
  } catch(e){}
}

/* ===================== MODELO ===================== */
var PERFIS = {
  fundacao:   {nome:"Fundação",     rf:20, horizonte:"mais de 15 anos"},
  construcao: {nome:"Construção",   rf:30, horizonte:"de 8 a 15 anos"},
  transicao:  {nome:"Transição",    rf:45, horizonte:"de 3 a 7 anos"},
  colheita:   {nome:"Colheita",     rf:60, horizonte:"menos de 3 anos"}
};
function alvos(p){
  var rf = PERFIS[p].rf, rv = 100 - rf, t = rv/3;
  return {rf:rf, fii:t, acao:t, int:t, out:0};
}
var CLASSES = [
  {k:"rf",   nome:"Renda fixa",         cor:"#7FB8E6"},
  {k:"fii",  nome:"Fundos imobiliários",cor:"#5BDF3F"},
  {k:"acao", nome:"Ações brasileiras",  cor:"#B8E68C"},
  {k:"int",  nome:"Internacional",      cor:"#C9A24D"},
  {k:"out",  nome:"Outros",             cor:"#8a8f80"}
];

/* ===================== ESTADO ===================== */
var S = {gasto:0, reserva:0, perfil:null, rf:0, fii:0, acao:0, int:0, out:0,
         maior:0, nFii:0, nAcao:0, aporte:0};
var cur = 0, LAST = 4;

/* ===================== HELPERS (sempre dentro do widget) ===================== */
function $(s,c){return (c||ROOT).querySelector(s);}
function $$(s,c){return Array.prototype.slice.call((c||ROOT).querySelectorAll(s));}
function num(v){ v = String(v||"").replace(/[^\d]/g,""); return v ? parseInt(v,10) : 0; }
function brl(v){ return "R$ " + Math.round(v).toLocaleString("pt-BR"); }
function pct(v){ return (Math.round(v*10)/10).toLocaleString("pt-BR") + "%"; }

function mask(el){
  el.addEventListener("input", function(){
    var n = num(el.value);
    el.value = n ? n.toLocaleString("pt-BR") : "";
    check();
  });
}
$$("#ma_gasto,#ma_reserva,#ma_c_rf,#ma_c_fii,#ma_c_acao,#ma_c_int,#ma_c_out,#ma_maior,#ma_aporte").forEach(mask);
$$("#ma_n_fii,#ma_n_acao").forEach(function(el){
  el.addEventListener("input", function(){ el.value = String(num(el.value)||""); check(); });
});

/* ===================== NAVEGAÇÃO ===================== */
var prog = $("#ma_prog");
for (var i=0;i<5;i++){ prog.appendChild(document.createElement("i")); }

/* rola até o topo da ferramenta (não da página inteira) */
function scrollTopo(){
  var top = ROOT.getBoundingClientRect().top;
  if (top < 0) window.scrollTo({top: window.pageYOffset + top - 20, behavior:"smooth"});
}
function paint(){
  $$(".step").forEach(function(s){ s.classList.toggle("active", +s.dataset.step === cur); });
  $$("#ma_prog i").forEach(function(b,i){ b.classList.toggle("on", i<=cur); });
  scrollTopo();
}
function check(){
  var ok = true;
  if (cur===0) ok = num($("#ma_gasto").value) > 0;
  if (cur===1) ok = !!S.perfil;
  if (cur===2) ok = totalCarteira() > 0;
  if (cur===3) ok = num($("#ma_aporte").value) >= 0 && num($("#ma_maior").value) > 0;
  var b = $('.step[data-step="'+cur+'"] .go');
  if (b) b.disabled = !ok;
}
function totalCarteira(){
  return num($("#ma_c_rf").value)+num($("#ma_c_fii").value)+num($("#ma_c_acao").value)+
         num($("#ma_c_int").value)+num($("#ma_c_out").value);
}
$$("[data-next]").forEach(function(b){
  b.addEventListener("click", function(e){
    e.preventDefault();
    if (cur===0){ S.gasto=num($("#ma_gasto").value); S.reserva=num($("#ma_reserva").value); }
    if (cur===2){
      S.rf=num($("#ma_c_rf").value); S.fii=num($("#ma_c_fii").value); S.acao=num($("#ma_c_acao").value);
      S.int=num($("#ma_c_int").value); S.out=num($("#ma_c_out").value);
    }
    if (cur===3){
      S.maior=num($("#ma_maior").value); S.nFii=num($("#ma_n_fii").value);
      S.nAcao=num($("#ma_n_acao").value); S.aporte=num($("#ma_aporte").value);
      render();
    }
    cur = Math.min(cur+1, LAST); paint(); check();
    track(cur >= LAST ? "resultado" : "avancou", cur >= LAST ? dadosResultado() : {passo:cur});
  });
});
$$("[data-back]").forEach(function(b){
  b.addEventListener("click", function(e){ e.preventDefault(); cur = Math.max(cur-1,0); paint(); check(); });
});
$$("#ma_perfil .opt").forEach(function(o){
  o.addEventListener("click", function(){
    $$("#ma_perfil .opt").forEach(function(x){x.classList.remove("sel");});
    o.classList.add("sel"); S.perfil = o.dataset.p; check();
  });
});

/* payload do evento 'resultado' — só números, nada pessoal */
function dadosResultado(){
  try{
    var d = diagnostico();
    return {
      passo: LAST,
      perfil: PERFIS[S.perfil] ? PERFIS[S.perfil].nome : null,
      carteira_total: Math.round(d.T),
      aporte: Math.round(S.aporte),
      nivel: d.nivel.t,
      desvio_pct: Math.round(d.desvio*100)/100,
      maior_pct: Math.round(d.maiorPct*100)/100,
      meses_reserva: Math.round(d.mesesRes*100)/100,
      pct_rf: Math.round(d.atual.rf*100)/100,
      pct_fii: Math.round(d.atual.fii*100)/100,
      pct_acao: Math.round(d.atual.acao*100)/100,
      pct_intl: Math.round(d.atual.int*100)/100,
      pct_outros: Math.round(d.atual.out*100)/100,
      n_fii: S.nFii,
      n_acao: S.nAcao
    };
  } catch(e){ return {passo:LAST}; }
}

/* ===================== CÁLCULO ===================== */
function diagnostico(){
  var T = S.rf+S.fii+S.acao+S.int+S.out;
  var A = alvos(S.perfil);
  var atual = {rf:S.rf/T*100, fii:S.fii/T*100, acao:S.acao/T*100, int:S.int/T*100, out:S.out/T*100};

  var soma = 0;
  CLASSES.forEach(function(c){ soma += Math.abs(atual[c.k] - A[c.k]); });
  var desvio = soma/2;

  var maiorPct = T>0 ? S.maior/T*100 : 0;

  var prof = 0, profTxt = [];
  [{n:S.nFii,p:atual.fii,nome:"FIIs"},{n:S.nAcao,p:atual.acao,nome:"ações"}].forEach(function(x){
    if (x.p >= 12){
      if (x.n > 0 && x.n < 4){ prof += 2; profTxt.push(x.nome); }
      else if (x.n >= 4 && x.n < 8){ prof += 1; profTxt.push(x.nome); }
    }
  });

  var pDesv = desvio<10?0 : desvio<20?1 : desvio<35?2 : 3;
  var pMaior = maiorPct<=5?0 : maiorPct<=10?1 : maiorPct<=20?2 : 3;
  var pOut = atual.out>20?2 : atual.out>10?1 : 0;
  var score = pDesv + pMaior + Math.min(prof,3) + pOut;

  var nivel = score<=1 ? {k:"baixa",t:"BAIXA",c:"v-baixa"}
            : score<=3 ? {k:"moderada",t:"MODERADA",c:"v-mod"}
            : score<=6 ? {k:"alta",t:"ALTA",c:"v-alta"}
                       : {k:"critica",t:"CRÍTICA",c:"v-crit"};

  var mesesRes = S.gasto>0 ? S.reserva/S.gasto : 0;

  return {T:T,A:A,atual:atual,desvio:desvio,maiorPct:maiorPct,
          nivel:nivel,score:score,mesesRes:mesesRes,profTxt:profTxt,prof:prof};
}

/* plano de aportes: fecha as lacunas sem vender nada */
function planoAportes(d){
  var meses = 6, caixa = S.aporte*meses;
  if (caixa <= 0) return null;
  var futuro = d.T + caixa;
  var gaps = [], somaGap = 0;
  CLASSES.forEach(function(c){
    if (c.k==="out") return;
    var g = futuro * d.A[c.k] / 100 - S[c.k];
    if (g > 0){ gaps.push({k:c.k, nome:c.nome, gap:g}); somaGap += g; }
  });
  if (!gaps.length) return {itens:[], caixa:caixa, meses:meses, equilibrada:true};
  var itens = gaps.map(function(g){
    return {nome:g.nome, mensal:(caixa*(g.gap/somaGap))/meses, total:caixa*(g.gap/somaGap)};
  }).sort(function(a,b){ return b.mensal - a.mensal; });
  return {itens:itens, caixa:caixa, meses:meses, equilibrada:false};
}

/* ===================== RENDER ===================== */
function render(){
  var d = diagnostico(), P = PERFIS[S.perfil];

  $("#ma_r_perfil").textContent = "Perfil " + P.nome + " · horizonte " + P.horizonte;
  $("#ma_r_titulo").textContent = "Sua carteira de " + brl(d.T);

  var textos = {
    baixa:"Sua carteira está próxima do desenho ideal para o seu momento. O trabalho agora é manutenção: manter a proporção com os aportes e revisar a cada trimestre.",
    moderada:"Existe desalinhamento, mas nada que exija movimento brusco. Dá para corrigir só com o direcionamento dos próximos aportes.",
    alta:"Uma parte relevante do seu patrimônio está exposta a um risco que você provavelmente não escolheu. Isso não se resolve sozinho — precisa de decisão.",
    critica:"Sua carteira depende demais de poucas peças. Se uma delas for mal, o estrago não é pontual: é no plano inteiro."
  };
  $("#ma_r_verdict").innerHTML =
    '<div class="verdict '+d.nivel.c+'"><p class="lab">Nível de concentração</p>'+
    '<p class="lvl">'+d.nivel.t+'</p><p class="txt">'+textos[d.nivel.k]+'</p></div>';

  var fora = d.T * d.desvio/100;
  $("#ma_r_desvio").innerHTML =
    '<div class="bignum"><div class="n">'+pct(d.desvio)+'</div>'+
    '<div class="d"><b>'+brl(fora)+'</b> da sua carteira está numa classe diferente da que o seu momento pede. '+
    'Não é dinheiro perdido — é dinheiro trabalhando na função errada.</div></div>';

  var maxEsc = 0;
  CLASSES.forEach(function(c){ maxEsc = Math.max(maxEsc, d.atual[c.k], d.A[c.k]); });
  maxEsc = Math.max(maxEsc*1.12, 40);
  $("#ma_r_bars").innerHTML = CLASSES.map(function(c){
    var a = d.atual[c.k], t = d.A[c.k], diff = a - t;
    var cls = Math.abs(diff)<3 ? "" : (diff>0 ? "up" : "down");
    var msg = Math.abs(diff)<3 ? "no lugar"
            : (diff>0 ? pct(Math.abs(diff))+" acima do alvo (" + brl(d.T*Math.abs(diff)/100) + ")"
                      : pct(Math.abs(diff))+" abaixo do alvo (" + brl(d.T*Math.abs(diff)/100) + ")");
    if (c.k==="out" && a===0) return "";
    return '<div class="bar"><div class="top"><b>'+c.nome+'</b>'+
      '<span class="v" style="color:'+c.cor+'">'+pct(a)+'</span></div>'+
      '<div class="track"><div class="fill" style="width:'+(a/maxEsc*100)+'%;background:'+c.cor+'"></div>'+
      (c.k==="out"?"":'<div class="tgt" style="left:'+(t/maxEsc*100)+'%"></div>')+'</div>'+
      '<p class="delta '+cls+'">'+msg+(c.k==="out"?"":" · alvo "+pct(t))+'</p></div>';
  }).join("") +
  '<div class="legend"><span><i style="background:var(--lime)"></i>onde está hoje</span>'+
  '<span><i style="background:var(--gold)"></i>onde deveria estar</span></div>';

  var F = [];
  var mesesTxt = (Math.round(d.mesesRes*10)/10).toLocaleString("pt-BR");
  if (S.gasto>0){
    if (d.mesesRes < 3) F.push(["bad","Sua reserva cobre "+mesesTxt+" meses",
      "Antes de qualquer ajuste na carteira, complete a reserva. Sem ela, a primeira emergência te obriga a vender ativo bom no pior preço — e aí o método não teve chance."]);
    else if (d.mesesRes < 6) F.push(["warn","Sua reserva cobre "+mesesTxt+" meses",
      "Está no caminho. A referência de segurança é 6 meses de custo de vida (12 se a sua renda oscila)."]);
    else F.push(["ok","Reserva de "+mesesTxt+" meses",
      "Blindagem feita. Isso é o que permite você não vender no susto."]);
  }
  if (d.maiorPct > 20) F.push(["bad","Um único ativo é "+pct(d.maiorPct)+" da carteira",
    "Um ativo sozinho decide o seu resultado. Isso não é convicção, é risco não diversificado: a referência de conforto é no máximo 5% a 10% por ativo."]);
  else if (d.maiorPct > 10) F.push(["warn","Sua maior posição é "+pct(d.maiorPct)+" da carteira",
    "Acima do confortável. Não precisa vender: direcione os próximos aportes para as outras posições até o peso dela cair sozinho."]);
  else if (d.maiorPct > 0) F.push(["ok","Maior posição em "+pct(d.maiorPct),
    "Nenhum ativo isolado tem poder de derrubar a carteira. É assim que deve ser."]);

  if (d.prof>0) F.push(["warn","Poucos ativos em "+d.profTxt.join(" e "),
    "A classe pesa na carteira, mas está apoiada em poucos nomes. A referência é chegar em 10 a 15 ativos por classe, construídos aos poucos — não de uma vez."]);
  if (S.nFii+S.nAcao > 32) F.push(["warn","Você tem "+(S.nFii+S.nAcao)+" ativos em renda variável",
    "Acima de 30 nomes, você não diversifica mais: só perde a capacidade de acompanhar o que tem. Diversificação vira colecionismo."]);
  if (d.atual.out > 10) F.push(["warn",pct(d.atual.out)+" em 'outros'",
    "Cripto, previdência de banco, poupança e multimercado costumam entrar na carteira por indicação, não por decisão. Vale abrir cada um e perguntar: qual é a função disso aqui?"]);
  if (d.atual.int < 5) F.push(["warn","Quase nada fora do Brasil",
    "Sua renda, sua casa, sua aposentadoria e sua carteira estão todas na mesma moeda e na mesma economia. Isso concentra mais do que parece."]);
  $("#ma_r_flags").innerHTML = F.map(function(f){
    return '<div class="flag '+f[0]+'"><p class="t">'+f[1]+'</p><p class="b">'+f[2]+'</p></div>';
  }).join("");

  var pl = planoAportes(d);
  if (!pl){
    $("#ma_r_plan").innerHTML = '<div class="ph">Informe um valor de aporte mensal para gerar o plano.</div>';
  } else if (pl.equilibrada){
    $("#ma_r_plan").innerHTML = '<div class="ph">Sua carteira já está acima do alvo em todas as classes relevantes. '+
      'Distribua o aporte mantendo a proporção do seu perfil.</div>';
  } else {
    $("#ma_r_plan").innerHTML = '<div class="ph">Sem vender nada. Só direcionando '+brl(S.aporte)+
      ' por mês durante '+pl.meses+' meses — é assim que se rebalanceia uma carteira em construção.</div>' +
      pl.itens.map(function(it){
        return '<div class="prow"><div class="nm">'+it.nome+'<small>'+brl(it.total)+' no total</small></div>'+
               '<div class="vl">'+brl(it.mensal)+'<small>/mês</small></div></div>';
      }).join("");
  }

  var resumo =
    "MAPA DE ALOCAÇÃO — Semana Destravando seus Investimentos\n"+
    "Perfil: "+P.nome+" (horizonte "+P.horizonte+")\n"+
    "Carteira: "+brl(d.T)+"\n"+
    "Nível de concentração: "+d.nivel.t+"\n"+
    "Fora do lugar: "+pct(d.desvio)+" ("+brl(fora)+")\n"+
    "Maior posição: "+pct(d.maiorPct)+"\n"+
    "Reserva: "+mesesTxt+" meses\n"+
    "Composição — RF "+pct(d.atual.rf)+" | FII "+pct(d.atual.fii)+" | Ações "+pct(d.atual.acao)+
    " | Intl "+pct(d.atual.int)+" | Outros "+pct(d.atual.out)+"\n"+
    "Ativos: "+S.nFii+" FIIs, "+S.nAcao+" ações · Aporte: "+brl(S.aporte)+"/mês";

  $("#ma_r_sum").textContent = resumo;
  $("#ma_r_copy").onclick = function(e){
    e.preventDefault();
    $("#ma_r_sum").style.display = "block";
    copiar(resumo);
    $("#ma_r_copy").textContent = "Copiado — é só colar no WhatsApp";
    track("copiou", {nivel: d.nivel.t, perfil: P.nome});
  };
}

/* copia com fallback (alguns navegadores bloqueiam clipboard) */
function copiar(txt){
  if (navigator.clipboard && window.isSecureContext){ navigator.clipboard.writeText(txt).catch(fallback); }
  else fallback();
  function fallback(){
    var t = document.createElement("textarea"); t.value = txt; t.style.position = "fixed"; t.style.opacity = "0";
    document.body.appendChild(t); t.select(); try{ document.execCommand("copy"); }catch(e){} document.body.removeChild(t);
  }
}

check();
track("abriu", {passo:0});

})();
