# 02-DOMAIN-MODEL-AND-DATASET.md

# EV Karnesi / Vehicle Reality Layer

## Domain Model ve Planın Datasetleri

Bu doküman EV (elektirikli araç) Karnesi sisteminin veri modelini, domain ayrımlarını ve hangi verinin ham gerçek, hangi verinin hesaplanan projection, hangi verinin B2B insight olduğunu tanımlar.

Temel ilke:

```text
Database gerçek dünyadaki olayları tutar.
Projection tabloları hesaplanmış özetleri tutar.
Insight tabloları anonim ve agregasyonlu analiz üretir.
```

---

# 1. Domain Haritası

Sistem aşağıdaki ana domainlerden oluşur:

```text
User Domain
Vehicle Domain
Ownership Domain
Trip Domain
Trip Context Domain
Charging Domain
Battery Lifecycle Domain
Route Planning Domain
Station Domain
Advisory Domain
Trip Recap Domain
Vehicle Registry Domain
Community Benchmark Domain
B2B Insight Domain
```

---

# 2. Veri Sınıfları

Her tablo üç sınıftan birine girer.

## 2.1 Core Event

Gerçek dünyada olan olaydır.

Örnek:

```text
trips
charge_sessions
service_visits
charging_decision_events
```

## 2.2 Projection

Core eventlerden hesaplanan özet/veridir.

Örnek:

```text
vehicle_battery_lifecycle_stats
vehicle_state_snapshots
monthly_reports
annual_reports
```

## 2.3 Derived Insight

Anonim, toplulaştırılmış, B2B veya benchmark amaçlı analiz katmanıdır.

Örnek:

```text
similar_trip_clusters
charging_need_clusters
charging_demand_hotspots
route_community_benchmarks
```

---

# 3. Planın Datasetleri

Sistemde başlangıçta ve orta vadede kullanılacak datasetler aşağıdaki gibidir:

```text
users
vehicles
vehicle_specs
vehicle_ownerships

trips
trip_points
trip_contexts
trip_behavior_signals
trip_context_questions

charge_sessions
charge_evidence
battery_cycle_events
vehicle_battery_lifecycle_stats

service_visits
service_evidence

route_fingerprints

route_plans
route_plan_user_inputs
route_plan_segments
route_scenarios
route_strategies
route_charge_stop_candidates

charging_stations
charging_connectors
station_availability_snapshots

trip_advisories
trip_recaps
trip_share_cards

vehicle_state_snapshots
vehicle_public_reports
transfer_requests

similar_trip_clusters
route_community_benchmarks

charging_decision_events
charging_need_clusters
charging_demand_hotspots

ad_segments
insight_queries
```

---

# 4. User Domain

## users

Kullanıcı hesabıdır.

```sql
users

id
email
phone
full_name

created_at
updated_at
```

Kullanıcı araçtan ayrı tutulur. Çünkü sistem araç merkezli sicil mantığına sahiptir.

---

# 5. Vehicle Domain

## vehicles

Araç kimliğidir.

```sql
vehicles

id
vin
brand
model
year
battery_version

created_at
updated_at
```

Araç kullanıcıdan bağımsız bir varlıktır.

Kullanıcı değişebilir, araç kalır.

---

## vehicle_specs

Fabrika verileridir.

```sql
vehicle_specs

id
brand
model
year
battery_version

battery_capacity_kwh
usable_battery_capacity_kwh

wltp_range_km
factory_consumption_kwh_100km

max_ac_kw
max_dc_kw

recommended_daily_min_soc
recommended_daily_max_soc

created_at
updated_at
```

Bu tablo kişisel veri değildir.

Araç katalog gerçekliğini temsil eder.

İlk gün kullanıcıya gösterilecek başlangıç noktası buradan gelir.

---

# 6. Ownership Domain

## vehicle_ownerships

Araç sahiplik dönemidir.

