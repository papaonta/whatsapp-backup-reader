<h1 align="center">WhatsApp Backup Reader</h1>

<p align="center">
  <img src="src/lib/assets/favicon.png" width="100" height="100" alt="WhatsApp Backup Reader" />
</p>

<p align="center">
  <strong>Baca ekspor WhatsApp Anda secara offline. Data tetap berada di perangkat Anda.</strong>
</p>

<p align="center">
  <a href="https://github.com/papaonta/whatsapp-backup-reader/releases/latest"><img src="https://img.shields.io/github/v/release/papaonta/whatsapp-backup-reader?style=flat-square&color=blue" alt="Rilis terbaru" /></a>
  <a href="https://github.com/papaonta/whatsapp-backup-reader/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/papaonta/whatsapp-backup-reader/ci.yml?branch=main&style=flat-square&label=CI" alt="Status CI" /></a>
  <a href="https://github.com/papaonta/whatsapp-backup-reader/blob/main/LICENSE"><img src="https://img.shields.io/github/license/papaonta/whatsapp-backup-reader?style=flat-square" alt="Lisensi" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Svelte-5-FF3E00?style=flat-square&logo=svelte&logoColor=white" alt="Svelte 5" />
  <img src="https://img.shields.io/badge/Electron-45-47848F?style=flat-square&logo=electron&logoColor=white" alt="Electron 45" />
  <img src="https://img.shields.io/badge/AI-Whisper_(local)-00A67E?style=flat-square&logo=openai&logoColor=white" alt="Whisper AI lokal" />
  <img src="https://img.shields.io/badge/Privacy-100%25_offline-4CAF50?style=flat-square&logo=shield&logoColor=white" alt="100% offline" />
</p>

<p align="center">
  <a href="README.md">English</a> •
  <strong>Bahasa Indonesia</strong>
</p>

<p align="center">
  <a href="#fitur">Fitur</a> •
  <a href="#mulai-cepat">Mulai Cepat</a> •
  <a href="#cara-mengekspor-dari-whatsapp">Panduan Ekspor</a> •
  <a href="#privasi--keamanan">Privasi</a> •
  <a href="#masukan">Masukan</a>
</p>

---

