# Plan 38 — Landing Page + Cloudflare Deploy

**Durum:** Aktif  
**Oluşturma:** Haziran 2026

---

## Hedef

`dmyc.digital` adresinde yayına girecek, APK indirme bağlantısı içeren statik landing page.  
Sistem (API + web app) şimdilik ayrı tutulacak — landing bağımsız bir `apps/landing/` klasörü olacak.

---

## Adım 1 — HTML Düzeltmeleri

Stitch çıktısındaki sorunlar giderilecek:

- [ ] **Logo** — `lh3.googleusercontent.com` URL'i → `./assets/yatay-logo.png` (mobil assets'ten kopyalanacak)
- [ ] **Hero arkaplan** — Google CDN görseli → koyu mavi/cyan CSS gradient (dışa bağımlılık sıfırlanacak)
- [ ] **Footer yılı** — "© 2024" → "© 2026"
- [ ] **"Rapor Doğrulama" linki** — footer'dan kaldırılacak (özellik yok)
- [ ] **"QR kodlu karnen"** — "Nasıl Çalışır" 3. adımdan çıkarılacak → "URL ile paylaş"
- [ ] **"CANLI VERİ ÖNİZLEME"** etiketi → "ÖRNEK VERİ"
- [ ] **Android indirme butonu** — hero'ya eklenecek, APK linki yerleştirilecek (Adım 2 tamamlanınca)
- [ ] **"Örnek Raporu Gör" butonu** — gerçek bir kasko rapor URL'sine bağlanacak (token gerekli)
- [ ] **Batarya Notu A+→D section** — eksik, eklenecek

---

## Adım 2 — APK İndirme Linki

Mevcut EAS build bir **development build** — Expo hesabı gerektiriyor, herkese açık değil.  
Public indirme için aşağıdaki yol izlenecek:

- [ ] EAS'ta `preview` profili ile yeni build al:
  ```bash
  eas build --profile preview --platform android
  ```
  > Preview build internal distribution üretir — APK direkt indirilebilir, Play Store gerekmez.

- [ ] EAS, build bitince herkese açık bir APK indirme URL'i üretecek  
  (format: `https://expo.dev/artifacts/eas/...apk`)

- [ ] Bu URL landing page'deki "Android'de İndir" butonuna eklenecek

**Alternatif:** APK dosyasını Cloudflare Pages'e asset olarak koy → `dmyc.digital/dmyc-app.apk`  
(EAS linkine güvenmek istemezsen, kendi hosting'inde tutarsın)

---

## Adım 3 — Klasör Yapısı

```
apps/
  landing/
    index.html          ← Stitch çıktısı + düzeltmeler
    assets/
      yatay-logo.png    ← apps/mobile/assets'ten kopyalanacak
      hero-bg.jpg       ← isteğe bağlı, yoksa gradient kullanılır
```

> `apps/landing/` Cloudflare Pages'e direkt bu klasör olarak push edilecek.

---

## Adım 4 — Cloudflare Pages Deploy

- [ ] Cloudflare dashboard → Pages → "Create a project"
- [ ] **Build ayarı:** Framework preset = None (statik HTML)
- [ ] **Build output directory:** `/` (root, yani `apps/landing/` içi)
- [ ] **Custom domain:** `dmyc.digital` → Pages projesine bağla
- [ ] Deploy tetiklenir, ~30 saniye içinde canlı olur

**Yöntem seçenekleri:**
- **Git bağlantısı (önerilen):** GitHub repo → `apps/landing/` klasörünü izle, her push'ta otomatik deploy
- **Manuel upload:** Cloudflare dashboard'dan klasörü sürükle-bırak, hızlı test için iyi

---

## Adım 5 — Kontrol Listesi (Canlıya Almadan Önce)

- [ ] Logo görünüyor mu? (cache'siz açarak test et)
- [ ] Hero gradient düzgün görünüyor mu?
- [ ] APK indirme butonu çalışıyor mu?
- [ ] "Örnek Raporu Gör" linki açılıyor mu?
- [ ] Footer yılı 2026
- [ ] Mobil görünüm (telefonda aç)
- [ ] `dmyc.digital` HTTPS ile açılıyor mu?

---

## Bağımlılıklar

| Adım | Bloker |
|------|--------|
| APK linki | EAS preview build tamamlanması |
| "Örnek Raporu Gör" linki | Canlı sunucu veya örnek token |
| Cloudflare domain bağlama | `dmyc.digital` NS kayıtları Cloudflare'a yönlendirilmiş olmalı |

---

## Sıradaki Adım

1. `eas build --profile preview --platform android` çalıştır → APK linki gelsin  
2. Ben HTML'i düzeltip `apps/landing/` klasörüne koyayım  
3. Sen Cloudflare'a yükle
