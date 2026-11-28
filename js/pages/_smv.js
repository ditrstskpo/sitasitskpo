// Potongan bersama Tahap 5 (Supermonev): lencana hasil, status, hitung mundur jatuh tempo, cincin progres,
// formulir monitoring bertahap (wizard ramah orang tua) dengan perkiraan hasil langsung, pemeriksaan/verifikasi,
// dan jendela verifikasi belanja / BAST / inventaris.
import { html, raw, angka, tanggal, tanggalJam, hariIni } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api, modePratinjau } from '../core/api.js';
import { bukaModal, toast, pesanGalat, tombolMuat, konfirmasi } from '../core/ui.js';
import { rupiah, chipPokjaU, JENIS_BANTUAN } from '../core/bnba.js';
import { galeriFoto, daftarBerkas, pasangUnggah, muatGambarMini } from '../core/unggah.js';
import { rupiahSingkat } from '../core/grafik.js';

// ---------------------------------------------------------------- jadwal mingguan (v2.11.0)
// Bawaan: monitoring setiap minggu, mulai 3 bulan setelah penyaluran. Server mengirim "mingguan" (true/false) di setiap
// jawaban Supermonev; nilainya disimpan di sini agar semua label memakai "Minggu ke-n" atau "Putaran n" (cara lama).
let MINGGUAN = true;
export const aturMingguan = (v) => { if (typeof v === 'boolean') MINGGUAN = v; return MINGGUAN; };
export const mingguanAktif = () => MINGGUAN;
export const labelPutaran = (n) => (MINGGUAN ? 'Minggu ke-' : 'Putaran ') + n;
export const namaPutaran = () => (MINGGUAN ? 'Minggu' : 'Putaran');
/** Pilihan filter nomor minggu/putaran */
export const daftarPutaran = (maks = MINGGUAN ? 52 : 4) => Array.from({ length: maks }, (_, i) => [String(i + 1), labelPutaran(i + 1)]);
export const namaBulan = (ym) => (ym ? new Date(ym + '-01T00:00:00').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : '—');
const tglPendek = (v) => (v ? new Date(v + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '');

/** Skala sumbu Y yang "bulat" (mis. 0, 200 rb, 400 rb, 600 rb) */
function skalaBulat(maks, garis = 4) {
  const kasar = Math.max(1, maks) / garis, pangkat = 10 ** Math.floor(Math.log10(kasar));
  const langkah = [1, 2, 2.5, 5, 10].map((k) => k * pangkat).find((x) => x >= kasar) || 10 * pangkat;
  const atas = Math.ceil((Math.max(1, maks) * 1.08) / langkah) * langkah;
  return { atas, garis: Array.from({ length: Math.round(atas / langkah) + 1 }, (_, i) => i * langkah) };
}
/**
 * Grafik pendapatan bersih per minggu satu PM (SVG, tanpa pustaka).
 * titik: [{ putaran, jatuh_tempo, nilai|null, hasil?, nanti? }] berurutan; dasar = pendapatan sebelum bantuan (garis putus-putus).
 * jenis 'garis' (banyak minggu) atau 'batang' (satu bulan, 4–5 minggu, dengan angka di atas batang).
 * Minggu tanpa isian terverifikasi dibiarkan kosong (garis terputus), bukan dianggap 0.
 */
export function grafikMingguan(titik, { dasar = null, tinggi = 240, lebar: W = 720, jenis = 'garis', judul = 'Pendapatan bersih per minggu' } = {}) {
  const n = titik.length;
  if (!n) return html`<p class="redup">Belum ada jadwal monitoring.</p>`;
  const batang = jenis === 'batang';
  const H = tinggi, kiri = 58, kanan = dasar != null ? 108 : 16, atas = batang ? 26 : 16, bawah = 40, lebar = W - kiri - kanan, tg = H - atas - bawah;
  const nilai = titik.map((t) => (t.nilai == null ? null : Number(t.nilai)));
  const sk = skalaBulat(Math.max(...nilai.filter((v) => v != null), Number(dasar) || 0, 1));
  const lajur = lebar / n;
  const x = batang ? (i) => kiri + lajur * (i + 0.5) : (i) => kiri + (n === 1 ? lebar / 2 : (i * lebar) / (n - 1));
  const y = (v) => atas + tg - (Math.max(0, v) / sk.atas) * tg;
  // label sumbu X: setiap k titik + titik terakhir (label sebelumnya dibuang bila terlalu dekat agar tidak bertumpuk)
  const langkahLabel = batang ? 1 : Math.max(1, Math.ceil(n / 9)), berlabel = new Set();
  for (let i = 0; i < n; i += langkahLabel) berlabel.add(i);
  if (!berlabel.has(n - 1)) { const sblm = Math.max(...berlabel); if (n - 1 - sblm < langkahLabel * 0.7) berlabel.delete(sblm); berlabel.add(n - 1); }
  let jalur = '', mulai = true;
  if (!batang) nilai.forEach((v, i) => { if (v == null) { mulai = true; return; } jalur += `${mulai ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)} `; mulai = false; });
  const lb = Math.min(56, lajur * 0.56);   // lebar batang
  const terisi = nilai.filter((v) => v != null).length, iAkhir = nilai.map((v, k) => (v == null ? -1 : k)).filter((k) => k >= 0).pop();
  return html`<figure class="grafik-minggu ${batang ? 'batang' : ''}">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${judul}: ${terisi} dari ${n} minggu terisi">
      ${sk.garis.map((v) => html`<g><line x1="${kiri}" x2="${W - kanan}" y1="${y(v)}" y2="${y(v)}" class="gm-grid"/><text x="${kiri - 8}" y="${y(v) + 4}" class="gm-sumbu" text-anchor="end">${v ? rupiahSingkat(v).replace('Rp ', '') : '0'}</text></g>`)}
      ${batang ? titik.map((t, i) => nilai[i] != null
        ? html`<path d="M${x(i) - lb / 2} ${atas + tg} V${y(nilai[i]) + 4} q0 -4 4 -4 H${x(i) + lb / 2 - 4} q4 0 4 4 V${atas + tg} Z" class="gm-batang"/>
          <text x="${x(i)}" y="${y(nilai[i]) - 8}" class="gm-nilai" text-anchor="middle">${rupiahSingkat(nilai[i]).replace('Rp ', '')}</text>`
        : html`<text x="${x(i)}" y="${atas + tg - 8}" class="gm-sumbu redup" text-anchor="middle">${t.nanti ? 'belum jatuh tempo' : 'belum terverifikasi'}</text>`) : ''}
      ${dasar != null ? html`<line x1="${kiri}" x2="${W - kanan}" y1="${y(dasar)}" y2="${y(dasar)}" class="gm-dasar"/>
        <text x="${W - kanan + 8}" y="${y(dasar) - 4}" class="gm-label-dasar">Sebelum bantuan</text><text x="${W - kanan + 8}" y="${y(dasar) + 12}" class="gm-label-dasar kuat">${rupiahSingkat(dasar)}</text>` : ''}
      ${jalur ? html`<path d="${jalur}" class="gm-garis"/>` : ''}
      ${titik.map((t, i) => html`<g class="gm-titik">${batang ? '' : nilai[i] != null ? html`<circle cx="${x(i)}" cy="${y(nilai[i])}" r="4.5"/>` : html`<circle cx="${x(i)}" cy="${atas + tg}" r="3" class="kosong"/>`}
        <rect x="${x(i) - Math.max(8, lajur / 2)}" y="${atas}" width="${Math.max(16, lajur)}" height="${tg}" class="gm-sentuh"><title>${labelPutaran(t.putaran)} · ${tanggal(t.jatuh_tempo)}
${nilai[i] != null ? 'Pendapatan bersih ' + rupiah(nilai[i]) + (t.hasil ? ' · ' + (HASIL[t.hasil]?.l || '') : '') : t.nanti ? 'Belum jatuh tempo' : 'Belum ada isian terverifikasi'}</title></rect>
        ${berlabel.has(i) ? html`<text x="${x(i)}" y="${H - bawah + 16}" class="gm-sumbu" text-anchor="middle">${(MINGGUAN ? (batang ? 'Mg ' : 'M') : 'P') + t.putaran}</text>
          <text x="${x(i)}" y="${H - bawah + 30}" class="gm-sumbu redup" text-anchor="middle">${tglPendek(t.jatuh_tempo)}</text>` : ''}</g>`)}
    </svg>
    <figcaption><span class="gm-kunci"><i class="${batang ? 'gm-k-batang' : 'gm-k-garis'}"></i> Pendapatan bersih (isian terverifikasi)</span>${dasar != null ? html`<span class="gm-kunci"><i class="gm-k-dasar"></i> Sebelum bantuan</span>` : ''}
      ${!batang && iAkhir != null ? html`<span>Terakhir <b>${rupiah(nilai[iAkhir])}</b> (${labelPutaran(titik[iAkhir].putaran)})</span>` : ''}
      <span class="redup">${terisi} dari ${n} ${MINGGUAN ? 'minggu' : 'putaran'} terisi</span></figcaption></figure>`;
}

// ---------------------------------------------------------------- hasil & status
// Lencana hasil: latar muda + tulisan tua + ikon (PRD 7.3)
export const HASIL = {
  berhasil: { l: 'Berhasil', i: 'trending-up', t: '#DDF1E8', x: '#0E5530', c: '#17824A', k: 'Pendapatan naik dari sebelum bantuan' },
  berhasil_catatan: { l: 'Berhasil dengan Catatan', i: 'badge-check', t: '#E6ECF7', x: '#1F3C73', c: '#3E66B3', k: 'Usaha berjalan, jenis usaha berubah' },
  perlu_pendampingan: { l: 'Perlu Pendampingan', i: 'hand-heart', t: '#FBF0CC', x: '#6B4E08', c: '#C99A06', k: 'Usaha berjalan, pendapatan belum naik' },
  tidak_berhasil: { l: 'Tidak Berhasil', i: 'circle-alert', t: '#FDE7E3', x: '#8E3422', c: '#D9644A', k: 'Usaha tidak berjalan' },
};
export const URUT_HASIL = Object.keys(HASIL);
export function lencanaHasil(h, { besar = false, teks = '' } = {}) {
  const x = HASIL[h];
  if (!x) return html`<span class="lencana-hasil kosong ${besar ? 'besar' : ''}">${raw(ikon('hourglass', besar ? 22 : 15))} ${teks || 'Belum dapat dinilai'}</span>`;
  return html`<span class="lencana-hasil ${besar ? 'besar' : ''}" style="--t:${x.t};--x:${x.x};--c:${x.c}">${raw(ikon(x.i, besar ? 22 : 15))} ${teks || x.l}</span>`;
}
export const STATUS_SMV = {
  belum_ditugaskan: { l: 'Belum ditugaskan', c: 'b-lock', i: 'user-x' },
  ditugaskan: { l: 'Sudah ditugaskan', c: 'b-proc', i: 'user-check' },
  draft: { l: 'Sedang diisi', c: 'b-draft', i: 'pencil' },
  menunggu: { l: 'Menunggu verifikasi', c: 'b-wait', i: 'clock' },
  perlu_perbaikan: { l: 'Perlu perbaikan', c: 'b-fix', i: 'alert' },
  terverifikasi: { l: 'Terverifikasi', c: 'b-ok', i: 'check-circle' },
};
export const STATUS_BELANJA = {
  belum: { l: 'Belum diunggah', c: 'b-lock', i: 'upload' },
  draft: { l: 'Belum diajukan', c: 'b-draft', i: 'pencil' },
  menunggu: { l: 'Menunggu verifikasi', c: 'b-wait', i: 'clock' },
  perlu_perbaikan: { l: 'Perlu perbaikan', c: 'b-fix', i: 'alert' },
  terverifikasi: { l: 'Terverifikasi', c: 'b-ok', i: 'check-circle' },
};
export const lencanaStatus = (peta, k) => { const s = peta[k] || { l: k || '—', c: 'b-lock', i: 'info' }; return html`<span class="badge ${s.c}">${raw(ikon(s.i, 15))} ${s.l}</span>`; };
export const KONDISI = [
  ['Baik', 'check-circle', 'Barang masih dipakai dan berfungsi'], ['Rusak ringan', 'alert', 'Masih bisa dipakai, perlu perbaikan kecil'],
  ['Rusak berat', 'circle-x', 'Tidak bisa dipakai lagi'], ['Hilang', 'search', 'Barang tidak ditemukan'],
  ['Dijual/dipindahtangankan', 'repeat', 'Barang sudah bukan milik PM'], ['Tidak ada barang', 'box', 'Bantuan berupa uang/modal saja'],
];
const CONTOH_KENDALA = ['Modal masih kurang', 'Pembeli sepi', 'Harga bahan baku naik', 'Peralatan rusak', 'Belum ada tempat usaha tetap', 'Cuaca/musim hujan', 'PM atau keluarga sakit', 'Belum bisa membuat pembukuan'];

/** Hitung mundur jatuh tempo: { n, teks, kelas } */
export function sisaHari(jt) {
  if (!jt) return { n: null, teks: '—', kelas: '' };
  const n = Math.round((Date.parse(jt) - Date.parse(hariIni())) / 864e5);
  const teks = n > 1 ? `${n} hari lagi` : n === 1 ? 'Besok' : n === 0 ? 'Hari ini' : `Lewat ${-n} hari`;
  return { n, teks, kelas: n < 0 ? 'lewat' : n <= 7 ? 'dekat' : 'aman' };
}
export const chipJatuhTempo = (jt) => { const s = sisaHari(jt); return html`<span class="chip-tempo ${s.kelas}" title="Jatuh tempo ${tanggal(jt)}">${raw(ikon('calendar-clock', 15))} ${s.teks}</span>`; };

/** Cincin progres (SVG) dengan isian bercahaya. p = 0–100 */
export function cincin(p, { ukuran = 112, tebal = 10, warna = '#5FD39B', label = '', sub = '' } = {}) {
  const r = 50 - tebal / 2, k = 2 * Math.PI * r, v = Math.max(0, Math.min(100, Number(p) || 0));
  return html`<div class="cincin" style="--k:${k.toFixed(1)};--v:${(k * (1 - v / 100)).toFixed(1)};width:${ukuran}px;height:${ukuran}px;--c:${warna}" role="img" aria-label="${label || angka(v) + '%'}">
    <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="${r}" class="cincin-trek" stroke-width="${tebal}"></circle>
      <circle cx="50" cy="50" r="${r}" class="cincin-isi" stroke-width="${tebal}" transform="rotate(-90 50 50)"></circle></svg>
    <span class="cincin-teks"><b>${label || angka(v) + '%'}</b>${sub ? html`<small>${sub}</small>` : ''}</span></div>`;
}

/** Perbandingan pendapatan bersih sebelum bantuan vs bulan ini (dua batang). */
export function bandingPendapatan(dasar, kini, { gelap = false } = {}) {
  if (dasar == null && kini == null) return html`<p class="redup">Belum ada angka pendapatan.</p>`;
  const maks = Math.max(Number(dasar) || 0, Number(kini) || 0, 1);
  const naik = dasar > 0 && kini != null ? ((kini - dasar) / dasar) * 100 : null;
  const w = (x) => Math.max(3, Math.round(((Number(x) || 0) / maks) * 100));
  return html`<div class="banding ${gelap ? 'gelap' : ''}">
    <div class="banding-baris"><span>Sebelum bantuan</span><i style="--w:${w(dasar)}%;--c:#9AA6B2"></i><b>${dasar == null ? 'belum ada' : rupiah(dasar)}</b></div>
    <div class="banding-baris"><span>Bulan ini</span><i style="--w:${w(kini)}%;--c:${naik == null ? '#4FA8E0' : naik > 0 ? '#17824A' : '#C99A06'}"></i><b>${kini == null ? '—' : rupiah(kini)}</b></div>
    ${naik != null ? html`<p class="banding-ket ${naik > 0 ? 'naik' : 'turun'}">${raw(ikon(naik > 0 ? 'trending-up' : 'trending-down', 16))} ${naik > 0 ? 'Naik' : naik < 0 ? 'Turun' : 'Sama'} ${angka(Math.abs(Math.round(naik * 10) / 10))}% dari sebelum bantuan</p>` : ''}</div>`;
}

// ---------------------------------------------------------------- penilaian (sama dengan aturan di basis data)
export function perkiraan(v) {
  if (v.usaha_berjalan == null) return null;
  if (!v.usaha_berjalan) return 'tidak_berhasil';
  if (v.usaha_berubah) return 'berhasil_catatan';
  const bersih = bersihDari(v), dasar = v.dasar ?? v.dasar_pendapatan;
  if (bersih == null || dasar == null) return null;
  return bersih > dasar ? 'berhasil' : 'perlu_pendampingan';
}
const angkaDari = (x) => (x === '' || x == null ? null : Number(String(x).replace(/[^\d-]/g, '')) || 0);
const bersihDari = (v) => (v.pendapatan_kotor == null ? null : (Number(v.pendapatan_kotor) || 0) - (Number(v.pengeluaran) || 0));

/** Format input rupiah selagi diketik (titik ribuan) dan kembalikan angka. */
export function pasangRupiah(root) {
  root.querySelectorAll('input[data-rp]').forEach((inp) => {
    const fmt = () => { const n = angkaDari(inp.value); inp.value = n == null ? '' : angka(n); };
    inp.addEventListener('input', () => { const pos = inp.value.length - inp.selectionStart; fmt(); const p = Math.max(0, inp.value.length - pos); inp.setSelectionRange(p, p); });
    fmt();
  });
}

const infoPm = (f) => html`<div class="smv-pm">
  <span class="smv-pm-ikon">${raw(ikon('store', 26))}</span>
  <div><b>${f.nama}</b><small class="mono">NIK ${f.nik || '—'}</small>
    <small>${[f.alamat, f.kelurahan, f.kecamatan, f.kabkota, f.provinsi].filter(Boolean).join(', ')}</small></div>
  <div class="smv-pm-kanan">${chipPokjaU(f)}<small>${JENIS_BANTUAN[f.jenis_bantuan] || f.jenis_bantuan || ''} · ${rupiah(f.nilai_bantuan)}</small>
    ${f.putaran != null ? html`<small>${f.label_putaran || labelPutaran(f.putaran)} · jatuh tempo ${tanggal(f.jatuh_tempo)}</small>` : f.tgl_cair ? html`<small>Cair ${tanggal(f.tgl_cair)}</small>` : ''}</div></div>`;

// ---------------------------------------------------------------- formulir monitoring (wizard)
const LANGKAH = [['Kunjungan', 'map-pin'], ['Usaha', 'store'], ['Keuangan', 'banknote'], ['Barang & Kendala', 'box'], ['Periksa & Ajukan', 'send']];

/**
 * Buka formulir Supermonev satu PM satu putaran.
 * Bila boleh mengisi → wizard 5 langkah. Bila hanya melihat / memverifikasi → ringkasan + panel verifikasi.
 */
export async function bukaFormSmv({ bnba_id, putaran, onSelesai }) {
  const m = bukaModal({ judul: 'Formulir Supermonev', ukuran: 'besar smv-modal', isi: '<div class="skel" style="height:360px;border-radius:20px"></div>', kaki: '<span></span>' });
  let f;
  try { f = await api.smvFormulir(bnba_id, putaran); aturMingguan(f.mingguan); } catch (e) { m.body.innerHTML = String(html`<div class="galat">${raw(ikon('alert', 20))}<span>${pesanGalat(e)}</span></div>`); return; }
  m.el.querySelector('.modal-head h2').textContent = (f.boleh_isi ? 'Isi Formulir Supermonev' : 'Hasil Monitoring Supermonev') + ' — ' + f.nama;
  const i = f.isian || {};
  const v = {
    id: i.id || null, tgl_kunjungan: i.tgl_kunjungan || hariIni(), usaha_berjalan: i.usaha_berjalan ?? null, usaha_berubah: i.usaha_berubah ?? null, usaha_baru: i.usaha_baru || '',
    pendapatan_kotor: i.pendapatan_kotor ?? null, pengeluaran: i.pengeluaran ?? null, rincian_pengeluaran: i.rincian_pengeluaran || '', tambah_pekerja: i.tambah_pekerja ?? 0,
    kondisi_barang: i.kondisi_barang || '', catatan_barang: i.catatan_barang || '', modal_usaha: i.modal_usaha ?? null, sumber_modal: i.sumber_modal || '',
    kendala: i.kendala || '', perkembangan: i.perkembangan || '', dasar: f.dasar, dasar_pendapatan: f.dasar ?? i.dasar_pendapatan ?? null,
  };
  let langkah = 0, foto = f.foto || [];
  if (!f.boleh_isi) return tampilPeriksa(m, f, onSelesai);

  const data = () => ({ bnba_id, putaran: Number(putaran), tgl_kunjungan: v.tgl_kunjungan, usaha_berjalan: v.usaha_berjalan, usaha_berubah: v.usaha_berjalan ? v.usaha_berubah : null,
    usaha_baru: v.usaha_baru, pendapatan_kotor: v.pendapatan_kotor, pengeluaran: v.pengeluaran, rincian_pengeluaran: v.rincian_pengeluaran, tambah_pekerja: v.tambah_pekerja,
    kondisi_barang: v.kondisi_barang, catatan_barang: v.catatan_barang, modal_usaha: v.modal_usaha, sumber_modal: v.sumber_modal, kendala: v.kendala, perkembangan: v.perkembangan,
    dasar_pendapatan: f.dasar == null ? v.dasar_pendapatan : null });
  const ya = (k, nilai, jud, sub, ik) => html`<button type="button" class="pilih-besar ${v[k] === nilai ? 'on' : ''}" data-pilih="${k}" data-nilai="${String(nilai)}" aria-pressed="${v[k] === nilai}">
    <span class="pb-ikon">${raw(ikon(ik, 26))}</span><span><b>${jud}</b><small>${sub}</small></span><span class="pb-cek">${raw(ikon('check', 18))}</span></button>`;
  const rp = (k, label, help = '') => html`<div class="field"><label class="label" for="smv-${k}">${label}</label>
    <div class="input-rp"><span>Rp</span><input id="smv-${k}" class="input" inputmode="numeric" data-rp data-v="${k}" value="${v[k] ?? ''}" placeholder="ketik angka" autocomplete="off"></div>
    ${help ? html`<div class="help">${help}</div>` : ''}</div>`;

  function isiLangkah() {
    if (langkah === 0) return html`${infoPm(f)}
      <div class="form-grid" style="margin-top:20px">
        <div class="field"><label class="label" for="smv-tgl">Tanggal kunjungan<span class="wajib">*</span></label><input id="smv-tgl" class="input" type="date" max="${hariIni()}" data-v="tgl_kunjungan" value="${v.tgl_kunjungan}">
          <div class="help">Hari Anda bertemu PM di lokasi usaha.</div></div>
        <div class="field"><span class="label">Petugas</span><div class="input statis">${raw(ikon('user', 18))} ${f.petugas_nama || 'Anda'}</div></div>
      </div>
      <div class="kartu-dasar">${raw(ikon('scale', 22))}<div><b>Pembanding: pendapatan bersih per bulan SEBELUM bantuan</b>
        ${f.dasar != null ? html`<p><span class="angka-besar">${rupiah(f.dasar)}</span> <small class="redup">${f.dasar_sumber === 'bnba' ? `dari data BNBA (pendapatan ${rupiah(f.dasar_kotor)} − biaya ${rupiah(f.dasar_biaya)})` : 'dicatat pada monitoring sebelumnya'}</small></p>`
          : html`<p class="redup">Belum tercatat di BNBA. Tanyakan kepada PM: <i>"Sebelum menerima bantuan, berapa kira-kira penghasilan bersih Bapak/Ibu per bulan?"</i></p>
            ${rp('dasar_pendapatan', 'Pendapatan bersih per bulan sebelum bantuan', 'Diisi sekali saja, pada monitoring pertama.')}`}</div></div>
      ${(f.riwayat || []).length ? html`<div class="smv-riwayat-mini"><b>Monitoring sebelumnya</b>${f.riwayat.map((r) => html`<span>${labelPutaran(r.putaran)}: ${lencanaHasil(r.hasil, { teks: r.hasil ? '' : (STATUS_SMV[r.status]?.l || r.status) })}</span>`)}</div>` : ''}`;
    if (langkah === 1) return html`
      <h3 class="tanya">1. Apakah usaha PM masih berjalan?</h3>
      <div class="pilih-dua">${ya('usaha_berjalan', true, 'Ya, masih berjalan', 'PM masih berjualan / berproduksi', 'store')}${ya('usaha_berjalan', false, 'Tidak, sudah berhenti', 'Usaha tutup atau tidak aktif', 'pause')}</div>
      ${v.usaha_berjalan ? html`<h3 class="tanya">2. Apakah jenis usahanya masih sama dengan rencana bantuan?</h3>
        <p class="redup" style="margin:-6px 0 12px">Rencana awal: <b>${f.rincian_barang || JENIS_BANTUAN[f.jenis_bantuan] || '—'}</b></p>
        <div class="pilih-dua">${ya('usaha_berubah', false, 'Masih sama', 'Jenis usaha tidak berubah', 'check-circle')}${ya('usaha_berubah', true, 'Berubah', 'PM beralih ke usaha lain', 'repeat')}</div>
        ${v.usaha_berubah ? html`<div class="field" style="margin-top:14px"><label class="label" for="smv-baru">Jenis usaha sekarang<span class="wajib">*</span></label>
          <input id="smv-baru" class="input" data-v="usaha_baru" value="${v.usaha_baru}" placeholder="mis. Warung kopi dan gorengan"></div>` : ''}
        <div class="form-grid" style="margin-top:18px"><div class="field"><span class="label">Tambahan tenaga kerja sejak bantuan</span>
          <div class="stepper" role="group" aria-label="Tambahan tenaga kerja"><button type="button" class="btn btn-secondary" data-langkah-pekerja="-1" aria-label="Kurangi">−</button>
            <output data-pekerja>${v.tambah_pekerja || 0}</output><button type="button" class="btn btn-secondary" data-langkah-pekerja="1" aria-label="Tambah">+</button><span class="redup">orang</span></div></div></div>` : ''}
      <div class="field" style="margin-top:18px"><label class="label" for="smv-kembang">Perkembangan usaha</label>
        <textarea id="smv-kembang" class="textarea" rows="3" data-v="perkembangan" placeholder="Ceritakan singkat: produk baru, pelanggan bertambah, mulai menabung, dll.">${v.perkembangan}</textarea></div>`;
    if (langkah === 2) return html`
      ${v.usaha_berjalan === false ? html`<div class="info-card emas" style="margin-bottom:16px">${raw(ikon('info', 20, 'ik'))}<span>Usaha tidak berjalan, jadi pendapatan bulan ini tidak perlu diisi. Lanjutkan ke langkah berikutnya bila tidak ada data modal.</span></div>` : ''}
      <div class="form-grid">
        ${v.usaha_berjalan !== false ? html`${rp('pendapatan_kotor', 'Pendapatan kotor per bulan *', MINGGUAN ? 'Perkiraan seluruh hasil penjualan dalam sebulan pada kondisi minggu ini (agar bisa dibandingkan dengan pendapatan sebelum bantuan).' : 'Seluruh uang hasil penjualan dalam sebulan.')}${rp('pengeluaran', 'Pengeluaran usaha per bulan *', 'Belanja bahan, sewa, listrik, transportasi, dll.')}` : ''}
      </div>
      ${v.usaha_berjalan !== false ? html`<div class="field" style="margin-top:14px"><label class="label" for="smv-rinci">Rincian pengeluaran</label><input id="smv-rinci" class="input" data-v="rincian_pengeluaran" value="${v.rincian_pengeluaran}" placeholder="mis. bahan baku, gas, plastik kemasan"></div>
        <div class="kartu-bersih" data-bersih></div>` : ''}
      <div class="form-grid" style="margin-top:16px">${rp('modal_usaha', 'Modal usaha saat ini (perkiraan)')}
        <div class="field"><label class="label" for="smv-sumber">Sumber modal</label><input id="smv-sumber" class="input" data-v="sumber_modal" value="${v.sumber_modal}" placeholder="mis. bantuan ATENSI dan tabungan"></div></div>`;
    if (langkah === 3) return html`
      <h3 class="tanya">Bagaimana kondisi barang bantuan sekarang?<span class="wajib">*</span></h3>
      <div class="pilih-kondisi">${KONDISI.map(([k, ik, sub]) => html`<button type="button" class="pilih-besar kecil ${v.kondisi_barang === k ? 'on' : ''}" data-kondisi="${k}" aria-pressed="${v.kondisi_barang === k}">
        <span class="pb-ikon">${raw(ikon(ik, 22))}</span><span><b>${k}</b><small>${sub}</small></span><span class="pb-cek">${raw(ikon('check', 16))}</span></button>`)}</div>
      <div class="field" style="margin-top:14px"><label class="label" for="smv-cbarang">Catatan barang</label><input id="smv-cbarang" class="input" data-v="catatan_barang" value="${v.catatan_barang}" placeholder="mis. roda gerobak perlu diganti"></div>
      <div class="field" style="margin-top:18px"><label class="label" for="smv-kendala">Kendala yang dihadapi PM</label>
        <div class="chip-contoh" aria-label="Contoh kendala, ketuk untuk menambahkan">${CONTOH_KENDALA.map((c) => html`<button type="button" data-contoh="${c}">${raw(ikon('plus', 14))} ${c}</button>`)}</div>
        <textarea id="smv-kendala" class="textarea" rows="3" data-v="kendala" placeholder="Tulis dengan kalimat sederhana. Tulis 'Tidak ada' bila tidak ada kendala.">${v.kendala}</textarea>
        <div class="help">Ringkasan kendala dibuat otomatis untuk laporan dan dapat dikoreksi Kapokja Supermonev.</div></div>
      <div style="margin-top:18px" data-foto></div>`;
    // langkah 4: periksa
    return ringkasan(f, { ...v, pendapatan_bersih: bersihDari(v) }, foto, { sunting: true });
  }
  function render() {
    const h = perkiraan(v);
    m.body.innerHTML = String(html`<div class="wizard">
      <ol class="wizard-langkah" style="--s:${(langkah / (LANGKAH.length - 1)).toFixed(3)}">${LANGKAH.map(([j, ik], n) => html`<li class="${n < langkah ? 'lewat' : n === langkah ? 'kini' : ''}">
        <button type="button" data-ke="${n}" ${n > langkah + 1 ? raw('disabled') : ''} aria-current="${n === langkah ? 'step' : 'false'}"><span class="wl-no">${n < langkah ? raw(ikon('check', 18)) : n + 1}</span><span class="wl-j">${j}</span></button></li>`)}</ol>
      <div class="wizard-isi" data-isi>${isiLangkah()}</div>
      <div class="galat" data-galat hidden></div></div>`);
    m.foot.innerHTML = String(html`<div class="perkiraan ${h ? 'ada' : ''}" style="${h ? `--t:${HASIL[h].t};--x:${HASIL[h].x};--c:${HASIL[h].c}` : ''}" aria-live="polite">
        <small>Perkiraan hasil</small>${lencanaHasil(h, { teks: h ? '' : 'Lengkapi isian' })}</div>
      <span class="spacer"></span>
      ${langkah > 0 ? html`<button type="button" class="btn btn-ghost" data-mundur>${raw(ikon('arrow-left', 18))} Kembali</button>` : html`<button type="button" class="btn btn-ghost" data-batal-wizard>Tutup</button>`}
      <button type="button" class="btn btn-secondary" data-draft>${raw(ikon('save', 18))} Simpan Draft</button>
      ${langkah < LANGKAH.length - 1 ? html`<button type="button" class="btn btn-primary" data-maju>Lanjut ${raw(ikon('arrow-right', 18))}</button>`
        : html`<button type="button" class="btn btn-primary btn-sinar" data-ajukan>${raw(ikon('send', 18))} Ajukan ke Kapokja Supermonev</button>`}`);
    pasangRupiah(m.body);
    if (langkah === 2) segarBersih();
    if (langkah === 3) gambarFoto();
    m.body.querySelector('.wizard-isi')?.classList.add('masuk');
    m.body.scrollTop = 0;
  }
  const segarPerkiraan = () => {
    const h = perkiraan(v), el = m.foot.querySelector('.perkiraan'); if (!el) return;
    el.classList.toggle('ada', !!h);
    el.style.cssText = h ? `--t:${HASIL[h].t};--x:${HASIL[h].x};--c:${HASIL[h].c}` : '';
    el.innerHTML = String(html`<small>Perkiraan hasil</small>${lencanaHasil(h, { teks: h ? '' : 'Lengkapi isian' })}`);
    el.classList.remove('kedip'); void el.offsetWidth; el.classList.add('kedip');
  };
  const segarBersih = () => {
    const w = m.body.querySelector('[data-bersih]'); if (!w) return;
    const b = bersihDari(v);
    w.innerHTML = String(html`<div><small>Pendapatan bersih bulan ini (otomatis)</small><b class="angka-besar ${b != null && b < 0 ? 'minus' : ''}">${b == null ? '—' : rupiah(b)}</b></div>
      ${bandingPendapatan(v.dasar ?? v.dasar_pendapatan, b)}`);
  };
  async function simpanDraft({ diam = false } = {}) {
    const r = await api.smvSimpan(data(), false);
    v.id = r.id;
    if (!diam) toast('Draft tersimpan. Anda bisa melanjutkan kapan saja.');
    return r;
  }
  async function gambarFoto() {
    const w = m.body.querySelector('[data-foto]'); if (!w) return;
    if (!v.id) {
      w.innerHTML = String(html`<div class="galeri"><div class="galeri-kepala"><span class="ubin">${raw(ikon('camera', 20))}</span><div><b>Foto usaha (opsional)</b><small>Maks 2 foto · otomatis dikecilkan ≤ 1 MB</small></div></div>
        <button type="button" class="btn btn-secondary" data-siap-foto>${raw(ikon('camera', 18))} Siapkan unggah foto</button><p class="help">Draft disimpan dulu agar foto tertaut ke isian ini.</p></div>`);
      return;
    }
    w.innerHTML = String(galeriFoto({ konteks: 'smv', ref: v.id, jenis: 'foto', judul: 'Foto usaha (opsional)', maks: 2, berkas: foto, boleh: true, ket: 'Maks 2 foto · otomatis dikecilkan ≤ 1 MB · tampil juga di Detail PM' }));
    muatGambarMini(w);
  }
  const muatFoto = async () => { try { const x = await api.smvFormulir(bnba_id, putaran); foto = x.foto || []; } catch {} gambarFoto(); };
  pasangUnggah(m.el, { muatUlang: muatFoto, judulJenis: { foto: 'Foto Supermonev' } });

  const galat = (pesan) => { const g = m.body.querySelector('[data-galat]'); g.hidden = !pesan; g.innerHTML = pesan ? String(html`${raw(ikon('alert', 20))}<span>${pesan}</span>`) : ''; if (pesan) g.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
  const cekLangkah = (n) => {
    if (n === 0 && !v.tgl_kunjungan) return 'Isi tanggal kunjungan.';
    if (n === 1 && v.usaha_berjalan == null) return 'Pilih jawaban: apakah usaha masih berjalan?';
    if (n === 1 && v.usaha_berjalan && v.usaha_berubah == null) return 'Pilih jawaban: apakah jenis usaha masih sama?';
    if (n === 1 && v.usaha_berjalan && v.usaha_berubah && !v.usaha_baru.trim()) return 'Tuliskan jenis usaha yang sekarang.';
    if (n === 2 && v.usaha_berjalan && (v.pendapatan_kotor == null || v.pengeluaran == null)) return 'Isi pendapatan kotor dan pengeluaran per bulan (tulis 0 bila tidak ada).';
    if (n === 3 && !v.kondisi_barang) return 'Pilih kondisi barang bantuan.';
    return null;
  };
  m.el.addEventListener('input', (e) => {
    const k = e.target.dataset?.v; if (!k) return;
    v[k] = e.target.matches('[data-rp]') ? angkaDari(e.target.value) : e.target.value;
    if (['pendapatan_kotor', 'pengeluaran', 'dasar_pendapatan'].includes(k)) { segarBersih(); segarPerkiraan(); }
  });
  m.el.addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.matches('[data-pilih]')) { v[t.dataset.pilih] = t.dataset.nilai === 'true'; if (t.dataset.pilih === 'usaha_berjalan' && !v.usaha_berjalan) v.usaha_berubah = null; render(); return; }
    if (t.matches('[data-kondisi]')) { v.kondisi_barang = t.dataset.kondisi; m.body.querySelectorAll('[data-kondisi]').forEach((b) => { b.classList.toggle('on', b === t); b.setAttribute('aria-pressed', String(b === t)); }); return; }
    if (t.matches('[data-langkah-pekerja]')) { v.tambah_pekerja = Math.max(0, (Number(v.tambah_pekerja) || 0) + Number(t.dataset.langkahPekerja)); m.body.querySelector('[data-pekerja]').textContent = v.tambah_pekerja; return; }
    if (t.matches('[data-contoh]')) { const ta = m.body.querySelector('[data-v="kendala"]'); v.kendala = (v.kendala.trim() ? v.kendala.trim().replace(/[.]?$/, '. ') : '') + t.dataset.contoh + '.'; ta.value = v.kendala; ta.focus(); return; }
    if (t.matches('[data-ke]')) { const n = Number(t.dataset.ke); if (n > langkah) { const er = cekLangkah(langkah); if (er) return galat(er); } langkah = n; return render(); }
    if (t.matches('[data-maju]')) { const er = cekLangkah(langkah); if (er) return galat(er); langkah++; return render(); }
    if (t.matches('[data-mundur]')) { langkah = Math.max(0, langkah - 1); return render(); }
    if (t.matches('[data-batal-wizard]')) return m.tutup();
    if (t.matches('[data-siap-foto]')) { const pulih = tombolMuat(t, 'Menyimpan…'); try { await simpanDraft({ diam: true }); gambarFoto(); } catch (err) { pulih(); galat(pesanGalat(err)); } return; }
    if (t.matches('[data-draft]')) { const pulih = tombolMuat(t); try { await simpanDraft(); pulih(); onSelesai?.(); } catch (err) { pulih(); galat(pesanGalat(err)); } return; }
    if (t.matches('[data-ajukan]')) {
      for (let n = 0; n < 4; n++) { const er = cekLangkah(n); if (er) { langkah = n; render(); return galat(er); } }
      const pulih = tombolMuat(t, 'Mengajukan…');
      try {
        await api.smvSimpan(data(), true);
        m.tutup(); toast('Isian terkirim ke Kapokja Supermonev untuk diverifikasi. Terima kasih!', 'sukses', 'Berhasil diajukan');
        onSelesai?.();
      } catch (err) { pulih(); galat(pesanGalat(err)); }
    }
  });
  render();
}

