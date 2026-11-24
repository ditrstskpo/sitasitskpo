// W-20 Detail Usulan: stepper 11 tahap (pita gelap), panel aksi tahap aktif sesuai peran,
// Daftar PM, Log Petugas Penyalur, Dokumentasi PM, dan Riwayat / jejak audit.
import { html, raw, angka, tanggal, tanggalJam, hariIni } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { hapusCache, bus } from '../core/store.js';
import { judulHalaman, kosong, kotakGalat, toast, konfirmasi, pesanGalat, tombolMuat, bukaModal, pasangReveal } from '../core/ui.js';
import { tabs, slotBerkas, pasangSlotBerkas, opsi, namaUnduhan, tautanAman } from '../core/komp.js';
import { STATUS_USULAN, STATUS_BNBA, MAK, badge, chipTahap, stepperBesar, infoTahap, bolehTahap, rupiah, chipPokjaU, urutEkspor, URUT_TAHAP } from '../core/bnba.js';
import { unduhExcel } from '../core/xlsx.js';
import { pergi } from '../core/nav.js';
import * as P from '../core/peran.js';
import { galeriFoto, pasangUnggah, muatGambarMini } from '../core/unggah.js';
import { panelDiskusi } from './_pesan.js';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const JENIS_BERKAS = { draft_sk: 'Draft SK', nota_dinas: 'Nota Dinas', sk_final: 'Scan SK TTD Final', surat_burekol: 'Surat Penyampaian Data Bantuan ATENSI', lampiran_burekol: 'Lampiran Data BNBA PM' };
const LABEL_DATA = { tanggal: 'Tanggal', petugas: 'Petugas', tgl_masuk_direktur: 'Tanggal masuk ke Direktur', status_ttd: 'Status TTD', tgl_ttd: 'Tanggal TTD',
  tgl_kirim: 'Tanggal kirim', pengirim: 'Pengirim (TSKPO)', penerima: 'Penerima di Sekretariat', hp_penerima: 'Nomor HP penerima', status_kirim: 'Status',
  sk_selesai: 'SK sudah selesai', no_sk: 'NO SK', tgl_sk: 'TGL SK', link_sk: 'Link SK', sp2d_terbit: 'SP2D terbit', no_sp2d: 'NO SP2D', tgl_sp2d: 'TGL SP2D',
  bulan_sp2d: 'BULAN (SP2D)', si_selesai: 'SI selesai', dikonfirmasi: 'Pencairan dikonfirmasi', tgl_cair: 'Tanggal cair' };
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
    const tolakKembali = ['4a', '4b', '4c'].includes(no);
    const tombol = (labelSelesai) => html`<div class="form-aksi">
      ${tolakKembali ? html`<button type="button" class="btn btn-ghost" data-aksi="kembalikan" data-t="${no}">${raw(ikon('undo', 18))} Kembalikan ke Tahap 3</button>
        <button type="button" class="btn btn-ghost teks-merah" data-aksi="tolak" data-t="${no}">${raw(ikon('circle-x', 18))} Tolak</button>` : ''}
      <span class="spacer"></span>${['4b', '4c', '5', '6'].includes(no) ? html`<button type="button" class="btn btn-secondary" data-aksi="simpan" data-t="${no}">${raw(ikon('save', 18))} Simpan Draf</button>` : ''}
      <button type="button" class="btn btn-primary" data-aksi="selesai" data-t="${no}">${raw(ikon('check-circle', 18))} ${labelSelesai}</button></div>`;
    const isi = {
      1: () => html`<p>Usulan masih disusun Pokja pengusul.</p>${milik() ? html`<a class="btn btn-primary" href="#/workspace-bnba/usulan?id=${u.id}">${raw(ikon('pencil', 18))} Buka Formulir Usulan</a>` : ''}`,
      2: () => html`<p>Menunggu verifikasi Kapokja ${u.pokja_nama}.</p>${bolehTahap(s, u.pokja_id, '2') ? html`<a class="btn btn-primary" href="#/antrean-verifikasi?id=${u.id}">${raw(ikon('inbox', 18))} Buka Antrean Verifikasi</a>` : ''}`,
      3: () => html`${t.catatan ? html`<div class="galat" style="margin-bottom:16px">${raw(ikon('alert', 20))}<span><b>Catatan pengembalian:</b> ${t.catatan}</span></div>` : ''}
        <div class="info-card biru" style="margin-bottom:16px">${raw(ikon('info', 20, 'ik'))}<span>Pada Tahap 3, Anggota Pokja mengunggah Draft SK dan Nota Dinas. Tidak ada paraf Kapokja kedua; setelah lengkap usulan langsung menuju Verifikasi TU (4a).</span></div>
        <div class="grid grid-2">${slotBerkas({ judul: '1. Draft SK Penetapan', ket: 'Naskah draf SK (.docx / .pdf, maks 10 MB)', jenis: 'draft_sk', berkas: berkasT('3'), boleh })}
          ${slotBerkas({ judul: '2. Naskah Nota Dinas Pengantar', ket: 'Nota Dinas pengantar usulan (.docx / .pdf)', jenis: 'nota_dinas', berkas: berkasT('3'), boleh })}</div>
        ${boleh ? tombol('Konfirmasi Tahap 3 Selesai & Kirim ke Verifikasi TU (4a)') : ''}`,
      '4a': () => html`<div class="form-grid">${fld('Tanggal verifikasi', inp('tanggal', dt.tanggal || hariIni(), 'date'))}${fld('Petugas TU', inp('petugas', dt.petugas || s.pengguna.nama))}</div>
        ${tombol('Disetujui TU — Lanjut ke Direktur (4b)')}`,
      '4b': () => html`<div class="form-grid">${fld('Tanggal masuk ke Direktur', inp('tgl_masuk_direktur', dt.tgl_masuk_direktur, 'date'), true)}
        ${fld('Status TTD Direktur', html`<select class="select" name="status_ttd">${opsi(['Menunggu TTD', 'Ditandatangani'], dt.status_ttd || 'Menunggu TTD')}</select>`)}
        ${fld('Tanggal TTD', inp('tgl_ttd', dt.tgl_ttd, 'date'))}</div>${tombol('Ditandatangani Direktur — Lanjut ke Sekretariat (4c)')}`,
      '4c': () => html`<div class="form-grid">${fld('Tanggal kirim', inp('tgl_kirim', dt.tgl_kirim, 'date'), true)}${fld('Nama pengirim dari TSKPO', inp('pengirim', dt.pengirim || s.pengguna.nama), true)}
        ${fld('Nama penerima di Sekretariat', inp('penerima', dt.penerima), true)}${fld('Nomor HP penerima', inp('hp_penerima', dt.hp_penerima, 'tel', '08…'), true)}
        ${fld('Status', html`<select class="select" name="status_kirim">${opsi(['Dikirim', 'Diterima Sekretariat'], dt.status_kirim || 'Dikirim')}</select>`)}</div>
        ${tombol('Diterima Sekretariat — Buka Tahap 5 & 6')}`,
      5: () => html`<div class="info-card emas" style="margin-bottom:16px">${raw(ikon('shield-alert', 20, 'ik'))}<span>Data ditarik dari BNBA. Rekening tampil penuh hanya bagi Pokja Keuangan, Pokja pemilik, dan Super Admin; setiap pembukaan tercatat di audit log.</span></div>
        <div data-dp><div class="skel" style="height:160px;border-radius:16px"></div></div>${boleh ? tombol('Semua PM Lengkap — Tahap 5 Selesai') : ''}`,
      6: () => html`${cek('sk_selesai', dt.sk_selesai, 'SK sudah selesai dan keluar dari Sekretariat')}
        <div class="form-grid" style="margin-top:16px">${fld('NO SK', inp('no_sk', dt.no_sk, 'text', '142/RSTSKPO/SK/11/2026'), true)}${fld('TGL SK', inp('tgl_sk', dt.tgl_sk, 'date'), true)}${fld('Link SK (opsional)', inp('link_sk', dt.link_sk, 'url', 'https://…'), false, true)}</div>
        <div style="margin-top:16px">${slotBerkas({ judul: 'Scan SK TTD Final', ket: 'PDF hasil pindai SK yang sudah ditandatangani', jenis: 'sk_final', berkas: berkasT('6'), boleh })}</div>
        <p class="help" style="margin-top:12px">NO SK dan TGL SK diisi sekali di sini, lalu otomatis tampil di BNBA, Data Pencairan, dan Rekap Data Pencairan.</p>${tombol('Konfirmasi SK Keluar — Tahap 6 Selesai')}`,
      7: () => html`<div class="grid grid-2">${slotBerkas({ judul: 'Surat Penyampaian Data Bantuan ATENSI', jenis: 'surat_burekol', berkas: berkasT('7'), boleh })}
        ${slotBerkas({ judul: 'Lampiran Data BNBA PM', ket: 'Bisa diunduh dari tombol "Unduh Excel Bundle Ini"', jenis: 'lampiran_burekol', berkas: berkasT('7'), boleh })}</div>${tombol('Administrasi Burekol Selesai — Buka Tahap 8')}`,
      8: () => html`${cek('sp2d_terbit', dt.sp2d_terbit, 'SP2D sudah terbit dari KPPN')}${tombol('SP2D Terbit — Buka Tahap 9')}`,
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
      ${boleh || ['1', '2'].includes(no) ? isi() : html`<div class="info-card">${raw(ikon('lock', 20, 'ik'))}<span>Menunggu <b>${info.oleh}</b> menyelesaikan tahap ini. Anda dapat memantau tanpa mengubah.</span></div>
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
      ${selesai.length ? html`<section class="card" style="margin-top:24px"><div class="card-head"><span class="ubin">${raw(ikon('list-checks', 20))}</span><div><h2 class="card-title">Rincian Tahap Selesai</h2><p class="card-sub">Petugas, waktu, isian, dan berkas setiap tahap.</p></div></div>
        <div class="akordeon">${selesai.map((x) => html`<details><summary>${chipTahap(x.tahap)}<span class="spacer"></span><small class="redup">${x.pic_nama || '—'} · ${tanggalJam(x.selesai_pada)}</small>${raw(ikon('chevron-down', 18, 'putar'))}</summary>
          <div class="isi-pm">${Object.keys(x.data || {}).length ? html`<dl class="kv">${Object.entries(x.data).map(([k, v]) => html`<div><dt>${LABEL_DATA[k] || k}</dt><dd>${nilaiData(v)}</dd></div>`)}</dl>` : ''}
            ${x.catatan ? html`<p><b>Catatan:</b> ${x.catatan}</p>` : ''}
            ${berkasT(x.tahap).map((b) => html`<div class="berkas-baris"><span class="ik">${raw(ikon('file-text', 18))}</span><span class="nm"><b>${JENIS_BERKAS[b.jenis] || b.jenis}</b><small>${b.nama}</small></span>
              <button type="button" class="btn btn-icon" data-unduh="${b.id}" aria-label="Unduh ${b.nama}">${raw(ikon('download', 18))}</button></div>`)}
            ${!Object.keys(x.data || {}).length && !x.catatan && !berkasT(x.tahap).length ? html`<p class="redup">Tidak ada isian tambahan.</p>` : ''}</div></details>`)}</div></section>` : ''}`;
  }

  async function gambarDP() {
    const box = $('[data-dp]'); if (!box) return;
    try {
      dp ||= await api.dataPencairan(id);
      const ubah = bolehTahap(s, d.usulan.pokja_id, '5') && d.usulan.status === 'proses' && T('5').status !== 'selesai';
      box.innerHTML = String(html`${ubah ? html`<div class="isi-semua"><b>Isi sekaligus:</b>
          <select class="select" data-semua="akun_bantuan">${opsi(Object.entries(MAK).map(([k, v]) => [k, `${k} — ${v}`]), '', 'Akun bantuan…')}</select>
          <input class="input" data-semua="nama_bank" placeholder="Nama bank (mis. BNI)"><input class="input" data-semua="rek_giro_bni" placeholder="No. rek giro bansos BNI">
          <button type="button" class="btn btn-secondary btn-sm" data-terap-semua>Terapkan ke semua PM</button></div>` : ''}
        <div class="table-wrap"><table class="tbl rapat"><thead><tr><th>PM</th><th>Jenis / Nilai</th><th>Akun Bantuan</th><th>Nama Bank</th><th>Nomor Rekening</th><th>Nama Pemilik</th><th>Rek Giro BNI</th></tr></thead><tbody>
        ${dp.baris.map((b) => html`<tr data-dp-baris="${b.id}"><td><b>${b.nama}</b><small class="mono redup" style="display:block">${b.nik}</small></td><td>${b.jenis_bantuan || '—'}<small style="display:block">${rupiah(b.nilai_bantuan)}</small></td>
          ${ubah ? html`<td><select class="select" name="akun_bantuan">${opsi(Object.keys(MAK), b.akun_bantuan, '—')}</select></td><td><input class="input" name="nama_bank" value="${b.nama_bank || ''}"></td>
            <td><input class="input mono" name="nomor_rekening" inputmode="numeric" value="${b.nomor_rekening || ''}"></td><td><input class="input" name="nama_pemilik_rek" value="${b.nama_pemilik_rek || b.nama}"></td>
            <td><input class="input mono" name="rek_giro_bni" value="${b.rek_giro_bni || ''}"></td>`
          : html`<td>${b.akun_bantuan || '—'}</td><td>${b.nama_bank || '—'}</td><td class="mono">${b.nomor_rekening || '—'}</td><td>${b.nama_pemilik_rek || '—'}</td><td class="mono">${b.rek_giro_bni || '—'}</td>`}</tr>`)}
        </tbody></table></div>${!dp.penuh ? html`<p class="help">Nomor rekening tersamar untuk peran Anda.</p>` : ''}`);
    } catch (e) { box.innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  const barisDP = () => [...el.querySelectorAll('[data-dp-baris]')].map((tr) => ({ id: tr.dataset.dpBaris, ...Object.fromEntries([...tr.querySelectorAll('[name]')].map((x) => [x.name, x.value.trim()])) }));

  async function tabPM() {
    pm ||= await api.bnbaUsulan(id);
    return html`<section class="card table-card"><div class="table-wrap"><table class="tbl"><thead><tr><th>No</th><th>Nama &amp; NIK</th><th>Klaster</th><th>Kab/Kota KTP</th><th>Jenis Bantuan</th><th class="kanan">Nilai</th><th>Rekening</th><th>Status</th></tr></thead><tbody>
      ${pm.map((b, i) => html`<tr class="baris-klik" data-nik="${b.nik}" tabindex="0"><td class="angka">${i + 1}</td><td><b>${b.nama}</b><small class="mono redup" style="display:block">${b.nik}</small></td>
        <td>${b.klaster_ppks || '—'}</td><td>${b.ktp_kabkota || '—'}<small class="redup" style="display:block">${b.ktp_provinsi || ''}</small></td><td>${b.jenis_bantuan || '—'}</td><td class="kanan angka">${rupiah(b.nilai_bantuan)}</td>
        <td class="mono">${b.nama_bank ? b.nama_bank + ' ' : ''}${b.nomor_rekening_samar || '—'}</td><td>${badge(STATUS_BNBA, b.status_verifikasi)}</td></tr>`)}
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
      <div class="info-card biru" style="margin-bottom:16px">${raw(ikon('info', 20, 'ik'))}<span>Klik <b>Unggah / lihat foto</b> pada baris PM. Foto dari kamera atau galeri otomatis dikecilkan ≤ 500 KB, maks 2 foto per kategori.
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
        maks: k.maks, berkas: k.berkas, boleh: k.boleh, tanpa: k.tanpa, wajib: !k.opsional && (k.kode === 'sebelum_usaha' || st.status_cair === 'cair'), ket: k.boleh ? 'Maks 2 foto · 500 KB per foto' : 'Hanya dapat dilihat' }))}</div>
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
      const k = await konfirmasi({ judul: `Selesaikan Tahap ${no}?`, ikonNama: 'check-circle', label: 'Ya, selesaikan',
        pesan: 'Tahap berikutnya terbuka dan pelaksananya menerima notifikasi (in-app, WhatsApp, email). Status selesai tidak dapat dibatalkan.' });
      if (!k.ok) return;
    }
    const pulih = tombolMuat(btn, 'Menyimpan…');
    try {
      if (no === '5' && (aksi === 'simpan' || aksi === 'selesai')) { await api.simpanDataPencairan(id, barisDP()); dp = null; }
      await api.prosesTahap(id, no, aksi, data, catatan);
      toast(aksi === 'simpan' ? 'Draf isian tersimpan.' : aksi === 'selesai' ? `Tahap ${no} selesai. Pelaksana tahap berikutnya sudah diberi tahu.` : aksi === 'tolak' ? 'Usulan ditolak.' : 'Usulan dikembalikan ke Tahap 3.');
      await segar();
    } catch (e) { pulih(); toast(pesanGalat(e), 'galat'); }
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
    const nk = e.target.closest('[data-nik]'); if (nk) return pergi('/pm/' + nk.dataset.nik);
    if (e.target.closest('[data-terap-semua]')) {
      el.querySelectorAll('[data-semua]').forEach((x) => { if (x.value) el.querySelectorAll(`[data-dp-baris] [name="${x.dataset.semua}"]`).forEach((y) => { y.value = x.value; }); });
      return toast('Diterapkan ke semua PM. Tekan "Simpan Draf" untuk menyimpan.', 'info');
    }
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
