// admin.js - admin dashboard interactions
async function fetchList() {
  const res = await fetch('/api/list');
  return await res.json();
}

function csvEscape(val){ return `"${String(val).replace(/"/g,'""')}"`; }

document.addEventListener('DOMContentLoaded', async () => {
  const data = await fetchList();
  renderTable(data);
  populateFilters(data);
  renderChart(data);
});

function renderTable(data){
  const wrap = document.getElementById('tableWrap');
  const rows = data.map(it=>`
    <div class="grid grid-cols-6 gap-2 p-2 border-b border-gray-700 items-center">
      <div>${it.nama}</div>
      <div>${it.asalSekolah}</div>
      <div>${it.kategoriLomba}</div>
      <div>${it.tingkat}</div>
      <div><a href="/uploads/${it.file}" target="_blank" class="underline">Download</a></div>
      <div><button onclick="deleteItem('${it.id}')" class="bg-red-600 px-2 py-1 rounded">Hapus</button></div>
    </div>
  `).join('') || '<div class="p-2 text-gray-400">Tidak ada data</div>';
  wrap.innerHTML = rows;
}

function populateFilters(data){
  const sel = document.getElementById('filterKategori');
  const unique = [...new Set(data.map(d=>d.kategoriLomba))];
  sel.innerHTML = '<option value="">Semua Kategori</option>' + unique.map(u=>`<option>${u}</option>`).join('');
  sel.addEventListener('change', async ()=>{
    const all = await fetchList();
    const filtered = sel.value ? all.filter(x=>x.kategoriLomba===sel.value) : all;
    renderTable(filtered);
  });
  document.getElementById('exportBtn').addEventListener('click', ()=>{
    exportCSV(data);
  });
}

function exportCSV(data){
  const header = ['nama','asalSekolah','kategoriLomba','tingkat','file','uploadedAt'];
  const csv = [header.join(',')].concat(data.map(r=> header.map(h=> csvEscape(r[h]||'')).join(','))).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'peserta_export.csv'; a.click();
}

async function deleteItem(id){
  if(!confirm('Hapus data ini?')) return;
  await fetch('/api/delete/'+id, { method:'DELETE' });
  const data = await fetchList();
  renderTable(data);
  renderChart(data);
}

async function renderChart(data){
  const ctx = document.getElementById('chart').getContext('2d');
  const counts = {};
  data.forEach(d=> { counts[d.tingkat] = (counts[d.tingkat]||0)+1; });
  new Chart(ctx, { type:'bar', data: { labels: Object.keys(counts), datasets:[{ label:'Jumlah', data: Object.values(counts) }] } });
}
