# DMyC Menzil Güven Planı

## Amaç

Roadmap Faz 8'in amacı, kullanıcının şu sorusuna ilk ürün cevabını vermektir:

```text
Bu araçla bu yolu yapabilir miyim?
```

Bu faz Google Maps, canlı navigasyon veya şarj operatörü optimizasyonu değildir. İlk sürüm manuel rota mesafesi ve senaryo girdileriyle çalışır; katalog verisi, usage profile ve şarj tamponu birlikte değerlendirilir.

---

## Kapsam

### Kapsam İçi

```text
route_plans
route_scenarios
route_strategies
route_charge_stop_candidates
Menzil güven API yüzeyi
Mobil menzil planlama ekranı
Kişi / yük / hava / yol tipi senaryosu
Başlangıç SOC ve varış tamponu
Şarj gerekli mi tahmini
```

### Kapsam Dışı

```text
Google Maps entegrasyonu
Gerçek rota geometri çözümü
Canlı navigasyon
Şarj operatörü istasyon listesi
Fiyat/yoğunluk optimizasyonu
Premium canlı rota takibi
```

---

## Fazlar

### Faz 16A: Plan ve Roadmap Senkronu

- `[x]` Roadmap Faz 8'in sıradaki ürün fazı olduğu netleşir.
- `[x]` Otomatik trip algısının teknik ara faz olduğu ve Faz 8 sırasını değiştirmediği kayda geçer.
- `[x]` Roadmap aktif yürütme notu bu plana bağlanır.

### Faz 16B: DB Foundation

- `[x]` `route_plans` tablosu eklenir.
- `[x]` `route_scenarios` tablosu eklenir.
- `[x]` `route_strategies` tablosu eklenir.
- `[x]` `route_charge_stop_candidates` tablosu eklenir.
- `[x]` Araç bazlı son plan indeksi eklenir.

### Faz 16C: Menzil Güven Hesap Motoru

- `[x]` Katalog batarya / WLTP / efficiency verisi okunur.
- `[x]` Usage profile confidence hesaba katılır.
- `[x]` Kişi, yük, hava ve yol tipi tüketim çarpanı uygulanır.
- `[x]` Başlangıç SOC ve varış tamponuna göre kullanılabilir enerji hesaplanır.
- `[x]` `safe`, `tight`, `charge_required` durumları üretilir.

### Faz 16D: API Yüzeyi

- `[x]` `POST /vehicles/:id/route-plans` eklenir.
- `[x]` `GET /vehicles/:id/route-plans/latest` eklenir.
- `[x]` Sonuç strateji ve şarj molası adaylarıyla döner.
- `[x]` API ham rota geometrisi veya canlı navigasyon verisi gerektirmez.

### Faz 16E: Mobil Görünürlük

- `[x]` Karne ekranına `MENZİL PLANLA` aksiyonu eklenir.
- `[x]` Menzil planlama ekranı eklenir.
- `[x]` Nereden / nereye / mesafe / kişi / yük / hava / yol tipi / SOC girdileri alınır.
- `[x]` Sonuç kartında güven durumu, beklenen menzil, enerji, tampon, tüketim ve şarj molası görünür.
- `[x]` UI metinleri çoklu dil yapısına uygun anahtarlarla hazırlanır.

### Faz 16F: Doğrulama

- `[x]` API typecheck geçer.
- `[x]` Mobile typecheck geçer.
- `[x]` DB migration uygulanır.
- `[x]` Route planning smoke geçer.
- `[x]` Canlı API akışı gerçek kullanıcı/araç/ownership ile route plan üretir.
- `[ ]` Mobil ekranda gerçek hesap akışı cihaz/web üzerinde gözle kontrol edilir.

Not: 19.06.2026 tarihinde mobil web ve API 200 döndü; canlı API akışı BMW i4 için İstanbul-Ankara senaryosunda `charge_required` ve 1 şarj molası üretti. In-app browser bu oturumda unavailable, Windows Computer Use ise eklenti paket export hatası verdiği için otomatik görsel click testi yapılamadı.

---

## Kabul Kriterleri

Bu faz tamamlandığında:

```text
Kullanıcı aracını seçtikten sonra manuel mesafe ve senaryo girerek menzil güven tahmini alabilir.
Sistem rota için güvenli / sınırda / şarj gerekli sonucunu üretir.
Şarj gerekiyorsa ilk şarj molası ihtiyacını tahmini enerji ve DC süreyle gösterir.
Route plan verisi backend'de kalıcı olarak saklanır.
Premium Google Maps/canlı takip katmanı ayrı Faz 9'a bırakılır.
```
