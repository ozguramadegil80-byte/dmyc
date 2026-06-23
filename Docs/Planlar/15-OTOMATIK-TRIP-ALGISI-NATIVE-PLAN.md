# DMyC Otomatik Trip Algısı ve Native Build Planı

## Amaç

Bu planın amacı, mevcut manuel trip recorder akışını bozmadan otomatik yolculuk algısına geçişi
ayrı ve kontrollü bir faz olarak yönetmektir.

Bu fazın ana kararı:

```text
Route Fingerprint fazı tamamlanana kadar manuel sistem kalabilir.
Route Fingerprint 12B-12G kapandığı için otomatik algı artık ayrı teknik faz olarak ele alınır.
Manuel trip başlat/bitir akışı test ve geliştirme fallback'i olarak korunur.
```

---

## Neden Ayrı Faz

Otomatik trip algısı Expo web/Expo Go yüzeyinden farklı bir çalışma modeline geçer.

Gerekenler:

```text
expo-location
Native Android/iOS build
Konum izinleri
watchPositionAsync ile sürekli GPS akışı
Hareket/durma eşikleri
Debounce mantığı
Arka plan task kararı
```

Bu yüzden bu iş Route Fingerprint, Battery Lifecycle veya Community Layer içinde eritilmemelidir.
Native davranış, izinler ve batarya tüketimi ayrı doğrulama ister.

---

## Kapsam

### Kapsam İçi

```text
expo-location kurulumu
Native build hazırlığı
Foreground trip detection
watchPositionAsync GPS akışı
Hareket başlatma eşiği
Durma kapama eşiği
Manual fallback korunması
Trip recorder API ile entegrasyon
Mobil UI'da otomatik algı durumu
```

### Kapsam Dışı

```text
Background task zorunlu canlı kullanım
Sürücü kimliği çözme
Co-presence / çoklu telefon ayrımı
Şarj istasyonu otomatik algısı
Harita navigasyonu
Premium route takip
```

Background task bu fazda opsiyonel hazırlık olarak ele alınır; zorunlu kabul kriteri değildir.

---

## Fazlar

### Faz 15A: Plan ve Geçiş Kararı

- `[x]` Manuel trip recorder'ın test/geliştirme fallback'i olarak kalacağı netleşir.
- `[x]` Otomatik algının Route Fingerprint sonrası ayrı faz olacağı kayda geçer.
- `[x]` Roadmap aktif yürütme notu bu plana bağlanır.

### Faz 15B: Native Build Hazırlığı

- `[x]` `expo-location` dependency eklenir.
- `[x]` Android/iOS konum izinleri app config'e eklenir.
- `[x]` Expo Go ile native build farkı dokümante edilir.
- `[x]` Local native test komutları netleşir.

### Faz 15C: GPS Stream Katmanı

- `[x]` `watchPositionAsync` ile foreground GPS akışı kurulur.
- `[x]` Accuracy, interval ve distanceInterval değerleri belirlenir.
- `[x]` GPS eventleri local state'e ve trip buffer'a kontrollü yazılır.
- `[x]` Konum izni yoksa manuel fallback bozulmaz.

### Faz 15D: Hareket Başlatma Algısı

Başlangıç eşiği:

```text
speed > 5 km/h
minimum 15 saniye süreklilik
```

Yapılacaklar:

- `[x]` Hız eşiği hesaplanır.
- `[x]` 15 saniye debounce uygulanır.
- `[x]` Aktif trip yoksa backend `createTrip` çağrılır.
- `[x]` Başlangıç konumu ilk güvenilir GPS noktasından alınır.

### Faz 15E: Durma ve Trip Kapatma Algısı

Kapanış eşiği:

```text
speed < 2 km/h
minimum 3 dakika debounce
```

Yapılacaklar:

- `[x]` Durma eşiği hesaplanır.
- `[x]` 3 dakika debounce uygulanır.
- `[x]` Aktif trip varsa `finishTrip` çağrılır.
- `[x]` Kısa/yanlış pozitif trip'ler debounce ile filtrelenir.

### Faz 15F: Mobil UI ve Kullanıcı Kontrolü

- `[x]` Otomatik algı açık/kapalı toggle eklenir.
- `[x]` Manuel başlat/bitir fallback'i korunur.
- `[x]` Kullanıcıya GPS/izin durumu açık gösterilir.
- `[x]` UI metinleri çoklu dil yapısına uygun anahtarlarla hazırlanır.

### Faz 15G: Background Task Hazırlığı

Opsiyonel sonraki aşama:

```text
expo-task-manager
background location permission
battery impact ölçümü
platform bazlı izin farkları
```

Bu fazda background task kodu şart değildir. Sadece mimari sınır ve izin modeli hazırlanır.

İlk uygulamada background tracking kodu eklenmedi. Foreground watcher, native permission modeli ve manuel fallback sınırı hazırlandı; background izinleri sonraki faza bırakıldı.

### Faz 15H: Doğrulama

- `[x]` Manuel trip akışı hâlâ çalışır.
- `[ ]` 5 km/h üstü 15 saniye hareket trip başlatır.
- `[ ]` 2 km/h altı 3 dakika durma trip kapatır.
- `[x]` Konum izni reddedilirse uygulama manuel moda düşer.
- `[x]` Typecheck geçer.
- `[ ]` Native build smoke geçer.

Not: Native smoke için cihaz/emülatörde `npm --prefix apps/mobile run android` veya `npm --prefix apps/mobile run ios` ile doğrulama yapılacak. Expo web tek başına background/native izin davranışını kanıtlamaz.

---

## Kabul Kriterleri

Bu faz tamamlandı sayılırsa:

```text
Kullanıcı manuel trip başlatmadan foreground hareketle trip oluşturabilir.
Durma debounce sonrası trip otomatik kapanır.
Manuel sistem fallback olarak kalır.
Konum izni yoksa akış bozulmaz.
Native build gereksinimleri belgelenir ve test edilir.
Route Fingerprint, Usage Profile ve Community akışları otomatik tripten beslenir.
```

---

## İlk Uygulama Kararı

İlk uygulama sırası:

```text
1. expo-location ve izin hazırlığı
2. Foreground GPS watcher
3. Hareket başlatma state machine
4. Durma kapatma state machine
5. Manual fallback UI
6. Native build doğrulama
7. Background task hazırlık notu
```

Bu fazda önce foreground doğruluk hedeflenir. Background tracking, pil ve izin riski nedeniyle ikinci adımda ele alınır.