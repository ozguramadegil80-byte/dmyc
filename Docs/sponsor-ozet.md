# DMyC — EV Karnesi

**Kullanıcıya ne fayda var? Sponsora ne fayda var?**

---

## Tek cümle

> Katalog menzili herkes için aynıdır. Gerçek menzil kişiseldir. DMyC bu farkı ölçer.

---

## Ne yapıyor?

DMyC, elektrikli araç kullanıcılarının aracı katalog verileriyle değil, **gerçek kullanım davranışlarıyla** anlamasını sağlar.

Sistem şunları birleştirir:

- Araç katalog verisi (WLTP, batarya kapasitesi)
- Yolculuk kayıtları ve GPS verileri
- Rota alışkanlıkları
- Şarj seansı ve SOC verileri
- Sürüş davranışı (frenleme, hızlanma)
- Hava koşulları ve HVAC etkisi

Ve kullanıcıya şunları gösterir:

- **"Senin aracın, senin sürüşünde kaç km gidiyor?"**
- **"Bu haftaki sürüş alışkanlığınla kaç kWh ve kaç TL kaybettin?"**
- **"Hangi rotanda en fazla enerji harcıyorsun?"**

---

## Kullanıcı faydaları

| Sorun | DMyC ne yapıyor? |
|-------|-----------------|
| Menzil kaygısı | Gerçek kullanım verisine göre kişisel menzil tahmini sunar |
| "Neden bu kadar tüketti?" | Rota, hava, davranış etkisini ayrıştırarak açıklar |
| Şarj ne zaman, ne kadar? | Kullanım profiline göre şarj alışkanlığı rehberi |
| Aracı gerçekten anlayamıyorum | Haftalık EV Karnesi — sayı değil, anlam |

---

## Pilot için ölçülebilecekler

Bir pilot programda aşağıdaki KPI'lar ölçülebilir:

1. **Ev şarjı vs. istasyon şarjı maliyet farkı** — kullanıcı bazında, haftalık
2. **Şarj davranışı değişimi** — pilot öncesi / sonrası kWh tüketimi
3. **Haftalık EV Karnesi görüntülenme oranı** — kullanıcı aktifliğinin en doğrudan göstergesi
4. **Enerji verimliliği trendi** — sürüş skoru haftalık iyileşiyor mu?
5. **Haftalık kazanım potansiyeli** — kaçının bildirimi okuduğu ve şarj planı oluşturduğu
6. **"Menzilimi daha iyi anladım" geri bildirimi** — net promoter veya anket skoru

---

## Marka nerede görünür?

- Uygulama içi "Bu pilot [Sponsor] iş birliğiyle" etiketi
- Haftalık kazanım kartında ev şarjı, public AC ve DC şarj maliyet farkları sponsorlu içerikle açıklanabilir
- Şarj noktası önerilerinde sponsor istasyonları önceliklendirilir
- Pilot raporu: katılımcı sayısı, enerji farkındalığı skoru, ortalama kazanım potansiyeli (anonim)

---

## Veri güvenliği

- Kullanıcıya ait yolculuk, konum, şarj ve sürüş davranışı verileri sponsor firmalarla paylaşılmaz.
- Tüm kullanıcı verileri DMyC'nin kontrolündeki özel sunucu altyapısında tutulur; sponsor firmalar ham veriye erişemez.
- Sponsor raporları yalnızca **anonim ve toplulaştırılmış içgörüler** içerir.
- Kullanıcı verisi; ham GPS rotası, şarj lokasyonu, hız serisi veya kişisel hareket geçmişi olarak üçüncü taraflara aktarılmaz.
- Kullanıcı ileride isterse, yalnızca kendi onayıyla doğrulanabilir özet rapor paylaşabilir.
- Kullanıcı hesabını ve verilerini silme hakkına sahiptir.

---

## Mevcut durum

| Katman | Durum |
|--------|-------|
| Yolculuk kaydı, rota öğrenmesi, şarj takibi | ✅ Aktif |
| Sürüş skoru, sürücü verimlilik faktörü | ✅ Aktif (beta) |
| Haftalık kazanım potansiyeli | ✅ Aktif (beta) |
| Hava / HVAC etkisi | 🔄 Entegrasyon tamamlandı, kalibrasyonda |
| Sponsorlu şarj / enerji senaryoları | 📋 Pilot kapsamında yapılandırılır |
| iOS sürümü | 📋 Yol haritasında |

---

## İletişim

**Proje:** DMyC / EV Karnesi  
**Platform:** Android (iOS yol haritasında)  
**Altyapı:** Özel sunucu, PostgreSQL + PostGIS  
**API:** NestJS — herhangi bir CRM veya enerji platformuyla entegre edilebilir yapıda