> **Ini adalah fork independen** dari [rodrigogs/whats-reader](https://github.com/rodrigogs/whats-reader), dikelola oleh [papaonta](https://github.com/papaonta). Seluruh kredit untuk aplikasi aslinya milik [Rodrigo Gomes da Silva](https://github.com/rodrigogs) dan para kontributornya. Fork ini menambahkan desain ulang antarmuka bergaya WhatsApp Desktop serta sejumlah fitur tambahan (lihat [Fitur](#fitur)); fork ini tidak berafiliasi dengan, dan tidak didukung oleh, proyek upstream. Dirilis dengan [lisensi AGPL-3.0](LICENSE) yang sama.

## Apa yang dilakukan aplikasi ini

Letakkan file ekspor WhatsApp `.zip`, lalu telusuri pesan, foto, dan pesan suara Anda. Mampu menangani chat besar (diuji dengan 10 ribu+ pesan).

**Galeri Media** memberi gambaran visual semua foto, video, dan file audio yang diurutkan berdasarkan tanggal. Pilih beberapa item lalu unduh sebagai file ZIP, atau klik media mana pun untuk melihatnya layar penuh dan melompat ke pesan aslinya.

Pesan suara dapat ditranskripsikan memakai [Whisper](https://openai.com/research/whisper) yang berjalan di browser Anda lewat WebGPU. Tanpa server, tanpa kunci API.

<details>
<summary>Tangkapan layar</summary>
<br>

> Tangkapan layar ini diambil dari tampilan asli upstream dan belum menampilkan desain ulang fork ini.

| Layar awal | Tampilan chat |
|:---:|:---:|
| <img src="examples/images/1-start.png" width="400" /> | <img src="examples/images/2-chats.png" width="400" /> |

| Opsi chat | Mode sudut pandang |
|:---:|:---:|
| <img src="examples/images/3-chat-options.png" width="400" /> | <img src="examples/images/4-view-as.png" width="400" /> |

| Berbintang | Statistik |
|:---:|:---:|
| <img src="examples/images/5-bookmarks.png" width="400" /> | <img src="examples/images/6-statistics.png" width="400" /> |

| Transkripsi suara | Galeri media |
|:---:|:---:|
| <img src="examples/images/7-audio-transcription.png" width="400" /> | <img src="examples/images/8-media-gallery.png" width="400" /> |

| Unduh yang dipilih | Buka tanggal |
|:---:|:---:|
| <img src="examples/images/9-media-gallery-download-selected.png" width="400" /> | <img src="examples/images/10-media-gallery-goto-date.png" width="400" /> |

</details>

---

## Unduh

Dapatkan aplikasi desktop untuk platform Anda:

**Syarat sistem:** macOS 13 atau lebih baru, Windows 10 atau lebih baru.

### Windows
- Unduh **WhatsApp-Backup-Reader-Setup-{version}.exe** dari [rilis terbaru](https://github.com/papaonta/whatsapp-backup-reader/releases/latest)
- Jalankan installer dan ikuti panduan pemasangan
- Aplikasi akan memperbarui diri saat versi baru tersedia

### macOS
- **Apple Silicon (M1/M2/M3)**: Unduh **WhatsApp-Backup-Reader-{version}-arm64.dmg**
- **Intel**: Unduh **WhatsApp-Backup-Reader-{version}.dmg**
- Buka file DMG lalu seret aplikasi ke folder Applications
- Saat pertama dibuka, klik kanan aplikasi dan pilih "Open" untuk melewati Gatekeeper

### Linux
- **Debian/Ubuntu**: Unduh **whats-reader_{version}_amd64.deb** atau **whats-reader_{version}_arm64.deb**
  ```bash
  sudo dpkg -i whats-reader_{version}_amd64.deb
  ```
- **Fedora/RHEL**: Unduh **whats-reader-{version}.x86_64.rpm** atau **whats-reader-{version}.aarch64.rpm**
  ```bash
  sudo rpm -i whats-reader-{version}.x86_64.rpm
  ```
- **Distro lain (Arch, dll.)**: Unduh **WhatsApp-Backup-Reader-{version}.AppImage**
  ```bash
  chmod +x WhatsApp-Backup-Reader-{version}.AppImage
  ./WhatsApp-Backup-Reader-{version}.AppImage
  ```

---

## Fitur

**Ditambahkan di fork ini**

- **Tata letak bergaya WhatsApp Desktop**: panel ikon, daftar chat yang tetap tersimpan (semua chat tersimpan langsung muncul saat aplikasi dibuka), pengaturan sebagai halaman penuh
- **Kunci PIN**: kunci seluruh aplikasi atau chat tertentu, dengan opsi buka kunci biometrik (Touch ID / Windows Hello). Ini hanya gerbang antarmuka, bukan enkripsi: data tersimpan tidak dienkripsi
- **Arsipkan dan hapus chat**: chat yang diarsipkan dipindahkan ke tampilan tersendiri
- **Pesan berbintang**: beri bintang pada pesan (atau media) lengkap dengan catatan; tersimpan setelah aplikasi ditutup
- **Semua media**: satu galeri untuk seluruh chat yang dimuat, dengan lencana nama chat pada setiap item
- **Pencarian lintas chat**: cari isi pesan di semua chat yang dimuat
- **Panel info chat**: peserta, nomor telepon, jumlah pesan, rentang tanggal
- **Identitas "Lihat sebagai" default**: isi nama atau nomor Anda sekali; diterapkan ke chat baru, dan bila memungkinkan disimpulkan otomatis dari baris "Anda menghapus pesan ini"
- **Gabungkan ekspor**: satukan beberapa ekspor dari chat yang sama tanpa duplikat
- **Cadangkan sebagai ZIP / ekspor sebagai HTML**: unduh transkrip chat beserta semua media sebagai satu ZIP, atau sebagai file HTML yang siap dicetak
- **ZIP besar (desktop)**: mengalirkan ekspor berukuran beberapa GB ke disk, memperbaiki ekspor dengan direktori ZIP rusak, dan memungkinkan Anda membatalkan impor
- Banner kenangan **"Pada hari ini"** dan warna nama berbeda untuk tiap pengirim di chat grup
- **Deteksi pesan sistem/pesan terhapus yang lebih baik** serta lebih banyak format tanggal
- **Antarmuka dalam bahasa Inggris dan Bahasa Indonesia**

**Dari aplikasi asli**

- **Galeri Media**: Telusuri semua foto, video, dan audio dalam tampilan kisi thumbnail
  - Diurutkan berdasarkan tanggal dengan navigasi kalender
  - Pilih banyak item dan unduh sebagai ZIP
  - Pratinjau lightbox dengan navigasi kembali ke pesan asli
- **Pembaruan otomatis**: Aplikasi desktop memeriksa dan memasang pembaruan secara otomatis (hanya Electron)
- **Transkripsi suara**: Transkripsikan audio dengan Whisper (berjalan lokal, 12+ bahasa)
- **Pencarian**: Pencarian teks lengkap pada pesan dan transkripsi
- **Mode sudut pandang**: Lihat chat sebagai peserta mana pun
- **Statistik**: Jumlah pesan, grafik aktivitas, linimasa
- **Mode gelap**: Mengikuti sistem atau diganti manual (pilihan tersimpan)
- **Aplikasi desktop**: macOS, Windows, Linux lewat Electron

---

## Mulai Cepat

### Prasyarat

Anda memerlukan [Node.js](https://nodejs.org/) (versi 24, lihat `mise.toml`). Unduh dari [nodejs.org](https://nodejs.org/) lalu jalankan installer.

Untuk memeriksa apakah sudah terpasang:
```bash
node --version
```

### Menjalankan aplikasi

1. Clone atau unduh proyek ini
2. Buka terminal di folder proyek
3. Jalankan perintah berikut:

```bash
npm install
npm run dev
```

4. Buka [localhost:5173](http://localhost:5173) di browser Anda
5. Seret dan lepas file `.zip` WhatsApp Anda ke halaman

### Aplikasi desktop (opsional)

Jika Anda lebih suka aplikasi mandiri daripada memakai browser:

```bash
npm run electron:dev    # jalankan dalam mode pengembangan
npm run electron:build  # buat installer untuk OS Anda
```

Build khusus platform:
```bash
npm run electron:build:mac    # macOS (dmg, zip)
npm run electron:build:win    # Windows (nsis, portable)
npm run electron:build:linux  # Linux (deb, rpm, AppImage)
```

---

## Cara Mengekspor dari WhatsApp

Pertama, ekspor chat dari WhatsApp di ponsel Anda. Ini menghasilkan file `.zip` berisi pesan dan media Anda.

### iPhone
1. Buka WhatsApp dan masuk ke chat mana pun
2. Ketuk nama kontak atau grup di bagian atas layar
3. Gulir ke bawah dan ketuk **Ekspor Chat**
4. Pilih **Lampirkan Media** untuk menyertakan foto, video, dan pesan suara
5. Simpan file (bisa dikirim lewat AirDrop ke Mac, disimpan ke Files, atau dikirim ke email sendiri)

### Android
1. Buka WhatsApp dan masuk ke chat mana pun
2. Ketuk tiga titik **⋮** di pojok kanan atas
3. Ketuk **Lainnya** → **Ekspor chat**
4. Pilih **Sertakan media**
5. Simpan atau bagikan file `.zip` ke komputer Anda

### Tips
- Chat berukuran besar bisa memakan waktu beberapa menit untuk diekspor
- Nama file biasanya seperti `WhatsApp Chat with John.zip`
- Chat pribadi maupun grup bisa digunakan

---

## Privasi & Keamanan

Aplikasi ini dirancang dengan privasi sebagai prioritas utama. Data WhatsApp Anda tidak pernah meninggalkan perangkat.

### Mengapa aman

- **100% offline**: Aplikasi berjalan sepenuhnya tanpa internet. Tanpa server, tanpa cloud, tanpa pengiriman data.
- **Pemrosesan lokal**: Semua proses parsing, pencarian, dan analisis terjadi di browser atau aplikasi Electron Anda.
- **AI lokal**: Transkripsi suara memakai [Whisper](https://openai.com/research/whisper) yang berjalan lokal lewat WebGPU. Tidak ada audio yang dikirim ke server atau API mana pun.
- **Tanpa pelacakan**: Tanpa analitik, telemetri, atau skrip pihak ketiga. Tanpa Google Analytics, tanpa cookie.
- **Tanpa akun**: Tanpa pendaftaran, tanpa login, tanpa pengumpulan data pribadi.
- **Sumber terbuka**: Seluruh kode terbuka di bawah [AGPL-3.0](LICENSE). Siapa pun dapat mengauditnya.

### Cara memverifikasi

Jangan hanya percaya begitu saja. Periksa sendiri:

1. **Baca kode sumber**  
   Telusuri [repositori GitHub](https://github.com/papaonta/whatsapp-backup-reader). Logika utama ada di `src/lib/` dan `src/routes/`.

2. **Periksa permintaan jaringan**  
   Buka DevTools browser (F12) → tab Network → gunakan aplikasi. Anda akan melihat **nol permintaan eksternal** (kecuali pemuatan halaman awal pada versi web).

3. **Uji secara offline**  
   Putuskan koneksi internet, lalu gunakan aplikasi. Semuanya berfungsi karena tidak ada yang membutuhkan koneksi.

4. **Build dari sumber**  
   Clone repo lalu build sendiri:
   ```bash
   git clone https://github.com/papaonta/whatsapp-backup-reader.git
   cd whatsapp-backup-reader
   npm install
   npm run build
   ```

5. **Audit aplikasi Electron**  
   Aplikasi desktop memakai kode web yang sama. Periksa `electron/main.cjs` dan `electron/preload.cjs`. Keduanya hanya menangani pengelolaan jendela dan dialog file.

---

## Pengembangan

### Skrip

| Perintah | Deskripsi |
|---------|-------------|
| `npm run dev` | Jalankan server pengembangan di [localhost:5173](http://localhost:5173) |
| `npm run build` | Build untuk produksi |
| `npm run preview` | Pratinjau build produksi |
| `npm run check` | Pemeriksaan tipe dengan svelte-check |
| `npm run check:watch` | Pemeriksaan tipe dalam mode watch |
| `npm run lint` | Lint dengan Biome |
| `npm run lint:fix` | Perbaiki masalah lint otomatis |
| `npm run format` | Format kode dengan Biome |
| `npm run electron` | Build dan jalankan aplikasi Electron |
| `npm run electron:dev` | Jalankan Electron dalam mode pengembangan |
| `npm run electron:build` | Build installer Electron |
| `npm run electron:build:mac` | Build untuk macOS |
| `npm run electron:build:win` | Build untuk Windows |
| `npm run electron:build:linux` | Build untuk Linux |

### Terjemahan

Antarmuka mendukung bahasa Inggris dan Bahasa Indonesia. String ada di `messages/en.json` dan `messages/id.json`; saat menambah key, tambahkan ke kedua file.

---

## Dibangun dengan

- [SvelteKit](https://kit.svelte.dev) + [Svelte 5](https://svelte.dev) - Framework
- [Tailwind CSS 4](https://tailwindcss.com) - Penataan gaya
- [Electron](https://electronjs.org) - Aplikasi desktop
- [Transformers.js](https://huggingface.co/docs/transformers.js) - Whisper AI untuk transkripsi
- [JSZip](https://stuk.github.io/jszip/) - Penanganan file ZIP
- [Paraglide JS](https://inlang.com/m/gerre34r/library-inlang-paraglideJs) - Internasionalisasi

---

## Masukan

Ini adalah fork pribadi. Menemukan bug? [Buka issue](https://github.com/papaonta/whatsapp-backup-reader/issues).

Ada contoh file chat di `examples/chats/` yang bisa dipakai untuk pengujian.

---

## Lisensi

[AGPL-3.0](LICENSE). Anda bebas menggunakan, mengubah, dan mendistribusikan perangkat lunak ini. Jika Anda mengubahnya lalu menjalankannya sebagai layanan atau mendistribusikannya, Anda wajib membagikan kode sumbernya dengan lisensi yang sama.
