// profile.js - show single participant details
async function fetchList(){ const r = await fetch('/api/list'); return await r.json(); }
function qs(name){ return new URLSearchParams(location.search).get(name); }
document.addEventListener('DOMContentLoaded', async ()=>{
  const id = qs('id'); if(!id){ document.getElementById('content').innerText='ID tidak ditemukan'; return; }
  const data = await fetchList();
  const item = data.find(d=>d.id===id);
  if(!item){ document.getElementById('content').innerText='Data tidak ditemukan'; return; }
  document.getElementById('content').innerHTML = `
    <h2 class="text-xl font-semibold">${item.nama}</h2>
    <p class="text-sm text-gray-300">${item.asalSekolah} — ${item.kategoriLomba} (${item.tingkat})</p>
    <p class="mt-3"><a href="/uploads/${item.file}" class="underline">Download file</a></p>
    <p class="mt-3 text-xs text-gray-400">Uploaded at: ${item.uploadedAt}</p>
  `;
});