# Hasil verifikasi lokal

Status: selesai secara lokal, tidak dipublikasikan, tidak dibundel, dan tidak disubmit.

## Artefak

- `entry.png`: PNG RGB 8-bit non-interlaced, **1024 × 1024**.
- Besar file: **421548 byte**, di bawah batas 1048576 byte.
- SHA-256: `0c21d83fdb71dc9293346d1cd7894ce01893e7d3d3d28821c0b72c6b62269e60`.
- Seluruh chunk/checksum, IHDR/IEND, hasil dekompresi, filter baris, batas dimensi, dan ukuran diuji.
- Render ulang sumber SVG pada toolchain lokal juga menghasilkan byte PNG yang sama.

## Pengujian nyata

`node --test tests/contract.test.mjs`: **3 tests, 3 pass, 0 fail**. Log asli keluaran tersimpan di `verification/tests.tap`.

1. Entrypoint menulis hanya `entry.png` dari direktori kerja lain ke output baru bertingkat; dua eksekusi identik dan sama dengan aset yang di-commit.
2. Aset dengan header rusak ditolak sebelum file keluaran ditulis.
3. Lebar 1025, tinggi 1025, dimensi nol, dan file di atas 1 MiB ditolak.

Uji kontrak pertama diperlihatkan gagal karena `main.ts` belum ada. Implementasi awal lalu mengungkap ketidakcocokan ESM `.ts` pada Node lokal; CommonJS memperbaikinya. Uji aset rusak juga diperlihatkan gagal sebelum validasi header/ukuran/dimensi diimplementasikan.

`python3 tools/verify-sandbox.py`: **dua run exit 0**, hash sama. Hasil asli tersimpan di `verification/sandbox.json`.

- Node **v22.22.1**.
- Namespace jaringan terisolasi; runtime tidak mempunyai kode jaringan.
- `/bot` hanya-baca, `/output` writable, root sementara.
- Pengguna/grup **65534:65534**, capability dihapus.
- Afinitas **1 CPU**, batas **64 proses**, timeout **60 detik**.
- Run terakhir: **0,3399 detik** dan **0,3316 detik**.
- Peak RSS: **11348 KiB**, di bawah 512 MiB.

## Pemeriksaan visual dan sumber

Gambar raster asli serta thumbnail 300×300 diperiksa dengan vision. Renderer pertama menyebabkan teks/warna rusak dan dibuang; librsvg/Cairo memperbaiki rendering. Judul diperbesar, label Timur Tengah dipindahkan, smoke/laptop dijauhkan dari teks. Review akhir memastikan tanggal dan tujuh judul terbaca, angka `$400m`, `483,200`, dan `126 CAPS` benar, tanpa judul terpotong atau rusak. Teks sumber dan subjudul kecil memerlukan gambar ukuran penuh.

Sumber fakta terbatas pada ringkasan tujuh laporan di `competition.yaml` resmi baris 52–69. Pemetaan lengkap ada di `SOURCES.md`; tidak ada penambahan berita atau klaim bahwa artikel asli telah diverifikasi independen. `verification/provenance.json` mencatat integritas kit dan kesamaan URL sumber.

## Provenance sesi dan batas

- Native harness: Hermes Agent, sesi **`20261114_122419_9c4120`** (`HERMES_SESSION_ID`).
- Seluruh kode ditulis/direvisi melalui tools di sesi ini; entrypoint mengambil baris final dari lebih dari dua pesan penulisan. Percakapan memuat lebih dari lima giliran substantif.
- Log native dikelola Hermes dalam `state.db`; tidak dibuat ulang, diedit, atau diekspor sebagai transcript palsu. Parent melaporkan pemeriksaan native DB lulus. Bundling/check transcript lengkap tetap tugas parent setelah child selesai; tidak dijalankan di sini sesuai lingkup.
- Tidak ada Docker di host, sehingga pinned Docker image resmi **belum diuji**. Tidak ada cgroup memori 512 MiB: peak RSS diperiksa, bukan batas hard memory.
- Scorer/AI judge tersegel di server; **tidak ada skor/ranking lokal yang diklaim**.
- Batas 1 MiB/1024px/60s dipenuhi dalam pengujian; kelayakan intake eksternal, harga model transcript, kepemilikan akun, serta ketentuan repo publik tidak diuji dengan publikasi/submisi.
- Git lokal saja, tanpa remote; tidak ada autentikasi, credential, API berbayar, atau unggah.
