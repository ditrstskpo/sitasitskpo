// Pengaturan > Notifikasi WhatsApp & Email (Super Admin): saklar kanal, matriks kejadian, token Fonnte
// (disimpan di Script Properties Apps Script, tampil tersamar), uji kirim, dan antrean pengiriman.
import { html, raw, angka, tanggalJam } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { gas, gasAktif } from '../core/gas.js';
import { judulHalaman, kosong, kotakGalat, toast, pesanGalat, tombolMuat, pager } from '../core/ui.js';
import { kpi, opsi } from '../core/komp.js';

const EVENT = {
  USULAN_MENUNGGU_KAPOKJA: ['Usulan menunggu verifikasi Kapokja', 'Kapokja Pokja pemilik (Tahap 2)'],
  TAHAP_BARU: ['Tahap berikutnya terbuka', 'Pelaksana tahap berikutnya: Anggota Pokja (3), TU (4a–4c, 6), Keuangan (5, 7–11)'],
  PROGRES_USULAN: ['Progres usulan (setiap tahap selesai)', 'Anggota & Kapokja Pokja pemilik usulan'],
  USULAN_DIKEMBALIKAN: ['Usulan dikembalikan beserta alasan', 'Anggota & Kapokja Pokja pemilik usulan'],
  USULAN_DITOLAK: ['Usulan ditolak beserta alasan', 'Anggota & Kapokja Pokja pemilik usulan'],
  USULAN_SELESAI: ['Bantuan sudah cair (Tahap 11)', 'Anggota & Kapokja Pokja pemilik usulan'],
  SMV_JATUH_TEMPO: ['Jadwal Supermonev jatuh tempo', 'Kapokja Supermonev & Kapokja TU'],
  SMV_DITUGASKAN: ['Tugas Supermonev baru / dipindahkan', 'Petugas Supermonev yang ditugaskan'],
  SMV_MENUNGGU: ['Isian Supermonev menunggu verifikasi', 'Kapokja Supermonev'],
  SMV_DIKEMBALIKAN: ['Isian Supermonev dikembalikan', 'Petugas pengisi'],
  SMV_TERVERIFIKASI: ['Isian Supermonev terverifikasi', 'Petugas pengisi'],
  BELANJA_MENUNGGU: ['Bukti belanja/BAST menunggu verifikasi', 'Kapokja Supermonev'],
  BELANJA_DIKEMBALIKAN: ['Bukti belanja/BAST dikembalikan', 'Pengunggah bukti belanja'],
  BELANJA_TERVERIFIKASI: ['Bukti belanja/BAST terverifikasi', 'Pengunggah bukti belanja'],
};
const STATUS = { antri: ['b-wait', 'clock', 'Antri'], proses: ['b-proc', 'refresh', 'Diproses'], terkirim: ['b-ok', 'check-circle', 'Terkirim'], gagal: ['b-no', 'circle-x', 'Gagal'], batal: ['b-lock', 'ban', 'Batal'] };

