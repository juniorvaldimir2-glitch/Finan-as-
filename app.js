
// ============================================================
// DADOS BASE
// ============================================================
var MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
var MESES_C = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

var CATS_BASE = {
  alimentacao: {label:'Alimentação', icon:'🍽️', color:'#3de8a0'},
  transporte:  {label:'Transporte',  icon:'🚗', color:'#5b9cf6'},
  moradia:     {label:'Moradia',     icon:'🏠', color:'#f5c842'},
  saude:       {label:'Saúde',       icon:'💊', color:'#f76e6e'},
  lazer:       {label:'Lazer',       icon:'🎉', color:'#fb923c'},
  educacao:    {label:'Educação',    icon:'📚', color:'#a78bfa'},
  trabalho:    {label:'Trabalho',    icon:'💼', color:'#38bdf8'},
  outros:      {label:'Outros',      icon:'📦', color:'#94a3b8'}
};

var INV_BASE = {
  renda_fixa:   {label:'Renda Fixa',   icon:'🏦', color:'#3de8a0'},
  acoes:        {label:'Ações',         icon:'📊', color:'#5b9cf6'},
  fundos:       {label:'FIIs',          icon:'🏢', color:'#f5c842'},
  cripto:       {label:'Cripto',        icon:'₿',  color:'#fb923c'},
  previdencia:  {label:'Previdência',   icon:'🛡️', color:'#a78bfa'},
  reserva:      {label:'Reserva',       icon:'🔒', color:'#f76e6e'},
  outros_inv:   {label:'Outros',        icon:'📦', color:'#94a3b8'}
};

var COLORS = ['#e879a0','#34d399','#60a5fa','#fbbf24','#a78bfa','#f87171','#38bdf8','#fb923c'];

// ============================================================
// ESTADO
// ============================================================
var viewDate = new Date();
var currentTipo = 'gasto';
var currentCatTipo = 'gasto';
var filterMode = 'mes';
var headerFilter = 'mes';
var headerDiaInicio = 9;
var analiseMode = '3m';
var charts = {};

// ============================================================
// STORAGE
// ============================================================
function getData() {
  try { return JSON.parse(localStorage.getItem('fin_data')) || []; } catch(e) { return []; }
}
function setData(d) { localStorage.setItem('fin_data', JSON.stringify(d)); }

function getMetas() {
  try {
    var m = JSON.parse(localStorage.getItem('fin_metas'));
    if (!m) return {gastos:{}, inv:{}};
    if (!m.gastos) m.gastos = {};
    if (!m.inv) m.inv = {};
    return m;
  } catch(e) { return {gastos:{}, inv:{}}; }
}
function setMetas(m) { localStorage.setItem('fin_metas', JSON.stringify(m)); }

function getCatsCustom() {
  try {
    var c = JSON.parse(localStorage.getItem('fin_cats'));
    if (!c) return {gastos:{}, inv:{}};
    if (!c.gastos || typeof c.gastos !== 'object') c.gastos = {};
    if (!c.inv || typeof c.inv !== 'object') c.inv = {};
    return c;
  } catch(e) { return {gastos:{}, inv:{}}; }
}
function setCatsCustom(c) { localStorage.setItem('fin_cats', JSON.stringify(c)); }

function getCatsGasto() {
  var custom = getCatsCustom();
  var result = {};
  var k;
  for (k in CATS_BASE) result[k] = CATS_BASE[k];
  for (k in custom.gastos) result[k] = custom.gastos[k];
  return result;
}
function getCatsInv() {
  var custom = getCatsCustom();
  var result = {};
  var k;
  for (k in INV_BASE) result[k] = INV_BASE[k];
  for (k in custom.inv) result[k] = custom.inv[k];
  return result;
}

// ============================================================
// HELPERS
// ============================================================
function fmt(v) {
  return 'R$ ' + Number(v).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
}
function fmtK(v) {
  if (Math.abs(v) >= 1000) return 'R$' + (v/1000).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}) + 'k';
  return 'R$' + Math.round(v);
}
function toDate(s) { return new Date(s + 'T12:00:00'); }
function inMonth(r, d) {
  var dt = toDate(r.data);
  return dt.getFullYear() === d.getFullYear() && dt.getMonth() === d.getMonth();
}
function inRange(r, from, to) {
  var dt = toDate(r.data);
  return dt >= from && dt <= to;
}
function toggleHeaderFilter() {
  var el = document.getElementById('headerFilterRow');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function setHeaderFilter(mode, btn) {
  headerFilter = mode;
  document.querySelectorAll('#headerFilterRow .fbtn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  document.getElementById('hfCustomFields').style.display = mode === 'custom' ? 'block' : 'none';
  renderHeaderPeriod();
}

function renderHeaderPeriod() {
  headerDiaInicio = parseInt(document.getElementById('hfDiaInicio').value) || 9;
  render();
}

function getHeaderRange() {
  var now = new Date();
  if (headerFilter === 'mes') {
    return {from: new Date(viewDate.getFullYear(), viewDate.getMonth(), 1), to: new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 0)};
  }
  // Custom: from day X of viewDate month to day X-1 of next month
  var from = new Date(viewDate.getFullYear(), viewDate.getMonth(), headerDiaInicio);
  var to = new Date(viewDate.getFullYear(), viewDate.getMonth()+1, headerDiaInicio-1);
  return {from: from, to: to};
}

function changePeriod(d) {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + d, 1);
  render();
}

function changeMonth(d) {
  changePeriod(d);
}

function getRange() {
  var now = new Date();
  if (filterMode === 'mes') {
    return {from: new Date(viewDate.getFullYear(), viewDate.getMonth(), 1), to: new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 0)};
  }
  if (filterMode === '3m') return {from: new Date(now.getFullYear(), now.getMonth()-2, 1), to: now};
  if (filterMode === '6m') return {from: new Date(now.getFullYear(), now.getMonth()-5, 1), to: now};
  if (filterMode === 'ano') return {from: new Date(now.getFullYear(), 0, 1), to: now};
  if (filterMode === 'tudo') return {from: new Date(2000,0,1), to: now};
  if (filterMode === 'custom') {
    var s = document.getElementById('dtIni').value;
    var e = document.getElementById('dtFim').value;
    if (s && e) return {from: toDate(s), to: toDate(e)};
  }
  return {from: new Date(now.getFullYear(), now.getMonth(), 1), to: now};
}

