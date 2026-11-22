// Pengaturan > Penyimpanan Berkas (Super Admin): tujuan penyimpanan aktif, dan tombol "Hubungkan Drive Saya"
// untuk Super Admin 1 dan 2. Berkas disimpan di Google Drive Super Admin lewat Edge Function "berkas".
import { html, raw, angka, tanggalJam } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api, modePratinjau } from '../core/api.js';
import { judulHalaman, kotakGalat, toast, pesanGalat, tombolMuat, konfirmasi } from '../core/ui.js';
import { ukuranTeks } from '../core/komp.js';
import { mulaiHubungDrive, putuskanDrive } from '../core/berkas.js';

const STATUS = { tersambung: ['b-ok', 'check-circle', 'Tersambung'], putus: ['b-no', 'circle-x', 'Terputus'], belum: ['b-wait', 'clock', 'Belum dihubungkan'] };
const TUJUAN = [['drive_sa1', 'Google Drive Super Admin 1'], ['drive_sa2', 'Google Drive Super Admin 2'], ['tunda', 'Tunda unggahan berkas']];

export async function render(el, { sesi }) {
  const slotSaya = sesi?.pengguna?.super_admin_slot || null;
  let st = null, pilih = '';

  el.innerHTML = String(html`${judulHalaman({ pill: 'Pengaturan Super Admin · Penyimpanan', sorot: 'Penyimpanan Berkas', sisa: '(Google Drive)',
    sub: 'KTP, bukti, surat, dan foto disimpan di Google Drive Super Admin, bukan di basis data. Tiap Super Admin menghubungkan Drive-nya sendiri dengan satu tombol; pengalihan tujuan simpan dilakukan di sini tanpa mengubah kode.' })}
    <div data-isi><div class="skel" style="height:320px;border-radius:20px"></div></div>`);
  const $ = (q) => el.querySelector(q);

  // Hasil kembali dari Google: ?hubung=ok|gagal&pesan=…  (dibersihkan agar tidak muncul lagi saat halaman dimuat ulang)
  const q = new URLSearchParams(location.search);
  if (q.has('hubung')) {
    const ok = q.get('hubung') === 'ok', pesan = q.get('pesan') || '';
    history.replaceState(null, '', location.pathname + location.hash);
    if (ok) toast('Google Drive Anda berhasil dihubungkan.', 'sukses', 'Tersambung');
    else toast(pesan || 'Drive gagal dihubungkan.', 'galat', 'Gagal menghubungkan Drive');
  }

  async function muat() {
    try { st = await api.statusPenyimpanan(); pilih = st.aktif; gambar(); }
    catch (e) { $('[data-isi]').innerHTML = String(kotakGalat(pesanGalat(e))); }
  }

  function kartuSlot(s) {
    const [kls, ik, lbl] = STATUS[s.status] || STATUS.belum;
    const milikSaya = slotSaya === s.slot;
    return html`<section class="card" data-slot="${s.slot}"><div class="card-head"><span class="ubin ${s.slot === 1 ? 'biru' : 'emas'}">${raw(ikon('hard-drive', 20))}</span>
        <div><h2 class="card-title">Google Drive Super Admin ${s.slot}</h2><p class="card-sub">${s.ada_akun ? html`${s.nama} · ${s.email}` : 'Belum ada akun Super Admin di slot ini'}</p></div>
        <span class="spacer"></span><span class="badge ${kls}">${raw(ikon(ik, 15))} ${lbl}</span></div>
      <dl class="kv"><div><dt>Akun Drive</dt><dd>${s.email_drive || '—'}</dd></div><div><dt>Terhubung sejak</dt><dd>${s.terhubung_pada ? tanggalJam(s.terhubung_pada) : '—'}</dd></div>
        <div><dt>Berkas tersimpan</dt><dd>${st.berkas?.['drive_sa' + s.slot] ? `${angka(st.berkas['drive_sa' + s.slot].jumlah)} berkas · ${ukuranTeks(st.berkas['drive_sa' + s.slot].ukuran)}` : 'Belum ada'}</dd></div></dl>
      ${s.status === 'putus' ? html`<div class="galat" style="margin-top:12px">${raw(ikon('alert', 20))}<span>Izin Google sudah dicabut atau kedaluwarsa. Pemilik akun perlu menekan <b>Hubungkan ulang</b>.</span></div>` : ''}
      <div class="slot-aksi" style="margin-top:16px">
        ${milikSaya ? html`<button type="button" class="btn btn-primary" data-hubung="${s.slot}">${raw(ikon('link', 16))} ${s.status === 'tersambung' ? 'Hubungkan ulang' : s.status === 'putus' ? 'Hubungkan ulang' : 'Hubungkan Drive Saya'}</button>
          ${s.status !== 'belum' ? html`<button type="button" class="btn btn-ghost" data-putus="${s.slot}">Putuskan</button>` : ''}`
        : html`<small class="redup">${s.ada_akun ? `Hanya ${s.nama} yang dapat menghubungkan atau memutus Drive ini, dari akunnya sendiri.` : 'Tambahkan Super Admin kedua di Pengguna & Hak Akses.'}</small>`}
      </div></section>`;
  }

  function gambar() {
    const sama = pilih === st.aktif;
    $('[data-isi]').innerHTML = String(html`
      ${modePratinjau ? html`<div class="info-card biru" style="margin-bottom:16px">${raw(ikon('info', 20))}<span><b>Mode Pratinjau.</b> Penghubungan Drive hanya simulasi. Di versi terpasang, tombol membuka login Google untuk memberi izin.</span></div>` : ''}
      <section class="card"><div class="card-head"><span class="ubin">${raw(ikon('hard-drive', 20))}</span><div><h2 class="card-title">Tujuan Penyimpanan Aktif</h2>
          <p class="card-sub">Berkas baru disimpan ke tujuan ini. Berkas lama tetap di Drive tempat asalnya dan tetap dapat diunduh.</p></div></div>
        <div class="pilihan-tujuan" style="display:grid;gap:10px;margin-top:8px">
          ${TUJUAN.map(([k, l]) => {
            const slot = k === 'tunda' ? null : st.slot.find((x) => 'drive_sa' + x.slot === k);
            const bisa = k === 'tunda' || slot?.status === 'tersambung';
            return html`<label class="saklar-baris" style="${bisa ? '' : 'opacity:.6'}"><span><b>${l}</b><small>${k === 'tunda' ? 'Pegawai tidak dapat mengunggah berkas baru sampai tujuan dipilih lagi. Tautan Drive tetap dapat ditempel.' : bisa ? slot.email_drive : 'Belum tersambung. Pemiliknya perlu menekan "Hubungkan Drive Saya".'}</small></span>
              <input type="radio" name="tujuan" value="${k}" ${pilih === k ? raw('checked') : ''} ${bisa ? '' : raw('disabled')}></label>`;
          })}
        </div>
        <div class="slot-aksi" style="margin-top:16px"><button type="button" class="btn btn-primary" data-terapkan ${sama ? raw('disabled') : ''}>${raw(ikon('check-circle', 16))} Terapkan Pengalihan</button>
          <small class="redup">Saat ini: <b>${(TUJUAN.find(([k]) => k === st.aktif) || [, st.aktif])[1]}</b></small></div>
      </section>
      <div class="grid grid-2" style="margin-top:24px">${st.slot.map(kartuSlot)}</div>
      <div class="info-card biru" style="margin-top:24px">${raw(ikon('info', 20))}<span>SITASI hanya meminta izin <b>"drive.file"</b>: aplikasi hanya dapat membuka berkas yang dibuatnya sendiri di folder <b>SITASI TSKPO</b>, tidak dapat melihat isi Drive lainnya.
        Izin dapat dicabut kapan saja di <b>myaccount.google.com → Keamanan → Akses pihak ketiga</b>. Berkas yang dibuat sebelumnya lewat Apps Script versi 2.1.0 tidak ikut terbaca dan perlu diunggah ulang bila dibutuhkan.</span></div>`);
  }

  el.addEventListener('change', (e) => {
    const r = e.target.closest('input[name="tujuan"]'); if (!r) return;
    pilih = r.value; $('[data-terapkan]').disabled = pilih === st.aktif;
  });
  el.addEventListener('click', async (e) => {
    const h = e.target.closest('[data-hubung]');
    if (h) {
      const pulih = tombolMuat(h, 'Membuka Google…');
      try { const r = await mulaiHubungDrive(Number(h.dataset.hubung)); if (r.selesai) { toast('Google Drive (simulasi) berhasil dihubungkan.', 'sukses'); await muat(); } }
      catch (err) { pulih(); toast(pesanGalat(err), 'galat', 'Tidak dapat memulai'); }
      return;
    }
    const p = e.target.closest('[data-putus]');
    if (p) {
      const slot = Number(p.dataset.putus);
      const k = await konfirmasi({ judul: `Putuskan Drive Super Admin ${slot}?`, label: 'Putuskan', bahaya: true,
        pesan: `Izin Google dicabut. Bila Drive ini sedang aktif, unggahan berkas baru otomatis ditunda sampai Anda memilih tujuan lain. Berkas yang sudah ada tetap di Drive Anda, tetapi tidak dapat diunduh lewat SITASI sampai Drive dihubungkan lagi.` });
      if (!k.ok) return;
      const pulih = tombolMuat(p, 'Memutus…');
      try { await putuskanDrive(slot); toast('Drive diputus.'); await muat(); } catch (err) { pulih(); toast(pesanGalat(err), 'galat'); }
      return;
    }
    const t = e.target.closest('[data-terapkan]');
    if (t) {
      const pulih = tombolMuat(t, 'Menerapkan…');
      try { st = await api.aturPenyimpanan(pilih); pilih = st.aktif; toast('Tujuan penyimpanan berhasil dialihkan.'); gambar(); }
      catch (err) { pulih(); toast(pesanGalat(err), 'galat', 'Pengalihan gagal'); }
    }
  });
  await muat();
}
