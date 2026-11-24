// Cadangan & Pemulihan (Tahap 6, Super Admin) — "Backup dapat dipulihkan" (PRD 8).
// • Buat cadangan: semua tabel data diunduh menjadi satu berkas JSON bersidik SHA-256 (+ Excel opsional untuk dibaca).
// • Pulihkan: pilih berkas → periksa sidik → UJI PULIH (tidak menulis) → Pulihkan. Hanya MENAMBAH baris yang hilang;
//   data yang sudah ada tidak pernah ditimpa. ID bawaan proyek baru (Pokja, folder, ruang obrolan) dipetakan otomatis.
import { html, raw, angka, tanggalJam } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api, modePratinjau } from '../core/api.js';
import { state } from '../core/store.js';
import { judulHalaman, kotakGalat, pesanGalat, toast, tombolMuat, konfirmasi } from '../core/ui.js';
import { pasangEfek, segarkanEfek } from '../core/efek.js';
import { unduhExcel } from '../core/xlsx.js';
import { simpanBlob } from '../core/berkas.js';

const LABEL = { pokja: 'Pokja', pengguna: 'Pengguna', pengguna_pokja: 'Keanggotaan Pokja', pengaturan: 'Pengaturan', pengumuman: 'Pengumuman', provinsi: 'Provinsi', ref_klaster: 'Klaster',
  usulan: 'Usulan', usulan_tahap: 'Tahap usulan', usulan_riwayat: 'Riwayat usulan', bnba: 'BNBA (PM)', penyaluran_log: 'Petugas penyalur', rekap_koreksi: 'Koreksi rekap', lks: 'LKS', aster: 'Aster',
  pegawai: 'Pegawai', ojt: 'OJT', jadwal: 'Jadwal', renja: 'Rencana kerja', dok_folder: 'Folder dokumen', produk_hukum: 'Produk hukum', tugas: 'Tugas', percakapan: 'Ruang pesan', pesan: 'Pesan',
  percakapan_baca: 'Tanda baca pesan', dok_pm_tanpa: 'Pengecualian dokumentasi', smv_tugas: 'Penugasan Supermonev', supermonev: 'Isian Supermonev', belanja: 'Verifikasi belanja', berkas: 'Catatan berkas',
  dokumen: 'Dokumen', notifikasi: 'Notifikasi' };
const lb = (t) => LABEL[t] || t;
async function sidik(teks) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(teks));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const cap = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 16).replace(' ', '-').replace(':', '');