// ============================================================
// NAVEGAÇÃO
// ============================================================
function goPage(name, btn) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
  document.getElementById('pg-' + name).classList.add('active');
  btn.classList.add('active');
  document.getElementById('fabBtn').style.display = (name === 'config') ? 'none' : 'flex';
  if (name === 'resumo') renderResumo();
  if (name === 'registros') renderRegistros();
  if (name === 'analise') renderAnalise();
  if (name === 'invest') renderInvest();
  if (name === 'config') renderConfig();
}



// ============================================================
// MODAL
// ============================================================
function abrirModal() {
  document.getElementById('inpData').value = new Date().toISOString().split('T')[0];
  document.getElementById('inpValor').value = '';
  document.getElementById('inpDesc').value = '';
  document.getElementById('inpParcelas').value = '2';
  document.getElementById('inpRecMeses').value = '12';
  setParcelado(false);
  setRecorrente(false);
  setTipo('gasto');
  buildSelects();
  document.getElementById('overlay').classList.add('open');
  setTimeout(function() { document.getElementById('inpValor').focus(); }, 350);
}

var isParcelado = false;
var isRecorrente = false;

function setRecorrente(sim) {
  isRecorrente = sim;
  document.getElementById('btnNaoRec').style.background = sim ? '' : 'rgba(61,232,160,0.12)';
  document.getElementById('btnNaoRec').style.borderColor = sim ? '' : 'var(--green)';
  document.getElementById('btnNaoRec').style.color = sim ? '' : 'var(--green)';
  document.getElementById('btnSimRec').style.background = sim ? 'rgba(167,139,250,0.12)' : '';
  document.getElementById('btnSimRec').style.borderColor = sim ? 'var(--purple)' : '';
  document.getElementById('btnSimRec').style.color = sim ? 'var(--purple)' : '';
  document.getElementById('fieldRecMeses').style.display = sim ? 'block' : 'none';
  if (sim) { setParcelado(false); document.getElementById('fieldParcelas').style.display = 'none'; }
}

function setParcelado(sim) {
  isParcelado = sim;
  document.getElementById('btnNaoParcela').style.background = sim ? '' : 'rgba(61,232,160,0.12)';
  document.getElementById('btnNaoParcela').style.borderColor = sim ? '' : 'var(--green)';
  document.getElementById('btnNaoParcela').style.color = sim ? '' : 'var(--green)';
  document.getElementById('btnSimParcela').style.background = sim ? 'rgba(91,156,246,0.12)' : '';
  document.getElementById('btnSimParcela').style.borderColor = sim ? 'var(--blue)' : '';
  document.getElementById('btnSimParcela').style.color = sim ? 'var(--blue)' : '';
  document.getElementById('fieldParcelas').style.display = sim ? 'block' : 'none';
}
function fecharModal(e) {
  if (e.target === document.getElementById('overlay')) {
    document.getElementById('overlay').classList.remove('open');
  }
}

function setTipo(t) {
  currentTipo = t;
  document.getElementById('tGasto').className = 'tbtn' + (t === 'gasto' ? ' ag' : '');
  document.getElementById('tReceita').className = 'tbtn' + (t === 'receita' ? ' ar' : '');
  document.getElementById('tInv').className = 'tbtn' + (t === 'inv' ? ' ai' : '');
  document.getElementById('fieldCat').style.display = t === 'inv' ? 'none' : 'block';
  document.getElementById('fieldInvCat').style.display = t === 'inv' ? 'block' : 'none';
}

function buildSelects() {
  var cg = getCatsGasto();
  var ci = getCatsInv();
  var selG = document.getElementById('inpCat');
  var selI = document.getElementById('inpInvCat');
  selG.innerHTML = '';
  selI.innerHTML = '';
  var k;
  for (k in cg) {
    var o = document.createElement('option');
    o.value = k; o.textContent = cg[k].icon + ' ' + cg[k].label;
    selG.appendChild(o);
  }
  for (k in ci) {
    var o2 = document.createElement('option');
    o2.value = k; o2.textContent = ci[k].icon + ' ' + ci[k].label;
    selI.appendChild(o2);
  }
}

function salvarRegistro() {
  var valor = parseFloat(document.getElementById('inpValor').value);
  var desc = document.getElementById('inpDesc').value.trim();
  var data = document.getElementById('inpData').value;
  if (!valor || valor <= 0) { alert('Digite um valor válido.'); return; }
  if (!desc) { alert('Digite uma descrição.'); return; }
  if (!data) { alert('Selecione uma data.'); return; }
  var cat = currentTipo === 'inv' ? document.getElementById('inpInvCat').value : document.getElementById('inpCat').value;
  var d = getData();
  var dt = toDate(data);

  if (isRecorrente) {
    var nMeses = parseInt(document.getElementById('inpRecMeses').value);
    if (!nMeses || nMeses < 2) { alert('Digite o número de meses (mínimo 2).'); return; }
    var i;
    for (i = 0; i < nMeses; i++) {
      var mesRec = new Date(dt.getFullYear(), dt.getMonth() + i, dt.getDate());
      var dataRecStr = mesRec.getFullYear() + '-' + String(mesRec.getMonth()+1).padStart(2,'0') + '-' + String(mesRec.getDate()).padStart(2,'0');
      d.push({
        id: Date.now() + i,
        tipo: currentTipo,
        valor: valor,
        desc: desc,
        cat: cat,
        data: dataRecStr,
        recorrente: true
      });
    }
  } else if (isParcelado) {
    var nParcelas = parseInt(document.getElementById('inpParcelas').value);
    if (!nParcelas || nParcelas < 2) { alert('Digite o número de parcelas (mínimo 2).'); return; }
    var valorParcela = Math.round((valor / nParcelas) * 100) / 100;
    var i;
    for (i = 0; i < nParcelas; i++) {
      var mes = new Date(dt.getFullYear(), dt.getMonth() + i, dt.getDate());
      var dataStr = mes.getFullYear() + '-' + String(mes.getMonth()+1).padStart(2,'0') + '-' + String(mes.getDate()).padStart(2,'0');
      d.push({
        id: Date.now() + i,
        tipo: currentTipo,
        valor: valorParcela,
        desc: desc + ' (' + (i+1) + '/' + nParcelas + ')',
        cat: cat,
        data: dataStr,
        parcela: true
      });
    }
  } else {
    d.push({id: Date.now(), tipo: currentTipo, valor: valor, desc: desc, cat: cat, data: data});
  }

  setData(d);
  document.getElementById('overlay').classList.remove('open');
  viewDate = new Date(dt.getFullYear(), dt.getMonth(), 1);
  render();
}

