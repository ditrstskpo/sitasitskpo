// W-20 Detail Usulan: stepper 11 tahap (pita gelap), panel aksi tahap aktif sesuai peran,
// Daftar PM, Log Petugas Penyalur, Dokumentasi PM, dan Riwayat / jejak audit.
import { html, raw, angka, tanggal, tanggalJam, hariIni } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { hapusCache, bus } from '../core/store.js';
import { judulHalaman, kosong, kotakGalat, toast, konfirmasi, pesanGalat, tombolMuat, bukaModal, pasangReveal } from '../core/ui.js';
import { tabs, slotBerkas, pasangSlotBerkas, opsi, namaUnduhan, tautanAman } from '../core/komp.js';
import { STATUS_USULAN, STATUS_BNBA, MAK, KLASTER, JENIS_BANTUAN, PROVINSI, badge, chipTahap, stepperBesar, infoTahap, bolehTahap, rupiah, chipPokjaU, urutEkspor, URUT_TAHAP, KOLOM_BANK, barisBank, BANK_UMUM, jenisDariKategori } from '../core/bnba.js';
import { cocokKabKota, daftarKabKota } from '../core/wilayah.js';
import { unduhExcel } from '../core/xlsx.js';
import { pergi } from '../core/nav.js';
import * as P from '../core/peran.js';
import { galeriFoto, pasangUnggah, muatGambarMini } from '../core/unggah.js';
import { panelDiskusi } from './_pesan.js';
import { field as fieldPM, KOL_FORM, GRUP_FORM, NAV as NAV_PM, barisRincian, fmtUang } from './usulan-edit.js';
import { GRUP, totalRincian, usia as usiaPM } from '../core/bnba.js';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const JENIS_BERKAS = { draft_sk: 'Draft SK', nota_dinas: 'Nota Dinas', sk_final: 'SK TTD Final (berkas atau tautan)', surat_burekol: 'Surat Penyampaian Data Bantuan ATENSI', lampiran_burekol: 'Lampiran Data BNBA PM' };
const LABEL_DATA = { tanggal: 'Tanggal', petugas: 'Petugas', tgl_masuk_direktur: 'Tanggal masuk ke Direktur', status_ttd: 'Status TTD', tgl_ttd: 'Tanggal TTD',
  tgl_kirim: 'Tanggal kirim', pengirim: 'Pengirim (TSKPO)', penerima: 'Penerima di Sekretariat', hp_penerima: 'Nomor HP penerima', status_kirim: 'Status',
  sk_selesai: 'SK sudah selesai', no_sk: 'NO SK', tgl_sk: 'TGL SK', link_sk: 'Link SK', sp2d_terbit: 'SP2D terbit', no_sp2d: 'NO SP2D', tgl_sp2d: 'TGL SP2D',
  bulan_sp2d: 'BULAN (SP2D)', bank_penyaluran_nama: 'Bank lokasi penyaluran', bank_penyaluran_alamat: 'Alamat bank penyaluran', si_selesai: 'SI selesai', dikonfirmasi: 'Pencairan dikonfirmasi', tgl_cair: 'Tanggal cair' };
const nilaiData = (v) => (v === true ? 'Ya' : v === false ? 'Tidak' : /^\d{4}-\d{2}-\d{2}$/.test(v || '') ? tanggal(v) : v || '—');

function fld(label, inp, wajib = false, penuh = false) {
  return html`<div class="field ${penuh ? 'penuh' : ''}"><label class="label">${label}${wajib ? html`<span class="wajib">*</span>` : ''}</label>${inp}</div>`;
}
const inp = (n, v, tipe = 'text', ph = '') => html`<input class="input" name="${n}" type="${tipe}" value="${v ?? ''}" placeholder="${ph}">`;
const cek = (n, v, teks) => html`<label class="cek-besar"><input type="checkbox" name="${n}" ${v ? raw('checked') : ''}><span>${teks}</span></label>`;

