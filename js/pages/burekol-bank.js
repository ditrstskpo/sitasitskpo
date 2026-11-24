// Burekol — Petugas Bank (v2.7.0): daftar SK bundle yang sudah sampai ke bank, isi nomor rekening per PM,
// kirim koreksi (NIK keliru / nama tidak sesuai), lalu kirim kembali ke Keuangan untuk SP2D.
import { html, raw, tanggal, tanggalJam } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { judulHalaman, kosong, kotakGalat, pesanGalat, toast, tombolMuat, skelKartu, bukaModal, konfirmasi } from '../core/ui.js';
import { rupiah } from '../core/bnba.js';
import { hapusCache } from '../core/store.js';

const JENIS_KOREKSI = [['nik_keliru', 'NIK keliru'], ['nama_tidak_sesuai', 'Nama tidak sesuai dengan data bank'], ['lainnya', 'Lainnya (tulis catatan)']];

export async function render(el) {
  let tampil = 'belum', daftar = [];
  el.innerHTML = String(html`
    ${judulHalaman({ pill: 'Burekol', sorot: 'Petugas Bank', sisa: '— SK Bundle', sub: 'Daftar SK bundle yang dikirim Keuangan. Isi nomor rekening setiap PM, atau kirim koreksi bila NIK/nama bermasalah. Setelah semua selesai, kirim kembali ke Keuangan.' })}
    <div data-isi class="rv">${skelKartu(3)}</div>`);
  const isi = el.querySelector('[data-isi]');

  async function muatDaftar() {
    try { daftar = await api.bankDaftar(); } catch (e) { isi.innerHTML = String(kotakGalat(pesanGalat(e))); return; }
    gambarDaftar();
  }
  function gambarDaftar() {
    const belum = daftar.filter((x) => x.status_bank === 'menunggu'), sudah = daftar.filter((x) => x.status_bank !== 'menunggu');
    const baris = tampil === 'belum' ? belum : daftar;
    isi.innerHTML = String(html`
      <div class="seg" role="tablist" style="margin-bottom:16px;display:flex;gap:8px">
        <button class="btn ${tampil === 'belum' ? 'btn-primary' : 'btn-secondary'}" data-f="belum">Belum ditindaklanjuti (${belum.length})</button>
        <button class="btn ${tampil === 'semua' ? 'btn-primary' : 'btn-secondary'}" data-f="semua">Semua (${daftar.length})</button>
      </div>
      ${baris.length ? html`<div class="kartu-daftar" style="display:grid;gap:12px">${baris.map((x) => html`
        <button class="kartu" data-buka="${x.id}" style="text-align:left;padding:16px;cursor:pointer">
          <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <b>${x.judul}</b>
            <span class="badge ${x.status_bank === 'menunggu' ? 'b-warn' : 'b-ok'}">${x.status_bank === 'menunggu' ? 'Menunggu bank' : 'Sudah dikirim ke Keuangan'}</span>
          </div>
          <div style="color:var(--teks-2);font-size:.875rem;margin-top:4px">${x.no_register} · ${x.pokja} · SK ${x.no_sk || '—'} (${x.tgl_sk ? tanggal(x.tgl_sk) : '—'})</div>
          <div style="margin-top:8px;font-size:.875rem">Rekening terisi <b>${x.terisi}</b> dari <b>${x.jumlah_pm}</b> PM${x.koreksi ? html` · <span style="color:var(--bahaya)">${x.koreksi} koreksi menunggu perbaikan</span>` : ''}${x.bank_penyaluran ? html` · Bank penyaluran: ${x.bank_penyaluran}` : ''}</div>
        </button>`)}</div>`
        : kosong({ ikonNama: 'landmark', judul: tampil === 'belum' ? 'Tidak ada SK bundle yang menunggu' : 'Belum ada SK bundle', teks: 'SK bundle muncul di sini setelah Keuangan mengirim Surat Penyampaian (Burekol Tahap 1).' })}`);
    isi.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { tampil = b.dataset.f; gambarDaftar(); }));
    isi.querySelectorAll('[data-buka]').forEach((b) => b.addEventListener('click', () => bukaDetail(b.dataset.buka)));
  }

  async function bukaDetail(id) {
    isi.innerHTML = String(skelKartu(3));
    let d;
    try { d = await api.bankDetail(id); } catch (e) { isi.innerHTML = String(kotakGalat(pesanGalat(e))); return; }
    const menunggu = d.status_bank === 'menunggu';
    const lengkap = d.pm.every((p) => p.nomor_rekening && p.nama_bank), adaKoreksi = d.pm.some((p) => p.koreksi);
    isi.innerHTML = String(html`
      <button class="btn btn-secondary" data-kembali>${raw(ikon('arrow-left', 16))} Kembali ke daftar</button>
      <div class="kartu" style="padding:16px;margin:16px 0">
        <b>${d.usulan.judul}</b>
        <div style="color:var(--teks-2);font-size:.875rem;margin-top:4px">${d.usulan.no_register} · ${d.usulan.pokja} · SK ${d.usulan.no_sk || '—'}</div>
        <div style="margin-top:10px"><b>Lokasi bank penyaluran:</b> ${d.bank_penyaluran.nama || 'belum diisi'}${d.bank_penyaluran.alamat ? html` — ${d.bank_penyaluran.alamat}` : ''}</div>
      </div>
      <div class="tabel-bungkus"><table class="tabel" data-tabel-pm>
        <thead><tr><th>Nama PM</th><th>Bank</th><th>No. rekening</th><th>Aksi</th></tr></thead>
        <tbody>${d.pm.map((p) => html`<tr data-pm="${p.id}">
          <td><b>${p.nama}</b><div style="font-size:.75rem;color:var(--teks-2)">NIK ${p.nik}</div>
            ${p.koreksi ? html`<div style="font-size:.75rem;color:var(--bahaya)">Koreksi dikirim: ${p.koreksi}</div>` : ''}</td>
          <td>${p.nama_bank || '—'}</td><td>${p.nomor_rekening || '—'}</td>
          <td>${menunggu ? html`<button class="btn btn-secondary" data-rek="${p.id}">${p.nomor_rekening ? 'Ubah rekening' : 'Isi nomor rekening'}</button>
            <button class="btn btn-secondary" data-kor="${p.id}">Kirim koreksi</button>` : '—'}</td></tr>`)}</tbody>
      </table></div>
      ${menunggu ? html`<div style="margin-top:16px">
        ${adaKoreksi ? html`<p style="color:var(--bahaya)">Masih ada koreksi yang menunggu perbaikan Pokja. Tombol kirim aktif setelah koreksi selesai diperbaiki.</p>` : ''}
        <button class="btn btn-primary" data-kirim ${lengkap && !adaKoreksi ? '' : 'disabled'}>${raw(ikon('send', 16))} Kirim ke Keuangan untuk SP2D</button></div>`
        : html`<p style="margin-top:16px" class="teks-2">SK bundle ini sudah dikirim kembali ke Keuangan.</p>`}`);
    isi.querySelector('[data-kembali]').addEventListener('click', muatDaftar);
    isi.querySelectorAll('[data-rek]').forEach((b) => b.addEventListener('click', () => dialogRekening(d, d.pm.find((p) => p.id === b.dataset.rek))));
    isi.querySelectorAll('[data-kor]').forEach((b) => b.addEventListener('click', () => dialogKoreksi(d, d.pm.find((p) => p.id === b.dataset.kor))));
    isi.querySelector('[data-kirim]')?.addEventListener('click', async (e) => {
      const ok = await konfirmasi({ judul: 'Kirim ke Keuangan?', pesan: 'Semua nomor rekening sudah terisi. Keuangan akan melanjutkan ke SP2D.', label: 'Ya, kirim' });
      if (!ok?.ok && ok !== true) return;
      const lepas = tombolMuat(e.currentTarget, 'Mengirim…');
      try { await api.prosesTahap(d.usulan.id, '7b', 'selesai', {}, null); hapusCache(); toast('Dikirim ke Keuangan.'); await muatDaftar(); }
      catch (er) { toast(pesanGalat(er), 'galat'); lepas(); }
    });
  }

  function dialogRekening(d, p) {
    const m = bukaModal({ judul: 'Isi nomor rekening — ' + p.nama, isi: String(html`
      <label class="lbl">Nama bank<input class="inp" data-bank value="${p.nama_bank || d.bank_penyaluran.nama || ''}"></label>
      <label class="lbl">Nomor rekening (6–20 digit)<input class="inp" data-no inputmode="numeric" value="${p.nomor_rekening || ''}"></label>
      <label class="lbl">Nama pemilik rekening<input class="inp" data-pem value="${p.nama_pemilik_rek || p.nama}"></label>`),
      kaki: '<button class="btn btn-secondary" data-batal>Batal</button><button class="btn btn-primary" data-simpan>Simpan</button>' });
    m.el.querySelector('[data-simpan]').addEventListener('click', async (e) => {
      const lepas = tombolMuat(e.currentTarget);
      try {
        await api.simpanRekeningSp2d(d.usulan.id, [{ id: p.id, nama_bank: m.el.querySelector('[data-bank]').value, nomor_rekening: m.el.querySelector('[data-no]').value, nama_pemilik_rek: m.el.querySelector('[data-pem]').value }]);
        hapusCache(); m.tutup(); toast('Rekening tersimpan.'); bukaDetail(d.usulan.id);
      } catch (er) { toast(pesanGalat(er), 'galat'); lepas(); }
    });
  }

  function dialogKoreksi(d, p) {
    const m = bukaModal({ judul: 'Kirim koreksi — ' + p.nama, isi: String(html`
      <p style="margin-top:0">Koreksi dikirim lewat WhatsApp/notifikasi ke Keuangan, Kapokja, dan pembuat BNBA untuk diperbaiki di menu BNBA.</p>
      <label class="lbl">Jenis koreksi<select class="inp" data-jenis>${JENIS_KOREKSI.map(([v, t]) => html`<option value="${v}">${t}</option>`)}</select></label>
      <label class="lbl">Catatan (wajib untuk "Lainnya")<textarea class="inp" data-cat rows="3"></textarea></label>`),
      kaki: '<button class="btn btn-secondary" data-batal>Batal</button><button class="btn btn-primary" data-simpan>Kirim koreksi</button>' });
    m.el.querySelector('[data-simpan]').addEventListener('click', async (e) => {
      const lepas = tombolMuat(e.currentTarget, 'Mengirim…');
      try {
        await api.kirimKoreksiBank(p.id, m.el.querySelector('[data-jenis]').value, m.el.querySelector('[data-cat]').value);
        hapusCache(); m.tutup(); toast('Koreksi terkirim.'); bukaDetail(d.usulan.id);
      } catch (er) { toast(pesanGalat(er), 'galat'); lepas(); }
    });
  }

  await muatDaftar();
}
