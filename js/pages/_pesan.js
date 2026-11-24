// Utas percakapan yang dapat dipakai ulang: halaman Pesan & Komunikasi dan tab "Diskusi" pada detail usulan / PM.
import { html, raw, jam, tanggal, esc } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { bus } from '../core/store.js';
import { toast, pesanGalat, konfirmasi, kotakGalat } from '../core/ui.js';

const NIK16 = /(^|\D)\d{16}(\D|$)/;
const hariKey = (v) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(v));
const autolink = (t) => esc(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/(#\/[a-z0-9\-/]+)/gi, '<a href="$1">$1</a>');

/**
 * Pasang utas pada wadah. Mengembalikan { muat, tambah(pesan), lepas }.
 * opsi: { id, kepala: html tambahan di kepala, onBaca, kembali (fungsi untuk tombol kembali ponsel) }
 */
export function pasangUtas(wadah, { id, judul = '', sub = '', kembali = null, onBaca, tinggi = null }) {
  let pesan = [], adaLagi = false, sedang = false;
  wadah.classList.add('utas');
  if (tinggi) wadah.style.height = tinggi;
  wadah.innerHTML = String(html`<div class="utas-kepala">${kembali ? html`<button class="btn btn-icon" data-kembali aria-label="Kembali ke daftar">${raw(ikon('arrow-left', 20))}</button>` : ''}
      <div style="min-width:0;flex:1"><b data-ut-judul>${judul}</b><small data-ut-sub>${sub}</small></div>
      <button class="btn btn-icon" data-ut-segar title="Muat ulang" aria-label="Muat ulang pesan">${raw(ikon('refresh', 18))}</button></div>
    <div class="utas-isi" data-ut-isi aria-live="polite"><div class="skel skel-baris"></div><div class="skel skel-baris" style="width:60%"></div></div>
    <form class="komposer" data-ut-form><div style="flex:1;display:grid;gap:4px"><label class="sr-only" for="ut-${id}">Tulis pesan</label>
      <textarea id="ut-${id}" class="textarea" rows="1" maxlength="2000" placeholder="Tulis pesan… (Enter kirim, Shift+Enter baris baru)" data-ut-teks></textarea>
      <span class="peringatan" data-ut-warn hidden>${raw(ikon('shield-alert', 14))} Jangan kirim NIK/No. KK lewat pesan. Sebutkan nama PM atau tautan Detail PM.</span></div>
      <button class="btn btn-primary" type="submit" data-ut-kirim aria-label="Kirim">${raw(ikon('send', 18))}</button></form>`);
  const isi = wadah.querySelector('[data-ut-isi]'), ta = wadah.querySelector('[data-ut-teks]');

  const gambar = (gulirBawah = true) => {
    if (!pesan.length) { isi.innerHTML = String(html`<div class="utas-kosong"><div style="text-align:center;color:var(--redup)">${raw(ikon('msg', 32))}<p style="margin-top:8px">Belum ada pesan. Mulai percakapan.</p></div></div>`); return; }
    let hari = '';
    const potong = [];
    if (adaLagi) potong.push(html`<button type="button" class="btn btn-ghost btn-sm" data-ut-lagi style="align-self:center">${raw(ikon('chevron-up', 16))} Muat pesan sebelumnya</button>`);
    pesan.forEach((p) => {
      const h = hariKey(p.dibuat_pada);
      if (h !== hari) { hari = h; potong.push(html`<span class="pemisah-hari">${tanggal(p.dibuat_pada)}</span>`); }
      potong.push(html`<div class="gelembung ${p.milik_saya ? 'milik' : ''} ${p.dihapus ? 'dihapus' : ''}" data-psn="${p.id}">
        ${p.milik_saya ? '' : html`<span class="siapa">${p.pengirim_nama}</span>`}
        <div class="isi">${p.dihapus ? 'Pesan dihapus' : raw(autolink(p.isi))}</div>
        <span class="wkt">${jam(p.dibuat_pada)}${p.milik_saya && !p.dihapus ? html` · <button type="button" class="hapus" data-ut-hapus="${p.id}">hapus</button>` : ''}</span></div>`);
    });
    const tinggiLama = isi.scrollHeight, atas = isi.scrollTop;
    isi.innerHTML = String(html`${potong}`);
    if (gulirBawah) isi.scrollTop = isi.scrollHeight; else isi.scrollTop = isi.scrollHeight - tinggiLama + atas;
  };
  async function muat() {
    try {
      const r = await api.pesanPercakapan(id);
      pesan = r.pesan; adaLagi = r.ada_lagi;
      if (r.percakapan) { wadah.querySelector('[data-ut-judul]').textContent = r.percakapan.judul || judul; }
      gambar(true);
      if (pesan.length) api.tandaiBacaPercakapan(id).then(() => { onBaca?.(id); bus.emit('pesan-berubah'); }).catch(() => {});
    } catch (e) { isi.innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  const kirim = async () => {
    const v = ta.value.trim();
    if (!v || sedang) return;
    if (NIK16.test(v)) { wadah.querySelector('[data-ut-warn]').hidden = false; toast('Pesan berisi 16 digit angka (NIK/No. KK). Hapus angka tersebut sebelum mengirim.', 'peringatan'); return; }
    sedang = true;
    const sementara = { id: 'tmp-' + Date.now(), isi: v, milik_saya: true, pengirim_nama: 'Anda', dibuat_pada: new Date().toISOString() };
    pesan.push(sementara); gambar(true); ta.value = ''; ta.style.height = '';
    try {
      const p = await api.kirimPesan(id, v);
      pesan = pesan.filter((x) => x.id !== sementara.id && x.id !== p.id); pesan.push(p); gambar(true);
      bus.emit('pesan-berubah');
    } catch (e) { pesan = pesan.filter((x) => x.id !== sementara.id); gambar(true); ta.value = v; toast(pesanGalat(e), 'galat', 'Pesan belum terkirim'); }
    sedang = false; ta.focus();
  };
  wadah.querySelector('[data-ut-form]').addEventListener('submit', (e) => { e.preventDefault(); kirim(); });
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); kirim(); } });
  ta.addEventListener('input', () => {
    wadah.querySelector('[data-ut-warn]').hidden = !NIK16.test(ta.value);
    ta.style.height = 'auto'; ta.style.height = Math.min(160, ta.scrollHeight) + 'px';
  });
  wadah.addEventListener('click', async (e) => {
    if (e.target.closest('[data-kembali]')) return kembali?.();
    if (e.target.closest('[data-ut-segar]')) return muat();
    if (e.target.closest('[data-ut-lagi]')) {
      try { const r = await api.pesanPercakapan(id, pesan[0]?.id); pesan = [...r.pesan, ...pesan]; adaLagi = r.ada_lagi; gambar(false); } catch (err) { toast(pesanGalat(err), 'galat'); }
      return;
    }
    const h = e.target.closest('[data-ut-hapus]');
    if (h) {
      const k = await konfirmasi({ judul: 'Hapus pesan?', pesan: 'Pesan akan tampil sebagai "Pesan dihapus" untuk semua peserta.', label: 'Hapus', bahaya: true });
      if (!k.ok) return;
      try { await api.hapusPesan(Number(h.dataset.utHapus) || h.dataset.utHapus); const p = pesan.find((x) => String(x.id) === h.dataset.utHapus); if (p) p.dihapus = true; gambar(false); } catch (err) { toast(pesanGalat(err), 'galat'); }
    }
  });
  /** Pesan baru dari realtime. */
  const tambah = (p) => {
    if (!p || String(p.percakapan_id) !== String(id)) return;
    if (pesan.some((x) => String(x.id) === String(p.id))) return;
    muat();
  };
  muat();
  return { muat, tambah, fokus: () => ta.focus() };
}

