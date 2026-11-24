# Panduan Upgrade SITASI TSKPO ke versi 2.3.0 (Tahap 3 & 4)

Versi ini menambah **Dashboard Realisasi Bantuan** (peta 38 provinsi 3D), **Data LKS, Data Aster, Kepegawaian & OJT, Jadwal Pegawai, Rencana Kerja**, serta **Dokumen Pokja, Dokumen Bersama, Produk Hukum & SOP, Tugas, dan Pesan & Komunikasi**. Setiap modul punya tombol unggah langsung dari web.

Hanya ada **2 langkah wajib**: jalankan SQL baru, lalu perbarui file di GitHub. **Edge Function `berkas` dan Secrets tidak perlu diubah.**

---

## Langkah 1 — Supabase: jalankan SQL baru

1. Buka supabase.com, masuk ke proyek SITASI.
2. Menu kiri: **SQL Editor** → tombol **New query** (kanan atas daftar query).
3. Buka file `SETUP_SUPABASE.sql` dari paket ini (pakai TextEdit atau VS Code), tekan **Cmd + A** lalu **Cmd + C**.
4. Kembali ke SQL Editor, klik area kosong, tekan **Cmd + V**.
5. Klik tombol hijau **Run** (kanan bawah editor). Tunggu sampai selesai (bisa 10–30 detik).
6. Di bagian **Results** harus tampil tulisan berisi **"SETUP SITASI TSKPO SELESAI"** dan versi **2.3.0**.

Catatan:
- Aman dijalankan ulang. Data usulan, BNBA, dan pengguna yang sudah ada **tidak terhapus**.
- Bila muncul jendela peringatan "This query has destructive operations", klik **Run this query** (isinya hanya mengganti fungsi lama dengan versi baru).
- Bila muncul galat, salin pesan merahnya dan kirimkan ke saya.

## Langkah 2 — GitHub: perbarui file web

Lakukan di Mac Anda, di **folder proyek lama yang sama** seperti saat upgrade 2.2.0 (folder yang berisi `index.html`, folder `css`, dan folder `js`, dan pernah Anda `git push`).

1. Ekstrak `sitasi-tskpo.zip` (klik dua kali). Akan muncul folder `sitasi-tskpo`.
2. Buka folder `sitasi-tskpo` itu, pilih **semua isinya** (Cmd + A), salin (Cmd + C).
3. Buka folder proyek lama Anda, tempel (Cmd + V). Bila Mac bertanya, pilih **Replace / Ganti** untuk semua.
   - File `js/config.js` milik Anda **tidak ikut tertimpa** karena paket ini tidak memuatnya. Paket hanya memuat `js/config.contoh.js` (contoh, tidak dipakai aplikasi).
   - Pastikan di dalam `js/config.js` Anda tetap ada baris `LOGO: 'assets/logo-sitasi.png',`.
4. Buka **Terminal**, masuk ke folder proyek lama (ganti jalurnya sesuai folder Anda):
   ```
   cd ~/Documents/sitasitskpo
   ```
5. Jalankan tiga perintah ini satu per satu:
   ```
   git add .
   git commit -m "Upgrade 2.3.0: Tahap 3 dan 4"
   git push
   ```
6. Tunggu 1–2 menit. Vercel dan GitHub Pages memperbarui situs otomatis.
7. Buka situs, tekan **Cmd + Shift + R** (muat ulang penuh) agar tampilan baru terbaca.

## Langkah 3 — Uji cepat (±10 menit)

Masuk dengan akun Anda lalu cek:

| No | Yang dicek | Hasil yang benar |
|---|---|---|
| 1 | **Beranda / Dashboard** | KPI, peta Indonesia hijau gelap yang miring, grafik kolom 3D, Progres Pokja |
| 2 | **Input LKS → Tambah LKS** → simpan | Jendela detail terbuka; bagian **Foto LKS** punya kotak **Tambah foto** |
| 3 | Unggah 1 foto dari ponsel/laptop | Foto tampil; di Google Drive Super Admin muncul folder `SITASI TSKPO/Data LKS/...` |
| 4 | **Dokumen Pokja** → seret 1 PDF ke kotak unggah | Kartu dokumen muncul berstatus **Privat Pokja**; tombol **Ajukan** tersedia |
| 5 | **Jadwal Pegawai** | Kisi bulan berjalan. Bila kosong: Pokja Kepegawaian buka **Kepegawaian & OJT → Sinkron dari akun** |
| 6 | **Pesan & Komunikasi** | Ada kanal **Koordinasi Lintas-Pokja** dan **Chat Pokja**; pesan terkirim dengan Enter |
| 7 | **Master BNBA → klik PM → tab Dokumentasi** | Tiga kategori foto: Sebelum Usaha, Saat Penyaluran, Supermonev |

Pertama kali, data LKS/Aster/Jadwal masih kosong (bukan galat). Isi lewat formulir atau tombol **Impor Excel** (FORMAT LKS.xlsx / FORMAT ASTER.xlsx bisa langsung dipakai).

## Siapa mengisi apa (ringkas)

- **Semua Pokja**: Input LKS, Dokumen Pokja, Rencana Kerja (Kapokja yang mengajukan), Tugas, Pesan.
- **Kapokja Data / Kapokja TU**: verifikasi LKS. **Kapokja Data**: verifikasi Aster.
- **Pokja Data**: Input Aster. **Pokja Kepegawaian**: data pegawai & SDM pendamping. **Pokja TU**: OJT, jadwal semua pegawai, hari libur, verifikasi Dokumen Bersama.
- **Pokja Perencanaan**: verifikasi rencana kerja. **Pokja Hukum**: Produk Hukum & SOP.
- Setiap pegawai yang akunnya tertaut di data kepegawaian dapat mengisi **jadwalnya sendiri**.

## Catatan

- Peta memakai berkas `assets/peta/indonesia-38.geojson` (Indonesia GeoJSON & TopoJSON Maps, 38 provinsi, lisensi CC BY 4.0; sumber dicantumkan di bawah peta). Koordinatnya dibulatkan agar ringan (50 KB).
- Foto dikecilkan otomatis di browser menjadi ≤ 500 KB sebelum dikirim. Dokumen maks 10 MB.
- Pesan menolak NIK / No. KK (16 digit angka) demi perlindungan data.
- Efek 3D dan animasi mati otomatis bila perangkat memakai pengaturan "kurangi gerakan".
