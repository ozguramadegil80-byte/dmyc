-- Migration 056: Şarj seanslarına km takibi ve maliyet anomali flag'i
ALTER TABLE charge_sessions
  ADD COLUMN IF NOT EXISTS km_since_last_charge numeric(10,1),
  ADD COLUMN IF NOT EXISTS gps_estimated_km     numeric(10,1),
  ADD COLUMN IF NOT EXISTS cost_anomaly_flag    boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN charge_sessions.km_since_last_charge IS 'Kullanıcının onayladığı veya girdiği son şarjdan bu yana gidilen km';
COMMENT ON COLUMN charge_sessions.gps_estimated_km     IS 'Son şarj GPS noktasından mevcut GPS noktasına Haversine mesafesi (km)';
COMMENT ON COLUMN charge_sessions.cost_anomaly_flag    IS 'True ise girilen maliyet/kWh oranı EPDK referanstan çok sapıyor';