// ============================================================
// FILTROS
// ============================================================
function setFilter(mode, btn) {
  filterMode = mode;
  document.querySelectorAll('#pg-registros .fbtn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  document.getElementById('customRange').style.display = mode === 'custom' ? 'grid' : 'none';
  var lbl = document.getElementById('monthLabel');
  var now = new Date();
  if (mode === 'mes') lbl.textContent = MESES[viewDate.getMonth()] + ' ' + viewDate.getFullYear();
  else if (mode === '3m') lbl.textContent = 'Últimos 3 meses';
  else if (mode === '6m') lbl.textContent = 'Últimos 6 meses';
  else if (mode === 'ano') lbl.textContent = 'Ano ' + now.getFullYear();
  else if (mode === 'tudo') lbl.textContent = 'Todo o período';
  else if (mode === 'custom') lbl.textContent = 'Período personalizado';
  renderRegistros();
}

function setAnalise(mode, btn) {
  analiseMode = mode;
  document.querySelectorAll('#pg-analise .fbtn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  document.getElementById('analiseCustomRange').style.display = mode === 'custom' ? 'grid' : 'none';
  if (mode !== 'custom') renderAnalise();
}

function getAnaliseMeses() {
  var now = new Date();
  var months = [];
  var i;
  if (analiseMode === '3m') {
    for (i = 2; i >= 0; i--) months.push(new Date(now.getFullYear(), now.getMonth()-i, 1));
  } else if (analiseMode === '6m') {
    for (i = 5; i >= 0; i--) months.push(new Date(now.getFullYear(), now.getMonth()-i, 1));
  } else if (analiseMode === 'ano') {
    for (i = 0; i <= now.getMonth(); i++) months.push(new Date(now.getFullYear(), i, 1));
  } else if (analiseMode === '12m') {
    for (i = 11; i >= 0; i--) months.push(new Date(now.getFullYear(), now.getMonth()-i, 1));
  } else if (analiseMode === 'custom') {
    var s = document.getElementById('anIni').value;
    var e = document.getElementById('anFim').value;
    if (!s || !e) return [];
    var from = toDate(s);
    var to = toDate(e);
    var cur = new Date(from.getFullYear(), from.getMonth(), 1);
    while (cur <= to) {
      months.push(new Date(cur));
      cur = new Date(cur.getFullYear(), cur.getMonth()+1, 1);
    }
  }
  return months;
}

// ============================================================
// RENDER PRINCIPAL
// ============================================================
function render() {
  var all = getData();
  var hRange = getHeaderRange();
  var lbl = document.getElementById('monthLabel');
  if (headerFilter === 'custom') {
    var d1 = hRange.from.toLocaleDateString('pt-BR', {day:'2-digit',month:'short'});
    var d2 = hRange.to.toLocaleDateString('pt-BR', {day:'2-digit',month:'short'});
    lbl.textContent = d1 + ' – ' + d2;
  } else {
    lbl.textContent = MESES[viewDate.getMonth()] + ' ' + viewDate.getFullYear();
  }
  var mes = all.filter(function(r) { return inRange(r, hRange.from, hRange.to); });
  var rec = mes.filter(function(r) { return r.tipo === 'receita'; }).reduce(function(a,r) { return a+r.valor; }, 0);
  var gas = mes.filter(function(r) { return r.tipo === 'gasto'; }).reduce(function(a,r) { return a+r.valor; }, 0);
  var inv = mes.filter(function(r) { return r.tipo === 'inv'; }).reduce(function(a,r) { return a+r.valor; }, 0);
  var sal = rec - gas - inv;
  document.getElementById('kpiRec').textContent = fmt(rec);
  document.getElementById('kpiGas').textContent = fmt(gas);
  document.getElementById('kpiSal').textContent = fmt(sal);
  document.getElementById('kpiSal').style.color = sal >= 0 ? 'var(--green)' : 'var(--red)';
  document.getElementById('kpiInv').textContent = fmt(inv);
  var activePage = document.querySelector('.page.active');
  if (!activePage) return;
  var pg = activePage.id.replace('pg-', '');
  if (pg === 'resumo') renderResumo();
  if (pg === 'registros') renderRegistros();
  if (pg === 'analise') renderAnalise();
  if (pg === 'invest') renderInvest();
}

// ============================================================
// RENDER RESUMO
// ============================================================
function renderResumo() {
  var all = getData();
  var hRange = getHeaderRange();
  var mes = all.filter(function(r) { return inRange(r, hRange.from, hRange.to); });
  var rec = mes.filter(function(r) { return r.tipo === 'receita'; }).reduce(function(a,r) { return a+r.valor; }, 0);
  var gas = mes.filter(function(r) { return r.tipo === 'gasto'; }).reduce(function(a,r) { return a+r.valor; }, 0);
  var inv = mes.filter(function(r) { return r.tipo === 'inv'; }).reduce(function(a,r) { return a+r.valor; }, 0);
  var sal = rec - gas - inv;
  var sEl = document.getElementById('saldoBig');
  sEl.textContent = fmt(sal);
  sEl.style.color = sal >= 0 ? 'var(--green)' : 'var(--red)';
  document.getElementById('poupLbl').textContent = rec > 0 ? 'Taxa de poupança: ' + ((rec-gas)/rec*100).toFixed(0) + '% da receita' : '';

  // Pizza
  var cg = getCatsGasto();
  var byCat = {};
  mes.filter(function(r) { return r.tipo === 'gasto'; }).forEach(function(r) {
    byCat[r.cat] = (byCat[r.cat] || 0) + r.valor;
  });
  var labels = [], data = [], colors = [];
  var total = 0;
  var k;
  for (k in byCat) { if (byCat[k] > 0) { var c = cg[k] || CATS_BASE.outros; labels.push(c.label); data.push(byCat[k]); colors.push(c.color); total += byCat[k]; } }
  document.getElementById('pieLegend').innerHTML = labels.map(function(l,i) {
    return '<div class="leg-item"><div class="leg-dot" style="background:' + colors[i] + '"></div>' + l + ' ' + (total > 0 ? (data[i]/total*100).toFixed(0) + '%' : '') + '</div>';
  }).join('');
  var pieWrap = document.getElementById('pieChart').parentElement;
  if (charts.pie) { charts.pie.destroy(); delete charts.pie; }
  if (data.length) {
    // Recriar canvas se foi substituído
    if (!document.getElementById('pieChart')) {
      pieWrap.innerHTML = '<canvas id="pieChart"></canvas>';
    }
    var canvas = document.getElementById('pieChart');
    charts.pie = new Chart(canvas, {type:'doughnut', data:{labels:labels, datasets:[{data:data, backgroundColor:colors, borderWidth:2, borderColor:'#13161f', hoverOffset:4}]}, options:{responsive:true, maintainAspectRatio:false, cutout:'60%', plugins:{legend:{display:false}, tooltip:{callbacks:{label:function(c){return ' '+c.label+': '+fmt(c.raw);}}}}}});
  } else {
    pieWrap.innerHTML = '<canvas id="pieChart"></canvas><div class="empty"><div class="empty-i">📊</div>Sem gastos registrados</div>';
  }

  // Metas gastos
  var metas = getMetas();
  var mg = metas.gastos || {};
  var mgEl = document.getElementById('metaGastoRes');
  if (!Object.keys(mg).length) {
    mgEl.innerHTML = '<div class="empty"><div class="empty-i">🎯</div>Configure metas na aba Config.</div>';
  } else {
    mgEl.innerHTML = Object.keys(mg).map(function(k) {
      var meta = mg[k]; var g = byCat[k] || 0; var pct = Math.min(g/meta*100, 100);
      var cls = pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok';
      var c = cg[k] || CATS_BASE.outros;
      return '<div class="prog-row"><div class="prog-top"><div class="prog-name">' + c.icon + ' ' + c.label + '</div><div class="prog-vals">' + fmt(g) + ' / ' + fmt(meta) + '</div></div><div class="prog-bg"><div class="prog-fill prog-' + cls + '" style="width:' + pct.toFixed(1) + '%"></div></div><div class="prog-pct">' + pct.toFixed(0) + '% utilizado</div></div>';
    }).join('');
  }

  // Metas inv
  var mi = metas.inv || {};
  var ci = getCatsInv();
  var byInv = {};
  mes.filter(function(r) { return r.tipo === 'inv'; }).forEach(function(r) { byInv[r.cat] = (byInv[r.cat]||0)+r.valor; });
  var miEl = document.getElementById('metaInvRes');
  if (!Object.keys(mi).length) {
    miEl.innerHTML = '<div class="empty"><div class="empty-i">📈</div>Configure metas na aba Config.</div>';
  } else {
    miEl.innerHTML = Object.keys(mi).map(function(k) {
      var meta = mi[k]; var g = byInv[k] || 0; var pct = Math.min(g/meta*100, 100);
      var c = ci[k] || INV_BASE.outros_inv;
      return '<div class="prog-row"><div class="prog-top"><div class="prog-name">' + c.icon + ' ' + c.label + '</div><div class="prog-vals">' + fmt(g) + ' / ' + fmt(meta) + '</div></div><div class="prog-bg"><div class="prog-fill prog-inv" style="width:' + pct.toFixed(1) + '%"></div></div><div class="prog-pct">' + pct.toFixed(0) + '% da meta</div></div>';
    }).join('');
  }
}

// ============================================================
// RENDER REGISTROS
// ============================================================
function renderRegistros() {
  var range = getRange();
  var all = getData().filter(function(r) { return inRange(r, range.from, range.to); });
  all.sort(function(a,b) { return new Date(b.data) - new Date(a.data); });
  var el = document.getElementById('registrosList');
  if (!all.length) { el.innerHTML = '<div class="empty"><div class="empty-i">📋</div>Nenhum registro no período</div>'; return; }
  var cg = getCatsGasto();
  var ci = getCatsInv();
  el.innerHTML = '<div class="card">' + all.map(function(r) {
    var isG = r.tipo === 'gasto'; var isI = r.tipo === 'inv';
    var cat = isI ? (ci[r.cat] || INV_BASE.outros_inv) : (cg[r.cat] || CATS_BASE.outros);
    var cor = isG ? 'var(--red)' : isI ? 'var(--blue)' : 'var(--green)';
    var badge = isG ? 'badge-gasto' : isI ? 'badge-inv' : 'badge-receita';
    var blbl = isG ? 'gasto' : isI ? 'invest.' : 'receita';
    var dt = toDate(r.data).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'});
    return '<div class="item"><div class="item-icon" style="background:' + cat.color + '20">' + cat.icon + '</div><div class="item-body"><div class="item-name">' + r.desc + '</div><div class="item-meta">' + cat.label + ' · ' + dt + ' · <span class="badge ' + badge + '">' + blbl + '</span></div></div><div class="item-val" style="color:' + cor + '">' + fmt(r.valor) + '</div><button class="item-del" style="font-size:14px;color:var(--muted2)" onclick="abrirEdit(' + r.id + ')">✏️</button><button class="item-del" onclick="deletar(' + r.id + ')">×</button></div>';
  }).join('') + '</div>';
}

function deletar(id) {
  setData(getData().filter(function(r) { return r.id !== id; }));
  render();
  renderRegistros();
}

// ============================================================
// RENDER ANÁLISE
// ============================================================
function makeBar(id, labels, datasets) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
  var el = document.getElementById(id);
  if (!el) return;
  charts[id] = new Chart(el, {type:'bar', data:{labels:labels, datasets:datasets}, options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{ticks:{color:'rgba(238,240,248,0.5)', font:{size:11}}, grid:{color:'rgba(255,255,255,0.04)'}}, y:{ticks:{color:'rgba(238,240,248,0.5)', font:{size:11}, callback:function(v){return fmtK(v);}}, grid:{color:'rgba(255,255,255,0.04)'}}}}});
}
function makeLine(id, labels, datasets, yFmt) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
  var el = document.getElementById(id);
  if (!el) return;
  charts[id] = new Chart(el, {type:'line', data:{labels:labels, datasets:datasets}, options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:datasets.length>1, labels:{color:'rgba(238,240,248,0.6)', font:{size:11}, boxWidth:10}}}, scales:{x:{ticks:{color:'rgba(238,240,248,0.5)', font:{size:11}}, grid:{color:'rgba(255,255,255,0.04)'}}, y:{ticks:{color:'rgba(238,240,248,0.5)', font:{size:11}, callback:yFmt || function(v){return fmtK(v);}}, grid:{color:'rgba(255,255,255,0.04)'}}}}});
}
function makeDonut(id, labels, data, colors, legendId) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
  // Garantir que o canvas existe
  var wrap = document.getElementById(id);
  if (!wrap) {
    var parent = document.querySelector('[data-canvas="'+id+'"]');
    if (parent) { parent.innerHTML = '<canvas id="'+id+'"></canvas>'; }
  }
  if (!wrap) wrap = document.getElementById(id);
  if (!wrap) return;
  var total = data.reduce(function(a,b){return a+b;}, 0);
  if (legendId) {
    var legEl = document.getElementById(legendId);
    if (legEl) legEl.innerHTML = labels.map(function(l,i) {
      return '<div class="leg-item"><div class="leg-dot" style="background:' + colors[i] + '"></div>' + l + ' ' + (total>0?(data[i]/total*100).toFixed(0)+'%':'') + '</div>';
    }).join('');
  }
  if (!total) {
    wrap.parentElement.innerHTML = '<canvas id="'+id+'"></canvas><div class="empty"><div class="empty-i">📊</div>Sem dados no período</div>';
    return;
  }
  charts[id] = new Chart(wrap, {type:'doughnut', data:{labels:labels, datasets:[{data:data, backgroundColor:colors, borderWidth:2, borderColor:'#13161f', hoverOffset:4}]}, options:{responsive:true, maintainAspectRatio:false, cutout:'60%', plugins:{legend:{display:false}, tooltip:{callbacks:{label:function(c){return ' '+c.label+': '+fmt(c.raw);}}}}}});
}

