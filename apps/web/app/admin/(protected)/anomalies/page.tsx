import { fetchAdminAnomalies, type AnomalousSession } from '../../../../src/lib/adminReviewApi';

function fmt(v: number | null, suffix = '') {
  if (v == null) return '—';
  return `${v.toLocaleString('tr-TR')}${suffix}`;
}

export default async function AnomaliesAdminPage() {
  let sessions: AnomalousSession[] = [];
  try {
    sessions = await fetchAdminAnomalies(100);
  } catch {
    sessions = [];
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#dfe3e4', margin: 0 }}>
          Maliyet Anomalileri
        </h1>
        <p style={{ color: '#849490', fontSize: 13, marginTop: 6 }}>
          EPDK referans tarife ile karşılaştırıldığında ₺/kWh oranı 5× fazla veya 0.1× az olan şarj kayıtları.
          Yüksek oran DC istasyon şarjı, düşük oran hatalı giriş belirtisi olabilir.
        </p>
      </div>

      {sessions.length === 0 ? (
        <div style={{
          background: '#181c1d', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10, padding: 40, textAlign: 'center', color: '#849490',
        }}>
          Anomali kaydı bulunamadı.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Araç', 'Şarj Tipi', 'Enerji (kWh)', 'Maliyet (₺)', '₺/kWh', 'Tarih', 'ID'].map((h) => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '10px 12px',
                    color: '#849490', fontWeight: 600, fontSize: 11,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px', color: '#dfe3e4', fontWeight: 600 }}>
                    {s.brand} {s.model}
                  </td>
                  <td style={{ padding: '12px', color: '#849490' }}>
                    {s.chargeLocationType}
                  </td>
                  <td style={{ padding: '12px', color: '#dfe3e4', fontFamily: 'monospace' }}>
                    {fmt(s.energyKwh, ' kWh')}
                  </td>
                  <td style={{ padding: '12px', color: '#dfe3e4', fontFamily: 'monospace' }}>
                    {fmt(s.costAmount, ' ₺')}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      background: 'rgba(251,146,60,0.12)',
                      border: '1px solid rgba(251,146,60,0.3)',
                      color: '#fb923c',
                      borderRadius: 4, padding: '2px 8px',
                      fontFamily: 'monospace', fontWeight: 700,
                    }}>
                      {s.costPerKwh != null ? `${s.costPerKwh} ₺/kWh` : '—'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#849490', fontSize: 12 }}>
                    {new Date(s.createdAt).toLocaleString('tr-TR')}
                  </td>
                  <td style={{ padding: '12px', color: '#3b4a46', fontSize: 10, fontFamily: 'monospace' }}>
                    {s.id.slice(-8).toUpperCase()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ color: '#3b4a46', fontSize: 11, marginTop: 12 }}>
            {sessions.length} kayıt · Son 100 gösteriliyor
          </p>
        </div>
      )}
    </div>
  );
}