export async function render(el) {
  let berkas = null, uji = null;
  el.innerHTML = String(html`
    ${judulHalaman({ pill: 'Tahap 6 · Integrasi & Penyempurnaan', sorot: 'Cadangan', sisa: '& Pemulihan Data',
      sub: 'Simpan salinan seluruh data SITASI TSKPO ke satu berkas, dan pulihkan bila terjadi kehilangan data atau pindah ke proyek Supabase baru. Pemulihan selalu diuji dulu dan tidak menimpa data yang ada.',
      aksi: String(html`<a class="btn btn-secondary" href="#/pengaturan/keamanan">${raw(ikon('shield', 18))} Pemeriksaan Keamanan</a>`) })}
    ${modePratinjau ? html`<div class="info-card biru rv" style="margin-bottom:16px">${raw(ikon('info', 20, 'ik'))}<span>Mode pratinjau: cadangan berisi data contoh di browser ini. Di Supabase, cadangan berisi data asli.</span></div>` : ''}
    <div class="cadangan-tata">
      <section class="card kartu-cadangan rv skala" data-tilt="2">
        <div class="kc-ikon hijau">${raw(ikon('database-backup', 34))}</div>
        <h2>1. Buat Cadangan</h2>
        <p>Semua tabel data diunduh menjadi satu berkas <b>.json</b>. Simpan di Google Drive kantor <i>dan</i> perangkat kantor. Lakukan minimal <b>seminggu sekali</b>.</p>
        <ul class="daftar-cek"><li>${raw(ikon('check', 16))} Usulan, BNBA, tahap pencairan, Supermonev, LKS, Aster, dokumen, pesan, pengguna</li>
          <li>${raw(ikon('check', 16))} Bersidik SHA-256: berkas rusak/diubah akan ketahuan saat dipulihkan</li>
          <li>${raw(ikon('info', 16))} Isi berkas di Google Drive tidak ikut (tetap aman di Drive); yang dicadangkan catatannya</li>
          <li>${raw(ikon('lock', 16))} Token sambungan Drive & antrean notifikasi tidak ikut dicadangkan</li></ul>
        <label class="sakelar" style="margin:8px 0 16px"><input type="checkbox" data-excel> Unduh juga versi Excel (mudah dibaca, tidak untuk dipulihkan)</label>
        <button class="btn btn-primary btn-sinar btn-besar" data-buat>${raw(ikon('download', 20))} Buat Cadangan Sekarang</button>
        <div data-progres-buat class="progres-tabel" hidden></div>
      </section>
      <section class="card kartu-cadangan rv skala" data-tilt="2">
        <div class="kc-ikon emas">${raw(ikon('archive-restore', 34))}</div>
        <h2>2. Pulihkan dari Cadangan</h2>
        <p>Pilih berkas cadangan. Aplikasi <b>menguji dulu</b> tanpa menulis apa pun, lalu Anda memutuskan. Hanya baris yang <b>hilang</b> yang ditambahkan; data yang ada tidak ditimpa.</p>
        <label class="zona-pulih" data-zona><input type="file" accept=".json,application/json" hidden data-pilih-berkas>
          ${raw(ikon('upload', 30))}<b>Pilih atau seret berkas cadangan (.json)</b><small>Contoh nama: SITASI-cadangan-2026-11-23-0930.json</small></label>
        <div data-info-berkas></div>
        <div class="tombol-pulih"><button class="btn btn-secondary btn-besar" data-uji disabled>${raw(ikon('scan', 20))} Uji Pulih (tanpa menulis)</button>
          <button class="btn btn-danger btn-besar" data-pulih disabled>${raw(ikon('archive-restore', 20))} Pulihkan Sekarang</button></div>
      </section>
    </div>
    <section class="card rv" style="margin-top:24px" data-laporan hidden></section>
    <section class="card rv" style="margin-top:24px"><div class="card-head"><span class="ubin biru">${raw(ikon('life-buoy', 20))}</span><div><h2 class="card-title">Bila terjadi masalah besar</h2><p class="card-sub">Urutan pemulihan yang disarankan</p></div></div>
      <ol class="daftar-manual"><li>Jangan panik dan jangan menghapus apa pun. Catat waktu kejadian.</li>
        <li>Buka <b>Log Aktivitas</b> untuk melihat perubahan terakhir dan siapa yang melakukannya.</li>
        <li>Bila hanya sebagian data hilang: pilih cadangan terakhir → <b>Uji Pulih</b> → periksa jumlah "akan ditambah" → <b>Pulihkan Sekarang</b>.</li>
        <li>Bila pindah ke proyek Supabase baru: jalankan <b>SETUP_SUPABASE.sql</b> di proyek baru, masuk sebagai Super Admin, lalu pulihkan cadangan. Hubungkan ulang Google Drive di <b>Penyimpanan Berkas</b>.</li>
        <li>Supabase berbayar juga menyimpan cadangan harian otomatis (menu <i>Database → Backups</i>) sebagai lapis kedua.</li></ol></section>`);
  pasangEfek(el);
  const $ = (q) => el.querySelector(q);

  // ---------------------------------------------------------------- buat cadangan
  async function buat(btn) {
    const pulih = tombolMuat(btn, 'Mencadangkan…'), w = $('[data-progres-buat]');
    try {
      const daftar = await api.cadanganDaftar();
      w.hidden = false;
      w.innerHTML = String(html`${daftar.tabel.map((t) => html`<div class="pt-baris" data-t="${t.tabel}"><span>${lb(t.tabel)}</span><span class="pt-trek"><i></i></span><small>${angka(t.baris)}</small></div>`)}`);
      const isi = {}, jumlah = {};
      for (const t of daftar.tabel) {
        const b = w.querySelector(`[data-t="${t.tabel}"]`); b.classList.add('jalan');
        const rows = [];
        for (let off = 0; off < Math.max(1, t.baris); off += 1000) {
          const r = await api.cadanganTabel(t.tabel, off, 1000);
          rows.push(...r);
          b.querySelector('i').style.width = Math.min(100, Math.round(((off + r.length) / Math.max(1, t.baris)) * 100)) + '%';
          if (r.length < 1000) break;
        }
        isi[t.tabel] = rows; jumlah[t.tabel] = rows.length;
        b.classList.remove('jalan'); b.classList.add('selesai'); b.querySelector('i').style.width = '100%';
      }
      const teks = JSON.stringify(isi), total = Object.values(jumlah).reduce((a, x) => a + x, 0);
      const paket = { aplikasi: 'SITASI TSKPO', jenis: 'cadangan', versi: daftar.versi, dibuat: new Date().toISOString(), oleh: state.sesi?.pengguna?.email || '', proyek: daftar.proyek,
        jumlah, sidik: await sidik(teks), tabel: isi };
      const nama = `SITASI-cadangan-${cap()}.json`;
      simpanBlob(nama, new Blob([JSON.stringify(paket)], { type: 'application/json' }));
      if ($('[data-excel]').checked) {
        await unduhExcel(nama.replace('.json', ''), Object.entries(isi).filter(([, r]) => r.length).map(([t, r]) => ({ nama: lb(t).slice(0, 31),
          baris: r.map((x) => Object.fromEntries(Object.entries(x).map(([k, v]) => [k, v && typeof v === 'object' ? JSON.stringify(v) : v]))) })));
      }
      await api.catatCadangan({ baris: total, tabel: daftar.tabel.length, sidik: paket.sidik.slice(0, 16) });
      toast(`Cadangan ${angka(total)} baris dari ${angka(daftar.tabel.length)} tabel terunduh (${nama}).`, 'sukses', 'Cadangan selesai');
    } catch (e) { toast(pesanGalat(e), 'galat', 'Cadangan gagal'); }
    pulih();
  }

  // ---------------------------------------------------------------- pulihkan
  async function bacaBerkas(file) {
    uji = null; $('[data-pulih]').disabled = true; $('[data-laporan]').hidden = true;
    const info = $('[data-info-berkas]');
    try {
      const j = JSON.parse(await file.text());
      if (j.aplikasi !== 'SITASI TSKPO' || j.jenis !== 'cadangan' || !j.tabel) throw new Error('Berkas ini bukan cadangan SITASI TSKPO.');
      const cocok = (await sidik(JSON.stringify(j.tabel))) === j.sidik;
      berkas = j;
      const total = Object.values(j.jumlah || {}).reduce((a, x) => a + x, 0);
      info.innerHTML = String(html`<div class="info-berkas ${cocok ? 'ok' : 'rusak'}">${raw(ikon(cocok ? 'badge-check' : 'shield-alert', 24))}
        <div><b>${file.name}</b><small>Versi ${j.versi} · dibuat ${tanggalJam(j.dibuat)} oleh ${j.oleh || '—'} · ${angka(total)} baris · ${angka(Object.keys(j.tabel).length)} tabel</small>
          <small>${cocok ? 'Sidik SHA-256 cocok: berkas utuh.' : 'PERINGATAN: sidik tidak cocok — berkas mungkin rusak atau diubah. Pemulihan tidak disarankan.'}</small></div></div>`);
      $('[data-uji]').disabled = !cocok;
    } catch (e) { berkas = null; info.innerHTML = String(kotakGalat(e.message || pesanGalat(e))); $('[data-uji]').disabled = true; }
  }
  async function jalankan(nyata, btn) {
    const lap = $('[data-laporan]'); lap.hidden = false;
    const urut = (await api.cadanganDaftar()).tabel.map((t) => t.tabel).filter((t) => berkas.tabel[t]);
    lap.innerHTML = String(html`<div class="card-head"><span class="ubin ${nyata ? 'emas' : 'biru'}">${raw(ikon(nyata ? 'archive-restore' : 'scan', 20))}</span><div><h2 class="card-title">${nyata ? 'Pemulihan' : 'Uji Pulih'}</h2>
      <p class="card-sub">${nyata ? 'Menambahkan baris yang hilang…' : 'Menghitung tanpa menulis apa pun…'}</p></div></div>
      <div class="table-wrap"><table class="tbl ringkas"><thead><tr><th>Data</th><th class="kanan">Di cadangan</th><th class="kanan">${nyata ? 'Ditambahkan' : 'Akan ditambah'}</th><th class="kanan">Sudah ada</th><th class="kanan">Gagal</th></tr></thead>
      <tbody>${urut.map((t) => html`<tr data-r="${t}"><td>${lb(t)}</td><td class="kanan">${angka(berkas.tabel[t].length)}</td><td class="kanan" data-c="tambah">…</td><td class="kanan" data-c="ada">…</td><td class="kanan" data-c="gagal">…</td></tr>`)}</tbody></table></div>
      <div data-catatan></div>`);
    const pulih = tombolMuat(btn, nyata ? 'Memulihkan…' : 'Menguji…');
    let peta = {}, tot = { tambah: 0, ada: 0, gagal: 0 }; const catatan = [], gagalRinci = [];
    try {
      for (const t of urut) {
        const rows = berkas.tabel[t], tr = lap.querySelector(`[data-r="${t}"]`); tr.classList.add('jalan');
        let tambah = 0, ada = 0, gagal = 0;
        for (let i = 0; i < Math.max(1, rows.length); i += 300) {
          const potong = rows.slice(i, i + 300); if (!potong.length) break;
          const h = await api.pulihkanTabel(t, potong, !nyata, peta);
          tambah += h.ditambah; ada += h.sudah_ada; gagal += h.jumlah_gagal; peta = { ...peta, ...(h.peta || {}) };
          (h.catatan || []).forEach((c) => catatan.push(c)); (h.gagal || []).slice(0, 3).forEach((g) => gagalRinci.push({ t, ...g }));
        }
        tr.classList.remove('jalan'); tr.classList.add(gagal ? 'ada-gagal' : 'selesai');
        tr.querySelector('[data-c="tambah"]').textContent = angka(tambah); tr.querySelector('[data-c="ada"]').textContent = angka(ada); tr.querySelector('[data-c="gagal"]').textContent = angka(gagal);
        tot.tambah += tambah; tot.ada += ada; tot.gagal += gagal;
      }
      lap.querySelector('.card-sub').textContent = `${nyata ? 'Selesai' : 'Hasil uji'}: ${angka(tot.tambah)} baris ${nyata ? 'ditambahkan' : 'akan ditambahkan'}, ${angka(tot.ada)} sudah ada, ${angka(tot.gagal)} gagal.`;
      lap.querySelector('[data-catatan]').innerHTML = String(html`${Object.keys(peta).length ? html`<p class="help" style="margin-top:12px">${raw(ikon('info', 15))} ${angka(Object.keys(peta).length)} ID bawaan (Pokja, folder, ruang pesan, pengguna) dicocokkan otomatis dengan data di proyek ini.</p>` : ''}
        ${catatan.map((c) => html`<div class="info-card emas" style="margin-top:10px">${raw(ikon('alert', 18, 'ik'))}<span>${c}</span></div>`)}
        ${gagalRinci.length ? html`<details style="margin-top:12px"><summary>Rincian baris yang gagal (${angka(tot.gagal)})</summary><ul>${gagalRinci.map((g) => html`<li><b>${lb(g.t)}</b> ${g.id}: ${g.pesan}</li>`)}</ul></details>` : ''}`);
      if (!nyata) { uji = tot; $('[data-pulih]').disabled = tot.tambah === 0; toast(tot.tambah ? `Uji pulih: ${angka(tot.tambah)} baris dapat dipulihkan.` : 'Tidak ada baris yang hilang. Data sudah lengkap.', 'info'); }
      else { toast(`${angka(tot.tambah)} baris dipulihkan.`, 'sukses', 'Pemulihan selesai'); $('[data-pulih]').disabled = true; }
    } catch (e) { toast(pesanGalat(e), 'galat'); }
    pulih();
    if (nyata || !uji?.tambah) $('[data-pulih]').disabled = true;
    segarkanEfek(el);
  }
  el.addEventListener('click', async (e) => {
    const bt = e.target.closest('[data-buat]'); if (bt) return buat(bt);
    const uj = e.target.closest('[data-uji]'); if (uj && berkas) return jalankan(false, uj);
    const pl = e.target.closest('[data-pulih]');
    if (pl && berkas && uji) {
      const k = await konfirmasi({ judul: 'Pulihkan data sekarang?', bahaya: true, label: 'Ya, pulihkan',
        pesan: `${angka(uji.tambah)} baris akan DITAMBAHKAN ke basis data. Data yang sudah ada tidak ditimpa. Ketik PULIHKAN untuk melanjutkan.`, alasan: { label: 'Ketik PULIHKAN', wajib: true } });
      if (!k.ok) return;
      if (k.alasan.trim().toUpperCase() !== 'PULIHKAN') return toast('Pemulihan dibatalkan: kata konfirmasi tidak sesuai.', 'peringatan');
      return jalankan(true, pl);
    }
  });
  el.addEventListener('change', (e) => { const f = e.target.closest('[data-pilih-berkas]'); if (f?.files?.[0]) bacaBerkas(f.files[0]); });
  const zona = $('[data-zona]');
  ['dragenter', 'dragover'].forEach((ev) => zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.add('seret'); }));
  ['dragleave', 'drop'].forEach((ev) => zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.remove('seret'); }));
  zona.addEventListener('drop', (e) => { const f = e.dataTransfer?.files?.[0]; if (f) bacaBerkas(f); });
}
