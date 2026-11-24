// Komponen halaman Tahap 2: kartu KPI, slot berkas (Drive / tautan), tab, pemilih, dan pembantu unduhan.
import { html, raw, angka, tanggalJam, hariIni, esc } from './util.js';
import { ikon } from './icons.js';
import { api } from './api.js';
import { unggahBerkas, ambilBerkas, hapusBerkas, simpanBlob } from './berkas.js';
import { siapkanGambar } from './foto.js';
import { toast, konfirmasi, pesanGalat, tombolMuat, bukaModal } from './ui.js';

/** Kartu KPI. nilai angka → hitung naik; rp → awalan "Rp" kecil. */
export function kpi({ warna = '', ikonNama = 'layers', label, nilai, satuan = '', note = '', rp = false }) {
  const num = typeof nilai === 'number';
  return html`<div class="kpi ${warna}"><span class="kpi-badge">${raw(ikon(ikonNama, 22))}</span><span class="kpi-label">${label}</span>
    <span class="kpi-num">${rp ? html`<small class="rp">Rp</small>` : ''}${num ? html`<span data-hitung="${nilai}">0</span>` : nilai}${satuan ? html`<small>${satuan}</small>` : ''}</span>
    ${note ? html`<span class="kpi-note">${note}</span>` : ''}</div>`;
}

export const opsi = (daftar, pilih = '', kosong = null) => html`${kosong != null ? html`<option value="">${kosong}</option>` : ''}${daftar.map((o) => {
  const [v, l] = Array.isArray(o) ? o : [o, o];
  return html`<option value="${v}" ${String(v) === String(pilih ?? '') ? raw('selected') : ''}>${l}</option>`;
})}`;

export function tabs(daftar, aktif) {
  return html`<div class="tabs" role="tablist">${daftar.map(([id, label, n]) => html`<button type="button" role="tab" data-tab="${id}" aria-selected="${id === aktif}">
    ${label}${n != null ? html` <span class="hitung">${angka(n)}</span>` : ''}</button>`)}</div>`;
}

export const namaUnduhan = (awal) => `SITASI-${awal}-${hariIni()}`;
export const ukuranTeks = (b) => (b == null ? '' : b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');

const MIME_OK = ['application/pdf', 'application/msword', 'image/jpeg', 'image/png', 'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

/**
 * Slot berkas untuk satu jenis berkas tahap. Unggah ke Google Drive Super Admin lewat Apps Script,
 * atau tempel tautan bila Apps Script belum dipasang.
 */
export function slotBerkas({ judul, ket = '', jenis, berkas = [], boleh = false }) {
  const ada = berkas.filter((b) => b.jenis === jenis);
  return html`<div class="slot-berkas" data-slot="${jenis}">
    <div class="slot-head"><span class="ubin biru">${raw(ikon('file-text', 20))}</span><div><b>${judul}</b>${ket ? html`<small>${ket}</small>` : ''}</div>
      ${ada.length ? html`<span class="badge b-ok">${raw(ikon('check-circle', 15))} Terunggah</span>` : html`<span class="badge b-wait">${raw(ikon('clock', 15))} Belum ada</span>`}</div>
    ${ada.map((b) => html`<div class="berkas-baris"><span class="ik">${raw(ikon(b.lokasi === 'tautan' ? 'link' : 'file-text', 18))}</span>
      <span class="nm"><b>${b.nama}</b><small>${[ukuranTeks(b.ukuran), b.lokasi === 'tautan' ? 'Tautan' : 'Google Drive', b.diunggah_nama, tanggalJam(b.dibuat_pada)].filter(Boolean).join(' · ')}</small></span>
      <button type="button" class="btn btn-icon" data-unduh="${b.id}" title="Unduh / buka" aria-label="Unduh ${b.nama}">${raw(ikon('download', 18))}</button>
      ${boleh ? html`<button type="button" class="btn btn-icon" data-hapus-berkas="${b.id}" title="Hapus berkas" aria-label="Hapus ${b.nama}">${raw(ikon('trash', 18))}</button>` : ''}</div>`)}
    ${boleh ? html`<div class="slot-aksi">
      <label class="btn btn-secondary btn-sm">${raw(ikon('upload', 16))} ${ada.length ? 'Ganti / tambah berkas' : 'Unggah berkas'}
        <input type="file" hidden data-file="${jenis}" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.heic,.heif"></label>
      <button type="button" class="btn btn-ghost btn-sm" data-tautan="${jenis}">${raw(ikon('link', 16))} Tempel tautan</button>
      <small class="redup">PDF, DOC/DOCX, XLS/XLSX, JPG/PNG · maks 10 MB</small></div>` : ''}
  </div>`;
}

/** Pasang perilaku slot berkas di dalam root. muatUlang() dipanggil setelah berubah. */
export function pasangSlotBerkas(root, { usulanId, tahap, judulJenis = {}, muatUlang }) {
  root.addEventListener('change', async (e) => {
    const inp = e.target.closest('input[data-file]');
    if (!inp || !inp.files?.[0]) return;
    let f = inp.files[0]; const jenis = inp.dataset.file, tahapX = inp.closest('[data-panel]')?.dataset.panel || tahap;
    inp.value = '';
    try { f = await siapkanGambar(f); } catch (err) { return toast(pesanGalat(err), 'galat', 'Foto tidak terbaca'); }
    if (f.size > 10 * 1024 * 1024) return toast('Ukuran dokumen maksimal 10 MB.', 'galat');
    if (f.type && !MIME_OK.includes(f.type)) return toast('Jenis berkas tidak diizinkan. Gunakan PDF, DOC/DOCX, XLS/XLSX, JPG, atau PNG.', 'galat');
    const lbl = inp.closest('label');
    const pulih = tombolMuat(lbl, 'Mengunggah…');
    try {
      await unggahBerkas({ usulanId, tahap: tahapX, jenis, file: f });
      toast(`${judulJenis[jenis] || 'Berkas'} tersimpan di Google Drive.`);
      await muatUlang();
    } catch (err) { toast(pesanGalat(err), 'galat', 'Unggah gagal'); pulih(); }
  });
  root.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-tautan]');
    if (t) {
      const jenis = t.dataset.tautan, tahapX = t.closest('[data-panel]')?.dataset.panel || tahap;
      const m = bukaModal({
        judul: 'Tempel tautan berkas', ukuran: 'kecil',
        isi: String(html`<div class="field"><label class="label" for="tb-nama">Nama berkas<span class="wajib">*</span></label><input id="tb-nama" class="input" value="${judulJenis[jenis] || ''}"></div>
          <div class="field" style="margin-top:16px"><label class="label" for="tb-url">Tautan (Google Drive / Docs)<span class="wajib">*</span></label><input id="tb-url" class="input" type="url" placeholder="https://drive.google.com/…"><div class="help">Pastikan berkas dapat dibuka oleh pegawai Direktorat.</div></div>`),
        kaki: String(html`<button class="btn btn-ghost" data-batal>Batal</button><button class="btn btn-primary" data-ok>Simpan tautan</button>`),
      });
      m.el.querySelector('[data-ok]').onclick = async (ev) => {
        const pulih = tombolMuat(ev.currentTarget);
        try {
          await api.tambahTautanBerkas(usulanId, tahapX, jenis, m.el.querySelector('#tb-nama').value.trim(), m.el.querySelector('#tb-url').value.trim());
          m.tutup(); toast('Tautan berkas tersimpan.'); await muatUlang();
        } catch (err) { pulih(); toast(pesanGalat(err), 'galat'); }
      };
      return;
    }
    const u = e.target.closest('[data-unduh]');
    if (u) return unduhBerkas(u.dataset.unduh, u);
    const h = e.target.closest('[data-hapus-berkas]');
    if (h) {
      const k = await konfirmasi({ judul: 'Hapus berkas?', pesan: 'Berkas dihapus dari usulan dan dari Google Drive.', label: 'Hapus', bahaya: true });
      if (!k.ok) return;
      try { await hapusBerkas(h.dataset.hapusBerkas); toast('Berkas dihapus.'); await muatUlang(); }
      catch (err) { toast(pesanGalat(err), 'galat'); }
    }
  });
}