/** Ringkasan isian (dipakai di langkah terakhir wizard, tampilan baca, dan verifikasi). */
function ringkasan(f, v, foto = [], { sunting = false } = {}) {
  const h = v.hasil || perkiraan({ ...v, dasar: f.dasar ?? v.dasar_pendapatan });
  const baris = (l, isi) => html`<div><dt>${l}</dt><dd>${isi ?? '—'}</dd></div>`;
  return html`${infoPm(f)}
    <div class="smv-hasil-besar" style="${h ? `--t:${HASIL[h].t};--x:${HASIL[h].x};--c:${HASIL[h].c}` : ''}">
      <div><small>${v.hasil ? 'Hasil penilaian (terverifikasi)' : 'Perkiraan hasil otomatis'}</small>${lencanaHasil(h, { besar: true })}
        <p>${h ? HASIL[h].k : 'Belum dapat dinilai: lengkapi pembanding pendapatan sebelum bantuan.'}${!v.hasil ? '. Keputusan akhir oleh Kapokja Supermonev.' : ''}</p></div>
      ${bandingPendapatan(f.dasar ?? v.dasar_pendapatan, v.pendapatan_bersih)}</div>
    <div class="grid grid-2" style="gap:16px">
      <section class="card datar"><h3 class="card-title">${raw(ikon('store', 18))} Usaha</h3><dl class="kv-baris">
        ${baris('Tanggal kunjungan', tanggal(v.tgl_kunjungan))}${baris('Usaha berjalan', v.usaha_berjalan == null ? '—' : v.usaha_berjalan ? 'Ya' : 'Tidak')}
        ${v.usaha_berjalan ? baris('Jenis usaha', v.usaha_berubah ? 'Berubah: ' + (v.usaha_baru || '—') : 'Masih sama') : ''}${baris('Tambahan pekerja', angka(v.tambah_pekerja || 0) + ' orang')}
        ${baris('Perkembangan', v.perkembangan || '—')}</dl></section>
      <section class="card datar"><h3 class="card-title">${raw(ikon('banknote', 18))} Keuangan per bulan</h3><dl class="kv-baris">
        ${baris('Pendapatan kotor', rupiah(v.pendapatan_kotor))}${baris('Pengeluaran', rupiah(v.pengeluaran))}${baris('Rincian', v.rincian_pengeluaran || '—')}
        ${baris('Pendapatan bersih', html`<b>${rupiah(v.pendapatan_bersih)}</b>`)}${baris('Modal usaha', rupiah(v.modal_usaha))}${baris('Sumber modal', v.sumber_modal || '—')}</dl></section>
      <section class="card datar"><h3 class="card-title">${raw(ikon('box', 18))} Barang bantuan</h3><dl class="kv-baris">
        ${baris('Kondisi', v.kondisi_barang || '—')}${baris('Catatan', v.catatan_barang || '—')}${baris('Rincian bantuan', f.rincian_barang || '—')}</dl></section>
      <section class="card datar"><h3 class="card-title">${raw(ikon('circle-alert', 18))} Kendala</h3><p>${v.kendala || '—'}</p>
        ${v.ringkasan_kendala ? html`<p class="ringkas-kendala">${raw(ikon('sparkles', 16))} <span><b>Ringkasan:</b> ${v.ringkasan_kendala}</span></p>` : ''}
        ${(v.kategori_kendala || []).length ? html`<div class="chips" style="margin-top:8px">${v.kategori_kendala.map((k) => html`<span class="badge b-gold kecil">${k}</span>`)}</div>` : ''}</section>
    </div>
    ${foto.length ? html`<div class="foto-grid" style="margin-top:16px">${foto.map((b) => html`<figure class="foto"><button type="button" class="foto-lihat" data-lihat="${b.id}" aria-label="Lihat ${b.nama}"><img alt="${b.nama}" data-gambar="${b.id}" loading="lazy"><span class="foto-muat"></span></button></figure>`)}</div>`
      : sunting ? html`<p class="redup" style="margin-top:12px">${raw(ikon('camera', 16))} Belum ada foto (opsional).</p>` : ''}
    ${sunting ? html`<div class="info-card biru" style="margin-top:16px">${raw(ikon('info', 20, 'ik'))}<span>Periksa kembali isian di atas. Setelah diajukan, isian tidak dapat diubah kecuali dikembalikan oleh Kapokja Supermonev.</span></div>` : ''}`;
}