export async function render(el, { sesi: s, param: id, query }) {
  let d, tab = query.get('tab') || 'proses', pm = null, dp = null;
  el.innerHTML = '<div class="skel" style="height:200px;border-radius:20px"></div><div class="skel" style="height:300px;border-radius:32px;margin-top:24px"></div>';
  const $ = (q) => el.querySelector(q);

  async function muat() { d = await api.usulanDetail(id); pm = null; dp = null; }
  try { await muat(); } catch (e) { el.innerHTML = String(kotakGalat(pesanGalat(e))); el.querySelector('[data-ulang]').onclick = () => render(el, { sesi: s, param: id, query }); return; }

  const T = (no) => d.tahap.find((x) => x.tahap === no) || { status: 'terkunci', data: {} };
  const berkasT = (no) => d.berkas.filter((b) => b.tahap === no);
  const milik = () => P.isSuperAdmin(s) || P.pokjaEfektif(s).some((p) => p.id === d.usulan.pokja_id);

  function kepala() {
    const u = d.usulan;
    return html`
      ${judulHalaman({ pill: 'Alur Penerbitan SK & Pencairan · Siklus 11 Tahap', sorot: 'Detail Usulan', sisa: '— ' + u.judul,
        sub: `${u.no_register} · pelacakan 11 tahap, validasi legalitas per tahap, penugasan petugas penyalur, dan jejak audit.`,
        aksi: String(html`<button class="btn btn-secondary" data-cetak>${raw(ikon('printer', 18))} Cetak Lembar Audit Trail</button>
          <button class="btn btn-primary" data-ekspor>${raw(ikon('download', 18))} Unduh Excel Bundle Ini</button>`) })}
      <div class="info-strip">
        <div><span class="ubin">${raw(ikon('network', 20))}</span><small>Unit Pelaksana Pokja</small><b>${chipPokjaU(u)}</b><small>Penyusun: ${u.pembuat_nama || '—'}</small></div>
        <div><span class="ubin biru">${raw(ikon('users', 20))}</span><small>Volume &amp; Alokasi PM</small><b>${angka(u.jumlah_pm)} Penerima Manfaat</b><small>${u.kabkota || '—'}</small></div>
        <div><span class="ubin emas">${raw(ikon('banknote', 20))}</span><small>Total Pagu Anggaran</small><b>${rupiah(u.nilai_total)}</b><small>${u.no_sk ? 'No SK: ' + u.no_sk : 'SK belum terbit'}</small></div>
        <div><span class="ubin">${raw(ikon('file-check', 20))}</span><small>Status &amp; Dokumen Profil</small><b>${badge(STATUS_USULAN, u.status)}</b>
          ${u.link_profil ? html`<a href="${tautanAman(u.link_profil)}" target="_blank" rel="noopener" class="tautan-kecil">${raw(ikon('external', 14))} Buka Profil Asesmen Kolektif</a>` : html`<small>Link profil belum ada</small>`}</div>
      </div>
      ${u.status === 'ditolak' ? html`<div class="galat" style="margin-top:16px">${raw(ikon('circle-x', 22))}<span><b>Usulan ditolak:</b> ${u.catatan_terakhir || '—'}
        ${u.usulan_baru_id ? html` · <a href="#/usulan/${u.usulan_baru_id}">Lihat usulan ajuan ulang</a>` : ''}</span><span class="spacer"></span>
        ${!u.usulan_baru_id && milik() ? html`<button class="btn btn-sm btn-secondary" data-ajukan-ulang>${raw(ikon('repeat', 16))} Ajukan Ulang sebagai Usulan Baru</button>` : ''}</div>` : ''}
      ${u.usulan_asal_id ? html`<div class="info-card biru" style="margin-top:16px">${raw(ikon('history', 20, 'ik'))}<span>Ajuan ulang dari usulan yang ditolak. <a href="#/usulan/${u.usulan_asal_id}">Buka usulan lama</a></span></div>` : ''}`;
  }

  function panelTahap(no) {
    const u = d.usulan, t = T(no), dt = t.data || {}, info = infoTahap(no), boleh = bolehTahap(s, u.pokja_id, no) && u.status === 'proses';
    const tolakKembali = ['3b', '4a', '4b', '4c'].includes(no);
    const tombol = (labelSelesai) => html`<div class="form-aksi">
      ${tolakKembali ? html`<button type="button" class="btn btn-ghost" data-aksi="kembalikan" data-t="${no}">${raw(ikon('undo', 18))} Kembalikan ke Tahap 3</button>
        <button type="button" class="btn btn-ghost teks-merah" data-aksi="tolak" data-t="${no}">${raw(ikon('circle-x', 18))} Tolak</button>` : ''}
      <span class="spacer"></span>${['4b', '4c', '5', '6', '7b', '8'].includes(no) ? html`<button type="button" class="btn btn-secondary" data-aksi="simpan" data-t="${no}">${raw(ikon('save', 18))} Simpan Draf</button>` : ''}
      <button type="button" class="btn btn-primary" data-aksi="selesai" data-t="${no}">${raw(ikon('check-circle', 18))} ${labelSelesai}</button></div>`;
    const isi = {
      1: () => html`<p>Usulan masih disusun Pokja pengusul.</p>${milik() ? html`<a class="btn btn-primary" href="#/workspace-bnba/usulan?id=${u.id}">${raw(ikon('pencil', 18))} Buka Formulir Usulan</a>` : ''}`,
      2: () => html`<p>Menunggu verifikasi Kapokja ${u.pokja_nama}.</p>${bolehTahap(s, u.pokja_id, '2') ? html`<a class="btn btn-primary" href="#/antrean-verifikasi?id=${u.id}">${raw(ikon('inbox', 18))} Buka Antrean Verifikasi</a>` : ''}`,
      3: () => html`${t.catatan ? html`<div class="galat" style="margin-bottom:16px">${raw(ikon('alert', 20))}<span><b>Catatan pengembalian:</b> ${t.catatan}</span></div>` : ''}
        <div class="info-card biru" style="margin-bottom:16px">${raw(ikon('info', 20, 'ik'))}<span>Pada Tahap 3, Anggota Pokja mengunggah Draft SK dan Nota Dinas. Tidak ada paraf Kapokja kedua; setelah lengkap usulan menuju Verifikasi Ketua Pokja (3b), lalu Verifikasi TU (4a).</span></div>
        <div class="grid grid-2">${slotBerkas({ judul: '1. Draft SK Penetapan', ket: 'Naskah draf SK (.docx / .pdf, maks 10 MB)', jenis: 'draft_sk', berkas: berkasT('3'), boleh })}
          ${slotBerkas({ judul: '2. Naskah Nota Dinas Pengantar', ket: 'Nota Dinas pengantar usulan (.docx / .pdf)', jenis: 'nota_dinas', berkas: berkasT('3'), boleh })}</div>
        ${boleh ? tombol('Konfirmasi Tahap 3 Selesai & Kirim ke Ketua Pokja (3b)') : ''}`,
      '3b': () => html`<div class="info-card biru" style="margin-bottom:16px">${raw(ikon('info', 20, 'ik'))}<span>Ketua Pokja memeriksa Draft SK dan Nota Dinas. Bila sudah benar, setujui agar lanjut ke Verifikasi TU. Bila ada yang salah, <b>kembalikan</b> dengan alasan: Ketua Pokja dan pembuat diberi tahu lewat notifikasi/WhatsApp untuk memperbaiki di Tahap 3.</span></div>
        <div class="grid grid-2">${slotBerkas({ judul: 'Draft SK Penetapan', jenis: 'draft_sk', berkas: berkasT('3'), boleh: false })}${slotBerkas({ judul: 'Naskah Nota Dinas Pengantar', jenis: 'nota_dinas', berkas: berkasT('3'), boleh: false })}</div>
        ${tombol('Setujui — Lanjut ke Verifikasi TU (4a)')}`,
      '7b': () => html`<div class="info-card emas" style="margin-bottom:16px">${raw(ikon('landmark', 20, 'ik'))}<span><b>Pengisian rekening oleh Petugas Bank / Keuangan.</b> Isi nama bank, nomor rekening, dan nama pemilik rekening setiap PM. Bila NIK atau nama tidak cocok, kirim koreksi (diperbaiki Pokja di menu BNBA). Setelah semua lengkap dan tidak ada koreksi tersisa, selesaikan tahap ini untuk lanjut ke SP2D.</span></div>
        <div data-dp8><div class="skel" style="height:140px;border-radius:16px"></div></div>${tombol('Rekening Lengkap — Lanjut ke SP2D (Tahap 8)')}`,
      '4a': () => html`<div class="form-grid">${fld('Tanggal verifikasi', inp('tanggal', dt.tanggal || hariIni(), 'date'))}${fld('Petugas TU', inp('petugas', dt.petugas || s.pengguna.nama))}</div>
        ${tombol('Disetujui TU — Lanjut ke Direktur (4b)')}`,
      '4b': () => html`<div class="form-grid">${fld('Tanggal masuk ke Direktur', inp('tgl_masuk_direktur', dt.tgl_masuk_direktur, 'date'), true)}
        ${fld('Status TTD Direktur', html`<select class="select" name="status_ttd">${opsi(['Menunggu TTD', 'Ditandatangani'], dt.status_ttd || 'Menunggu TTD')}</select>`)}
        ${fld('Tanggal TTD', inp('tgl_ttd', dt.tgl_ttd, 'date'))}</div>${tombol('Ditandatangani Direktur — Lanjut ke Sekretariat (4c)')}`,
      '4c': () => html`<div class="form-grid">${fld('Tanggal kirim', inp('tgl_kirim', dt.tgl_kirim, 'date'), true)}${fld('Nama pengirim dari TSKPO', inp('pengirim', dt.pengirim || s.pengguna.nama), true)}
        ${fld('Nama penerima di Sekretariat', inp('penerima', dt.penerima), true)}${fld('Nomor HP penerima', inp('hp_penerima', dt.hp_penerima, 'tel', '08…'), true)}
        ${fld('Status', html`<select class="select" name="status_kirim">${opsi(['Dikirim', 'Diterima Sekretariat'], dt.status_kirim || 'Dikirim')}</select>`)}</div>
        ${tombol('Diterima Sekretariat — Buka Tahap 5 & 6')}`,
      5: () => html`<div class="info-card emas" style="margin-bottom:16px">${raw(ikon('shield-alert', 20, 'ik'))}<span><b>Rekap Data Pencairan per PM.</b> Periksa setiap baris, centang "sudah dicek", lalu unduh Excel untuk dicetak dan diberikan ke bank.
          Bila ada data yang salah: perbaiki langsung, atau <b>kembalikan ke Pokja</b> lengkap dengan catatan. Nama bank dan nomor rekening <b>belum diisi di tahap ini</b> (diisi pada Tahap 8 SP2D).
          Data sensitif tampil penuh hanya bagi Pokja Keuangan, Pokja pemilik, dan Super Admin; pembukaannya tercatat di audit log.</span></div>
        <div data-dp><div class="skel" style="height:160px;border-radius:16px"></div></div>${boleh ? tombol('Semua PM Sudah Dicek — Tahap 5 Selesai') : ''}`,
      6: () => html`${cek('sk_selesai', dt.sk_selesai, 'SK sudah selesai dan keluar dari Sekretariat')}
        <div class="form-grid" style="margin-top:16px">${fld('NO SK', inp('no_sk', dt.no_sk, 'text', '142/RSTSKPO/SK/11/2026'), true)}${fld('TGL SK', inp('tgl_sk', dt.tgl_sk, 'date'), true)}
          ${fld('Nama bank lokasi penyaluran', inp('bank_penyaluran_nama', dt.bank_penyaluran_nama, 'text', 'Mis. BNI Cabang Bekasi'))}${fld('Alamat bank penyaluran', inp('bank_penyaluran_alamat', dt.bank_penyaluran_alamat, 'text', 'Jalan, kota'))}</div>
        <div style="margin-top:16px">${slotBerkas({ judul: 'SK TTD Final (wajib)', ket: 'Unggah berkas PDF hasil pindai, atau tempel tautan (Google Drive). Salah satunya wajib.', jenis: 'sk_final', berkas: berkasT('6'), boleh })}</div>
        <p class="help" style="margin-top:12px">NO SK dan TGL SK diisi sekali di sini, lalu otomatis tampil di BNBA, Data Pencairan, dan Rekap Data Pencairan.</p>${tombol('Konfirmasi SK Keluar — Tahap 6 Selesai')}`,
      7: () => html`<div class="grid grid-2">${slotBerkas({ judul: 'Surat Penyampaian Data Bantuan ATENSI', jenis: 'surat_burekol', berkas: berkasT('7'), boleh })}
        <div class="slot-berkas"><div class="slot-kepala"><b>Lampiran Data BNBA PM</b><small>Tidak perlu diunggah — unduh dari sini sesuai rekap Tahap 5 (Excel), lalu lampirkan pada surat ke Burekol.</small></div>
          <button type="button" class="btn btn-primary" data-unduh-lampiran>${raw(ikon('download', 18))} Unduh Lampiran Data BNBA PM (Excel)</button></div></div>${tombol('Administrasi Burekol Selesai — Kirim ke Petugas Bank (7b)')}`,
      8: () => html`<div class="info-card emas" style="margin-bottom:16px">${raw(ikon('shield-alert', 20, 'ik'))}<span><b>Nomor rekening baru diisi di tahap SP2D ini.</b> Isi nama bank, nomor rekening, dan nama pemilik rekening untuk setiap PM, lalu centang "SP2D sudah terbit".</span></div>
        <div data-dp8><div class="skel" style="height:140px;border-radius:16px"></div></div>
        <div style="margin-top:16px">${cek('sp2d_terbit', dt.sp2d_terbit, 'SP2D sudah terbit dari KPPN')}</div>${tombol('SP2D Terbit — Buka Tahap 9')}`,
      9: () => html`<div class="form-grid">${fld('NO SP2D', inp('no_sp2d', dt.no_sp2d, 'text', '2601928019289'), true)}${fld('TGL SP2D', inp('tgl_sp2d', dt.tgl_sp2d, 'date'), true)}
        ${fld('BULAN (SP2D)', html`<select class="select" name="bulan_sp2d">${opsi(BULAN, dt.bulan_sp2d, 'Pilih bulan')}</select>`, true)}</div>
        <p class="help" style="margin-top:12px">Nilai SP2D otomatis tersalin ke seluruh BNBA dalam usulan dan Rekap Data Pencairan.</p>${tombol('Administrasi SI Selesai — Buka Tahap 10')}`,
      10: () => html`${cek('si_selesai', dt.si_selesai, 'Surat Instruksi (SI) pemindahbukuan ke rekening PM sudah selesai')}${tombol('SI Selesai — Buka Tahap 11')}`,
      11: () => html`${cek('dikonfirmasi', dt.dikonfirmasi, 'Pencairan bantuan ke rekening seluruh PM sudah dikonfirmasi')}
        <div class="form-grid" style="margin-top:16px">${fld('Tanggal cair', inp('tgl_cair', dt.tgl_cair, 'date'), true)}</div>${tombol('Konfirmasi Pencairan (Final)')}`,
    }[no];
    return html`<section class="card panel-tahap" data-panel="${no}" style="--c:${info.warna}">
      <div class="panel-kepala"><span class="fokus">${boleh ? 'Fokus Aksi' : 'Tahap Aktif'}</span>${chipTahap(no)}<span class="spacer"></span>
        <small class="redup">Pelaksana: <b>${info.oleh}</b> · dibuka ${tanggalJam(t.mulai_pada)}</small></div>
      ${no === '7b' ? html`<div data-koreksi-bank></div>` : ''}
      ${boleh || ['1', '2'].includes(no) ? isi() : html`${no === '5' && milik() ? html`<div data-dp-pokja></div>` : ''}<div class="info-card">${raw(ikon('lock', 20, 'ik'))}<span>Menunggu <b>${info.oleh}</b> menyelesaikan tahap ini. Anda dapat memantau tanpa mengubah.</span></div>
        ${Object.keys(dt).length ? html`<dl class="kv" style="margin-top:16px">${Object.entries(dt).map(([k, v]) => html`<div><dt>${LABEL_DATA[k] || k}</dt><dd>${nilaiData(v)}</dd></div>`)}</dl>` : ''}`}
    </section>`;
  }

  function tabProses() {
    const u = d.usulan, st = u.tahap_status || {}, aktif = u.status === 'proses' || ['draft', 'menunggu', 'perlu_perbaikan'].includes(u.status) ? (u.tahap_aktif_list?.length ? u.tahap_aktif_list : [u.tahap_aktif]) : [];
    const selesai = d.tahap.filter((x) => x.status === 'selesai').sort((a, b) => URUT_TAHAP.indexOf(a.tahap) - URUT_TAHAP.indexOf(b.tahap));
    return html`
      <section class="band band-stepper rv">
        <div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="band-kepala"><div><span class="pill">Siklus Hidup Rekonsiliasi &amp; SK TSKPO</span><h2><span class="hl hl-sapu">Siklus 11 Tahap</span> Usulan</h2>
          <p>Pemantauan linier dari pengusulan sampai pencairan. Setiap tahap baru terbuka setelah tahap sebelumnya dikonfirmasi petugas berwenang.</p></div>
          <span class="status-chip gelap"><span class="titik"></span>${u.status === 'selesai' ? 'Selesai — bantuan cair' : u.status === 'ditolak' ? 'Ditolak' : 'Tahap aktif: ' + aktif.join(' & ')}</span></div>
        ${stepperBesar(st)}
        ${selesai.length ? html`<div class="grid grid-2 ringkas-selesai">${selesai.slice(-2).map((x) => html`<div class="kaca-gelap"><b>${raw(ikon('check-circle', 18))} Tahap ${x.tahap}: ${infoTahap(x.tahap).nama}</b>
          <small>${x.pic_nama || '—'} · ${tanggalJam(x.selesai_pada)}${x.catatan ? ' · ' + x.catatan : ''}</small></div>`)}</div>` : ''}
      </section>
      ${aktif.map(panelTahap)}
      ${kartuLanjutan()}
      ${selesai.length ? html`<section class="card" style="margin-top:24px"><div class="card-head"><span class="ubin">${raw(ikon('list-checks', 20))}</span><div><h2 class="card-title">Rincian Tahap Selesai</h2><p class="card-sub">Petugas, waktu, isian, dan berkas setiap tahap.</p></div></div>
        <div class="akordeon">${selesai.map((x) => html`<details><summary>${chipTahap(x.tahap)}<span class="spacer"></span><small class="redup">${x.pic_nama || '—'} · ${tanggalJam(x.selesai_pada)}</small>${raw(ikon('chevron-down', 18, 'putar'))}</summary>
          <div class="isi-pm">${Object.keys(x.data || {}).length ? html`<dl class="kv">${Object.entries(x.data).map(([k, v]) => html`<div><dt>${LABEL_DATA[k] || k}</dt><dd>${nilaiData(v)}</dd></div>`)}</dl>` : ''}
            ${x.catatan ? html`<p><b>Catatan:</b> ${x.catatan}</p>` : ''}
            ${berkasT(x.tahap).map((b) => html`<div class="berkas-baris"><span class="ik">${raw(ikon('file-text', 18))}</span><span class="nm"><b>${JENIS_BERKAS[b.jenis] || b.jenis}</b><small>${b.nama}</small></span>
              <button type="button" class="btn btn-icon" data-unduh="${b.id}" aria-label="Unduh ${b.nama}">${raw(ikon('download', 18))}</button></div>`)}
            ${!Object.keys(x.data || {}).length && !x.catatan && !berkasT(x.tahap).length ? html`<p class="redup">Tidak ada isian tambahan.</p>` : ''}</div></details>`)}</div></section>` : ''}`;
  }

  async function gambarKoreksiBank() {
    const box = $('[data-koreksi-bank]'); if (!box) return;
    try {
      const k = await api.koreksiBankDaftar(id);
      box.innerHTML = k.length ? String(html`<div class="galat" style="margin-bottom:16px">${raw(ikon('alert', 22))}<span><b>${k.length} PM dikoreksi bank — mohon diperbaiki di menu BNBA (Edit lanjutan):</b></span></div>
        <div class="rekap-tabel" style="margin-bottom:16px"><table><thead><tr><th>Nama</th><th>Catatan bank</th><th>Dikirim oleh</th><th></th></tr></thead><tbody>
        ${k.map((x) => html`<tr class="ditolak"><td><b>${x.nama}</b></td><td>${x.catatan}</td><td>${x.oleh || '—'} · ${tanggalJam(x.pada)}</td>
          <td>${bolehEditLanjutan() ? html`<button type="button" class="btn btn-primary btn-sm" data-edit-pm-lanjutan="${x.id}">${raw(ikon('pencil', 15))} Perbaiki PM</button>` : ''}</td></tr>`)}</tbody></table></div>`) : '';
    } catch { box.innerHTML = ''; }
  }
  const bolehEditLanjutan = () => ['menunggu', 'proses', 'selesai'].includes(d.usulan.status) && (P.isSuperAdmin(s) || P.diPokja(s, 'TU') || milik());
  const kartuLanjutan = () => !bolehEditLanjutan() ? '' : html`<section class="card" style="margin-top:24px"><div class="card-head"><span class="ubin">${raw(ikon('pencil', 20))}</span><div><h2 class="card-title">Edit Lanjutan</h2>
      <p class="card-sub">Tetap dapat diubah setelah tahap selesai, bahkan setelah pencairan (mis. nama/NIK PM, link profil, Draft SK, Nota Dinas, scan SK final). Setiap perubahan tercatat di riwayat.</p></div></div>
    <div class="form-aksi" style="justify-content:flex-start;flex-wrap:wrap;gap:8px"><button type="button" class="btn btn-secondary" data-edit-usulan-lanjutan>${raw(ikon('pencil', 18))} Ubah judul &amp; link profil</button>
      <button type="button" class="btn btn-secondary" data-ke-tab-pm>${raw(ikon('users', 18))} Ubah data PM (nama, NIK, dll)</button></div>
    <div class="grid grid-2" style="margin-top:16px">
      <div data-panel="3">${slotBerkas({ judul: 'Draft SK Penetapan', jenis: 'draft_sk', berkas: d.berkas, boleh: true })}</div>
      <div data-panel="3">${slotBerkas({ judul: 'Naskah Nota Dinas Pengantar', jenis: 'nota_dinas', berkas: d.berkas, boleh: true })}</div>
      <div data-panel="6">${slotBerkas({ judul: 'SK TTD Final (scan)', jenis: 'sk_final', berkas: d.berkas, boleh: true })}</div></div>
    <p class="help">Mengganti scan SK final tidak mengubah tautan SK yang sudah tersalin ke data pencairan sebelumnya.</p></section>`;
  const KUNCI_BARIS = (b) => [b.ktp_kelurahan, b.ktp_kecamatan, b.ktp_kabkota, b.ktp_provinsi].filter(Boolean).join(', ');
  async function gambarDP() {
    try {
      const box = $('[data-dp]'), box8 = $('[data-dp8]'), boxP = $('[data-dp-pokja]');
      gambarKoreksiBank();
      if (!box && !box8 && !boxP) return;
      dp ||= await api.dataPencairan(id);
      const u = d.usulan;
      if (box) {
        const ubah = bolehTahap(s, u.pokja_id, '5') && u.status === 'proses' && T('5').status !== 'selesai';
        const n = dp.baris.length, dicek = dp.baris.filter((b) => b.cek_keu).length, tolak = dp.baris.filter((b) => b.tolak_keu_catatan).length;
        box.innerHTML = String(html`<div class="rekap-ringkas"><span class="badge ${dicek === n && !tolak ? 'b-ok' : 'b-wait'}">${raw(ikon('check-circle', 15))} ${dicek} dari ${n} PM sudah dicek</span>
            ${tolak ? html`<span class="badge b-no">${raw(ikon('undo', 15))} ${tolak} PM dikembalikan ke Pokja</span>` : ''}
            <span class="spacer"></span><button type="button" class="btn btn-secondary btn-sm" data-unduh-rekap>${raw(ikon('download', 16))} Unduh Rekap untuk Bank (Excel)</button></div>
          ${ubah ? html`<div class="isi-semua"><b>Isi sekaligus:</b>
            <select class="select" data-semua="akun_bantuan" aria-label="MAK (akun bantuan)">${opsi(Object.entries(MAK).map(([k, v]) => [k, `${k} — ${v}`]), '', 'Pilih MAK…')}</select>
            <button type="button" class="btn btn-secondary btn-sm" data-terap-semua>Terapkan akun ke semua PM</button>
            <button type="button" class="btn btn-secondary btn-sm" data-cek-semua>${raw(ikon('check', 16))} Centang semua sudah dicek</button></div>` : ''}
          <div class="rekap-tabel"><table><thead><tr><th>Dicek</th><th>Nama</th><th>NIK</th><th>Nama Ibu Kandung</th><th>Alamat KTP</th><th>Jenis PPKS</th><th>Jenis Bantuan</th><th>Nilai</th><th>MAK</th>${ubah ? html`<th>Tindakan</th>` : ''}</tr></thead><tbody>
          ${dp.baris.map((b) => html`<tr class="${b.tolak_keu_catatan ? 'ditolak' : b.cek_keu ? 'dicek' : ''}" data-dp-baris="${b.id}">
            <td>${ubah ? html`<input type="checkbox" class="cek-besar" name="cek_keu" ${b.cek_keu ? raw('checked') : ''} ${b.tolak_keu_catatan ? raw('disabled title="PM dikembalikan ke Pokja"') : ''} aria-label="Sudah dicek: ${b.nama}">` : (b.cek_keu ? raw(ikon('check-circle', 20)) : '—')}</td>
            <td><b>${b.nama}</b>${b.tolak_keu_catatan ? html`<small class="teks-merah" style="display:block"><b>Dikembalikan:</b> ${b.tolak_keu_catatan}</small>` : ''}</td><td class="mono nowrap">${b.nik}</td><td>${b.nama_ibu || '—'}</td>
            <td style="min-width:240px">${b.ktp_jalan || ''}<small class="redup" style="display:block">${KUNCI_BARIS(b)}</small></td><td>${b.klaster_ppks || '—'}</td><td>${b.jenis_bantuan || '—'}</td><td class="nowrap">${rupiah(b.nilai_bantuan)}</td>
            <td>${ubah ? html`<select class="select" name="akun_bantuan" aria-label="Akun bantuan ${b.nama}">${opsi(Object.keys(MAK), b.akun_bantuan, '—')}</select>` : (b.akun_bantuan || '—')}</td>
            ${ubah ? html`<td><div class="aksi-baris"><button type="button" class="btn btn-ghost btn-sm" data-perbaiki-pm="${b.id}">${raw(ikon('pencil', 15))} Perbaiki</button>
              <button type="button" class="btn btn-ghost btn-sm teks-merah" data-kembalikan-pm="${b.id}">${raw(ikon('undo', 15))} Kembalikan ke Pokja</button></div></td>` : ''}</tr>`)}
          </tbody></table></div>${!dp.penuh ? html`<p class="help">Sebagian data tersamar untuk peran Anda.</p>` : ''}`);
      }
      if (boxP) {
        const salah = dp.baris.filter((b) => b.tolak_keu_catatan);
        boxP.innerHTML = salah.length ? String(html`<div class="galat" style="margin-bottom:16px">${raw(ikon('alert', 22))}<span><b>${salah.length} PM dikembalikan Keuangan — mohon diperbaiki:</b></span></div>
          <div class="rekap-tabel" style="margin-bottom:16px"><table><thead><tr><th>Nama</th><th>NIK</th><th>Catatan Keuangan</th><th></th></tr></thead><tbody>
          ${salah.map((b) => html`<tr class="ditolak"><td><b>${b.nama}</b></td><td class="mono">${b.nik}</td><td>${b.tolak_keu_catatan}</td>
            <td><button type="button" class="btn btn-primary btn-sm" data-perbaiki-pm="${b.id}" data-mode="pokja">${raw(ikon('pencil', 15))} Perbaiki PM</button></td></tr>`)}</tbody></table></div>`) : '';
      }
      if (box8) {
        const ubah8 = u.status === 'proses' && ((bolehTahap(s, u.pokja_id, '8') && T('8').status === 'aktif') || (bolehTahap(s, u.pokja_id, '7b') && T('7b').status === 'aktif'));
        const di7b = T('7b').status === 'aktif';
        box8.innerHTML = String(html`<datalist id="dl-bank">${BANK_UMUM.map((b) => html`<option value="${b}"></option>`)}</datalist>
          ${dp.baris.map((b) => html`<div class="rek-baris" data-rek-baris="${b.id}"><div><b>${b.nama}</b><small class="mono redup" style="display:block">${b.nik}</small></div>
            ${ubah8 ? html`<input class="input" name="nama_bank" list="dl-bank" placeholder="Nama bank" value="${b.nama_bank || ''}" aria-label="Nama bank ${b.nama}" autocomplete="off">
              <input class="input mono" name="nomor_rekening" inputmode="numeric" placeholder="Nomor rekening" value="${b.nomor_rekening || ''}" aria-label="Nomor rekening ${b.nama}">
              <input class="input" name="nama_pemilik_rek" placeholder="Nama pemilik rekening" value="${b.nama_pemilik_rek || b.nama}" aria-label="Nama pemilik ${b.nama}">${di7b ? html`<button type="button" class="btn btn-ghost btn-sm" data-koreksi-bank-pm="${b.id}" data-nama="${b.nama}">${raw(ikon('alert', 15))} Kirim koreksi</button>` : ''}`
            : html`<span>${b.nama_bank || '—'}</span><span class="mono">${b.nomor_rekening || '—'}</span><span>${b.nama_pemilik_rek || '—'}</span>`}</div>`)}
          ${!dp.penuh ? html`<p class="help">Nomor rekening tersamar untuk peran Anda.</p>` : ''}`);
      }
    } catch (e) { ['[data-dp]', '[data-dp8]', '[data-dp-pokja]'].forEach((q) => { const b = $(q); if (b) b.innerHTML = String(kotakGalat(pesanGalat(e))); }); }
  }
  const barisDP = () => [...el.querySelectorAll('[data-dp-baris]')].map((tr) => ({ id: tr.dataset.dpBaris,
    ...Object.fromEntries([...tr.querySelectorAll('[name]')].filter((x) => !x.disabled).map((x) => [x.name, x.type === 'checkbox' ? x.checked : x.value.trim()])) }));
  const barisRek = () => [...el.querySelectorAll('[data-rek-baris]')].map((r) => ({ id: r.dataset.rekBaris, ...Object.fromEntries([...r.querySelectorAll('[name]')].map((x) => [x.name, x.value.trim()])) }));

  async function unduhRekapBank(namaBerkas) {
    dp = await api.dataPencairan(id);
    const baris = dp.baris.map((b) => barisBank(b, dp.usulan));
    const j = await unduhExcel(namaUnduhan(namaBerkas + '-' + d.usulan.no_register), [{ nama: 'Rekap Pencairan', kolom: KOLOM_BANK, baris }]);
    toast(j === 'xlsx' ? 'Excel diunduh.' : 'Diunduh sebagai CSV (bisa dibuka di Excel).');
  }

  // Perbaiki satu PM (Keuangan di Tahap 5, atau Pokja untuk PM yang dikembalikan)
  // Edit lanjutan memakai formulir LENGKAP yang sama dengan saat pertama input BNBA (termasuk desil dan rincian barang)
  function modalLanjutan(b) {
    const ctx = { b, jenisKunci: jenisDariKategori(d.usulan.kategori), kategori: d.usulan.kategori };
    const m = bukaModal({ judul: 'Edit lanjutan PM · ' + b.nama, ukuran: 'besar', isi: String(html`
      ${b.koreksi_bank_catatan ? html`<div class="galat" style="margin-bottom:16px">${raw(ikon('alert', 20))}<span><b>Catatan bank:</b> ${b.koreksi_bank_catatan}</span></div>` : ''}
      <p class="help" style="margin:0 0 12px">Isian sama seperti saat pertama input BNBA. Hanya kolom yang Anda ubah yang disimpan. Setelah disimpan, Kapokja dan KTU diberi tahu lewat notifikasi dan WhatsApp.</p>
      <form data-pm-lanjut novalidate>${GRUP_FORM.map((g, i) => html`<section class="form-section">
        <div class="form-section-head"><span class="no">${i + 1}</span><h3>${GRUP[g]}</h3></div>
        <div class="form-grid">${KOL_FORM.filter((c) => c.g === g).map((c) => fieldPM(c, c.k === 'usia' ? b.tgl_lahir : b[c.k], ctx))}</div></section>`)}</form>`),
      kaki: String(html`<button class="btn btn-ghost" data-batal>Batal</button><button class="btn btn-primary" data-ok>${raw(ikon('save', 18))} Simpan perubahan</button>`) });
    const root = m.el, form = root.querySelector('form');
    const ambil = () => {
      const o = {};
      form.querySelectorAll('[name]').forEach((x) => { o[x.name] = x.matches('[data-uang]') ? x.value.replace(/[^\d]/g, '') : x.value.trim(); });
      const ri = [...form.querySelectorAll('[data-ri-baris]')].map((r) => ({ nama: r.querySelector('[data-ri=nama]').value.trim(), jumlah: r.querySelector('[data-ri=jumlah]').value.trim(),
        satuan: r.querySelector('[data-ri=satuan]').value.trim(), subtotal: r.querySelector('[data-ri=subtotal]').value.replace(/[^\d]/g, '') })).filter((x) => x.nama || x.subtotal || x.jumlah);
      o.rincian_item = ri; if (ri.length) o.nilai_bantuan = String(totalRincian(ri));
      return o;
    };
    const hitung = () => {
      const rows = [...form.querySelectorAll('[data-ri-baris]')].map((r) => Number(r.querySelector('[data-ri=subtotal]').value.replace(/\D/g, '')) || 0), total = rows.reduce((x, y) => x + y, 0);
      const tt = form.querySelector('[data-ri-total]'); if (tt) tt.textContent = rupiah(total);
      const nv = form.querySelector('[name=nilai_bantuan]'); if (nv) { const ada = rows.some(Boolean); nv.readOnly = ada; nv.toggleAttribute('data-otomatis', ada); if (ada) nv.value = fmtUang(total); }
    };
    const segarKab = (sel) => form.querySelectorAll(`[data-kabkota="${sel.name}"]`).forEach((inp) => {
      const dl = form.querySelector('#' + inp.getAttribute('list')); if (dl) dl.innerHTML = daftarKabKota(sel.value).map((n) => `<option value="${n}"></option>`).join('');
    });
    hitung();
    const awal = ambil();
    form.addEventListener('input', (e) => {
      if (e.target.matches('[data-nik]')) e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16);
      if (e.target.name === 'tgl_lahir') { const x = form.querySelector('[data-usia]'); if (x) x.value = usiaPM(e.target.value) !== '' ? usiaPM(e.target.value) + ' tahun' : ''; }
      if (e.target.closest('[data-rincian]')) hitung();
    });
    form.addEventListener('change', (e) => { if (e.target.matches('[data-prov]')) segarKab(e.target); });
    form.addEventListener('focusout', (e) => {
      if (e.target.matches('[data-kabkota]') && e.target.value) { const r = cocokKabKota(e.target.value, form.querySelector(`[name=${e.target.dataset.kabkota}]`)?.value); if (r.nilai) e.target.value = r.nilai; }
      if (e.target.matches('[data-uang]')) e.target.value = fmtUang(e.target.value);
    });
    form.addEventListener('click', (e) => {
      if (e.target.closest('[data-ri-tambah]')) { form.querySelector('[data-ri-daftar]').insertAdjacentHTML('beforeend', String(barisRincian({}))); form.querySelector('[data-ri-daftar] [data-ri-baris]:last-child [data-ri=nama]').focus(); hitung(); return; }
      const rh = e.target.closest('[data-ri-hapus]'); if (rh) { rh.closest('[data-ri-baris]').remove(); hitung(); }
    });
    root.querySelector('[data-ok]').onclick = async (ev) => {
      const skr = ambil(), v = {};
      for (const k of Object.keys(skr)) { const a = k === 'rincian_item' ? JSON.stringify(awal[k]) : (awal[k] ?? ''), n = k === 'rincian_item' ? JSON.stringify(skr[k]) : skr[k]; if (a !== n) v[k] = skr[k]; }
      delete v.usia;
      if (v.nik && !/^\d{16}$/.test(v.nik)) return toast('NIK harus 16 digit angka.', 'galat');
      if (v.desil && !/^(10|[1-9])$/.test(v.desil)) return toast('Desil harus angka 1 sampai 10.', 'galat');
      if (!Object.keys(v).length) { m.tutup(); return toast('Tidak ada perubahan.', 'info'); }
      const pulih = tombolMuat(ev.currentTarget);
      try { await api.ubahPmLanjutan(b.id, v); m.tutup(); toast('Data PM diperbarui. Kapokja dan KTU diberi tahu.'); hapusCache('usulan'); dp = null; pm = null; await segar(); }
      catch (err) { pulih(); toast(pesanGalat(err), 'galat'); }
    };
  }

  function modalPerbaikiPM(b, mode) {
    const kunci = jenisDariKategori(d.usulan.kategori);
    const fl = (lbl, nama, v, extra = '') => html`<div class="field"><label class="label">${lbl}</label><input class="input" name="${nama}" value="${v ?? ''}" ${raw(extra)}></div>`;
    const m = bukaModal({ judul: (mode === 'lanjutan' ? 'Edit lanjutan PM · ' : mode === 'pokja' ? 'Perbaiki PM · ' : 'Koreksi data PM · ') + b.nama, ukuran: 'besar', isi: String(html`
      ${b.tolak_keu_catatan ? html`<div class="galat" style="margin-bottom:16px">${raw(ikon('alert', 20))}<span><b>Catatan Keuangan:</b> ${b.tolak_keu_catatan}</span></div>` : ''}
      ${b.koreksi_bank_catatan ? html`<div class="galat" style="margin-bottom:16px">${raw(ikon('alert', 20))}<span><b>Catatan bank:</b> ${b.koreksi_bank_catatan}</span></div>` : ''}
      <div class="form-grid">${fl('Nama', 'nama', b.nama)}${mode === 'lanjutan' ? fl('NIK (16 digit)', 'nik', b.nik, 'inputmode="numeric" maxlength="16"') : ''}${fl('Nama ibu kandung', 'nama_ibu', b.nama_ibu)}
        <div class="field"><label class="label">Provinsi (KTP)</label><select class="select" name="ktp_provinsi" data-prov>${opsi(PROVINSI.map((x) => [x, x]), b.ktp_provinsi, 'Pilih provinsi…')}</select></div>
        <div class="field"><label class="label">Kabupaten/Kota (KTP)</label><input class="input" name="ktp_kabkota" list="dl-pm-kab" value="${b.ktp_kabkota || ''}" autocomplete="off"><datalist id="dl-pm-kab">${daftarKabKota(b.ktp_provinsi).map((n) => html`<option value="${n}"></option>`)}</datalist></div>
        ${fl('Kecamatan', 'ktp_kecamatan', b.ktp_kecamatan)}${fl('Kelurahan/Desa', 'ktp_kelurahan', b.ktp_kelurahan)}
        <div class="field penuh"><label class="label">Nama jalan / No / RT / RW</label><input class="input" name="ktp_jalan" value="${b.ktp_jalan || ''}"></div>
        <div class="field"><label class="label">Klaster PPKS</label><select class="select" name="klaster_ppks">${opsi(KLASTER, b.klaster_ppks, 'Pilih…')}</select></div>
        ${kunci ? '' : html`<div class="field"><label class="label">Jenis bantuan</label><select class="select" name="jenis_bantuan">${opsi(Object.keys(JENIS_BANTUAN).map((k) => [k, `${k} — ${JENIS_BANTUAN[k]}`]), b.jenis_bantuan, 'Pilih…')}</select></div>`}
        <div class="field"><label class="label">Nilai bantuan (Rp)</label><input class="input angka" name="nilai_bantuan" inputmode="numeric" value="${b.nilai_bantuan ?? ''}"></div></div>
      <p class="help" style="margin-top:12px">Setelah disimpan, centang "sudah dicek" PM ini direset dan perlu dicek ulang oleh Keuangan.</p>`),
      kaki: String(html`<button class="btn btn-ghost" data-batal>Batal</button><button class="btn btn-primary" data-ok>${raw(ikon('save', 18))} Simpan perbaikan</button>`) });
    m.el.addEventListener('change', (e) => { if (e.target.matches('[data-prov]')) { m.el.querySelector('#dl-pm-kab').innerHTML = daftarKabKota(e.target.value).map((n) => `<option value="${n}"></option>`).join(''); } });
    m.el.addEventListener('focusout', (e) => {
      if (e.target.name === 'ktp_kabkota' && e.target.value) { const r = cocokKabKota(e.target.value, m.el.querySelector('[name=ktp_provinsi]').value); if (r.nilai) e.target.value = r.nilai; }
    });
    m.el.querySelector('[data-ok]').onclick = async (ev) => {
      let v = Object.fromEntries([...m.el.querySelectorAll('[name]')].map((x) => [x.name, x.value.trim()]));
      v.nilai_bantuan = String(v.nilai_bantuan || '').replace(/[^\d]/g, '');
      // Edit lanjutan: kirim hanya kolom yang diubah, agar data tersamar (mis. TU) tidak menimpa data asli
      if (mode === 'lanjutan') {
        const awal = Object.fromEntries([...m.el.querySelectorAll('[name]')].map((x) => [x.name, (x.defaultValue ?? '').trim?.() ?? '']));
        v.nilai_bantuan = v.nilai_bantuan; const aw = { ...awal, nilai_bantuan: String(awal.nilai_bantuan || '').replace(/[^\d]/g, '') };
        v = Object.fromEntries(Object.entries(v).filter(([k, x]) => x !== (aw[k] ?? '')));
        if (!Object.keys(v).length) { m.tutup(); return toast('Tidak ada perubahan.', 'info'); }
      }
      const pulih = tombolMuat(ev.currentTarget);
      try {
        if (mode === 'lanjutan') await api.ubahPmLanjutan(b.id, v); else if (mode === 'pokja') await api.perbaikiPmDitolak(b.id, v); else await api.simpanDataPencairan(id, [{ id: b.id, ...v }]);
        m.tutup(); toast(mode === 'lanjutan' ? 'Data PM diperbarui.' : mode === 'pokja' ? 'PM diperbaiki. Keuangan akan mengecek ulang.' : 'Data PM diperbarui. Mohon dicentang ulang setelah dicek.'); hapusCache('usulan'); dp = null; pm = null; await segar();
      } catch (err) { pulih(); toast(pesanGalat(err), 'galat'); }
    };
  }

  // Pilih penerima notifikasi tahap berikutnya (TU: anggota/kapokja; Keuangan: anggota/kapokja)
  function pilihPenerima(no, calon) {
    return new Promise((resolve) => {
      const grup = [...new Set(calon.map((c) => c.kelompok))];
      const m = bukaModal({ judul: `Selesaikan Tahap ${no}?`, isi: String(html`<p>Tahap berikutnya terbuka. <b>Siapa yang diberi tahu</b> lewat notifikasi aplikasi, WhatsApp, dan email sesuai pengaturan? Pilih satu atau lebih orang.</p>
        <div class="pilih-penerima">${grup.map((g) => { const isi = calon.filter((c) => c.kelompok === g); return html`<fieldset><legend>Pokja ${isi[0].kelompok_nama}</legend>
          <div class="cepat"><button type="button" class="btn btn-ghost btn-sm" data-pilih-g="${g}" data-cara="semua">Semua</button><button type="button" class="btn btn-ghost btn-sm" data-pilih-g="${g}" data-cara="kapokja">Hanya Kapokja</button><button type="button" class="btn btn-ghost btn-sm" data-pilih-g="${g}" data-cara="anggota">Hanya Anggota</button></div>
          ${isi.map((c) => html`<label class="opsi-orang"><input type="checkbox" value="${c.id}" data-grup="${g}" data-jab="${c.jabatan}" checked><span><b>${c.nama}</b> <small class="redup">${c.jabatan === 'kapokja' ? 'Kapokja' : 'Anggota'}</small></span></label>`)}</fieldset>`; })}</div>
        <p class="help" style="margin-top:12px">Status selesai tidak dapat dibatalkan.</p>`),
        kaki: String(html`<button class="btn btn-ghost" data-batal>Batal</button><button class="btn btn-primary" data-ok>${raw(ikon('check-circle', 18))} Ya, selesaikan &amp; kirim notifikasi</button>`),
        onTutup: () => resolve(null) });
      const ids = () => [...m.el.querySelectorAll('input[type=checkbox]:checked')].map((x) => x.value);
      const ok = m.el.querySelector('[data-ok]'), segarOk = () => { ok.disabled = !ids().length; };
      m.el.addEventListener('change', segarOk);
      m.el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-pilih-g]'); if (!b) return;
        m.el.querySelectorAll(`input[data-grup="${b.dataset.pilihG}"]`).forEach((x) => { x.checked = b.dataset.cara === 'semua' || x.dataset.jab === b.dataset.cara; });
        segarOk();
      });
      ok.onclick = () => { const r = ids(); resolve(r); m.tutup(); };
    });
  }

  async function tabPM() {
    pm ||= await api.bnbaUsulan(id);
    return html`<section class="card table-card"><div class="table-wrap"><table class="tbl"><thead><tr><th>No</th><th>Nama &amp; NIK</th><th>Klaster</th><th>Kab/Kota KTP</th><th>Jenis Bantuan</th><th class="kanan">Nilai</th><th>Rekening</th><th>Status</th>${bolehEditLanjutan() ? html`<th></th>` : ''}</tr></thead><tbody>
      ${pm.map((b, i) => html`<tr class="baris-klik" data-nik="${b.nik}" tabindex="0"><td class="angka">${i + 1}</td><td><b>${b.nama}</b><small class="mono redup" style="display:block">${b.nik}</small></td>
        <td>${b.klaster_ppks || '—'}</td><td>${b.ktp_kabkota || '—'}<small class="redup" style="display:block">${b.ktp_provinsi || ''}</small></td><td>${b.jenis_bantuan || '—'}</td><td class="kanan angka">${rupiah(b.nilai_bantuan)}</td>
        <td class="mono">${b.nama_bank ? b.nama_bank + ' ' : ''}${b.nomor_rekening_samar || '—'}</td><td>${badge(STATUS_BNBA, b.status_verifikasi)}</td>${bolehEditLanjutan() ? html`<td><button type="button" class="btn btn-ghost btn-sm" data-edit-pm-lanjutan="${b.id}">${raw(ikon('pencil', 15))} Edit</button></td>` : ''}</tr>`)}
      </tbody></table></div></section>`;
  }
  function tabPenyalur() {
    const boleh = P.isSuperAdmin(s) || P.diPokja(s, 'TU') || milik();
    return html`<section class="card"><div class="card-head"><span class="ubin">${raw(ikon('user-check', 20))}</span><div><h2 class="card-title">Log &amp; Penugasan Petugas Penyalur</h2>
        <p class="card-sub">Pengusul dan penyalur dapat berbeda orang. Satu usulan boleh beberapa petugas; nama petugas otomatis mengisi kolom Petugas Penyalur di Rekap Data Pencairan.</p></div>
        <span class="spacer"></span>${boleh ? html`<button class="btn btn-primary btn-sm" data-penyalur>${raw(ikon('plus', 16))} Tambah Petugas Penyalur</button>` : ''}</div>
      ${d.penyaluran.length ? html`<div class="table-wrap"><table class="tbl"><thead><tr><th>Nama Petugas</th><th>Instansi / Pokja &amp; Kontak</th><th>Wilayah</th><th>Tanggal</th><th>Cakupan PM</th>${boleh ? html`<th></th>` : ''}</tr></thead><tbody>
        ${d.penyaluran.map((p) => html`<tr><td><b>${p.nama_petugas}</b></td><td>${p.instansi || '—'}<small class="redup" style="display:block">${p.no_hp || ''}</small></td><td>${p.kabkota || '—'}</td><td>${tanggal(p.tanggal)}</td>
          <td>${p.semua_pm ? `Semua PM (${angka(d.usulan.jumlah_pm)})` : `${angka(p.nik_pm.length)} PM`}</td>
          ${boleh ? html`<td class="aksi-sel"><button class="btn btn-ghost btn-sm" data-penyalur="${p.id}">Ubah</button><button class="btn btn-ghost btn-sm teks-merah" data-hapus-penyalur="${p.id}">Hapus</button></td>` : ''}</tr>`)}
      </tbody></table></div>` : kosong({ ikonNama: 'user-check', judul: 'Belum ada petugas penyalur', teks: 'Catat petugas yang menyalurkan bantuan, beserta wilayah dan tanggal penyaluran.' })}</section>`;
  }
  function tabRiwayat() {
    return html`<section class="card table-card"><div class="card-head" style="padding:20px 20px 0"><span class="ubin">${raw(ikon('history', 20))}</span><div><h2 class="card-title">Riwayat Status &amp; Jejak Audit</h2><p class="card-sub">Catatan permanen perubahan status usulan secara kronologis. Riwayat tidak dapat dihapus.</p></div></div>
      ${d.riwayat.length ? html`<div class="table-wrap"><table class="tbl"><thead><tr><th>Waktu (WIB)</th><th>Pengguna / Aktor</th><th>Tahap</th><th>Status Lama</th><th>Status Baru</th><th>Catatan</th></tr></thead><tbody>
        ${d.riwayat.map((r) => html`<tr><td>${tanggalJam(r.waktu)}</td><td><b>${r.pengguna_nama || '—'}</b><small class="redup" style="display:block">${r.sebagai || ''}</small></td>
          <td>${r.tahap ? chipTahap(r.tahap, { kecil: true }) : '—'}</td><td>${r.status_lama || '—'}</td><td><b>${r.aksi}</b><small style="display:block">${r.status_baru || ''}</small></td><td>${r.catatan || '—'}</td></tr>`)}
      </tbody></table></div>` : kosong({ ikonNama: 'history', judul: 'Belum ada riwayat' })}</section>`;
  }

  async function gambar() {
    const u = d.usulan;
    let isi;
    try {
      isi = tab === 'proses' ? tabProses() : tab === 'pm' ? await tabPM() : tab === 'penyalur' ? tabPenyalur() : tab === 'riwayat' ? tabRiwayat()
        : tab === 'diskusi' ? html`<div data-diskusi></div>` : await tabDok();
    } catch (e) { isi = kotakGalat(pesanGalat(e)); }
    el.innerHTML = String(html`${kepala()}
      <div style="margin:24px 0 16px">${tabs([['proses', '1. Proses & Stepper 11 Tahap'], ['pm', '2. Daftar PM', u.jumlah_pm], ['penyalur', '3. Log Petugas Penyalur', d.penyaluran.length], ['dok', '4. Dokumentasi PM'], ['riwayat', '5. Riwayat & Audit Trail'], ['diskusi', '6. Diskusi']], tab)}</div>
      <div data-isi>${isi}</div>`);
    pasangReveal(el, { segera: true });
    if (tab === 'proses') gambarDP();
    lepasDiskusi(); lepasDiskusi = () => {};
    if (tab === 'diskusi') panelDiskusi(el.querySelector('[data-diskusi]'), { tabel: 'usulan', ref: id }).then((f) => { lepasDiskusi = f; });
  }
  let lepasDiskusi = () => {};

  // ---- Tab Dokumentasi PM: ringkasan kelengkapan foto per PM + unggah langsung per PM
  async function tabDok() {
    const r = await api.dokPmUsulan(id);
    const sel = (pm, k, wajib) => {
      const n = pm[k], t = pm.tanpa?.[k];
      if (n) return html`<span class="badge b-ok kecil">${raw(ikon('camera', 14))} ${n}/2</span>`;
      if (t?.status === 'disetujui') return html`<span class="badge b-draft kecil">Tidak ada (disetujui)</span>`;
      if (t?.status === 'menunggu') return html`<span class="badge b-wait kecil">Pengecualian menunggu</span>`;
      return wajib ? html`<span class="badge b-fix kecil">${raw(ikon('alert', 14))} Belum</span>` : html`<span class="badge b-draft kecil">—</span>`;
    };
    const cair = r.status_cair === 'cair';
    const lengkapS = r.pm.filter((p) => p.sebelum_usaha || p.tanpa?.sebelum_usaha?.status === 'disetujui').length;
    const lengkapP = r.pm.filter((p) => p.saat_penyaluran || p.tanpa?.saat_penyaluran?.status === 'disetujui').length;
    return html`<section class="card">
      <div class="card-head"><span class="ubin">${raw(ikon('camera', 22))}</span><div><h2 class="card-title">Dokumentasi PM</h2>
        <p class="card-sub">Foto Sebelum Usaha ${lengkapS}/${r.pm.length} PM · Saat Penyaluran ${cair ? `${lengkapP}/${r.pm.length} PM` : 'diisi setelah cair'} · Supermonev opsional</p></div></div>
      <div class="info-card biru" style="margin-bottom:16px">${raw(ikon('info', 20, 'ik'))}<span>Klik <b>Unggah / lihat foto</b> pada baris PM. Foto dari kamera atau galeri otomatis dikecilkan ≤ 1 MB, maks 2 foto per kategori.
        Kelengkapan foto memengaruhi <b>Progres Pokja</b> di Dashboard.</span></div>
      ${r.pm.length ? html`<div class="table-wrap"><table class="tbl"><thead><tr><th>PM</th><th>Sebelum Usaha</th><th>Saat Penyaluran</th><th>Supermonev</th><th></th></tr></thead><tbody>
        ${r.pm.map((p) => html`<tr><td><div class="sel-utama"><b>${p.nama}</b><small class="mono">${p.nik}</small></div></td>
          <td>${sel(p, 'sebelum_usaha', true)}</td><td>${sel(p, 'saat_penyaluran', cair)}</td><td>${sel(p, 'supermonev', false)}</td>
          <td class="kanan"><button class="btn btn-sm btn-secondary" data-dok-pm="${p.bnba_id}" data-nama="${p.nama}" data-nik="${p.nik}">${raw(ikon('camera', 16))} Unggah / lihat foto</button></td></tr>`)}
      </tbody></table></div>` : kosong({ ikonNama: 'users', judul: 'Belum ada PM terlihat' })}</section>`;
  }
  async function bukaDokPm(bid, nama, nik = '') {
    const m = bukaModal({ judul: 'Dokumentasi · ' + nama, ukuran: 'besar', isi: '<div class="skel" style="height:260px;border-radius:16px"></div>', kaki: '<button class="btn btn-ghost" data-batal>Selesai</button>' });
    const g = async () => {
      const st = await api.statusDokPm(bid);
      m.body.innerHTML = String(html`<div class="galeri-grid">${st.kategori.map((k) => galeriFoto({ konteks: 'dok_pm', ref: bid, jenis: k.kode, judul: k.label + (k.opsional ? ' (opsional)' : ''),
        maks: k.maks, berkas: k.berkas, boleh: k.boleh, tanpa: k.tanpa, wajib: !k.opsional && (k.kode === 'sebelum_usaha' || st.status_cair === 'cair'), ket: k.boleh ? 'Maks 2 foto · 1 MB per foto' : 'Hanya dapat dilihat' }))}</div>
        <p class="help" style="margin-top:12px">Pengajuan "tidak ada dokumentasi" dilakukan dari Detail PM (Master BNBA → klik PM → tab Dokumentasi).
          <a href="#/pm/${nik}" data-batal>Buka Detail PM</a></p>`);
      muatGambarMini(m.body);
    };
    pasangUnggah(m.body, { muatUlang: async () => { await g(); if (tab === 'dok') gambar(); }, judulJenis: { sebelum_usaha: 'Foto Sebelum Usaha', saat_penyaluran: 'Foto Saat Penyaluran', supermonev: 'Foto Supermonev' } });
    try { await g(); } catch (e) { m.body.innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  const segar = async () => { await muat(); hapusCache('usulan'); await gambar(); };

  async function aksiTahap(btn) {
    const no = btn.dataset.t, aksi = btn.dataset.aksi, panel = el.querySelector(`[data-panel="${no}"]`);
    const data = {};
    panel.querySelectorAll('[name]').forEach((x) => { if (!x.closest('[data-dp-baris]')) data[x.name] = x.type === 'checkbox' ? x.checked : x.value.trim(); });
    let catatan = null;
    if (aksi === 'kembalikan' || aksi === 'tolak') {
      const k = await konfirmasi({ judul: aksi === 'tolak' ? `Tolak usulan pada Tahap ${no}?` : `Kembalikan ke Tahap 3?`, bahaya: true, label: aksi === 'tolak' ? 'Tolak usulan' : 'Kembalikan',
        pesan: aksi === 'tolak' ? 'Usulan ditutup. Pokja dapat mengajukan ulang sebagai usulan baru.' : 'Usulan kembali ke Tahap 3 pada record yang sama. Kapokja dan Pokja pengusul menerima notifikasi.',
        alasan: { label: 'Alasan', wajib: true, placeholder: 'Tuliskan alasan dengan jelas' } });
      if (!k.ok) return;
      catatan = k.alasan;
    }
    if (no === '4b' && aksi === 'selesai' && data.status_ttd !== 'Ditandatangani') return toast('Ubah Status TTD Direktur menjadi "Ditandatangani" terlebih dahulu.', 'peringatan');
    if (no === '4c' && aksi === 'selesai' && data.status_kirim !== 'Diterima Sekretariat') return toast('Ubah status menjadi "Diterima Sekretariat" terlebih dahulu.', 'peringatan');
    if (aksi === 'selesai') {
      let calon = [];
      try { calon = await api.calonPenerima(id, no); } catch { calon = []; }
      if (calon && calon.length) {
        const pilih = await pilihPenerima(no, calon);
        if (!pilih) return;
        data._penerima = pilih;
      } else {
        const k = await konfirmasi({ judul: `Selesaikan Tahap ${no}?`, ikonNama: 'check-circle', label: 'Ya, selesaikan',
          pesan: 'Tahap berikutnya terbuka dan pelaksananya menerima notifikasi (in-app, WhatsApp, email). Status selesai tidak dapat dibatalkan.' });
        if (!k.ok) return;
      }
    }
    const pulih = tombolMuat(btn, 'Menyimpan…');
    try {
      if (no === '5' && (aksi === 'simpan' || aksi === 'selesai')) { await api.simpanDataPencairan(id, barisDP()); dp = null; }
      if ((no === '8' || no === '7b') && (aksi === 'simpan' || aksi === 'selesai')) { const rk = barisRek(); if (rk.length) await api.simpanRekeningSp2d(id, rk); dp = null; }
      await api.prosesTahap(id, no, aksi, data, catatan);
      toast(aksi === 'simpan' ? 'Draf isian tersimpan.' : aksi === 'selesai' ? `Tahap ${no} selesai. Pelaksana tahap berikutnya sudah diberi tahu.` : aksi === 'tolak' ? 'Usulan ditolak.' : 'Usulan dikembalikan ke Tahap 3.');
      await segar();
    } catch (e) { pulih(); toast(pesanGalat(e), 'galat'); }
  }

  function modalUsulanLanjutan() {
    const m = bukaModal({ judul: 'Ubah judul & link profil', isi: String(html`<div class="form-grid">${fld('Judul usulan', inp('judul', d.usulan.judul), false, true)}${fld('Link profil asesmen (https://…)', inp('link_profil', d.usulan.link_profil, 'url'), false, true)}</div>`),
      kaki: String(html`<button class="btn btn-ghost" data-batal>Batal</button><button class="btn btn-primary" data-ok>Simpan</button>`) });
    m.el.querySelector('[data-ok]').onclick = async (ev) => {
      const v = Object.fromEntries([...m.el.querySelectorAll('[name]')].map((x) => [x.name, x.value.trim()]));
      const pulih = tombolMuat(ev.currentTarget);
      try { await api.ubahUsulanLanjutan(id, v); m.tutup(); toast('Perubahan tersimpan.'); hapusCache('usulan'); await segar(); } catch (err) { pulih(); toast(pesanGalat(err), 'galat'); }
    };
  }
  function modalKoreksiBank(bid, nama) {
    const m = bukaModal({ judul: 'Kirim koreksi — ' + nama, isi: String(html`<div class="form-grid">
      ${fld('Jenis koreksi', html`<select class="select" name="jenis">${opsi([['nik_keliru', 'NIK keliru'], ['nama_tidak_sesuai', 'Nama tidak sesuai'], ['lainnya', 'Lainnya (tulis catatan)']], 'nik_keliru')}</select>`, true, true)}
      ${fld('Catatan', html`<textarea class="textarea" name="catatan" rows="3"></textarea>`, false, true)}</div>`),
      kaki: String(html`<button class="btn btn-ghost" data-batal>Batal</button><button class="btn btn-primary" data-ok>Kirim koreksi</button>`) });
    m.el.querySelector('[data-ok]').onclick = async (ev) => {
      const v = Object.fromEntries([...m.el.querySelectorAll('[name]')].map((x) => [x.name, x.value.trim()]));
      const pulih = tombolMuat(ev.currentTarget);
      try { await api.kirimKoreksiBank(bid, v.jenis, v.catatan); m.tutup(); toast('Koreksi terkirim ke Pokja & Keuangan.'); hapusCache('usulan'); dp = null; await segar(); } catch (err) { pulih(); toast(pesanGalat(err), 'galat'); }
    };
  }

  function modalPenyalur(p = {}) {
    const m = bukaModal({ judul: p.id ? 'Ubah Petugas Penyalur' : 'Tambah Petugas Penyalur', isi: String(html`<div class="form-grid">
      ${fld('Nama petugas', inp('nama_petugas', p.nama_petugas), true, true)}${fld('Instansi / Pokja', inp('instansi', p.instansi ?? d.usulan.pokja_nama))}${fld('Nomor HP', inp('no_hp', p.no_hp, 'tel', '08…'))}
      ${fld('Tanggal penyaluran', inp('tanggal', p.tanggal, 'date'))}${fld('Kab/Kota', inp('kabkota', p.kabkota ?? (d.usulan.kabkota || '').split(',')[0]))}
      <div class="field penuh">${cek('semua_pm', p.semua_pm ?? true, 'Menyalurkan ke semua PM dalam usulan')}</div>
      ${fld('NIK PM yang disalurkan (bila sebagian, pisahkan dengan koma)', html`<textarea class="textarea" name="nik_pm" rows="2">${(p.nik_pm || []).join(', ')}</textarea>`, false, true)}</div>`),
      kaki: String(html`<button class="btn btn-ghost" data-batal>Batal</button><button class="btn btn-primary" data-ok>Simpan</button>`) });
    m.el.querySelector('[data-ok]').onclick = async (e) => {
      const v = Object.fromEntries([...m.el.querySelectorAll('[name]')].map((x) => [x.name, x.type === 'checkbox' ? x.checked : x.value.trim()]));
      v.nik_pm = String(v.nik_pm || '').split(/[\s,;]+/).filter((x) => /^\d{16}$/.test(x));
      const pulih = tombolMuat(e.currentTarget);
      try { await api.simpanPenyaluran(id, { ...v, id: p.id || null }); m.tutup(); toast('Petugas penyalur tersimpan.'); hapusCache('rekap'); await segar(); }
      catch (err) { pulih(); toast(pesanGalat(err), 'galat'); }
    };
  }

  el.addEventListener('click', async (e) => {
    const tb = e.target.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; history.replaceState(null, '', `#/usulan/${id}?tab=${tab}`); return gambar(); }
    const dpm = e.target.closest('[data-dok-pm]'); if (dpm) return bukaDokPm(dpm.dataset.dokPm, dpm.dataset.nama, dpm.dataset.nik);
    const ak = e.target.closest('[data-aksi]'); if (ak) return aksiTahap(ak);
    const ep = e.target.closest('[data-edit-pm-lanjutan]');
    if (ep) {
      pm ||= await api.bnbaUsulan(id); let b = pm.find((x) => x.id === ep.dataset.editPmLanjutan);
      try { dp ||= await api.dataPencairan(id); const f = dp.baris.find((x) => x.id === ep.dataset.editPmLanjutan); if (f) b = { ...(b || {}), ...f }; } catch { /* pakai data yang tersedia */ }
      return b && modalLanjutan(b);
    }
    if (e.target.closest('[data-ke-tab-pm]')) { tab = 'pm'; history.replaceState(null, '', `#/usulan/${id}?tab=pm`); return gambar(); }
    if (e.target.closest('[data-edit-usulan-lanjutan]')) return modalUsulanLanjutan();
    const kk = e.target.closest('[data-koreksi-bank-pm]'); if (kk) return modalKoreksiBank(kk.dataset.koreksiBankPm, kk.dataset.nama);
    const nk = e.target.closest('[data-nik]'); if (nk) return pergi('/pm/' + nk.dataset.nik);
    if (e.target.closest('[data-terap-semua]')) {
      el.querySelectorAll('[data-semua]').forEach((x) => { if (x.value) el.querySelectorAll(`[data-dp-baris] [name="${x.dataset.semua}"]`).forEach((y) => { y.value = x.value; }); });
      return toast('Diterapkan ke semua PM. Tekan "Simpan Draf" untuk menyimpan.', 'info');
    }
    if (e.target.closest('[data-cek-semua]')) { el.querySelectorAll('[data-dp-baris] [name=cek_keu]:not(:disabled)').forEach((c) => { c.checked = true; c.closest('tr').classList.add('dicek'); }); return toast('Semua dicentang. Tekan "Simpan Draf" untuk menyimpan.', 'info'); }
    if (e.target.matches('[data-dp-baris] [name=cek_keu]')) e.target.closest('tr').classList.toggle('dicek', e.target.checked);
    const pb = e.target.closest('[data-perbaiki-pm]');
    if (pb) { dp ||= await api.dataPencairan(id); const b = dp.baris.find((x) => x.id === pb.dataset.perbaikiPm); return b && modalPerbaikiPM(b, pb.dataset.mode === 'pokja' ? 'pokja' : 'keuangan'); }
    const kb = e.target.closest('[data-kembalikan-pm]');
    if (kb) {
      const b = (dp ||= await api.dataPencairan(id)) && dp.baris.find((x) => x.id === kb.dataset.kembalikanPm); if (!b) return;
      const k = await konfirmasi({ judul: `Kembalikan ${b.nama} ke Pokja?`, label: 'Kembalikan', bahaya: true, pesan: 'Pokja pengusul menerima notifikasi dan memperbaiki data PM ini.', alasan: { label: 'Catatan untuk Pokja', wajib: true, placeholder: 'Mis. NIK tidak sesuai KTP' } });
      if (!k.ok) return;
      try { await api.tolakPmKeuangan(id, b.id, k.alasan); toast('PM dikembalikan ke Pokja.'); hapusCache('usulan'); dp = null; await segar(); } catch (err) { toast(pesanGalat(err), 'galat'); }
      return;
    }
    if (e.target.closest('[data-unduh-rekap]')) {
      try { const baru = barisDP(); if (baru.length && !el.querySelector('[data-dp-pokja]')?.children.length) { await api.simpanDataPencairan(id, baru); dp = null; } await unduhRekapBank('Rekap-Pencairan'); } catch (err) { toast(pesanGalat(err), 'galat'); }
      return;
    }
    if (e.target.closest('[data-unduh-lampiran]')) { try { await unduhRekapBank('Lampiran-Data-BNBA-PM'); } catch (err) { toast(pesanGalat(err), 'galat'); } return; }
    const py = e.target.closest('[data-penyalur]'); if (py) return modalPenyalur(d.penyaluran.find((x) => x.id === py.dataset.penyalur) || {});
    const hp = e.target.closest('[data-hapus-penyalur]');
    if (hp) { if (!(await konfirmasi({ judul: 'Hapus petugas penyalur?', pesan: 'Entri log dihapus dari usulan ini.', label: 'Hapus', bahaya: true })).ok) return;
      try { await api.hapusPenyaluran(hp.dataset.hapusPenyalur); await segar(); } catch (err) { toast(pesanGalat(err), 'galat'); } return; }
    if (e.target.closest('[data-ajukan-ulang]')) {
      if (!(await konfirmasi({ judul: 'Ajukan ulang usulan?', pesan: 'PM dan berkas dipindah ke usulan baru berstatus Draft yang bertaut ke usulan ini. Riwayat usulan lama tetap tersimpan.', label: 'Ajukan ulang' })).ok) return;
      try { const b = await api.ajukanUlang(id); hapusCache('usulan'); toast(`Usulan baru ${b.no_register} dibuat.`); pergi('/workspace-bnba/usulan?id=' + b.id); } catch (err) { toast(pesanGalat(err), 'galat'); }
      return;
    }
    if (e.target.closest('[data-cetak]')) { const lama = tab; if (tab !== 'riwayat') { tab = 'riwayat'; await gambar(); } window.print(); tab = lama; return gambar(); }
    if (e.target.closest('[data-ekspor]')) {
      try {
        const rows = urutEkspor(await api.eksporBnba({ usulan_ids: [id], termasuk_draft: true }));
        const j = await unduhExcel(namaUnduhan('Bundle-' + d.usulan.no_register), [{ nama: 'BNBA', baris: rows }]);
        toast(j === 'xlsx' ? 'Excel bundle diunduh.' : 'Diunduh sebagai CSV.');
      } catch (err) { toast(pesanGalat(err), 'galat'); }
    }
  });
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-nik]')) e.target.click(); });
  pasangSlotBerkas(el, { usulanId: id, tahap: null, judulJenis: JENIS_BERKAS, muatUlang: segar });
  await gambar();
  const lepasBus = bus.on('usulan-berubah', (uid) => { if (!uid || uid === id) segar().catch(() => {}); });
  return () => { lepasBus(); lepasDiskusi(); };
}
