// Pengaturan > Log Aktivitas & Audit (Super Admin). Hanya baca; log tidak dapat diubah/dihapus.
import { html, raw, tanggalJam, relatif, hariIni, debounce, angka, unduhCSV } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { ambil, dariCache } from '../core/store.js';
import { judulHalaman, skelTabel, kosong, kotakGalat, pager, bukaModal, toast, pesanGalat, tombolMuat } from '../core/ui.js';

const PER = 50;
const AKSI = {
  INSERT: ['Tambah', 'b-ok', 'plus'], UPDATE: ['Ubah', 'b-proc', 'pencil'], DELETE: ['Hapus', 'b-no', 'trash'],
  LOGIN: ['Masuk', 'b-draft', 'login'], LOGOUT: ['Keluar', 'b-draft', 'logout'], GANTI_PERAN: ['Ganti Peran', 'b-violet', 'repeat'],
  EKSPOR: ['Ekspor', 'b-gold', 'download'],
};
const TABEL = { pengguna: 'Pengguna', pengguna_pokja: 'Keanggotaan Pokja', pokja: 'Pokja', pengumuman: 'Pengumuman', pengaturan: 'Pengaturan' };
const KOLOM = {
  nama: 'Nama', email: 'Email', nip: 'NIP', no_hp: 'Nomor HP', jenis_akses: 'Jenis akses', peran_sistem: 'Peran sistem', aktif: 'Aktif',
  catatan: 'Catatan', super_admin_slot: 'Slot Super Admin', jabatan: 'Jabatan', isi: 'Isi', judul: 'Judul', tingkat: 'Tingkat',
  sasaran: 'Sasaran', mulai: 'Mulai', selesai: 'Selesai', nilai: 'Nilai', pokja_id: 'Pokja', pengguna_id: 'Pengguna',
};
const SEMBUNYI = ['id', 'dibuat_pada', 'diubah_pada', 'dibuat_oleh', 'auth_id', 'simulasi', 'login_terakhir'];

const tampilNilai = (v) => (v === null || v === undefined || v === '' ? '—' : v === true ? 'Ya' : v === false ? 'Tidak' : typeof v === 'object' ? JSON.stringify(v) : String(v));
function ringkasan(x) {
  if (x.ringkasan) return x.ringkasan;
  const p = x.perubahan || {};
  if (x.aksi === 'UPDATE') return 'Mengubah ' + Object.keys(p).map((k) => KOLOM[k] || k).join(', ');
  const nama = p.nama || p.email || p.isi || p.judul || p.jabatan || '';
  return `${x.aksi === 'INSERT' ? 'Menambah' : 'Menghapus'} ${TABEL[x.tabel]?.toLowerCase() || x.tabel || 'data'}${nama ? ': ' + String(nama).slice(0, 80) : ''}`;
}