```sql
vehicle_ownerships

id
vehicle_id
user_id

started_at
ended_at

start_odometer_km
end_odometer_km

ownership_status
created_at
updated_at
```

Araç sicili bu tablo üzerinden dönemlere ayrılır.

Araç satılırsa eski sahiplik kapanır, yeni sahiplik açılır.

---

# 7. Trip Domain

## trips

Yolculuğun ana kaydıdır.

```sql
trips

id
vehicle_id
ownership_id

started_at
ended_at

start_location
end_location

distance_km
duration_seconds

avg_speed_kmh
max_speed_kmh

start_soc
end_soc
soc_delta

route_fingerprint_id

confidence_score

created_at
```

Bu core eventtir.

Yolculuk sistemin temel ham verisidir.

---

## trip_points

GPS ham noktalarıdır.

```sql
trip_points

id
trip_id

recorded_at
location

speed_kmh
altitude_m
accuracy_m

created_at
```

PostGIS ile tutulmalıdır.

Bu tablo rota fingerprint, hız profili, dur-kalk analizi ve sapma motoru için kullanılır.

---

# 8. Trip Context Domain

## trip_contexts

Yolculuk bağlamıdır.

Bazı alanlar kullanıcı doğrulamalı, bazıları inferred, bazıları unknown olabilir.

```sql
trip_contexts

id
trip_id

ambient_temp_c
weather_condition

weather_source
-- weather_api
-- vehicle_api
-- user_confirmed
-- unknown

traffic_level

passenger_count
passenger_source
-- user_confirmed
-- inferred
-- unknown

passenger_confidence_score

climate_usage
-- on
-- off
-- inferred
-- unknown

climate_usage_confidence_score
climate_inference_reason

cargo_load_level
-- none
-- light
-- heavy
-- inferred
-- unknown

road_type
-- city
-- highway
-- mixed
-- unknown

context_confidence_score

created_at
```

Klima bilgisi varsayılan olarak kullanıcıdan istenmez.

Sistem hava durumu, rota, tüketim sapması ve zaman bilgisinden çıkarım yapar.

---

## trip_behavior_signals

Sürüş stilinden çıkarılan sinyallerdir.

```sql
trip_behavior_signals

id
trip_id

avg_speed_delta_from_baseline
max_speed_delta_from_baseline

hard_acceleration_count
hard_braking_count

aggressive_driving_score
cautious_driving_score

speeding_duration_seconds
high_speed_duration_seconds

baseline_consumption_delta
baseline_duration_delta

inferred_passenger_presence
inferred_passenger_confidence_score

inference_reason

created_at
```

Amaç kullanıcıya sürekli soru sormadan yolcu, yük, sürüş stili gibi bağlamları tahmin etmektir.

---

## trip_context_questions

Sistemin kullanıcıya sorduğu bağlam sorularını tutar.

```sql
trip_context_questions

id
trip_id

question_type
-- passenger
-- climate
-- cargo
-- charge
-- service
-- other

question_text

system_reason
system_confidence_score

user_answer
answered_at

created_at
```

Sistem her yolculukta soru sormaz.

Akış:

```text
Trip
↓
Sapma
↓
Tahmin
↓
Emin değilse soru
↓
Doğrulama
↓
Öğrenme
↓
Sonraki sefer susma
```

---

# 9. Charging Domain

## charge_sessions

Şarj oturumudur.

```sql
charge_sessions

id
vehicle_id
ownership_id

started_at
ended_at

start_soc
end_soc
soc_delta

kwh_added
cost_tl

charge_type
-- AC
-- DC
-- unknown

charger_power_kw
station_id

ambient_temp_c
location

evidence_level
confidence_score

created_at
```

Şarj oturumu core eventtir.

---

## charge_evidence

Şarj kanıtlarıdır.

```sql
charge_evidence

id
charge_session_id

evidence_type
-- photo
-- invoice
-- user_confirmed
-- station_detected
-- api_verified

file_url
extracted_kwh
extracted_cost
extracted_start_soc
extracted_end_soc

confidence_score

created_at
```