function renderAnalise() {
  var all = getData();
  var months = getAnaliseMeses();
  if (!months.length) return;
  var labels = months.map(function(m) { return MESES_C[m.getMonth()] + '/' + String(m.getFullYear()).slice(2); });
  var recD = months.map(function(m) { return all.filter(function(r){return r.tipo==='receita'&&inMonth(r,m);}).reduce(function(a,r){return a+r.valor;},0); });
  var gasD = months.map(function(m) { return all.filter(function(r){return r.tipo==='gasto'&&inMonth(r,m);}).reduce(function(a,r){return a+r.valor;},0); });
  var invD = months.map(function(m) { return all.filter(function(r){return r.tipo==='inv'&&inMonth(r,m);}).reduce(function(a,r){return a+r.valor;},0); });
  var salD = months.map(function(_,i) { return recD[i]-gasD[i]-invD[i]; });
  var poupD = months.map(function(_,i) { return recD[i]>0?parseFloat(((recD[i]-gasD[i])/recD[i]*100).toFixed(1)):0; });
  var maxG = Math.max.apply(null, gasD);

  makeBar('recChart', labels, [{data:recD, backgroundColor:'rgba(61,232,160,0.75)', borderRadius:5}]);
  makeBar('gasChart', labels, [{data:gasD, backgroundColor:gasD.map(function(v){return v===maxG&&v>0?'rgba(247,110,110,0.9)':'rgba(247,110,110,0.5)';}), borderRadius:5}]);
  makeLine('salChart', labels, [{label:'Saldo', data:salD, borderColor:'#3de8a0', backgroundColor:'rgba(61,232,160,0.08)', fill:true, tension:0.4, pointBackgroundColor:salD.map(function(v){return v>=0?'#3de8a0':'#f76e6e';}), pointRadius:4}]);
  makeLine('poupChart', labels, [
    {label:'Poupança', data:poupD, borderColor:'#5b9cf6', backgroundColor:'rgba(91,156,246,0.08)', fill:true, tension:0.4, pointBackgroundColor:poupD.map(function(v){return v>=20?'#3de8a0':v>=0?'#f5c842':'#f76e6e';}), pointRadius:4},
    {label:'Meta 20%', data:months.map(function(){return 20;}), borderColor:'rgba(61,232,160,0.3)', borderDash:[4,4], pointRadius:0, fill:false}
  ], function(v){return v.toFixed(0)+'%';});

  var cg = getCatsGasto(); var ci = getCatsInv();
  var byCat = {}; var byInv = {};
  all.filter(function(r){return r.tipo==='gasto'&&months.some(function(m){return inMonth(r,m);});}).forEach(function(r){byCat[r.cat]=(byCat[r.cat]||0)+r.valor;});
  all.filter(function(r){return r.tipo==='inv'&&months.some(function(m){return inMonth(r,m);});}).forEach(function(r){byInv[r.cat]=(byInv[r.cat]||0)+r.valor;});

  var catE = Object.keys(byCat).sort(function(a,b){return byCat[b]-byCat[a];});
  makeDonut('catPieChart', catE.map(function(k){return (cg[k]||CATS_BASE.outros).label;}), catE.map(function(k){return byCat[k];}), catE.map(function(k){return (cg[k]||CATS_BASE.outros).color;}), 'catPieLegend');
  var invE = Object.keys(byInv).sort(function(a,b){return byInv[b]-byInv[a];});
  makeDonut('invPieChart', invE.map(function(k){return (ci[k]||INV_BASE.outros_inv).label;}), invE.map(function(k){return byInv[k];}), invE.map(function(k){return (ci[k]||INV_BASE.outros_inv).color;}), 'invPieLegend');

  // Insights
  var insights = [];
  var last = months.length - 1;
  var curRec = recD[last]; var curGas = gasD[last]; var curSal = salD[last];
  var prevGas = gasD.slice(0,-1).filter(function(v){return v>0;});
  var avgGas = prevGas.length ? prevGas.reduce(function(a,b){return a+b;},0)/prevGas.length : 0;
  var prevRec = recD.slice(0,-1).filter(function(v){return v>0;});
  var avgRec = prevRec.length ? prevRec.reduce(function(a,b){return a+b;},0)/prevRec.length : 0;

  if (avgGas > 0 && curGas > avgGas*1.15) insights.push({type:'bad', icon:'⚠️', title:'Gastos acima da média', text:'Gastos este mês (' + fmt(curGas) + ') estão ' + ((curGas/avgGas-1)*100).toFixed(0) + '% acima da média (' + fmt(avgGas) + ').'});
  else if (avgGas > 0 && curGas < avgGas*0.85 && curGas > 0) insights.push({type:'good', icon:'✅', title:'Gastos controlados', text:'Gastos abaixo da média do período. Ótima disciplina!'});

  if (avgRec > 0 && curRec > avgRec*1.1) insights.push({type:'good', icon:'📈', title:'Receita crescendo', text:'Receita este mês (' + fmt(curRec) + ') acima da média (' + fmt(avgRec) + ').'});
  else if (avgRec > 0 && curRec < avgRec*0.9 && curRec > 0) insights.push({type:'warn', icon:'📉', title:'Receita abaixo da média', text:'Receita este mês (' + fmt(curRec) + ') abaixo da média do período.'});

  if (curRec > 0) {
    var poup = (curRec-curGas)/curRec*100;
    if (poup >= 20) insights.push({type:'good', icon:'💚', title:'Poupança saudável', text:'Você poupou ' + poup.toFixed(0) + '% da receita este mês.'});
    else if (poup < 0) insights.push({type:'bad', icon:'🔴', title:'Déficit este mês', text:'Gastos superiores à receita. Déficit de ' + fmt(Math.abs(curSal)) + '.'});
    else insights.push({type:'warn', icon:'🟡', title:'Poupança abaixo do ideal', text:'Taxa de ' + poup.toFixed(0) + '%. Tente chegar a 20% da receita.'});
  }

  var melhor = salD.indexOf(Math.max.apply(null, salD));
  if (salD[melhor] > 0) insights.push({type:'info', icon:'🏆', title:'Melhor mês do período', text:MESES[months[melhor].getMonth()] + ' foi seu melhor mês — saldo de ' + fmt(salD[melhor]) + '.'});

  var invTotal = invD.reduce(function(a,b){return a+b;},0);
  if (invTotal > 0) {
    var mInv = months.filter(function(_,i){return invD[i]>0;}).length;
    insights.push({type:'info', icon:'📊', title:'Investimentos no período', text:'Total investido: ' + fmt(invTotal) + '. Média de ' + fmt(invTotal/mInv) + ' nos meses com aportes.'});
  }

  if (catE.length) {
    var top = catE[0]; var totalGas = Object.keys(byCat).reduce(function(a,k){return a+byCat[k];},0);
    var topCat = cg[top] || CATS_BASE.outros;
    insights.push({type:'info', icon:topCat.icon, title:topCat.label + ' é seu maior gasto', text:(byCat[top]/totalGas*100).toFixed(0) + '% dos gastos do período (' + fmt(byCat[top]) + ').'});
  }

  if (!insights.length) insights.push({type:'info', icon:'💡', title:'Lance mais dados', text:'Registre receitas e gastos para ver insights personalizados.'});

  document.getElementById('insightsBox').innerHTML = insights.map(function(ins) {
    return '<div class="ins-card ' + ins.type + '"><div class="ins-icon">' + ins.icon + '</div><div><div class="ins-title">' + ins.title + '</div><div class="ins-text">' + ins.text + '</div></div></div>';
  }).join('');
}