export async function render(el) {
  let atur, status = null, fAntri = '', hal = 1;
  el.innerHTML = String(html`${judulHalaman({ pill: 'Pengaturan Super Admin · Notifikasi', sorot: 'Notifikasi', sisa: 'WhatsApp & Email Perpindahan Tahap',
    sub: 'Setiap kali tahap alur pencairan terbuka, pelaksana tahap berikutnya dan Pokja pemilik menerima pemberitahuan di lonceng, WhatsApp (Fonnte), dan email (Gmail Super Admin). Pesan tidak memuat NIK, rekening, atau data pribadi PM.' })}
    <div data-isi><div class="skel" style="height:300px;border-radius:20px"></div></div>`);
  const $ = (q) => el.querySelector(q);

  async function muat() {
    try {
      const janjiStatus = gasAktif() ? gas('status_notif').catch((e) => ({ galat: pesanGalat(e) })) : null;
      atur = await api.pengaturanNotif();
      gambar();
      muatAntrean();
      if (janjiStatus) { status = await janjiStatus; gambarGateway(); }
    } catch (e) { $('[data-isi]').innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  function gambarGateway() {
    const w = $('[data-gateway]'); if (!w) return;
    w.innerHTML = String(html`${status?.galat ? html`<div class="galat">${raw(ikon('alert', 20))}<span>${status.galat}</span></div>` : status ? html`<dl class="kv"><div><dt>Token</dt><dd class="mono">${status.token_fonnte || 'Belum diisi'}</dd></div>
            <div><dt>Perangkat</dt><dd>${status.perangkat ? html`<span class="badge ${status.perangkat.status === 'connect' ? 'b-ok' : 'b-fix'}">${status.perangkat.status}</span> ${status.perangkat.nomor || ''}` : '—'}</dd></div>
            <div><dt>Kuota email tersisa</dt><dd>${angka(status.kuota_email)}</dd></div><div><dt>Pemicu 1 menit</dt><dd>${status.pemicu_aktif ? 'Aktif' : html`<span class="teks-merah">Belum dipasang (jalankan pasangSITASI)</span>`}</dd></div>
            <div><dt>Akun Google pengirim</dt><dd>${status.akun_google || '—'}</dd></div><div><dt>Terakhir memproses</dt><dd>${tanggalJam(status.terakhir)}</dd></div></dl>` : gasAktif() ? html`<p class="redup">Memeriksa Apps Script…</p>` : html`<p class="redup">Status tersedia setelah Apps Script tersambung.</p>`}`);
  }
  function gambar() { gambarIsi(); gambarGateway(); taksir(); }
  function gambarIsi() {
    const m = atur.notif_matriks || {};
    $('[data-isi]').innerHTML = String(html`
      ${!gasAktif() ? html`<div class="galat" style="margin-bottom:16px">${raw(ikon('alert', 22))}<span><b>Apps Script belum tersambung.</b> Isi GAS_URL di js/config.js (lihat Panduan Instalasi bagian E).
        Notifikasi in-app tetap berjalan; WhatsApp dan email tersimpan di antrean dan terkirim setelah Apps Script dipasang.</span></div>` : ''}
      <div class="kpi-row" data-ringkas></div>
      <div class="grid grid-2">
        <section class="card"><div class="card-head"><span class="ubin">${raw(ikon('toggle', 20))}</span><div><h2 class="card-title">Saklar Kanal</h2><p class="card-sub">Lonceng in-app selalu aktif.</p></div></div>
          <label class="saklar-baris"><span><b>${raw(ikon('msg', 18))} WhatsApp (Fonnte)</b><small>Dikirim ke nomor HP pegawai di Pengguna &amp; Hak Akses</small></span><input type="checkbox" class="saklar" data-kanal="wa" ${atur.notif_wa_aktif ? raw('checked') : ''}></label>
          <label class="saklar-baris"><span><b>${raw(ikon('mail', 18))} Email (Gmail Super Admin)</b><small>Kuota Gmail pribadi ±100 email/hari, Workspace ±1.500</small></span><input type="checkbox" class="saklar" data-kanal="email" ${atur.notif_email_aktif ? raw('checked') : ''}></label>
          <div class="field" style="margin-top:16px"><label class="label" for="app-url">Alamat web SITASI (untuk tautan di pesan)</label>
            <div class="baris-input"><input id="app-url" class="input" type="url" value="${atur.app_url || ''}" placeholder="https://username.github.io/sitasi-tskpo/"><button class="btn btn-secondary" data-simpan-url>Simpan</button></div></div>
        </section>
        <section class="card"><div class="card-head"><span class="ubin biru">${raw(ikon('key', 20))}</span><div><h2 class="card-title">Gateway WhatsApp Fonnte</h2><p class="card-sub">Token disimpan di Script Properties Apps Script, tidak di basis data maupun browser.</p></div></div>
          <div data-gateway></div>
          <div class="baris-input" style="margin-top:16px"><input class="input mono" data-token type="password" placeholder="Tempel token Fonnte baru" autocomplete="off" ${!gasAktif() ? raw('disabled') : ''}>
            <button class="btn btn-primary" data-simpan-token ${!gasAktif() ? raw('disabled') : ''}>Simpan Token</button></div>
        </section>
      </div>
      <section class="card" style="margin-top:24px"><div class="card-head"><span class="ubin emas">${raw(ikon('sliders', 20))}</span><div><h2 class="card-title">Pengiriman WhatsApp (Anti-Spam)</h2>
          <p class="card-sub">Pesan dikirim berkelompok dengan jeda acak antar pesan, supaya nomor pengirim tidak dianggap spam oleh WhatsApp.</p></div></div>
        <div class="grid grid-3" style="gap:16px">
          <div class="field"><label class="label" for="wa-batch">Batch bawaan</label><select id="wa-batch" class="select" data-pg>${opsi([['5', '5 pesan'], ['10', '10 pesan (disarankan)'], ['20', '20 pesan'], ['50', '50 pesan']], String(atur.wa_batch ?? 10))}</select>
            <div class="help">Jumlah pesan maksimum yang dikirim dalam satu putaran.</div></div>
          <div class="field"><label class="label" for="wa-jeda">Jeda antar pesan (detik)</label><input id="wa-jeda" class="input" type="number" min="3" max="120" step="1" value="${atur.wa_jeda ?? 5}" data-pg>
            <div class="help">Minimal 3 detik. Makin lama makin aman.</div></div>
          <div class="field"><label class="label" for="wa-acak">Tambahan jeda acak (detik)</label><input id="wa-acak" class="input" type="number" min="0" max="60" step="1" value="${atur.wa_acak ?? 3}" data-pg>
            <div class="help">Jeda tiap pesan = jeda di atas + acak 0 sampai angka ini, agar pola tidak seragam.</div></div>
        </div>
        <p class="redup" style="margin-top:12px" data-taksiran></p>
        <div class="slot-aksi" style="margin-top:12px"><button type="button" class="btn btn-primary" data-simpan-pengiriman>${raw(ikon('save', 16))} Simpan Pengaturan Pengiriman</button>
          <button type="button" class="btn btn-ghost" data-cek-perangkat ${!gasAktif() ? raw('disabled') : ''}>${raw(ikon('refresh', 16))} Cek Perangkat</button></div>
        <div class="info-card biru" style="margin-top:16px">${raw(ikon('info', 20))}<span>Tips: gunakan nomor khusus kantor, jangan kirim ke nomor yang tidak menyimpan kontak Anda dalam jumlah besar, dan biarkan batch 10 dengan jeda 5 detik atau lebih. Email tidak terkena pembatasan ini.</span></div>
      </section>
      <section class="card" style="margin-top:24px"><div class="card-head"><span class="ubin emas">${raw(ikon('list-checks', 20))}</span><div><h2 class="card-title">Matriks Kejadian</h2><p class="card-sub">Pilih kejadian yang dikirim lewat WhatsApp dan email.</p></div><span class="spacer"></span>
        <button class="btn btn-primary btn-sm" data-simpan-matriks>${raw(ikon('save', 16))} Simpan Matriks</button></div>
        <div class="table-wrap"><table class="tbl"><thead><tr><th>Kejadian</th><th>Penerima</th><th class="tengah">WhatsApp</th><th class="tengah">Email</th></tr></thead><tbody>
          ${Object.entries(EVENT).map(([k, [l, p]]) => html`<tr><td><b>${l}</b></td><td><small>${p}</small></td>
            <td class="tengah"><input type="checkbox" class="cek" data-m="${k}" data-k="wa" ${m[k]?.wa ? raw('checked') : ''} aria-label="WhatsApp ${l}"></td>
            <td class="tengah"><input type="checkbox" class="cek" data-m="${k}" data-k="email" ${m[k]?.email ? raw('checked') : ''} aria-label="Email ${l}"></td></tr>`)}
        </tbody></table></div></section>
      <section class="card" style="margin-top:24px"><div class="card-head"><span class="ubin">${raw(ikon('send', 20))}</span><div><h2 class="card-title">Uji Kirim</h2></div></div>
        <div class="baris-input"><select class="select" data-uji-kanal style="max-width:160px">${opsi([['WA', 'WhatsApp'], ['EMAIL', 'Email']])}</select>
          <input class="input" data-uji-tujuan placeholder="Nomor HP (08…) atau alamat email"><button class="btn btn-secondary" data-uji>Kirim uji</button>
          ${gasAktif() ? html`<button class="btn btn-ghost" data-proses>${raw(ikon('zap', 16))} Proses antrean sekarang</button>` : ''}</div></section>
      <section class="card table-card" style="margin-top:24px"><div class="card-head" style="padding:20px 20px 8px"><span class="ubin biru">${raw(ikon('inbox', 20))}</span><div><h2 class="card-title">Antrean Pengiriman</h2><p class="card-sub">Gagal dicoba ulang otomatis hingga 3 kali.</p></div><span class="spacer"></span>
        <select class="select" data-f-antri style="max-width:180px">${opsi(Object.entries(STATUS).map(([k, v]) => [k, v[2]]), fAntri, 'Semua status')}</select>
        <button class="btn btn-ghost btn-sm" data-ulang-gagal>${raw(ikon('repeat', 16))} Kirim ulang yang gagal</button></div><div data-antri></div></section>`);
  }
  async function muatAntrean() {
    try {
      const [r, d] = await Promise.all([api.ringkasanAntrian(), api.daftarAntrian({ status: fAntri, hal, per: 20 })]);
      $('[data-ringkas]').innerHTML = String(html`${kpi({ warna: 'gold', ikonNama: 'clock', label: 'Dalam Antrean', nilai: r.antri, note: 'Menunggu pemicu Apps Script' })}
        ${kpi({ ikonNama: 'check-circle', label: 'Terkirim', nilai: r.terkirim, note: 'Terakhir ' + tanggalJam(r.terakhir) })}
        ${kpi({ warna: 'coral', ikonNama: 'circle-x', label: 'Gagal', nilai: r.gagal, note: 'Setelah 3 kali percobaan' })}
        ${kpi({ warna: 'sky', ikonNama: 'bell', label: 'Kanal Aktif', nilai: [atur.notif_wa_aktif && 'WA', atur.notif_email_aktif && 'Email'].filter(Boolean).join(' + ') || 'In-app', note: 'Lonceng selalu aktif' })}`);
      $('[data-antri]').innerHTML = String(d.baris.length ? html`<div class="table-wrap"><table class="tbl"><thead><tr><th>Waktu</th><th>Kanal</th><th>Penerima</th><th>Kejadian</th><th>Status</th><th>Respons</th></tr></thead><tbody>
        ${d.baris.map((x) => { const st = STATUS[x.status] || STATUS.antri; return html`<tr><td>${tanggalJam(x.dibuat_pada)}</td><td>${x.kanal === 'WA' ? 'WhatsApp' : 'Email'}</td><td><b>${x.nama_penerima || '—'}</b><small class="mono redup" style="display:block">${x.tujuan}</small></td>
          <td>${EVENT[x.event]?.[0] || x.event}</td><td><span class="badge ${st[0]}">${raw(ikon(st[1], 14))} ${st[2]}</span><small class="redup" style="display:block">${x.percobaan}× coba</small></td><td><small>${x.respon || '—'}</small></td></tr>`; })}
        </tbody></table></div>${pager({ hal, total: d.total, per: 20 })}` : kosong({ ikonNama: 'inbox', judul: 'Antrean kosong', teks: 'Pesan WhatsApp dan email muncul di sini saat ada perpindahan tahap.' }));
    } catch (e) { $('[data-antri]').innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  function taksir() {
    const t = $('[data-taksiran]'); if (!t) return;
    const b = Number($('#wa-batch').value) || 10, j = Number($('#wa-jeda').value) || 5, a = Number($('#wa-acak').value) || 0, rata = j + a / 2;
    const permenit = Math.min(b, Math.floor(60 / rata) || 1), detikBatch = Math.round(b * rata);
    t.innerHTML = String(html`Kira-kira satu batch <b>${angka(b)} pesan</b> selesai dalam <b>±${angka(detikBatch)} detik</b>; sekitar <b>${angka(Math.max(1, Math.round(3600 / rata)))} pesan per jam</b> bila antrean panjang.`);
  }
  el.addEventListener('input', (e) => { if (e.target.matches('[data-pg]')) taksir(); });
  el.addEventListener('change', async (e) => {
    const k = e.target.closest('[data-kanal]');
    if (k) { try { atur = await api.aturNotifikasi({ [k.dataset.kanal]: k.checked }); toast(`${k.dataset.kanal === 'wa' ? 'WhatsApp' : 'Email'} ${k.checked ? 'diaktifkan' : 'dinonaktifkan'}.`); muatAntrean(); } catch (err) { k.checked = !k.checked; toast(pesanGalat(err), 'galat'); } }
    if (e.target.matches('[data-f-antri]')) { fAntri = e.target.value; hal = 1; muatAntrean(); }
  });
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const jalan = async (fn, pesan) => { const pulih = tombolMuat(b); try { await fn(); if (pesan) toast(pesan); } catch (err) { toast(pesanGalat(err), 'galat'); } pulih(); };
    if (b.matches('[data-simpan-url]')) return jalan(async () => { atur = await api.aturNotifikasi({ app_url: $('#app-url').value.trim() }); }, 'Alamat web tersimpan.');
    if (b.matches('[data-simpan-pengiriman]')) return jalan(async () => {
      atur = await api.aturNotifikasi({ wa_batch: Number($('#wa-batch').value), wa_jeda: Number($('#wa-jeda').value), wa_acak: Number($('#wa-acak').value) });
    }, 'Pengaturan pengiriman tersimpan.');
    if (b.matches('[data-cek-perangkat]')) return jalan(async () => { status = await gas('status_notif').catch((err) => ({ galat: pesanGalat(err) })); gambarGateway(); }, 'Status perangkat diperbarui.');
    if (b.matches('[data-simpan-matriks]')) return jalan(async () => {
      const m = {}; el.querySelectorAll('[data-m]').forEach((c) => { (m[c.dataset.m] ||= {})[c.dataset.k] = c.checked; });
      atur = await api.aturNotifikasi({ matriks: m });
    }, 'Matriks kejadian tersimpan.');
    if (b.matches('[data-simpan-token]')) return jalan(async () => { status = await gas('simpan_token', { token: el.querySelector('[data-token]').value.trim() }, { tulis: true }); gambarGateway(); el.querySelector('[data-token]').value = ''; muatAntrean(); }, 'Token Fonnte tersimpan di Script Properties.');
    if (b.matches('[data-uji]')) return jalan(async () => { await api.ujiNotifikasi(el.querySelector('[data-uji-kanal]').value, el.querySelector('[data-uji-tujuan]').value); await muatAntrean(); }, 'Pesan uji masuk antrean.');
    if (b.matches('[data-proses]')) return jalan(async () => { const r = await gas('proses_sekarang', {}, { tulis: true }); toast(`Diproses: ${r.wa || 0} WA, ${r.email || 0} email, ${r.gagal || 0} gagal.`, 'info'); await muatAntrean(); });
    if (b.matches('[data-ulang-gagal]')) return jalan(async () => { const n = await api.kirimUlangAntrian(); toast(`${n} pesan dikembalikan ke antrean.`, 'info'); await muatAntrean(); });
    if (b.matches('[data-hal]') && !b.disabled) { hal = Number(b.dataset.hal); muatAntrean(); }
    if (b.matches('[data-ulang]')) muat();
  });
  muat();
}