OCR ve AI burada kullanılabilir.

Ancak karar motoru deterministic kalır.

---

# 10. Battery Lifecycle Domain

## battery_cycle_events

Her şarj oturumundan batarya döngü olayı üretilir.

```sql
battery_cycle_events

id
vehicle_id
ownership_id
charge_session_id

start_soc
end_soc
soc_delta

efc_value

soc_band

charge_type
-- AC
-- DC
-- unknown

ambient_temp_c
estimated_battery_temp_band

soc_stress_score
temperature_stress_score
charge_power_stress_score
dc_stress_score

stress_multiplier
stress_adjusted_cycle

confidence_score

created_at
```

Temel ayrım:

```text
EFC = gerçek eşdeğer tam döngü
Stress Adjusted Cycle = yıpranma katsayılı döngü
```

Örnek:

```text
%20 → %80 = 0.60 EFC
%60 → %80 = 0.20 EFC
%80 → %100 = 0.20 EFC
```

Ancak her SOC aralığı aynı yıpranmayı üretmez.

Örnek katsayı:

```text
%20 → %60    x1.00
%20 → %80    x1.05
%60 → %80    x1.10
%80 → %90    x1.30
%90 → %100   x1.60
```

DC şarj, sıcak hava ve yüksek SOC birleşirse katsayı artar.

---

## vehicle_battery_lifecycle_stats

Araç seviyesinde batarya yaşam özeti projection tablosudur.

```sql
vehicle_battery_lifecycle_stats

vehicle_id
ownership_id

total_efc
total_stress_adjusted_cycles

avg_charge_start_soc
avg_charge_end_soc

ac_charge_count
dc_charge_count
dc_charge_ratio

high_soc_charge_count
low_soc_charge_count

estimated_high_soc_hours
estimated_low_soc_events

avg_stress_multiplier

battery_usage_grade

last_calculated_at
```

Bu tablo ham veri değildir.

Core eventlerden hesaplanır.

İkinci el karnede şöyle anlatılabilir:

```text
Eşdeğer döngü: 420
Yıpranma eşdeğeri: 512
Kullanım profili: Yüksek SOC / DC ağırlıklı
Veri güveni: Orta
```

---

# 11. Service Domain

## service_visits

Servis ziyaretidir.

```sql
service_visits

id
vehicle_id
ownership_id

visited_at
service_provider
location

odometer_km

visit_type
-- maintenance
-- repair
-- battery_check
-- unknown

evidence_level
confidence_score

created_at
```

---

## service_evidence

Servis kanıtlarıdır.

```sql
service_evidence

id
service_visit_id

evidence_type
-- photo
-- invoice
-- user_confirmed
-- gps_detected
-- verified

file_url
extracted_text

confidence_score

created_at
```

Sistem “bakımlı/bakımsız” gibi yargılayıcı etiketler üretmez.

Bunun yerine:

```text
Son doğrulanmış bakım
Bakım takvimine uyum
Gecikmiş bakım
Doğrulama seviyesi
```

gösterir.

---

# 12. Route Fingerprint Domain

## route_fingerprints

Tekrarlayan rota profilidir.

```sql
route_fingerprints

id
vehicle_id
ownership_id

origin_cluster
destination_cluster

avg_distance_km
avg_duration_seconds
avg_consumption_soc
avg_consumption_kwh

avg_speed_kmh

trip_count

confidence_score

created_at
updated_at
```

Aynı rota tekrarlandıkça normal tüketim profili oluşur.

Sapma motoru bu tabloyu kullanır.

---

# 13. Route Planning Domain

## route_plans

Kullanıcının rota planıdır.

```sql
route_plans

id
user_id
vehicle_id
ownership_id

origin_location
destination_location

planned_departure_at

start_soc
target_arrival_soc

total_distance_km
estimated_duration_minutes

route_confidence_score

risk_level
-- low
-- medium
-- high

created_at
```