// ============================================================
// RENDER INVEST
// ============================================================
function renderInvest() {
  var all = getData();
  var mes = all.filter(function(r) { return r.tipo === 'inv' && inMonth(r, viewDate); });
  var metas = getMetas(); var mi = metas.inv || {};
  var ci = getCatsInv();
  var byMes = {}; var byTotal = {};
  mes.forEach(function(r) { byMes[r.cat] = (byMes[r.cat]||0)+r.valor; });
  all.filter(function(r){return r.tipo==='inv';}).forEach(function(r){byTotal[r.cat]=(byTotal[r.cat]||0)+r.valor;});

  var mEl = document.getElementById('investMetaBox');
  if (!Object.keys(mi).length) {
    mEl.innerHTML = '<div class="empty"><div class="empty-i">🎯</div>Configure metas na aba Config.</div>';
  } else {
    mEl.innerHTML = Object.keys(mi).map(function(k) {
      var meta = mi[k]; var g = byMes[k]||0; var pct = Math.min(g/meta*100,100);
      var c = ci[k] || INV_BASE.outros_inv;
      return '<div class="prog-row"><div class="prog-top"><div class="prog-name" style="color:' + c.color + '">' + c.icon + ' ' + c.label + '</div><div class="prog-vals">' + fmt(g) + ' / ' + fmt(meta) + '</div></div><div class="prog-bg"><div class="prog-fill prog-inv" style="width:' + pct.toFixed(1) + '%"></div></div><div class="prog-pct">' + pct.toFixed(0) + '% da meta · Acumulado: ' + fmt(byTotal[k]||0) + '</div></div>';
    }).join('');
  }

  mes.sort(function(a,b){return new Date(b.data)-new Date(a.data);});
  var lEl = document.getElementById('investList');
  if (!mes.length) { lEl.innerHTML = '<div class="empty"><div class="empty-i">📈</div>Nenhum aporte este mês</div>'; return; }
  lEl.innerHTML = mes.map(function(r) {
    var c = ci[r.cat] || INV_BASE.outros_inv;
    var dt = toDate(r.data).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'});
    return '<div class="item"><div class="item-icon" style="background:' + c.color + '20">' + c.icon + '</div><div class="item-body"><div class="item-name">' + r.desc + '</div><div class="item-meta">' + c.label + ' · ' + dt + '</div></div><div class="item-val" style="color:var(--blue)">' + fmt(r.valor) + '</div><button class="item-del" onclick="deletar(' + r.id + ');renderInvest()">×</button></div>';
  }).join('');
}

