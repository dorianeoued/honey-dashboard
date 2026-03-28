const PRICE_PER_BOTTLE = 2500;
const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

function semColor(sem) { return sem === 1 ? '#f5c842' : '#e8960a'; }
function parseDate(dateStr) {
  const [year, month] = dateStr.split('-').map(Number);
  return { year, month, semester: month <= 6 ? 1 : 2 };
}

let rawData    = [];
let ordersData = [];
let salesView  = 'semester';
let prodChart, salesChart;

async function loadAll() {
  const [harvestRes, ordersRes] = await Promise.all([fetch('/api/data'), fetch('/api/orders')]);
  rawData    = await harvestRes.json();
  ordersData = await ordersRes.json();
  render();
}
loadAll().catch(err => console.error('Erreur chargement :', err));

function render() {
  renderKPIs();
  renderCharts();
  renderHarvestTable();
  renderOrdersTable();
}

// ── Agrégation récoltes ──────────────────────────────────────────────────────

function getHarvestBySemester() {
  const map = {};
  rawData.forEach(d => {
    const key = `${d.year} S${d.semester}`;
    if (!map[key]) map[key] = { label: key, year: d.year, semester: d.semester, production: 0 };
    map[key].production += d.production;
  });
  return Object.values(map);
}

// ── Agrégation ventes (commandes livrées) ────────────────────────────────────

function getDelivered() { return ordersData.filter(o => o.status === 'livré'); }

function getDeliveredBySemester() {
  const map = {};
  getDelivered().forEach(o => {
    const { year, semester } = parseDate(o.date);
    const key = `${year} S${semester}`;
    if (!map[key]) map[key] = { label: key, year, semester, sales: 0 };
    map[key].sales += o.value;
  });
  return Object.values(map);
}

function getDeliveredByMonth() {
  const map = {};
  getDelivered().forEach(o => {
    const { year, month, semester } = parseDate(o.date);
    const key = `${MONTHS_FR[month - 1]} ${year}`;
    if (!map[key]) map[key] = { label: key, year, semester, sales: 0 };
    map[key].sales += o.value;
  });
  return Object.values(map);
}

// ── KPIs ─────────────────────────────────────────────────────────────────────

function renderKPIs() {
  const semData      = getHarvestBySemester();
  const totalProd    = rawData.reduce((s, d) => s + d.production, 0);
  const delivered    = getDelivered();
  const totalSales   = delivered.reduce((s, o) => s + o.value, 0);
  const totalBottles = delivered.reduce((s, o) => s + o.quantity, 0);
  const best         = semData.reduce((b, d) => d.production > b.production ? d : b, semData[0] || {});
  const pending      = ordersData.filter(o => o.status === 'en_attente').length;

  const kpis = [
    { label: 'Production totale',    value: totalProd.toFixed(1) + ' L',                  sub: 'Toutes récoltes confondues' },
    { label: 'Ventes (livrées)',     value: totalSales.toLocaleString('fr-FR') + ' FCFA', sub: 'Commandes livrées' },
    { label: 'Bouteilles livrées',   value: totalBottles.toLocaleString('fr-FR'),          sub: 'Bouteilles de 0,5 L' },
    { label: 'Commandes en attente', value: pending,                                       sub: best.label ? 'Meilleure récolte : ' + best.label : '—' },
  ];

  document.getElementById('kpi-row').innerHTML = kpis.map(k => `
    <div class="kpi-card">
      <span class="kpi-label">${k.label}</span>
      <span class="kpi-value">${k.value}</span>
      <span class="kpi-sub">${k.sub}</span>
    </div>
  `).join('');
}

// ── Graphiques ───────────────────────────────────────────────────────────────