Ücretsiz katmanda kullanıcı hedef girerek temel menzil hesabı alır:

```text
Tahmini mesafe
Tahmini enerji tüketimi
Tahmini varış SOC
Yol yapılabilir mi?
Tahmini şarj ihtiyacı
```

---

## route_plan_user_inputs

Rota planlamadan önce kullanıcıdan alınan kritik değişkenlerdir.

```sql
route_plan_user_inputs

id
route_plan_id

passenger_count

cargo_load_level
-- none
-- light
-- heavy

climate_preference
-- auto
-- on
-- off

driving_style
-- eco
-- normal
-- fast

created_at
```

Bu form uzun tutulmaz.

Sadece sonucu ciddi etkileyen sorular sorulur.

---

## route_plan_segments

Rotayı parçalara böler.

```sql
route_plan_segments

id
route_plan_id

segment_order

start_location
end_location

distance_km
estimated_duration_minutes

road_type
-- city
-- highway
-- mixed

elevation_gain_m
avg_speed_estimate_kmh

estimated_consumption_kwh
estimated_soc_drop

confidence_score

created_at
```

---

## route_scenarios

Alternatif kullanım senaryolarıdır.

```sql
route_scenarios

id
route_plan_id

scenario_name

speed_profile
-- eco
-- normal
-- fast

climate_usage
-- on
-- off
-- estimated

passenger_count
cargo_load_level

estimated_arrival_soc
estimated_total_consumption_kwh

estimated_charge_stop_count
estimated_total_charge_time_minutes

risk_level

created_at
```

Örnek:

```text
Normal kullanım: 1 şarj, varış %18
Hızlı kullanım: 2 şarj, varış %11
Eco kullanım: şarjsız varış mümkün, varış %16
```

---

## route_strategies

Bir rota için farklı stratejiler üretir.

```sql
route_strategies

id
route_plan_id

strategy_type
-- safe
-- fast
-- economical

is_recommended

total_distance_km
estimated_duration_minutes
estimated_energy_cost

estimated_charge_count
estimated_total_charge_minutes

estimated_arrival_soc

route_confidence_score
risk_score

reason

created_at
```

Varsayılan strateji:

```text
SAFE / Güvenli Rota
```

Çünkü ürünün temel sorusu:

```text
Yolda kalır mıyım?
```

sorusudur.

---

## route_charge_stop_candidates

Rota üzerinde önerilen şarj duraklarıdır.

```sql
route_charge_stop_candidates

id
route_plan_id
route_strategy_id

station_id
connector_id

distance_from_origin_km
detour_distance_km

estimated_arrival_soc
estimated_departure_soc

estimated_charge_minutes

risk_score
reason

created_at
```

Sistem “Afyon civarı” demez.

Net istasyon önerir.

Örnek:

```text
Trugo Afyon Otoyol
180 kW DC
CCS2
Tahmini varış: %18
Önerilen çıkış: %72
Tahmini şarj: 24 dk
```

---

# 14. Charging Station Domain

## charging_stations

Şarj istasyonu bilgisidir.

```sql
charging_stations

id
provider
station_name

location
address

city
district
highway_name

is_active

source
last_verified_at

created_at
```

---

## charging_connectors

İstasyondaki soket bilgisidir.

```sql
charging_connectors

id
station_id

connector_type
-- CCS2
-- Type2
-- CHAdeMO
-- other

charger_type
-- AC
-- DC

max_power_kw
price_per_kwh

status
-- available
-- occupied
-- offline
-- unknown

last_status_checked_at

created_at
```

---

## station_availability_snapshots

Canlı veya dönemsel müsaitlik bilgisidir.

```sql
station_availability_snapshots

id
station_id
connector_id

available_connector_count
occupied_connector_count

status
-- available
-- busy
-- offline
-- unknown

source

checked_at
created_at
```

Kaynaklar:

```text
EPDK Şarj@TR
Operatör API’leri
Operatör uygulamaları
Kullanıcı doğrulamaları
Saha doğrulamaları
```

Her istasyon için veri güven seviyesi tutulur.

---

# 15. Advisory Domain

## trip_advisories

Yolculuk sırasında verilen sesli enerji koçu uyarılarıdır.

```sql
trip_advisories

id
trip_id

advisory_type
-- speed
-- consumption
-- charging
-- weather
-- traffic
-- route

severity
-- info
-- warning
-- critical

message
trigger_reason

acknowledged

created_at
```

MVP’de sistem kendi navigasyonunu yazmaz.

Google Maps’e ara duraklı rota gönderir.

Araç Karnesi arka planda menzil güven takibi yapar.

Plan sapması olursa sesli uyarı verir.

---

# 16. Trip Recap Domain

## trip_recaps

Yolculuk sonu özetidir.

```sql
trip_recaps

id
trip_id

distance_km
duration_minutes

charge_duration_minutes

energy_used_kwh
energy_cost

arrival_soc

passenger_count
climate_usage

efficiency_rating
driving_profile

trip_summary

created_at
```

Sistem “şoför puanı” vermez.

Bunun yerine:

```text
Sürüş karakteri
Enerji verimliliği
Yolculuk özeti
```

gösterir.

---

## trip_share_cards

Paylaşılabilir yolculuk kartlarıdır.

```sql
trip_share_cards

id
trip_id

card_type
-- story
-- whatsapp
-- x
-- public

public_token
share_count

created_at
```

Örnek paylaşım:

```text
Antalya → Ankara
487 km
1 şarj
412 TL
4 yolcu
Varış: %14
Araç Karnesi
```

---

# 17. Vehicle Registry Domain

## vehicle_state_snapshots

Araç sicili için dönemsel fotoğraftır.

```sql
vehicle_state_snapshots

id
vehicle_id
ownership_id

snapshot_at
odometer_km

total_efc
total_stress_adjusted_cycles

estimated_capacity_kwh
estimated_capacity_confidence

avg_consumption_kwh_100km

battery_usage_grade

data_confidence_score

created_at
```

Bu projection tablosudur.

Araç geçmişini zaman içinde izlemek için kullanılır.

---

## vehicle_public_reports

QR ile paylaşılabilir araç karnesidir.

```sql
vehicle_public_reports

id
vehicle_id
ownership_id

public_token

report_type
-- sale
-- monthly
-- annual
-- battery
-- ownership

visibility_status

created_at
expires_at
```

Public karne kişisel rota detaylarını göstermez.

Sadece araç seviyesinde anonimleştirilmiş özetleri gösterir.

---

## transfer_requests

Araç sicili devir sürecidir.

```sql
transfer_requests

id
vehicle_id

from_user_id
to_user_id

status
-- pending
-- accepted
-- rejected
-- expired

requested_at
responded_at

created_at
```

Devir iki taraflı onayla yapılır.

---

# 18. Community Benchmark Domain

## similar_trip_clusters

Benzer yolculuk kümeleridir.

```sql
similar_trip_clusters

id

vehicle_spec_id
route_cluster_id

passenger_bucket
-- 1
-- 2
-- 3_plus

cargo_bucket
-- none
-- light
-- heavy

climate_bucket
-- likely_on
-- likely_off
-- unknown

speed_profile_bucket
-- eco
-- normal
-- fast

temperature_bucket

trip_count

avg_consumption_kwh_100km
avg_soc_drop
avg_arrival_soc
avg_speed_kmh

confidence_score

last_calculated_at
```

Bu tablo anonim ve agregasyonlu çalışır.

Tekil kullanıcı verisi gösterilmez.

---

## route_community_benchmarks

Rota planına topluluk gerçekliği ekler.

```sql
route_community_benchmarks

id
route_plan_id
similar_trip_cluster_id

matched_trip_count
match_quality_score

community_avg_consumption
community_avg_soc_drop
community_avg_arrival_soc

community_warning

created_at
```