// ============================================================
// RENDER CONFIG
// ============================================================
function renderConfig() {
  var metas = getMetas();
  var mg = metas.gastos || {}; var mi = metas.inv || {};
  var cg = getCatsGasto(); var ci = getCatsInv();

  var mgEl = document.getElementById('metaGastoEdit');
  var miEl = document.getElementById('metaInvEdit');
  if (mgEl) mgEl.innerHTML = Object.keys(cg).map(function(k) {
    var v = cg[k];
    return '<div class="meta-edit-row"><div class="meta-edit-label">' + v.icon + ' ' + v.label + '</div><input class="meta-edit-inp" id="mg_' + k + '" type="number" placeholder="0" value="' + (mg[k]||'') + '" min="0" inputmode="decimal"></div>';
  }).join('');
  if (miEl) miEl.innerHTML = Object.keys(ci).map(function(k) {
    var v = ci[k];
    return '<div class="meta-edit-row"><div class="meta-edit-label">' + v.icon + ' ' + v.label + '</div><input class="meta-edit-inp" id="mi_' + k + '" type="number" placeholder="0" value="' + (mi[k]||'') + '" min="0" inputmode="decimal"></div>';
  }).join('');

  renderCatList();
}

function salvarMetaGasto() {
  var metas = getMetas(); metas.gastos = {};
  var cg = getCatsGasto();
  Object.keys(cg).forEach(function(k) {
    var el = document.getElementById('mg_' + k);
    if (el) { var v = parseFloat(el.value); if (!isNaN(v) && v > 0) metas.gastos[k] = v; }
  });
  setMetas(metas);
  alert('Metas de gasto salvas!');
  render();
}

