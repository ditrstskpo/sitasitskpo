// v2.9.0 — Cetak / simpan PDF profil PM lengkap (semua bagian, bukan hanya tab yang terbuka). NIK lengkap untuk keperluan instansi; No. KK & rekening disamarkan.
import { html, raw, angka, tanggal } from '../core/util.js';
import { KOLOM, KOLOM_EKONOMI, GRUP, JENIS_BANTUAN, STATUS_BNBA, STATUS_USULAN, infoTahap, URUT_TAHAP, rupiah, usia } from '../core/bnba.js';

const samarNik = (n) => (n && n.length >= 8 ? n.slice(0, 4) + '••••••••' + n.slice(-4) : n || '—');
export function cetakProfil({ d, smv, nikPenuh = true }) {
  const b = d.bnba, u = d.usulan || {}, nik = nikPenuh ? b.nik : samarNik(b.nik);
  const nilai = (c) => {
    if (c.k === 'usia') return usia(b.tgl_lahir) !== '' ? usia(b.tgl_lahir) + ' tahun' : '—';
    if (['no_sk', 'tgl_sk'].includes(c.k)) return c.k === 'tgl_sk' ? tanggal(u.tgl_sk) : u.no_sk || '—';
    if (c.k === 'link_sk') return u.link_sk ? 'Tersedia' : '—';
    if (c.k === 'nik') return nik;
    if (c.sensitif) return b[c.k + '_samar'] ?? '—';
    if (c.k === 'jenis_bantuan') return JENIS_BANTUAN[b.jenis_bantuan] || '—';
    if (['nilai_bantuan', 'pendapatan_kotor_awal', 'biaya_awal'].includes(c.k)) return rupiah(b[c.k]);
    if (['tgl_lahir', 'tgl_sp2d'].includes(c.k)) return tanggal(b[c.k]);
    return b[c.k] ?? '—';
  };
  const stt = Object.fromEntries((d.tahap || []).map((x) => [x.tahap, x]));
  const put = smv?.putaran || [];
  const peny = (d.penyaluran || []).filter((x) => x.semua_pm || (x.nik_pm || []).includes(b.nik));
  const w = document.createElement('div'); w.className = 'cetak-profil';
  w.innerHTML = String(html`
    <header class="cp-kop"><b>SITASI TSKPO</b><span>Profil Penerima Manfaat · Dit. RSTSKPO Kemensos RI · dicetak ${tanggal(new Date().toISOString().slice(0, 10))}</span></header>
    <h1>${b.nama}</h1>
    <p class="cp-sub">NIK ${nik} · ${[b.jenis_kelamin, usia(b.tgl_lahir) !== '' ? usia(b.tgl_lahir) + ' tahun' : null, b.klaster_ppks ? 'Klaster ' + b.klaster_ppks : null, 'Pokja ' + (b.pokja?.nama_pendek || '—')].filter(Boolean).join(' · ')}</p>
    <div class="cp-tiga"><div><small>1 · Status BNBA</small><b>${STATUS_BNBA[b.status_verifikasi]?.l || STATUS_BNBA[b.status_verifikasi]?.label || b.status_verifikasi || '—'}</b></div>
      <div><small>2 · Posisi usulan</small><b>${u.status === 'proses' ? `Tahap ${u.tahap_aktif} · ${infoTahap(u.tahap_aktif).nama}` : (STATUS_USULAN[u.status]?.l || STATUS_USULAN[u.status]?.label || u.status || '—')}</b></div>
      <div><small>3 · Bantuan</small><b>${JENIS_BANTUAN[b.jenis_bantuan] || '—'} · ${rupiah(b.nilai_bantuan)}</b></div></div>
    <h2>Data BNBA</h2>
    ${['profil', 'ktp', 'dom', 'umum', 'intervensi', 'ekonomi', 'sk', 'keu'].map((g) => html`<section class="cp-grup"><h3>${GRUP[g].replace(/ \(.*\)$/, '')}</h3>
      <dl>${[...KOLOM, ...KOLOM_EKONOMI].filter((c) => c.g === g).map((c) => html`<div><dt>${c.x}</dt><dd>${nilai(c)}</dd></div>`)}</dl></section>`)}
    <h2>Usulan &amp; SK — 11 Tahap</h2>
    <table class="cp-tabel"><thead><tr><th>Tahap</th><th>Nama tahap</th><th>Status</th><th>Petugas (PIC)</th><th>Selesai</th></tr></thead><tbody>
      ${URUT_TAHAP.map((no) => { const x = stt[no] || {}, t = infoTahap(no); return html`<tr><td>${no}</td><td>${t.nama}</td><td>${x.status === 'selesai' ? 'Selesai' : u.tahap_aktif === no ? 'Sedang berjalan' : 'Belum'}</td><td>${x.pic_nama || t.oleh}</td><td>${x.selesai_pada ? tanggal(String(x.selesai_pada).slice(0, 10)) : '—'}</td></tr>`; })}</tbody></table>
    <h2>Pencairan &amp; Penyalur</h2>
    <dl class="cp-kv"><div><dt>Status pencairan</dt><dd>${u.status === 'selesai' ? 'Sudah cair ' + tanggal(u.tgl_cair) : 'Belum cair'}</dd></div><div><dt>Bank / rekening</dt><dd>${b.nama_bank || '—'} · ${b.nomor_rekening_samar || '—'}</dd></div>
      <div><dt>No SP2D</dt><dd>${b.no_sp2d || '—'} · ${tanggal(b.tgl_sp2d)}</dd></div><div><dt>Petugas penyalur</dt><dd>${peny.length ? peny.map((x) => x.nama_petugas + (x.kabkota ? ' (' + x.kabkota + ')' : '')).join('; ') : 'Belum tercatat'}</dd></div></dl>
    <h2>Supermonev</h2>
    ${put.length ? html`<table class="cp-tabel"><thead><tr><th>Putaran</th><th>Jatuh tempo</th><th>Status</th><th>Hasil</th><th>Pendapatan bersih</th><th>Perubahan</th></tr></thead><tbody>
      ${put.map((x) => { const i = x.isian || {}; return html`<tr><td>${x.putaran}</td><td>${tanggal(x.jatuh_tempo)}</td><td>${i.status === 'terverifikasi' ? 'Terverifikasi' : i.status ? 'Terisi' : 'Belum diisi'}</td><td>${i.hasil || '—'}</td><td>${i.pendapatan_bersih == null ? '—' : rupiah(i.pendapatan_bersih)}</td><td>${i.kenaikan == null ? '—' : (i.kenaikan > 0 ? '+' : '') + angka(i.kenaikan) + '%'}</td></tr>`; })}</tbody></table>
      ${put.filter((x) => x.isian?.ringkasan_kendala).map((x) => html`<p class="cp-kendala"><b>Putaran ${x.putaran}:</b> ${x.isian.ringkasan_kendala}</p>`)}` : html`<p>Belum ada jadwal monitoring.</p>`}`);
  document.body.appendChild(w);
  const gaya = document.createElement('style'); gaya.textContent = '@page { size: A4 portrait; margin: 12mm; }'; document.head.appendChild(gaya);
  document.documentElement.classList.add('mencetak-profil');
  const selesai = () => { document.documentElement.classList.remove('mencetak-profil'); w.remove(); gaya.remove(); removeEventListener('afterprint', selesai); };
  addEventListener('afterprint', selesai);
  setTimeout(() => window.print(), 60);
}