function renderCharts() {
  const semData   = getHarvestBySemester();
  const salesData = salesView === 'semester' ? getDeliveredBySemester() : getDeliveredByMonth();

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#2b1d00', titleColor: '#f5c842', bodyColor: '#fff', padding: 10, cornerRadius: 8 },
    },
    scales: {
      x: { ticks: { color: '#7a5c20', font: { family: 'DM Sans', size: 11 } }, grid: { color: 'rgba(0,0,0,.05)' } },
      y: { ticks: { color: '#7a5c20', font: { family: 'DM Sans', size: 11 } }, grid: { color: 'rgba(0,0,0,.07)' }, beginAtZero: true },
    },
  };

  if (prodChart)  prodChart.destroy();
  if (salesChart) salesChart.destroy();

  prodChart = new Chart(document.getElementById('productionChart'), {
    type: 'bar',
    data: {
      labels: semData.map(d => d.label),
      datasets: [{ label: 'Production (L)', data: semData.map(d => d.production), backgroundColor: semData.map(d => semColor(d.semester)), borderRadius: 8, borderSkipped: false }],
    },
    options: baseOptions,
  });

  salesChart = new Chart(document.getElementById('salesChart'), {
    type: 'bar',
    data: {
      labels: salesData.map(d => d.label),
      datasets: [{ label: 'Ventes (FCFA)', data: salesData.map(d => d.sales), backgroundColor: salesData.map(d => semColor(d.semester)), borderRadius: 8, borderSkipped: false }],
    },
    options: baseOptions,
  });
}

// ── Tableau récoltes ─────────────────────────────────────────────────────────

function renderHarvestTable() {
  document.querySelector('#priceTable tbody').innerHTML = getHarvestBySemester().map(d => `
    <tr>
      <td>${d.year}</td>
      <td>${d.label.split(' ')[1]}</td>
      <td>${d.production.toFixed(1)}</td>
      <td>${Math.floor(d.production * 2).toLocaleString('fr-FR')}</td>
      <td>${(d.production * 5000).toLocaleString('fr-FR')}</td>
    </tr>`).join('');
}

// ── Tableau commandes ────────────────────────────────────────────────────────

function renderOrdersTable() {
  document.querySelector('#ordersTable tbody').innerHTML = ordersData.map(o => `
    <tr>
      <td>${o.date}</td>
      <td>${o.client}</td>
      <td>${o.quantity}</td>
      <td>${o.value.toLocaleString('fr-FR')}</td>
      <td><span class="badge ${o.status === 'livré' ? 'badge-ok' : 'badge-pending'}">${o.status}</span></td>
      <td>${o.status === 'en_attente'
        ? `<button class="btn-deliver" data-id="${o.id}">Marquer livré</button>`
        : '✓'}</td>
    </tr>`).join('');

  document.querySelectorAll('.btn-deliver').forEach(btn => {
    btn.addEventListener('click', async () => {
      await fetch(`/api/orders/${btn.dataset.id}/deliver`, { method: 'PATCH' });
      ordersData = await fetch('/api/orders').then(r => r.json());
      render();
    });
  });
}

// ── Toggle ventes semestre/mois ──────────────────────────────────────────────

document.querySelectorAll('.toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    salesView = btn.dataset.view;
    renderCharts();
  });
});

// ── Ajouter une récolte ──────────────────────────────────────────────────────

document.getElementById('addBtn').addEventListener('click', async () => {
  const year  = parseInt(document.getElementById('f-year').value);
  const month = parseInt(document.getElementById('f-month').value);
  const prod  = parseFloat(document.getElementById('f-prod').value);
  if (!year || !month || isNaN(prod)) { alert('Veuillez remplir tous les champs.'); return; }
  await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ year, month, production: prod }) });
  rawData = await fetch('/api/data').then(r => r.json());
  render();
  document.getElementById('f-year').value = '';
  document.getElementById('f-prod').value = '';
});

// ── Ajouter une commande ─────────────────────────────────────────────────────

document.getElementById('addOrderBtn').addEventListener('click', async () => {
  const date   = document.getElementById('o-date').value;
  const client = document.getElementById('o-client').value.trim();
  const qty    = parseInt(document.getElementById('o-qty').value);
  if (!date || !client || !qty) { alert('Veuillez remplir tous les champs.'); return; }
  await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, client, quantity: qty }) });
  ordersData = await fetch('/api/orders').then(r => r.json());
  render();
  document.getElementById('o-date').value   = '';
  document.getElementById('o-client').value = '';
  document.getElementById('o-qty').value    = '';
});