function salvarMetaInv() {
  var metas = getMetas(); metas.inv = {};
  var ci = getCatsInv();
  Object.keys(ci).forEach(function(k) {
    var el = document.getElementById('mi_' + k);
    if (el) { var v = parseFloat(el.value); if (!isNaN(v) && v > 0) metas.inv[k] = v; }
  });
  setMetas(metas);
  alert('Metas de investimento salvas!');
  render();
}

// ============================================================
// CATEGORIAS
// ============================================================
function setCatTipo(tipo) {
  currentCatTipo = tipo;
  document.getElementById('catBtnG').className = 'cat-tbtn' + (tipo === 'gasto' ? ' ag' : '');
  document.getElementById('catBtnI').className = 'cat-tbtn' + (tipo === 'inv' ? ' ai' : '');
}

function addCategoria() {
  var emoji = document.getElementById('newCatEmoji').value.trim() || '📦';
  var nome = document.getElementById('newCatNome').value.trim();
  if (!nome) {
    alert('Digite o nome da categoria.');
    document.getElementById('newCatNome').focus();
    return;
  }
  var key = 'c_' + Date.now();
  var color = COLORS[Math.floor(Math.random() * COLORS.length)];
  var cats = getCatsCustom();

  if (currentCatTipo === 'gasto') {
    cats.gastos[key] = {label: nome, icon: emoji, color: color};
  } else {
    cats.inv[key] = {label: nome, icon: emoji, color: color};
  }

  setCatsCustom(cats);

  document.getElementById('newCatNome').value = '';
  document.getElementById('newCatEmoji').value = '';

  var fb = document.getElementById('catFeedback');
  fb.style.display = 'block';
  setTimeout(function() { fb.style.display = 'none'; }, 3000);

  renderCatList();
  renderConfig();
}

function delCategoria(tipo, key) {
  var cats = getCatsCustom();
  if (tipo === 'gasto' && cats.gastos[key]) delete cats.gastos[key];
  if (tipo === 'inv' && cats.inv[key]) delete cats.inv[key];
  setCatsCustom(cats);
  renderCatList();
  renderConfig();
}

function renderCatList() {
  var cats = getCatsCustom();
  var el = document.getElementById('catList');
  if (!el) return;
  var items = [];
  var k;
  for (k in cats.gastos) items.push({k:k, v:cats.gastos[k], tipo:'gasto'});
  for (k in cats.inv) items.push({k:k, v:cats.inv[k], tipo:'inv'});
  if (!items.length) {
    el.innerHTML = '<div style="font-size:12px;color:var(--muted);text-align:center;padding:12px">Nenhuma categoria criada ainda.</div>';
    return;
  }
  var html = '<div style="font-size:10px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px">Criadas</div>';
  items.forEach(function(x) {
    html += '<div id="catrow_' + x.k + '">';
    html += '<div class="item">';
    html += '<div class="item-icon" style="background:' + x.v.color + '25">' + x.v.icon + '</div>';
    html += '<div class="item-body"><div class="item-name">' + x.v.label + '</div><div class="item-meta">' + (x.tipo === 'gasto' ? 'Gasto' : 'Investimento') + '</div></div>';
    html += '<button class="item-del" style="font-size:14px;color:var(--muted2)" onclick="toggleEditCat(\'' + x.k + '\')">✏️</button>';
    html += '<button class="item-del" onclick="delCategoria(\'' + x.tipo + '\',\'' + x.k + '\')">×</button>';
    html += '</div>';
    html += '<div id="catEdit_' + x.k + '" style="display:none;background:var(--s2);border-radius:10px;padding:12px;margin:4px 0 10px">';
    html += '<div style="display:grid;grid-template-columns:70px 1fr;gap:8px;margin-bottom:8px">';
    html += '<input type="text" id="editEmoji_' + x.k + '" value="' + x.v.icon + '" maxlength="2" style="background:var(--s1);border:1px solid var(--border);border-radius:8px;padding:9px;color:var(--text);font-size:16px;text-align:center;outline:none;width:100%">';
    html += '<input type="text" id="editNome_' + x.k + '" value="' + x.v.label + '" style="background:var(--s1);border:1px solid var(--border);border-radius:8px;padding:9px;color:var(--text);font-size:14px;outline:none;width:100%">';
    html += '</div>';
    html += '<button onclick="salvarEditCat(\'' + x.tipo + '\',\'' + x.k + '\')" style="width:100%;padding:9px;border-radius:8px;border:none;background:var(--green);color:#0a0c12;font-family:Space Grotesk,sans-serif;font-size:13px;font-weight:600;cursor:pointer">Salvar</button>';
    html += '</div>';
    html += '</div>';
  });
  el.innerHTML = html;
}