export async function unduhBerkas(id, tombol) {
  const pulih = tombolMuat(tombol, '');
  try {
    const r = await ambilBerkas(id);
    if (r.tautan) window.open(r.tautan, '_blank', 'noopener');
    else simpanBlob(r.nama, r.blob);
  } catch (e) { toast(pesanGalat(e), 'galat', 'Unduh gagal'); }
  finally { pulih(); }
}

/** Tabel sederhana dari daftar objek (dipakai modal 40 kolom & pratinjau impor). */
export function tabelObjek(baris, kolom) {
  return html`<div class="table-wrap"><table class="tbl rapat"><thead><tr>${kolom.map((k) => html`<th>${k}</th>`)}</tr></thead>
    <tbody>${baris.map((r) => html`<tr>${kolom.map((k) => html`<td>${r[k] ?? ''}</td>`)}</tr>`)}</tbody></table></div>`;
}

export const tautanAman = (u) => (/^https?:\/\//i.test(u || '') ? u : '#');

/**
 * Daftar Pokja untuk filter/pilihan (data referensi yang jarang berubah).
 * Tampil seketika dari cache sesi browser; diperbarui di latar paling lama tiap 10 menit
 * (gas-instant-ux-pro Prinsip 2) sehingga halaman tidak menunggu jaringan sebelum tampil.
 */
const KUNCI_POKJA = 'sitasi:pokja-ref';
let pokjaMem = null, pokjaT = 0, pokjaJanji = null;
export function pokjaCepat() {
  if (!pokjaMem) { try { const c = JSON.parse(sessionStorage.getItem(KUNCI_POKJA) || 'null'); if (c?.data?.length) { pokjaMem = c.data; pokjaT = c.t; } } catch {} }
  const segarkan = () => (pokjaJanji ||= api.daftarPokja().then((d) => {
    pokjaMem = d; pokjaT = Date.now();
    try { sessionStorage.setItem(KUNCI_POKJA, JSON.stringify({ data: d, t: pokjaT })); } catch {}
    return d;
  }).catch(() => pokjaMem || []).finally(() => { pokjaJanji = null; }));
  if (pokjaMem) { if (Date.now() - pokjaT > 600_000) segarkan(); return Promise.resolve(pokjaMem); }
  return segarkan();
}
