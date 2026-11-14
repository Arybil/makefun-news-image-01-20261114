# Catatan desain

Tujuan penonton: mengenali tanggal berita, memahami tujuh peristiwa/laporan spesifik, dan membedakan klaim yang diatribusikan dari konfirmasi. Audiens ialah pembaca umum yang melewatkan berita hari tersebut.

Pilihan tata letak yang dipertimbangkan:

1. **Bento + editorial grafis**: satu konsep per panel, judul besar, simbol yang mudah dibaca. Dipilih karena kepadatan tujuh berita.
2. Hub-and-spoke + skema teknis: globe pusat memakan ruang yang dibutuhkan judul.
3. Dense-modules + retro grid: padat namun mengurangi ruang ilustrasi dan keterbacaan kecil.

Komposisi final berupa halaman depan persegi 1024×1024: tanggal dominan, enam panel berita dengan judul dua baris, satu pita olahraga. Palet kertas hangat, tinta biru tua, warna latar berbeda yang tetap serasi. Semua objek digambar dengan primitive SVG asli; tidak ada foto, logo, portrait hasil salin, atau aset house.

Materi faktual berasal dari tujuh ringkasan laporan dalam kit. Angka $400m, 483,200, serta 126 dipertahankan. Klaim Iran dan atribusi FBI tampil pada judul; total deportasi diberi konteks tahun 2026. Ikon bersifat simbolik dan tidak menambahkan peristiwa atau korban.

Revisi berdasarkan pengujian nyata:

- Renderer SVG internal ImageMagick merusak teks/warna. Jalur pembangunan diganti ke librsvg+Cairo, ImageMagick hanya melakukan downsampling/encoding PNG.
- Review gambar penuh memastikan tanggal dan judul terbaca.
- Judul panel diperbesar dari 33px ke 38px; beberapa judul dipadatkan tanpa mengubah fakta. Label panel Timur Tengah dipindahkan ke atas dan angka Kane diberi satuan CAPS.
- Thumbnail 300px diperiksa terpisah. Judul/angka diprioritaskan; teks sumber dan subjudul kecil memang memerlukan gambar penuh.

File sumber: `artwork/news.svg`. Raster PNG disimpan di root agar runtime Node22 tidak memerlukan renderer, font, paket, atau jaringan. Skrip build di `tools/` bukan entrypoint penilaian.
