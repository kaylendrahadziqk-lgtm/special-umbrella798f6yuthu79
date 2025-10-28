// main.js - client-side handling (frontend)
// Simple client-side logic while backend exists: uploads will POST to /api/upload
const form = document.getElementById('uploadForm');
const list = document.getElementById('list');
const searchInput = document.getElementById('searchInput');
const downloadZipBtn = document.getElementById('downloadZipBtn');

async function fetchList() {
  const res = await fetch('/api/list');
  const data = await res.json();
  return data;
}

async function renderList(filter='') {
  const data = await fetchList();
  const filtered = data.filter(item => {
    const q = filter.toLowerCase();
    return !q || item.nama.toLowerCase().includes(q) || item.asalSekolah.toLowerCase().includes(q) || item.kategoriLomba.toLowerCase().includes(q);
  });
  list.innerHTML = filtered.map(it => `
    <div class="bg-gray-700 p-3 rounded flex justify-between items-center">
      <div>
        <div class="font-semibold">${it.nama} <span class="text-xs text-gray-300">(${it.tingkat} - ${it.kategoriLomba})</span></div>
        <div class="text-sm text-gray-400">${it.asalSekolah}</div>
      </div>
      <div class="flex gap-2">
        <a href="/uploads/${it.file}" target="_blank" class="text-sm underline">Download</a>
        <a href="/profile.html?id=${it.id}" class="text-sm underline">Detail</a>
      </div>
    </div>
  `).join('') || '<div class="text-gray-400">Belum ada data.</div>';
}

searchInput?.addEventListener('input', (e) => {
  renderList(e.target.value);
});

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  try {
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const json = await res.json();
    if (json.success) {
      Swal.fire('Sukses', 'File berhasil diupload', 'success');
      form.reset();
      renderList();
    } else {
      Swal.fire('Gagal', json.message || 'Upload gagal', 'error');
    }
  } catch (err) {
    Swal.fire('Error', 'Server error', 'error');
  }
});

downloadZipBtn?.addEventListener('click', async () => {
  // download a zip containing user's uploads (server will pack by query param ?mine=true for demo)
  window.location = '/api/download-zip?mine=true';
});

// initial render
renderList();
