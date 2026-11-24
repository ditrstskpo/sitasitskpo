# Panduan Upgrade SITASI TSKPO ke versi 2.8.0

Versi ini menyelesaikan 6 poin "Perbaikan ke-2" (24 November 2026): kategori dokumen Hukum, login email Kemensos, tampilan subtotal, edit BNBA lengkap, geser tabel dari atas, dan perapian tampilan yang keluar kotak.

> Paket ini sudah mencakup versi sebelumnya (sampai 2.7.0). Cukup ikuti panduan ini.

Ada **3 langkah**: SQL, GitHub, dan (hanya bila ingin login email) pengaturan email di Supabase. Edge Function `berkas` dan Apps Script **tidak perlu diubah**.

---

## Langkah 1 — Supabase: jalankan SQL baru

1. Buka supabase.com, masuk ke proyek SITASI.
2. Menu kiri: **SQL Editor** → **New query**.
3. Buka `SETUP_SUPABASE.sql` dari paket ini, **Cmd + A**, **Cmd + C**.
4. Kembali ke SQL Editor, klik area kosong, **Cmd + V**.
5. Klik **Run**. Tunggu 20–60 detik. Bila muncul peringatan "destructive operations", klik **Run this query**.
6. Hasil harus memuat **"SETUP SITASI TSKPO SELESAI"** dan versi **2.8.0**.

Aman dijalankan ulang; data tidak terhapus. Dokumen lama berkategori **SK** atau **Perpres** otomatis berubah menjadi **Produk Hukum**.

## Langkah 2 — GitHub: perbarui file web

1. Ekstrak `sitasi-tskpo.zip`. Buka folder `sitasi-tskpo`, **Cmd + A**, **Cmd + C**.
2. Buka folder proyek lama (berisi `index.html`, `css`, `js`), tempel (**Cmd + V**), pilih **Replace / Ganti**. `js/config.js` Anda tidak tertimpa.
3. Di Terminal, masuk ke folder proyek lama, jalankan satu per satu:
   ```
   git add .
   git commit -m "Upgrade 2.8.0"
   git push
   ```
4. Tunggu 1–2 menit, buka situs, tekan **Cmd + Shift + R**.

## Langkah 3 — Supabase: aktifkan login kode lewat email (opsional)

Tanpa langkah ini, tombol Google tetap berfungsi; hanya login email yang belum bisa.

1. Supabase → **Authentication** → **Sign In / Providers** → pastikan **Email** menyala.
2. Supabase → **Authentication** → **Email Templates** → buka **Magic Link**. Pada isi email, tambahkan baris: `Kode masuk Anda: {{ .Token }}` lalu **Save**. Lakukan hal yang sama pada template **Confirm signup**.
3. Disarankan: **Authentication → Emails → SMTP Settings**, aktifkan **Custom SMTP** (mis. email resmi/Brevo). Email bawaan Supabase dibatasi sangat sedikit per jam dan sering masuk spam.
4. Email pegawai tetap harus didaftarkan lebih dulu di **Hak Akses & Pengguna**, kalau tidak, hasilnya "tidak terdaftar" seperti login Google.

---

## Yang berubah

| No | Perubahan | Di mana melihatnya |
|---|---|---|
| 1 | Kategori dokumen kini: SK ATENSI, SK Kegiatan, **Produk Hukum**, **SOP**, KAK, Bahan Paparan, Dokumentasi Kegiatan, Lainnya (SK/Perpres lama dihapus). Dokumen **Produk Hukum dan SOP** setelah diajukan masuk antrean **Pokja Hukum** untuk diverifikasi, baru terbit. Kategori lain tetap diverifikasi Pokja TU. Pokja Hukum diberi tahu lewat notifikasi/WA | Dokumen Pokja, Dokumen Bersama |
| 2 | Login **tanpa Google**: masukkan email `@kemensos.go.id` atau `@kemsos.go.id`, terima kode 6–8 angka lewat email, masukkan kode. Email lain diarahkan memakai Google | Halaman Masuk |
| 3 | Kolom **Subtotal** rencana intervensi tidak lagi melebihi kotak; di layar sempit tiap barang menjadi kartu bersusun | Formulir BNBA, Edit PM |
| 4 | **Edit PM** (edit lanjutan) kini memakai formulir lengkap yang sama seperti input pertama: semua kolom termasuk **Desil** dan **rincian barang** (jumlah, satuan, subtotal). Hanya kolom yang diubah disimpan. Setelah tersimpan, **Kapokja pemilik dan Kapokja TU** diberi notifikasi + WhatsApp. Saat usulan baru diajukan ke Kapokja, Kapokja TU juga ikut diberi tahu | Detail Usulan → Daftar PM → Edit |
| 5 | Tabel lebar kini punya **bilah geser di atas** (sinkron dengan yang di bawah), tidak perlu menggulir ke bawah dulu | Semua tabel lebar |
| 6 | Lencana, chip tahap, tombol, dan teks seperti "Menunggu verifikasi Kapokja" kini turun baris dan tidak keluar kotak. 20 halaman diperiksa otomatis di layar komputer dan HP | Seluruh aplikasi |

---

## Catatan jujur

- Semua pengujian (PostgreSQL 16 lokal dan browser mode pratinjau) dijalankan **di komputer pengembang**, belum pada proyek Supabase dan Vercel Anda. Mohon coba sekali setelah upgrade.
- **Login email belum bisa saya uji dengan email sungguhan** (butuh proyek Supabase Anda). Di mode pratinjau kodenya selalu `123456`. Bila email kode tidak datang atau tidak berisi kode, penyebabnya hampir pasti template belum memuat `{{ .Token }}` (Langkah 3) atau batas kirim email bawaan.
- Asumsi saya: Produk Hukum/SOP **diverifikasi dan diterbitkan Pokja Hukum dalam satu langkah**. Bila Pokja Hukum belum punya anggota, Super Admin yang dapat memverifikasi.
- Domain yang diizinkan untuk login email ada di `js/config.js` (`DOMAIN_EMAIL`); bila file itu milik Anda dan belum memuatnya, aplikasi otomatis memakai dua domain di atas.
- Peringatan WhatsApp mengikuti pengaturan **Notifikasi WA & Email** (kejadian "Data PM dikoreksi" sudah aktif secara bawaan).