/** Tampilan baca + verifikasi (Kapokja Supermonev). */
function tampilPeriksa(m, f, onSelesai) {
  const i = f.isian;
  if (!i) { m.body.innerHTML = String(html`${infoPm(f)}<div class="info-card" style="margin-top:16px">${raw(ikon('hourglass', 20, 'ik'))}<span>Formulir belum diisi petugas${f.petugas_nama ? ' (' + f.petugas_nama + ')' : ''}.</span></div>`); return; }
  m.body.innerHTML = String(html`<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">${lencanaStatus(STATUS_SMV, i.status)}
      <small class="redup" style="align-self:center">Diisi ${i.petugas_nama || '—'}${i.diajukan_pada ? ' · diajukan ' + tanggalJam(i.diajukan_pada) : ''}${i.diverifikasi_nama && i.status === 'terverifikasi' ? ' · diverifikasi ' + i.diverifikasi_nama : ''}</small></div>
    ${i.catatan_verifikasi ? html`<div class="info-card ${i.status === 'perlu_perbaikan' ? 'emas' : ''}" style="margin-bottom:12px">${raw(ikon('msg', 18, 'ik'))}<span><b>Catatan Kapokja:</b> ${i.catatan_verifikasi}</span></div>` : ''}
    ${ringkasan(f, i, f.foto || [])}
    ${f.boleh_verifikasi ? html`<section class="panel-verifikasi">
      <h3>${raw(ikon('shield', 20))} Verifikasi Kapokja Supermonev</h3>
      <p class="redup">Penilaian otomatis: ${lencanaHasil(i.hasil_otomatis)}. Ubah hasil bila kondisi lapangan berbeda — wajib menulis alasan.</p>
      <div class="pilih-hasil" role="radiogroup" aria-label="Hasil penilaian">${URUT_HASIL.map((h) => html`<label class="${h === i.hasil_otomatis ? 'otomatis' : ''}" style="--t:${HASIL[h].t};--x:${HASIL[h].x};--c:${HASIL[h].c}">
        <input type="radio" name="hasil" value="${h}" ${h === (i.hasil_otomatis || '') ? raw('checked') : ''}><span>${raw(ikon(HASIL[h].i, 18))} ${HASIL[h].l}${h === i.hasil_otomatis ? html`<small>otomatis</small>` : ''}</span></label>`)}</div>
      <div class="field" style="margin-top:14px"><label class="label" for="vf-ringkas">Ringkasan kendala (untuk laporan & PPTX)</label>
        <textarea id="vf-ringkas" class="textarea" rows="2">${i.ringkasan_kendala || ''}</textarea><div class="help">Dibuat otomatis dari isian petugas; silakan perbaiki kalimatnya bila perlu.</div></div>
      <div class="field" style="margin-top:14px"><label class="label" for="vf-catatan">Catatan / alasan</label><textarea id="vf-catatan" class="textarea" rows="2" placeholder="Wajib bila mengembalikan atau mengubah hasil otomatis"></textarea></div>
      <div class="galat" data-galat hidden style="margin-top:12px"></div></section>` : ''}`);
  muatGambarMini(m.body);
  pasangUnggah(m.el, {});
  if (!f.boleh_verifikasi) {
    m.foot.innerHTML = String(html`<span class="spacer"></span><button type="button" class="btn btn-ghost" data-batal>Tutup</button>`);
    m.foot.querySelector('[data-batal]').onclick = m.tutup;
    return;
  }
  m.foot.innerHTML = String(html`<span class="spacer"></span><button type="button" class="btn btn-ghost" data-batal>Tutup</button>
    <button type="button" class="btn btn-secondary" data-kembalikan>${raw(ikon('undo', 18))} Kembalikan ke Petugas</button>
    <button type="button" class="btn btn-primary btn-sinar" data-setujui>${raw(ikon('check', 18))} Setujui &amp; Verifikasi</button>`);
  m.foot.querySelector('[data-batal]').onclick = m.tutup;
  const g = m.body.querySelector('[data-galat]');
  const jalan = async (btn, setuju) => {
    g.hidden = true;
    const hasil = m.body.querySelector('input[name="hasil"]:checked')?.value || null;
    const catatan = m.body.querySelector('#vf-catatan').value.trim(), ringkas = m.body.querySelector('#vf-ringkas').value.trim();
    const pulih = tombolMuat(btn, setuju ? 'Memverifikasi…' : 'Mengembalikan…');
    try {
      await api.smvVerifikasi(i.id, setuju, setuju ? hasil : null, setuju ? ringkas : null, catatan || null);
      m.tutup(); toast(setuju ? 'Isian terverifikasi dan masuk dashboard.' : 'Isian dikembalikan ke petugas dengan catatan.', setuju ? 'sukses' : 'info');
      onSelesai?.();
    } catch (err) { pulih(); g.hidden = false; g.innerHTML = String(html`${raw(ikon('alert', 20))}<span>${pesanGalat(err)}</span>`); g.scrollIntoView({ block: 'nearest' }); }
  };
  m.foot.querySelector('[data-setujui]').onclick = (e) => jalan(e.currentTarget, true);
  m.foot.querySelector('[data-kembalikan]').onclick = (e) => jalan(e.currentTarget, false);
}