Örnek:

```text
Benzer sürüşlerde yüksek hız profili varış bataryasını ortalama %9 düşürdü.
```

---

# 19. Charging Behavior Intelligence Domain

## charging_decision_events

Şarj işlemi değil, şarj kararı anıdır.

```sql
charging_decision_events

id

trip_id
vehicle_id
ownership_id

decision_at

decision_location
decision_latitude
decision_longitude

road_segment_id

soc_at_decision

estimated_remaining_range_km

distance_since_trip_start_km
distance_from_destination_km
distance_to_next_station_km
distance_to_selected_station_km

current_speed_kmh

ambient_temp_c

passenger_bucket
cargo_bucket

decision_reason

selected_station_id

decision_cluster_id

created_at
```

Asıl değer:

```text
Nerede şarj edildi?
```

değil,

```text
Şarj ihtiyacı nerede ve neden oluştu?
```

sorusudur.

---

## charging_need_clusters

Şarj kararlarının davranışsal kümeleridir.

```sql
charging_need_clusters

id

vehicle_model
route_cluster

temperature_bucket
passenger_bucket
cargo_bucket

avg_decision_soc
avg_decision_distance_km
avg_charge_stop_distance_km

trip_count
confidence_score

last_calculated_at
```

Örnek insight:

```text
35°C üstü, 3+ yolcu, uzun yol EV kullanıcıları ortalama %28 SOC seviyesinde şarj aramaya başlıyor.
```

---

## charging_demand_hotspots

Şarj ihtiyacının oluştuğu konumsal kümelerdir.

```sql
charging_demand_hotspots

id

region
road_segment_id

center_location

event_count

avg_decision_soc
avg_temperature
avg_vehicle_range

avg_distance_to_station

demand_score
confidence_score

last_calculated_at
```

Bu enerji şirketleri için en değerli insight katmanlarından biridir.

Çünkü istasyon yatırımında kritik soru:

```text
Araçlar nerede şarj oldu?
```

değil,

```text
Şarj ihtiyacı hangi yol segmentinde doğdu?
```

sorusudur.

---

# 20. Insight ve Monetization Domain

## ad_segments

Davranış bazlı reklam segmentleridir.

```sql
ad_segments

id

segment_name
segment_type

criteria_json

estimated_user_count

created_at
updated_at
```

Örnek segmentler:

```text
Yıllık 30.000 km üstü EV kullanıcıları
Sık DC şarj kullananlar
Uzun yol ağırlıklı kullanıcılar
İkinci el satışa hazırlananlar
Batarya sağlığına önem verenler
```

---

## insight_queries

B2B analiz sorgularıdır.

```sql
insight_queries

id

customer_type
-- oem
-- charging_operator
-- insurance
-- fleet
-- energy_company

query_name
filters_json

result_summary
confidence_score

created_at
```

Örnek:

```text
Antalya
35°C üstü
BYD Seal
3+ yolcu
Uzun yol
İlk şarj kararı nerede veriliyor?
```

---

# 21. Ücretsiz / Premium Dataset Ayrımı

## Ücretsiz Katman

Ücretsiz katmanda kullanıcı şunları alabilir:

```text
Araç profili
Fabrika verileri
Temel rota/menzil hesabı
Trip kayıtları
Şarj geçmişi
Aylık karne
Yıllık karne
Temel benchmark
```

Rota girip km, enerji ve varış SOC hesaplatmak ücretsizdir.

Çünkü bu ürünün ana vaadidir.

---

## Premium Katman

Premium katman güvenlik ve operasyon desteğidir.

Premium özellikler:

```text
Net şarj istasyonu seçimi
Google Maps’e rota gönderimi
Yolda canlı takip
Plan sapma analizi
Sesli Enerji Koçu
Dinamik alternatif planlar
Güvenli / hızlı / ekonomik rota stratejileri
```

Ücretsiz katman:

```text
Bu yol yapılabilir mi?
```