function toggleEditCat(key) {
  var el = document.getElementById('catEdit_' + key);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function salvarEditCat(tipo, key) {
  var emojiEl = document.getElementById('editEmoji_' + key);
  var nomeEl = document.getElementById('editNome_' + key);
  if (!emojiEl || !nomeEl) return;
  var emoji = emojiEl.value.trim() || '📦';
  var nome = nomeEl.value.trim();
  if (!nome) { alert('Digite um nome.'); return; }
  var cats = getCatsCustom();
  if (tipo === 'gasto' && cats.gastos[key]) { cats.gastos[key].icon = emoji; cats.gastos[key].label = nome; }
  else if (tipo === 'inv' && cats.inv[key]) { cats.inv[key].icon = emoji; cats.inv[key].label = nome; }
  setCatsCustom(cats);
  renderCatList();
  renderConfig();
}




// EDITAR REGISTRO
var editId = null;
var editTipoAtual = 'gasto';

function abrirEdit(id) {
  var d = getData();
  var reg = null;
  for (var i = 0; i < d.length; i++) { if (d[i].id === id) { reg = d[i]; break; } }
  if (!reg) return;
  editId = id;
  var cg = getCatsGasto(); var ci = getCatsInv();
  var selG = document.getElementById('editCat');
  var selI = document.getElementById('editInvCat');
  selG.innerHTML = ''; selI.innerHTML = '';
  var k;
  for (k in cg) { var o = document.createElement('option'); o.value = k; o.textContent = cg[k].icon + ' ' + cg[k].label; selG.appendChild(o); }
  for (k in ci) { var o2 = document.createElement('option'); o2.value = k; o2.textContent = ci[k].icon + ' ' + ci[k].label; selI.appendChild(o2); }
  setEditTipo(reg.tipo);
  document.getElementById('editValor').value = reg.valor;
  document.getElementById('editDesc').value = reg.desc;
  document.getElementById('editData').value = reg.data;
  if (reg.tipo === 'inv') document.getElementById('editInvCat').value = reg.cat;
  else document.getElementById('editCat').value = reg.cat;
  editIsRec = false;
  setEditRec(false);
  document.getElementById('editRecMeses').value = '12';
  document.getElementById('overlayEdit').classList.add('open');
}

function setEditTipo(t) {
  editTipoAtual = t;
  document.getElementById('eGasto').className = 'tbtn' + (t === 'gasto' ? ' ag' : '');
  document.getElementById('eReceita').className = 'tbtn' + (t === 'receita' ? ' ar' : '');
  document.getElementById('eInv').className = 'tbtn' + (t === 'inv' ? ' ai' : '');
  document.getElementById('editFieldCat').style.display = t === 'inv' ? 'none' : 'block';
  document.getElementById('editFieldInv').style.display = t === 'inv' ? 'block' : 'none';
}

var editIsRec = false;

function setEditRec(sim) {
  editIsRec = sim;
  document.getElementById('editBtnNaoRec').style.background = sim ? '' : 'rgba(61,232,160,0.12)';
  document.getElementById('editBtnNaoRec').style.borderColor = sim ? '' : 'var(--green)';
  document.getElementById('editBtnNaoRec').style.color = sim ? '' : 'var(--green)';
  document.getElementById('editBtnSimRec').style.background = sim ? 'rgba(167,139,250,0.12)' : '';
  document.getElementById('editBtnSimRec').style.borderColor = sim ? 'var(--purple)' : '';
  document.getElementById('editBtnSimRec').style.color = sim ? 'var(--purple)' : '';
  document.getElementById('editRecField').style.display = sim ? 'block' : 'none';
}

function salvarEdicao() {
  var valor = parseFloat(document.getElementById('editValor').value);
  var desc = document.getElementById('editDesc').value.trim();
  var data = document.getElementById('editData').value;
  if (!valor || valor <= 0) { alert('Digite um valor válido.'); return; }
  if (!desc) { alert('Digite uma descrição.'); return; }
  if (!data) { alert('Selecione uma data.'); return; }
  var cat = editTipoAtual === 'inv' ? document.getElementById('editInvCat').value : document.getElementById('editCat').value;
  var d = getData();
  var dt = toDate(data);

  if (editIsRec) {
    var nMeses = parseInt(document.getElementById('editRecMeses').value);
    if (!nMeses || nMeses < 1) { alert('Digite o número de meses.'); return; }
    // Remove registro atual
    d = d.filter(function(r) { return r.id !== editId; });
    // Criar recorrentes
    for (var i = 0; i < nMeses; i++) {
      var mes = new Date(dt.getFullYear(), dt.getMonth() + i, dt.getDate());
      var dataStr = mes.getFullYear() + '-' + String(mes.getMonth()+1).padStart(2,'0') + '-' + String(mes.getDate()).padStart(2,'0');
      d.push({id: Date.now() + i, tipo: editTipoAtual, valor: valor, desc: desc, cat: cat, data: dataStr, recorrente: true});
    }
  } else {
    for (var j = 0; j < d.length; j++) {
      if (d[j].id === editId) {
        d[j].tipo = editTipoAtual; d[j].valor = valor; d[j].desc = desc; d[j].cat = cat; d[j].data = data;
        break;
      }
    }
  }

  setData(d);
  document.getElementById('overlayEdit').classList.remove('open');
  viewDate = new Date(dt.getFullYear(), dt.getMonth(), 1);
  render(); renderRegistros();
}
