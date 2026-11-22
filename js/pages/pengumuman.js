// Pengaturan > Kelola Pengumuman (Super Admin dan Pokja TU)
import { html, raw, tanggal, relatif } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { bus, hapusCache } from '../core/store.js';
import { judulHalaman, skelTabel, kosong, kotakGalat, bukaModal, konfirmasi, toast, pesanGalat, tombolMuat } from '../core/ui.js';

const SASARAN = { semua: 'Semua pengguna', pegawai: 'Pegawai Direktorat', petugas_supermonev: 'Petugas Supermonev' };

export async function render(el) {
  el.innerHTML = String(html`
    ${judulHalaman({ pill: 'Informasi Direktorat', sorot: 'Kelola Pengumuman', sisa: 'Direktorat',
      sub: 'Pengumuman tampil di bagian atas setiap halaman dan dapat dilipat. Pengumuman bertanda "Penting" juga dikirim sebagai notifikasi in-app.',
      aksi: String(html`<button type="button" class="btn btn-primary" data-buat>${raw(ikon('plus', 20))} Buat Pengumuman</button>`) })}
    <section class="card table-card"><div class="card-head"><div><h2 class="card-title">Daftar Pengumuman</h2><p class="card-sub" data-jml>Memuat…</p></div></div>
      <div data-isi>${skelTabel(4, 5)}</div></section>`);
  const isi = el.querySelector('[data-isi]');
  let daftar = [];

  async function muat() {
    try {
      daftar = await api.daftarPengumuman();
      el.querySelector('[data-jml]').textContent = `${daftar.length} pengumuman · ${daftar.filter((x) => x.aktif).length} aktif`;
      isi.innerHTML = String(daftar.length ? html`<div class="table-wrap"><table class="tbl">
        <thead><tr><th>Pengumuman</th><th>Tingkat</th><th>Sasaran</th><th>Periode Tampil</th><th>Status</th><th class="aksi">Aksi</th></tr></thead>
        <tbody>${daftar.map((x) => html`<tr>
          <td style="min-width:320px"><b style="color:var(--judul);display:block">${x.judul}</b><span>${x.isi}</span><small class="redup" style="display:block;margin-top:4px">Diperbarui ${relatif(x.diubah_pada)}</small></td>
          <td>${x.tingkat === 'penting' ? html`<span class="badge b-wait">${raw(ikon('alert', 15))} Penting</span>` : html`<span class="badge b-proc">${raw(ikon('info', 15))} Info</span>`}</td>
          <td>${SASARAN[x.sasaran] || x.sasaran}</td>
          <td style="white-space:nowrap">${x.mulai || x.selesai ? `${x.mulai ? tanggal(x.mulai) : '…'} – ${x.selesai ? tanggal(x.selesai) : '…'}` : 'Tanpa batas'}</td>
          <td>${x.aktif ? html`<span class="badge b-ok">${raw(ikon('check-circle', 15))} Tampil</span>` : html`<span class="badge b-lock">${raw(ikon('eye-off', 15))} Disembunyikan</span>`}</td>
          <td class="aksi"><div style="display:flex;gap:6px"><button type="button" class="btn btn-sm btn-secondary" data-ubah="${x.id}">${raw(ikon('pencil', 16))} Ubah</button>
            <button type="button" class="btn btn-sm btn-ghost" data-hapus="${x.id}" style="color:var(--merah)">${raw(ikon('trash', 16))} Hapus</button></div></td></tr>`)}</tbody></table></div>`
        : kosong({ ikonNama: 'megaphone', judul: 'Belum ada pengumuman', teks: 'Buat pengumuman untuk menyampaikan batas waktu atau informasi penting kepada seluruh pegawai.',
            aksi: String(html`<button type="button" class="btn btn-primary" data-buat>${raw(ikon('plus', 18))} Buat Pengumuman</button>`) }));
    } catch (e) { isi.innerHTML = String(kotakGalat(pesanGalat(e))); }
  }

  function form(x = null) {
    const m = bukaModal({
      judul: x ? 'Ubah Pengumuman' : 'Buat Pengumuman', ukuran: 'besar',
      isi: String(html`<form data-form novalidate><div data-galat></div><div class="form-grid">
        <div class="field penuh"><label class="label" for="p-judul">Label pengumuman</label><input id="p-judul" name="judul" class="input" value="${x?.judul || 'Pengumuman Dit. RSTSKPO'}" maxlength="60"></div>
        <div class="field penuh"><label class="label" for="p-isi">Isi pengumuman<span class="wajib">*</span></label>
          <textarea id="p-isi" name="isi" class="textarea" rows="3" maxlength="400" placeholder="Contoh: Batas akhir verifikasi usulan SK Pencairan Tahap II TA 2026 adalah 30 November 2026." autofocus>${x?.isi || ''}</textarea>
          <span class="help" data-hitung-isi>0 / 400 karakter</span><div class="err" hidden></div></div>
        <div class="field penuh"><span class="label">Tingkat</span><div class="pilihan">
          <label><input type="radio" name="tingkat" value="info" ${x?.tingkat !== 'penting' ? raw('checked') : ''}><span><b>Info</b><small>Tampil di bagian atas halaman</small></span></label>
          <label><input type="radio" name="tingkat" value="penting" ${x?.tingkat === 'penting' ? raw('checked') : ''}><span><b>Penting</b><small>${x ? 'Ditonjolkan di bagian atas halaman' : 'Ditonjolkan dan dikirim sebagai notifikasi in-app'}</small></span></label></div></div>
        <div class="field"><label class="label" for="p-sasaran">Sasaran</label><select id="p-sasaran" name="sasaran" class="select">
          ${Object.entries(SASARAN).map(([k, v]) => html`<option value="${k}" ${x?.sasaran === k ? raw('selected') : ''}>${v}</option>`)}</select></div>
        <label class="saklar" style="align-self:end"><input type="checkbox" name="aktif" ${x?.aktif === false ? '' : raw('checked')}><span>Tampilkan pengumuman</span></label>
        <div class="field"><label class="label" for="p-mulai">Mulai tampil <span class="redup" style="font-weight:500">(opsional)</span></label><input id="p-mulai" name="mulai" type="date" class="input" value="${x?.mulai || ''}"></div>
        <div class="field"><label class="label" for="p-selesai">Selesai tampil <span class="redup" style="font-weight:500">(opsional)</span></label><input id="p-selesai" name="selesai" type="date" class="input" value="${x?.selesai || ''}"></div>
        <div class="penuh"><span class="label" style="display:block;margin-bottom:8px">Pratinjau</span><div data-pratinjau></div></div>
      </div></form>`),
      kaki: String(html`<button type="button" class="btn btn-ghost" data-batal>Batal</button><button type="button" class="btn btn-primary" data-simpan>${raw(ikon('check', 18))} Simpan Pengumuman</button>`),
    });
    const f = m.el.querySelector('[data-form]');
    const segar = () => {
      m.el.querySelector('[data-hitung-isi]').textContent = `${f.isi.value.length} / 400 karakter`;
      m.el.querySelector('[data-pratinjau]').innerHTML = String(html`<div class="pengumuman ${f.tingkat.value === 'penting' ? 'penting' : ''}" style="margin:0">${raw(ikon('megaphone', 20))}
        <div class="isi"><b>${f.judul.value.trim() || 'Pengumuman Dit. RSTSKPO'}:</b> ${f.isi.value.trim() || 'Isi pengumuman akan tampil di sini.'}</div></div>`);
    };
    f.addEventListener('input', segar); f.addEventListener('change', segar); segar();
    m.foot.querySelector('[data-simpan]').addEventListener('click', async (e) => {
      const fld = f.isi.closest('.field');
      if (!f.isi.value.trim()) { fld.classList.add('salah'); const er = fld.querySelector('.err'); er.hidden = false; er.innerHTML = String(html`${raw(ikon('alert', 14))} Isi pengumuman wajib diisi.`); return f.isi.focus(); }
      const pulih = tombolMuat(e.currentTarget);
      try {
        await api.simpanPengumuman({ id: x?.id || null, judul: f.judul.value, isi: f.isi.value, tingkat: f.tingkat.value, sasaran: f.sasaran.value, aktif: f.aktif.checked, mulai: f.mulai.value, selesai: f.selesai.value });
        hapusCache('pengumuman'); bus.emit('pengumuman');
        toast(x ? 'Pengumuman diperbarui.' : (f.tingkat.value === 'penting' && f.aktif.checked ? 'Pengumuman diterbitkan dan notifikasi dikirim.' : 'Pengumuman diterbitkan.'), 'sukses');
        m.tutup(); muat();
      } catch (err) {
        pulih();
        m.el.querySelector('[data-galat]').innerHTML = String(html`<div class="galat" style="margin-bottom:16px">${raw(ikon('alert', 20))}<span>${pesanGalat(err)}</span></div>`);
      }
    });
  }

  el.addEventListener('click', async (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.matches('[data-buat]')) return form();
    if (t.matches('[data-ulang]')) return muat();
    if (t.matches('[data-ubah]')) return form(daftar.find((x) => x.id === t.dataset.ubah));
    if (t.matches('[data-hapus]')) {
      const x = daftar.find((v) => v.id === t.dataset.hapus);
      const j = await konfirmasi({ judul: 'Hapus pengumuman?', pesan: `"${x?.isi?.slice(0, 120) || ''}" akan dihapus. Tindakan ini tercatat di log aktivitas.`, label: 'Hapus', bahaya: true, ikonNama: 'trash' });
      if (!j.ok) return;
      try { await api.hapusPengumuman(x.id); hapusCache('pengumuman'); bus.emit('pengumuman'); toast('Pengumuman dihapus.', 'sukses'); muat(); }
      catch (err) { toast(pesanGalat(err), 'galat'); }
    }
  });
  await muat();
}