sorusuna cevap verir.

Premium katman:

```text
Bu yolu en güvenli şekilde nasıl tamamlarım?
```

sorusuna cevap verir.

---

# 22. AI Kullanım Sınırı

AI karar motoru değildir.

AI şu alanlarda kullanılabilir:

```text
Araç model normalizasyonu
Kullanım kılavuzu özetleme
Fotoğraf/OCR veri çıkarma
Yolculuk özeti anlatımı
Kullanıcıya açıklama üretme
```

Karar motoru deterministic olmalıdır.

Örnek deterministic alanlar:

```text
SOC hesaplama
EFC hesaplama
Stress adjusted cycle
Route risk score
Charge stop selection
Route strategy comparison
Battery lifecycle projection
```
## 23A. Market / Catalog Availability Prensibi

## Amaç

Sistem yalnızca çoklu dili değil, çoklu ülke/pazar katalog gerçekliğini de desteklemelidir.

Dil kullanıcı arayüzünü belirler.

Pazar ise kullanıcıya hangi araçların, hangi satış adıyla ve hangi yerel satış durumuyla gösterileceğini belirler.

Bu iki kavram birbirine karıştırılmayacaktır.

```text
locale = tr / en / de
market_code = TR / GB / DE
```

Örnek:

```text
İngilizce arayüz kullanan bir Türkiye kullanıcısı TR kataloğunu görebilir.
Türkçe arayüz kullanan bir İngiltere kullanıcısı GB kataloğunu görebilir.
```

---

## Market Veri Modeli

İlk ayrım:

```sql
markets

code
-- TR
-- GB
-- DE

name
default_locale
currency
distance_unit
is_active
created_at
updated_at
```

Araç teknik gerçekliği `vehicle_specs` içinde kalır.

Pazarda görünürlük ve yerel satış gerçekliği ayrı tutulur:

```sql
vehicle_spec_market_availability

id
vehicle_spec_id
market_code

local_display_name
local_sales_status
-- active
-- discontinued
-- unknown
-- legacy_reference
-- needs_review

year_from
year_to

source_name
source_url
verification_level

created_at
updated_at
```

Bu sayede aynı teknik variant farklı pazarlarda farklı şekilde yönetilebilir.

Örnek:

```text
BMW i4 eDrive40
TR -> Edition M Sport adıyla aktif olabilir.
GB -> farklı trim adıyla aktif olabilir.
DE -> farklı paketlerle listelenebilir.
```

---

## Mobil Katalog Kuralı

Mobil katalog hiçbir zaman yalnızca dile göre seçilmez.

Doğru ayrım:

```text
locale kullanıcıya gösterilecek dili belirler.
market_code kullanıcıya gösterilecek araç kataloğunu belirler.
```

MVP yaklaşımı:

```text
Kullanıcı ülke/pazar seçer.
Default market = TR
İkinci planlanan market = GB
```

API ve export yaklaşımı:

```text
GET /vehicle-specs?market=TR
GET /vehicle-specs?market=GB

mobile_vehicle_catalog_TR.json
mobile_vehicle_catalog_GB.json
```

Eksik pazar verisi uydurulmaz.

Bir araç GB pazarında doğrulanmadıysa kullanıcıya aktif GB katalog aracı gibi gösterilmez; admin veri kalite backlog'u veya pending evidence olarak kalır.

---

## Admin ve Evidence Kuralı

Kaynak kanıtı pazara bağlı tutulmalıdır.

Örnek alanlar:

```text
market_code
source_country
local_sales_status
local_display_name
```

Tesla Türkiye kaynağı ile Tesla UK kaynağı aynı model ailesi için farklı satış gerçekliği verebilir. Bu fark hata olarak değil, pazar gerçekliği olarak yönetilir.

---

## Temel Kural

```text
Dil pazarı belirlemez.
Pazar dili belirlemez.
Araç teknik gerçekliği vehicle_specs içinde kalır.
Pazar görünürlüğü vehicle_spec_market_availability içinde yönetilir.
```