export async function render(el) {
  const f = { dari: hariIni(-6), sampai: hariIni(), aksi: '', tabel: '', q: '' };
  let hal = 1, baris = [];

  el.innerHTML = String(html`
    ${judulHalaman({ pill: 'Audit & Keamanan', sorot: 'Log Aktivitas', sisa: '& Audit',
      sub: 'Setiap tambah, ubah, hapus, login, ganti peran, dan ekspor tercatat otomatis oleh basis data. Log tidak dapat diubah atau dihapus.',
      aksi: String(html`<button type="button" class="btn btn-secondary" data-unduh>${raw(ikon('download', 18))} Unduh CSV</button>`) })}
    <section class="card filter-card">
      <div class="filter-head">${raw(ikon('filter', 20))} Saring Log</div>
      <div class="filter-grid enam">
        <div class="field"><label class="label" for="l-dari">Dari tanggal</label><input id="l-dari" type="date" class="input" value="${f.dari}"></div>
        <div class="field"><label class="label" for="l-sampai">Sampai tanggal</label><input id="l-sampai" type="date" class="input" value="${f.sampai}"></div>
        <div class="field"><label class="label" for="l-aksi">Aksi</label><select id="l-aksi" class="select"><option value="">Semua aksi</option>
          ${Object.entries(AKSI).map(([k, [l]]) => html`<option value="${k}">${l}</option>`)}</select></div>
        <div class="field"><label class="label" for="l-tabel">Objek</label><select id="l-tabel" class="select"><option value="">Semua objek</option>
          ${Object.entries(TABEL).map(([k, l]) => html`<option value="${k}">${l}</option>`)}</select></div>
        <div class="field"><label class="label" for="l-q">Cari pengguna atau rincian</label><div class="input-ikon">${raw(ikon('search', 18))}<input id="l-q" type="search" class="input" placeholder="Nama, email, atau kata kunci"></div></div>
        <button type="button" class="btn btn-ghost" data-reset>${raw(ikon('refresh', 18))} Reset</button>
      </div>
    </section>
    <section class="card table-card" style="margin-top:24px">
      <div class="card-head"><div><h2 class="card-title">Jejak Aktivitas</h2><p class="card-sub" data-jml>Memuat…</p></div></div>
      <div data-isi>${skelTabel(8, 6)}</div>
    </section>`);
  const $ = (s) => el.querySelector(s);
  const isi = $('[data-isi]');

  const kunci = () => 'audit:' + JSON.stringify({ ...f, hal });
  async function muat(paksa = false) {
    const k = kunci();
    const c = dariCache(k);
    if (c && !paksa) gambar(c); else if (!c) isi.innerHTML = String(skelTabel(8, 6));
    try { const d = await ambil(k, () => api.auditLog({ ...f, hal, per: PER }), { ttl: 15_000, paksa: true }); if (k === kunci()) gambar(d); }
    catch (e) { if (k === kunci()) isi.innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  function gambar(d) {
    baris = d.baris;
    $('[data-jml]').textContent = `${angka(d.total)} catatan sesuai saringan`;
    isi.innerHTML = String(baris.length ? html`<div class="table-wrap"><table class="tbl">
      <thead><tr><th>Waktu</th><th>Pengguna</th><th>Sebagai</th><th>Aksi</th><th>Rincian</th><th class="aksi"></th></tr></thead>
      <tbody>${baris.map((x) => { const a = AKSI[x.aksi] || [x.aksi, 'b-draft', 'circle-dot']; return html`<tr>
        <td style="white-space:nowrap"><b style="color:var(--judul);display:block">${relatif(x.waktu)}</b><small class="redup">${tanggalJam(x.waktu)}</small></td>
        <td style="min-width:230px"><b style="color:var(--judul);display:block">${x.pengguna_nama || 'Sistem'}</b><small class="redup" style="overflow-wrap:anywhere">${x.pengguna_email || 'proses otomatis / SQL Editor'}</small></td>
        <td style="min-width:150px">${x.sebagai || '—'}</td>
        <td><span class="badge ${a[1]}">${raw(ikon(a[2], 15))} ${a[0]}</span></td>
        <td style="min-width:260px">${x.tabel ? html`<small class="redup" style="display:block">${TABEL[x.tabel] || x.tabel}</small>` : ''}${ringkasan(x)}${x.alasan ? html`<small style="display:block;color:var(--emas-teks2)">Alasan: ${x.alasan}</small>` : ''}</td>
        <td class="aksi"><button type="button" class="btn btn-sm btn-ghost" data-lihat="${x.id}">${raw(ikon('eye', 16))} Lihat</button></td></tr>`; })}</tbody></table></div>
      ${d.total > PER ? pager({ hal, total: d.total, per: PER }) : ''}`
      : kosong({ ikonNama: 'history', judul: 'Tidak ada aktivitas', teks: 'Tidak ada catatan pada rentang tanggal dan saringan ini.' }));
  }

  function rincian(x) {
    const a = AKSI[x.aksi] || [x.aksi, 'b-draft', 'circle-dot'];
    const p = x.perubahan || {};
    const isiPerubahan = x.aksi === 'UPDATE'
      ? html`<div class="diff">${Object.entries(p).map(([k, v]) => html`<div class="diff-row"><b>${KOLOM[k] || k}</b><span class="lama">${tampilNilai(v?.lama)}</span> → <span class="baru">${tampilNilai(v?.baru)}</span></div>`)}</div>`
      : html`<div class="diff">${Object.entries(p).filter(([k]) => !SEMBUNYI.includes(k)).map(([k, v]) => html`<div class="diff-row"><b>${KOLOM[k] || k}</b>${tampilNilai(v)}</div>`)}</div>`;
    bukaModal({
      judul: 'Rincian Aktivitas', laci: true,
      isi: String(html`<dl class="kv" style="grid-template-columns:1fr;gap:14px">
        <div><dt>Waktu</dt><dd>${tanggalJam(x.waktu)}</dd></div>
        <div><dt>Pengguna</dt><dd>${x.pengguna_nama || 'Sistem'}<br><small class="redup">${x.pengguna_email || ''}</small></dd></div>
        <div><dt>Bertindak sebagai</dt><dd>${x.sebagai || '—'}</dd></div>
        <div><dt>Aksi</dt><dd><span class="badge ${a[1]}">${raw(ikon(a[2], 15))} ${a[0]}</span></dd></div>
        <div><dt>Objek</dt><dd>${TABEL[x.tabel] || x.tabel || '—'} <small class="redup mono">${x.record_id || ''}</small></dd></div>
        ${x.ringkasan ? html`<div><dt>Ringkasan</dt><dd>${x.ringkasan}</dd></div>` : ''}
        ${x.alasan ? html`<div><dt>Alasan</dt><dd>${x.alasan}</dd></div>` : ''}
      </dl>${Object.keys(p).length ? html`<h3 style="font-size:1rem;margin:22px 0 10px">${x.aksi === 'UPDATE' ? 'Perubahan (lama → baru)' : 'Data'}</h3>${isiPerubahan}` : ''}`),
    });
  }

  async function unduh(btn) {
    const pulih = tombolMuat(btn, 'Menyiapkan…');
    try {
      const semua = await api.auditLogSemua(f, 5000);
      const data = [['Waktu (WIB)', 'Nama Pengguna', 'Email', 'Sebagai', 'Aksi', 'Objek', 'ID Objek', 'Rincian', 'Alasan', 'Perubahan']]
        .concat(semua.map((x) => [tanggalJam(x.waktu), x.pengguna_nama || 'Sistem', x.pengguna_email || '', x.sebagai || '', (AKSI[x.aksi] || [x.aksi])[0],
          TABEL[x.tabel] || x.tabel || '', x.record_id || '', ringkasan(x), x.alasan || '', x.perubahan || '']));
      unduhCSV(`log-aktivitas_${f.dari || 'awal'}_${f.sampai || 'kini'}.csv`, data);
      api.catat('EKSPOR', `Unduh log aktivitas (${semua.length} baris)`, { filter: f }).catch(() => {});
      toast(`${angka(semua.length)} baris diunduh${semua.length >= 5000 ? ' (dibatasi 5.000 baris; persempit rentang tanggal untuk sisanya)' : ''}.`, 'sukses');
    } catch (e) { toast(pesanGalat(e), 'galat'); }
    pulih();
  }

  const saring = () => { hal = 1; muat(); };
  $('#l-dari').addEventListener('change', (e) => { f.dari = e.target.value; saring(); });
  $('#l-sampai').addEventListener('change', (e) => { f.sampai = e.target.value; saring(); });
  $('#l-aksi').addEventListener('change', (e) => { f.aksi = e.target.value; saring(); });
  $('#l-tabel').addEventListener('change', (e) => { f.tabel = e.target.value; saring(); });
  $('#l-q').addEventListener('input', debounce((e) => { f.q = e.target.value; saring(); }, 300));
  el.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.matches('[data-ulang]')) return muat(true);
    if (t.matches('[data-hal]')) { hal = Number(t.dataset.hal); return muat(); }
    if (t.matches('[data-lihat]')) return rincian(baris.find((x) => String(x.id) === t.dataset.lihat));
    if (t.matches('[data-unduh]')) return unduh(t);
    if (t.matches('[data-reset]')) {
      Object.assign(f, { dari: hariIni(-6), sampai: hariIni(), aksi: '', tabel: '', q: '' });
      $('#l-dari').value = f.dari; $('#l-sampai').value = f.sampai; $('#l-aksi').value = ''; $('#l-tabel').value = ''; $('#l-q').value = '';
      return saring();
    }
  });
  await muat();
}
