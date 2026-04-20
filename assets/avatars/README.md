# Avatar Default

Tempatkan file avatar default di folder ini dengan format penamaan berikut:

## Format Penamaan File

### Avatar Laki-laki:
```
default-male.png          (avatar utama/default)
default-male-1.png        (varian 1)
default-male-2.png        (varian 2)
default-male-3.png        (varian 3)
default-male-4.png        (varian 4)
default-male-5.png        (varian 5)
...dst sampai default-male-10.png
```

### Avatar Perempuan:
```
default-female.png        (avatar utama/default)
default-female-1.png      (varian 1)
default-female-2.png      (varian 2)
default-female-3.png      (varian 3)
...dst
```

### Avatar Netral (Opsional):
```
default-neutral.png       (untuk gender tidak dipilih)
default-neutral-1.png     (varian 1)
...dst
```

## Cara Kerja Sistem

1. **Jika jenis kelamin dipilih** (Laki-laki/Perempuan):
   - Sistem akan memilih secara **random** dari varian yang tersedia
   - Contoh: User pilih "Laki-laki" → bisa muncul `default-male.png`, `default-male-2.png`, atau `default-male-4.png`

2. **Jika jenis kelamin TIDAK dipilih**:
   - Sistem akan random antara laki-laki atau perempuan
   - Lalu random lagi pilih varian avatar

3. **Prioritas file**:
   - File utama (`default-male.png`) = varian index 0
   - File dengan angka (`default-male-1.png`) = varian index 1, dst
   - Minimal harus ada file utama untuk setiap gender

## Format yang Didukung
- PNG (disarankan untuk transparansi)
- JPG / JPEG
- Ukuran disarankan: 200x200px atau lebih besar (ratio 1:1)
- Ukuran file: < 500KB per avatar

## Contoh Struktur Folder

```
assets/avatars/
├── default-male.png         ← wajib ada
├── default-male-1.png       ← opsional
├── default-male-2.png       ← opsional
├── default-female.png       ← wajib ada
├── default-female-1.png     ← opsional
├── default-female-2.png       ← opsional
└── README.md
```

## Tips
- Semakin banyak varian, semakin beragam avatar yang muncul
- Gunakan gaya visual yang konsisten untuk semua avatar
- Pastikan wajah/persona terlihat jelas di ukuran kecil (48x48px)

## Fallback
Jika file avatar tidak ditemukan, sistem akan menggunakan **inisial nama** sebagai fallback.