// ---------------------------------------------------------------- verifikasi belanja / BAST / inventaris
export async function bukaBelanja({ bnba_id, onSelesai }) {
  const m = bukaModal({ judul: 'Verifikasi Belanja, BAST & Inventaris', ukuran: 'besar smv-modal', isi: '<div class="skel" style="height:320px;border-radius:20px"></div>', kaki: '<span></span>' });
  let d;
  const muat = async () => {
    try { d = await api.belanjaDetail(bnba_id); } catch (e) { m.body.innerHTML = String(html`<div class="galat">${raw(ikon('alert', 20))}<span>${pesanGalat(e)}</span></div>`); return false; }
    return true;
  };
  if (!(await muat())) return;
  let inv = d.inventaris?.length ? d.inventaris.map((x) => ({ ...x })) : [{ nama: '', jumlah: 1, satuan: 'unit', nilai: null }];
  const total = () => inv.reduce((a, x) => a + (Number(x.nilai) || 0), 0);
  const barisInv = (x, n) => html`<div class="baris-inv" data-n="${n}">
    <input class="input" data-iv="nama" value="${x.nama || ''}" placeholder="Nama barang" aria-label="Nama barang" ${d.boleh_isi ? '' : raw('disabled')}>
    <input class="input" data-iv="jumlah" inputmode="numeric" value="${x.jumlah ?? ''}" aria-label="Jumlah" ${d.boleh_isi ? '' : raw('disabled')}>
    <input class="input" data-iv="satuan" value="${x.satuan || ''}" placeholder="unit" aria-label="Satuan" ${d.boleh_isi ? '' : raw('disabled')}>
    <div class="input-rp"><span>Rp</span><input class="input" data-iv="nilai" data-rp inputmode="numeric" value="${x.nilai ?? ''}" placeholder="nilai" aria-label="Nilai (Rp)" ${d.boleh_isi ? '' : raw('disabled')}></div>
    ${d.boleh_isi ? html`<button type="button" class="btn btn-icon" data-hapus-inv="${n}" aria-label="Hapus baris">${raw(ikon('x', 18))}</button>` : html`<span></span>`}</div>`;
  function render() {
    const b = d.berkas || [];
    m.body.innerHTML = String(html`${!d.boleh_isi && !d.boleh_verifikasi ? html`<div class="info-card emas" style="margin-bottom:16px">${raw(ikon('lock', 20, 'ik'))}<span><b>Mode lihat saja.</b> Bukti belanja dan BAST diunggah oleh <b>petugas Supermonev yang ditugaskan</b> atau Pokja Supermonev, lalu diverifikasi Kapokja Supermonev. Akun Anda hanya dapat memantau, sehingga kolom terkunci.</span></div>` : ''}${infoPm({ ...d, putaran: null })}
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:16px 0">${lencanaStatus(STATUS_BELANJA, d.status)}
        <small class="redup">${d.diisi_nama ? 'Diisi ' + d.diisi_nama : 'Belum diisi'}${d.diajukan_pada ? ' · diajukan ' + tanggalJam(d.diajukan_pada) : ''}${d.diverifikasi_nama && d.status === 'terverifikasi' ? ' · diverifikasi ' + d.diverifikasi_nama : ''}</small></div>
      ${d.catatan_verifikasi ? html`<div class="info-card ${d.status === 'perlu_perbaikan' ? 'emas' : ''}" style="margin-bottom:16px">${raw(ikon('msg', 18, 'ik'))}<span><b>Catatan Kapokja Supermonev:</b> ${d.catatan_verifikasi}</span></div>` : ''}
      <div class="langkah-belanja">
        <div class="lb-no">1</div><div>${daftarBerkas({ konteks: 'belanja', ref: bnba_id, jenis: 'bukti_belanja', judul: 'Bukti belanja (nota / kuitansi) *', ket: 'PDF atau foto. Foto otomatis dikecilkan ≤ 1 MB; dokumen maks 10 MB.', berkas: b, boleh: d.boleh_isi })}</div>
        <div class="lb-no">2</div><div>${daftarBerkas({ konteks: 'belanja', ref: bnba_id, jenis: 'bast', judul: 'Berita Acara Serah Terima (BAST) *', ket: 'Ditandatangani PM dan petugas/penyalur.', berkas: b, boleh: d.boleh_isi })}</div>
        <div class="lb-no">3</div><div>${daftarBerkas({ konteks: 'belanja', ref: bnba_id, jenis: 'inventaris', judul: 'Foto barang / daftar inventaris (opsional)', ket: 'Foto barang yang diterima PM.', berkas: b, boleh: d.boleh_isi })}</div>
        <div class="lb-no">4</div><div class="slot-berkas"><div class="slot-head"><span class="ubin emas">${raw(ikon('list-ordered', 20))}</span><div><b>Daftar inventaris barang *</b><small>Sesuai barang yang diserahkan kepada PM.</small></div></div>
          <div class="baris-inv kepala"><span>Nama barang</span><span>Jumlah</span><span>Satuan</span><span>Nilai</span><span></span></div>
          <div data-inv>${inv.map(barisInv)}</div>
          ${d.boleh_isi ? html`<button type="button" class="btn btn-ghost btn-sm" data-tambah-inv>${raw(ikon('plus', 16))} Tambah barang</button>` : ''}
          <p class="total-inv">Total nilai barang: <b data-total>${rupiah(total())}</b>${d.nilai_bantuan ? html` <small class="redup">dari nilai bantuan ${rupiah(d.nilai_bantuan)}</small>` : ''}</p>
          <div class="form-grid" style="margin-top:12px">
            <div class="field"><label class="label" for="bl-tgl">Tanggal belanja</label><input id="bl-tgl" type="date" class="input" data-bl="tgl_belanja" value="${d.tgl_belanja || ''}" ${d.boleh_isi ? '' : raw('disabled')}></div>
            <div class="field"><label class="label" for="bl-bast">Tanggal BAST</label><input id="bl-bast" type="date" class="input" data-bl="tgl_bast" value="${d.tgl_bast || ''}" ${d.boleh_isi ? '' : raw('disabled')}></div></div>
          <div class="field" style="margin-top:12px"><label class="label" for="bl-cat">Catatan</label><textarea id="bl-cat" class="textarea" rows="2" data-bl="catatan" ${d.boleh_isi ? '' : raw('disabled')}>${d.catatan || ''}</textarea></div></div>
      </div>
      ${d.boleh_verifikasi ? html`<section class="panel-verifikasi"><h3>${raw(ikon('shield', 20))} Verifikasi Kapokja Supermonev</h3>
        <p class="redup">Cocokkan nota/kuitansi dan BAST dengan daftar inventaris. Kembalikan dengan catatan bila ada yang kurang.</p>
        <div class="field" style="margin-top:12px"><label class="label" for="bv-cat">Catatan</label><textarea id="bv-cat" class="textarea" rows="2" placeholder="Wajib bila mengembalikan"></textarea></div></section>` : ''}
      <div class="galat" data-galat hidden style="margin-top:12px"></div>`);
    pasangRupiah(m.body);
    m.foot.innerHTML = String(html`<span class="spacer"></span><button type="button" class="btn btn-ghost" data-tutup-bl>Tutup</button>
      ${d.boleh_isi ? html`<button type="button" class="btn btn-secondary" data-simpan-bl>${raw(ikon('save', 18))} Simpan</button><button type="button" class="btn btn-primary btn-sinar" data-ajukan-bl>${raw(ikon('send', 18))} Ajukan Verifikasi</button>` : ''}
      ${d.boleh_verifikasi ? html`<button type="button" class="btn btn-secondary" data-kembali-bl>${raw(ikon('undo', 18))} Kembalikan</button><button type="button" class="btn btn-primary btn-sinar" data-setuju-bl>${raw(ikon('check', 18))} Verifikasi</button>` : ''}`);
  }
  const bacaInv = () => { m.body.querySelectorAll('.baris-inv[data-n]').forEach((r) => { const x = inv[Number(r.dataset.n)]; if (!x) return; r.querySelectorAll('[data-iv]').forEach((inp) => { x[inp.dataset.iv] = inp.dataset.iv === 'nilai' ? angkaDari(inp.value) : inp.value; }); }); };
  const nilaiBl = () => Object.fromEntries([...m.body.querySelectorAll('[data-bl]')].map((x) => [x.dataset.bl, x.value || null]));
  const galat = (p) => { const g = m.body.querySelector('[data-galat]'); g.hidden = !p; g.innerHTML = p ? String(html`${raw(ikon('alert', 20))}<span>${p}</span>`) : ''; if (p) g.scrollIntoView({ block: 'nearest' }); };
  const muatUlang = async () => { bacaInv(); const simpan = { inv, bl: nilaiBl() }; if (await muat()) { inv = simpan.inv; render(); Object.entries(simpan.bl).forEach(([k, val]) => { const x = m.body.querySelector(`[data-bl="${k}"]`); if (x && val) x.value = val; }); } };
  pasangUnggah(m.el, { muatUlang, judulJenis: { bukti_belanja: 'Bukti belanja', bast: 'BAST', inventaris: 'Foto barang' } });
  m.el.addEventListener('input', (e) => { if (e.target.dataset?.iv) { bacaInv(); m.body.querySelector('[data-total]').textContent = rupiah(total()); } });
  m.el.addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.matches('[data-tutup-bl]')) return m.tutup();
    if (t.matches('[data-tambah-inv]')) { bacaInv(); inv.push({ nama: '', jumlah: 1, satuan: 'unit', nilai: null }); m.body.querySelector('[data-inv]').innerHTML = String(html`${inv.map(barisInv)}`); pasangRupiah(m.body); m.body.querySelector('.baris-inv[data-n]:last-child input')?.focus(); return; }
    if (t.matches('[data-hapus-inv]')) { bacaInv(); inv.splice(Number(t.dataset.hapusInv), 1); if (!inv.length) inv.push({ nama: '', jumlah: 1, satuan: 'unit', nilai: null }); m.body.querySelector('[data-inv]').innerHTML = String(html`${inv.map(barisInv)}`); pasangRupiah(m.body); m.body.querySelector('[data-total]').textContent = rupiah(total()); return; }
    if (t.matches('[data-simpan-bl], [data-ajukan-bl]')) {
      bacaInv(); galat(null);
      const ajukan = t.matches('[data-ajukan-bl]'), pulih = tombolMuat(t, ajukan ? 'Mengajukan…' : 'Menyimpan…');
      try {
        d = { ...d, ...(await api.belanjaSimpan(bnba_id, { inventaris: inv, ...nilaiBl() }, ajukan)) };
        if (ajukan) { m.tutup(); toast('Bukti belanja diajukan ke Kapokja Supermonev.', 'sukses', 'Berhasil diajukan'); onSelesai?.(); return; }
        pulih(); toast('Data belanja tersimpan.'); onSelesai?.();
      } catch (err) { pulih(); galat(pesanGalat(err)); }
      return;
    }
    if (t.matches('[data-setuju-bl], [data-kembali-bl]')) {
      const setuju = t.matches('[data-setuju-bl]'), cat = m.body.querySelector('#bv-cat')?.value.trim() || null;
      const pulih = tombolMuat(t);
      try { await api.belanjaVerifikasi(bnba_id, setuju, cat); m.tutup(); toast(setuju ? 'Belanja, BAST, dan inventaris terverifikasi.' : 'Dikembalikan ke petugas dengan catatan.', setuju ? 'sukses' : 'info'); onSelesai?.(); }
      catch (err) { pulih(); galat(pesanGalat(err)); }
    }
  });
  render();
}

export const catatanPratinjau = () => (modePratinjau ? html`<div class="info-card biru" style="margin-bottom:16px">${raw(ikon('info', 20, 'ik'))}<span>Mode pratinjau: data Supermonev di halaman ini adalah contoh fiktif.</span></div>` : '');
