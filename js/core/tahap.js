// 11 tahap alur pencairan (PRD 5.2) dengan warna tahap (DESIGN.md: Stage Colors).
// "teksGelap" = angka ditulis gelap karena warna dasarnya terang (aturan kontras).
export const TAHAP_PENCAIRAN = [
  { no: '1', nama: 'Pengajuan BNBA & Profil', oleh: 'Anggota Pokja', warna: '#7A8794', ket: 'Usulan berjudul, BNBA per PM, dan link profil asesmen.' },
  { no: '2', nama: 'Verifikasi Kapokja', oleh: 'Kapokja', warna: '#4FA8E0', teksGelap: true, ket: 'Setujui atau kembalikan dengan catatan wajib.' },
  { no: '3', nama: 'Draft SK & Nota Dinas', oleh: 'Anggota Pokja', warna: '#2A4B8D', ket: 'Unggah naskah draft SK dan Nota Dinas.' },
  { no: '4a', nama: 'Verifikasi Tata Usaha', oleh: 'TU', warna: '#7B5EC2', ket: 'TU memeriksa dan menyetujui usulan SK.' },
  { no: '4b', nama: 'TTD Direktur', oleh: 'TU mencatat', warna: '#E7B416', teksGelap: true, ket: 'Status tanda tangan Direktur dicatat oleh TU.' },
  { no: '4c', nama: 'Sekretariat', oleh: 'TU / Pokja', warna: '#E58A2E', teksGelap: true, ket: 'Pengirim, penerima, dan nomor HP penerima tercatat.' },
  { no: '5', nama: 'Data Pencairan', oleh: 'Keuangan', warna: '#D9644A', ket: 'Rekap data pencairan per PM dicek Keuangan, diunduh sebagai Excel untuk bank. Rekening belum diisi.' },
  { no: '6', nama: 'SK Keluar dari Sekretariat', oleh: 'TU / Pokja', warna: '#8BB32E', teksGelap: true, ket: 'Scan SK final, nomor, dan tanggal SK.' },
  { no: '7', nama: 'Administrasi Burekol', oleh: 'Keuangan', warna: '#12A5A0', teksGelap: true, ket: 'Surat penyampaian; lampiran data BNBA PM diunduh dari aplikasi.' },
  { no: '8', nama: 'SP2D', oleh: 'Keuangan', warna: '#C2477F', ket: 'Checklist SP2D terbit.' },
  { no: '9', nama: 'Administrasi SI', oleh: 'Keuangan', warna: '#8C6A3E', ket: 'Nomor, tanggal, dan bulan SP2D.' },
  { no: '10', nama: 'SI', oleh: 'Keuangan', warna: '#5B8DEF', teksGelap: true, ket: 'Checklist SI.' },
  { no: '11', nama: 'Pencairan', oleh: 'Keuangan', warna: '#0E6B3A', ket: 'Konfirmasi pencairan dan tanggal cair.' },
];