---

## 23. Localization (Çoklu Dil) Prensibi

## Amaç

Sistem çoklu dili destekleyecektir.

Ancak sistemin çekirdek veri modeli hiçbir zaman dile bağımlı olmayacaktır.

Localization bir kullanıcı arayüzü problemidir.

Domain modeli problemi değildir.

---

## Canonical Veri Prensibi

Tüm çekirdek veriler canonical tutulur.

Örnek:

* brand
* model
* variant_code
* road_type
* charge_type
* battery_chemistry
* charging_connector_type
* vehicle_class

Bu alanlar çevrilmez.

Database içerisinde tek bir gerçek değer bulunur.

Örnek:

```text
road_type = city
```

UI katmanı:

```text
TR -> Şehir İçi
EN -> City
DE -> Stadtverkehr
FR -> Ville
```

gösterebilir.

Ancak database içerisinde değer değişmez.

---

## Karar Motoru Prensibi

Karar motoru hiçbir zaman çevrilmiş metinlerle çalışmayacaktır.

Tüm hesaplamalar:

* canonical kodlar
* enum değerleri
* sayısal alanlar

üzerinden yapılacaktır.

Örnek:

Doğru:

```text
road_type = city
```

Yanlış:

```text
road_type = Şehir İçi
```

---

## AI Kullanımı

AI dahil hiçbir sistem çevrilmiş metinlere bağlı karar üretmeyecektir.

AI yalnızca:

* açıklama üretimi
* metin özetleme
* kullanıcıya anlatım
* veri normalizasyonu

katmanlarında kullanılabilir.

Karar üretimi canonical veri üzerinden yapılacaktır.

---

## MVP Yaklaşımı

İlk sürümde aşağıdaki yapı yeterlidir.

vehicle_specs:

* display_name_tr
* display_name_en

Örnek:

```text
canonical_name:
Tesla Model Y Long Range AWD

display_name_tr:
Tesla Model Y Uzun Menzil Dört Çeker

display_name_en:
Tesla Model Y Long Range AWD
```

---

## Gelecek Yapı

İleri sürümlerde çeviriler ayrı tabloda tutulabilir.

Örnek:

vehicle_spec_translations

* id
* vehicle_spec_id
* locale
* display_name
* marketing_name
* short_description
* created_at
* updated_at

Benzer yaklaşım:

* manual_rules
* maintenance_rules
* notification_templates
* benchmark_descriptions

için de kullanılabilir.

---

## Temel Kural

Çeviriler değişebilir.

Metinler değişebilir.

Diller değişebilir.

Ancak sistemin davranışı değişmez.

Tüm sistem canonical veri modeli üzerinden çalışır.

Localization katmanı yalnızca kullanıcıya gösterilecek dili belirler.




---

# 24. Temel Veri Prensipleri

Sistemin veri modeli şu prensiplere bağlı kalacaktır:

```text
Her şeyi sorma.
Önce gözlemle.
Sapma varsa tahmin et.
Emin değilsen sor.
Doğrulamayla öğren.
Sonraki sefer sus.
```

Kullanıcıdan veri istemek son çaredir.

Asıl güç davranıştan bağlam çıkarmaktır.

---

# 25. Kapanış

Bu dataset yapısı Araç Karnesi sistemini sadece bir EV takip uygulaması olmaktan çıkarır.

Sistem üç ana gerçekliği birlikte tutar:

```text
Araç ne yaptı?
Kullanıcı nasıl kullandı?
Şarj ihtiyacı nerede ve neden oluştu?
```

Bu nedenle ürünün uzun vadeli tanımı:

```text
Elektrikli araç kullanıcıları için gerçek kullanım, maliyet, şarj, batarya ve araç geçmişini görünür kılan; rota planlama, sesli enerji koçluğu ve B2B şarj davranışı içgörüleri üreten Vehicle Reality Layer.
```