/** Panel diskusi untuk usulan / PM (dipasang di tab detail). */
export async function panelDiskusi(wadah, { tabel, ref }) {
  wadah.innerHTML = '<div class="skel" style="height:320px;border-radius:18px"></div>';
  try {
    const c = await api.bukaDiskusi(tabel, ref);
    wadah.innerHTML = String(html`<div class="info-card biru" style="margin-bottom:12px">${raw(ikon('info', 20, 'ik'))}<span>Diskusi ini terlihat oleh semua pegawai yang boleh melihat ${tabel === 'usulan' ? 'usulan' : 'data PM'} ini.
      Bukan pengganti pencatatan resmi: keputusan tetap dicatat pada tahap/verifikasi.</span></div><div class="card" style="padding:0;overflow:hidden;display:flex;flex-direction:column" data-panel-utas></div>`);
    const u = pasangUtas(wadah.querySelector('[data-panel-utas]'), { id: c.id, judul: c.judul, sub: 'Diskusi data', tinggi: '460px' });
    let lepas = () => {};
    try { lepas = await api.langgananTabel('pesan', (p) => u.tambah(p)); } catch {}
    return () => { try { lepas(); } catch {} };
  } catch (e) { wadah.innerHTML = String(kotakGalat(pesanGalat(e))); return () => {}; }
}
