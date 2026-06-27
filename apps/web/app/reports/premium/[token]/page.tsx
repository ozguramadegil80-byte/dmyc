import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import PrintButton from './PrintButton';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportData = {
  vehicleSummary: {
    scenarioId: string;
    scenarioTitle: string;
    odometerKm: number;
    vehicleAgeYears: number;
    annualKm: number;
    practicalRangeKm: number | null;
    estimatedTotalFullCycles: number | null;
    city: string | null;
    cityTrafficClass: string | null;
  } | null;
  driverUsageProfile: {
    included: boolean;
    dataSource: string;
    confidence: string;
    drivingStyle: {
      label: string;
      score: number | null;
      signals: {
        factoryReferenceConsumptionKwhPer100Km: number | null;
        consumptionDeviationPercent: number | null;
        dcFastChargeRatio: number | null;
        highSocChargeCount: number | null;
        lowSocChargeCount: number | null;
        totalChargeCount: number | null;
        batteryUsageGrade: string | null;
      };
    };
    chargingStyle: {
      label: string;
      dcFastChargeRatio: number | null;
      highSocWaitingRisk: string;
      lowSocUsageRisk: string;
    };
    summary: string;
  };
  economicSummary: {
    totalKwh: number | null;
    currentTariffCost: number | null;
    activeTariffTlPerKwh: number | null;
    fossilEquivCost: number | null;
    estimatedSavingsTl: number | null;
    currency: string;
  };
  verificationSummary: {
    shareToken: string;
    verificationLevel: string;
    generatedAt: string;
  } | null;
  generatedAt: string;
};

type PremiumReportRow = {
  id: string;
  vehicleId: string;
  reportData: ReportData;
  drivingStyleLabel: string | null;
  drivingStyleScore: number | null;
  consumptionDeviationPercent: number | null;
  totalKwh: number | null;
  estimatedSavingsTl: number | null;
  confidence: string;
  createdAt: string;
  brand: string;
  model: string;
  variant: string;
  variantDisplayName: string;
  imageUrl: string | null;
  wltpRangeKm: number | null;
  vehicleDisplayName: string;
  vinLast5: string | null;
  identityLevel: string;
  nextInspectionDate: string | null;
  lastInspectionDate: string | null;
  lastServiceKm: number | null;
  lastServiceDate: string | null;
};

// ─── Data fetch ───────────────────────────────────────────────────────────────

const API_BASE = process.env.DMYC_API_URL ?? 'http://127.0.0.1:4311';

async function fetchReport(reportId: string): Promise<PremiumReportRow | null> {
  try {
    const res = await fetch(`${API_BASE}/public/premium-reports/${reportId}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<PremiumReportRow>;
  } catch {
    return null;
  }
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const report = await fetchReport(token);
  if (!report) return { title: 'Rapor Bulunamadı – DMyC' };
  return {
    title: `${report.brand} ${report.model} – DMyC EV Karnesi Premium Raporu`,
    description: `${report.variantDisplayName} için DMyC Premium EV Analiz Raporu`,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// http://localhost:4310/uploads/... → /uploads/... (host bağımsız, telefonda da çalışır)
function relativeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.replace(/^https?:\/\/[^/]+/, '');
}

function formatTL(val: number | null | undefined, fallback = '—') {
  if (val == null) return fallback;
  return `₺${Math.round(val).toLocaleString('tr-TR')}`;
}

function formatKm(val: number | null | undefined, fallback = '—') {
  if (val == null) return fallback;
  return `${Math.round(val).toLocaleString('tr-TR')} km`;
}

function normalizeGrade(raw: string | null | undefined): string {
  const map: Record<string, string> = { balanced: 'B+', watch: 'B', high_stress: 'C', unknown: 'unknown' };
  if (!raw) return 'unknown';
  return map[raw] ?? (['A+','A','B+','B','C','D'].includes(raw) ? raw : 'unknown');
}

function gradeColor(grade: string | null) {
  const g = normalizeGrade(grade);
  if (g === 'unknown') return '#849490';
  if (g === 'A+' || g === 'A') return '#4ade80';
  if (g === 'B+' || g === 'B') return '#facc15';
  if (g === 'C') return '#fb923c';
  return '#f87171';
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;700&family=JetBrains+Mono:wght@500;600&display=swap');
  .rpt-root { background:#080F10; color:#dfe3e4; font-family:'Inter',sans-serif; min-height:100vh; -webkit-font-smoothing:antialiased; }
  .rpt-sg { font-family:'Space Grotesk',sans-serif; }
  .rpt-mono { font-family:'JetBrains Mono',monospace; }
  .rpt-border { border:1px solid rgba(255,255,255,0.08); }
  .rpt-muted { color:#849490; }
  .rpt-cyan { color:#71ffe8; }
  .rpt-label { font-size:11px; letter-spacing:0.08em; font-weight:700; text-transform:uppercase; }
  .rpt-card { background:#181c1d; padding:24px; border-radius:12px; border:1px solid rgba(255,255,255,0.08); }
  .rpt-inner { background:#1c2021; border-radius:8px; border:1px solid rgba(59,74,70,0.3); }
  .rpt-sep { border-bottom:1px solid rgba(59,74,70,0.2); padding-bottom:8px; }
  .rpt-card:hover { border-color:rgba(0,229,204,0.35); transition:border-color 0.3s; }
  *, *::before, *::after { box-sizing:border-box; }
  .g2  { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .g3  { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
  .g75 { display:grid; grid-template-columns:7fr 5fr; gap:24px; align-items:start; }
  .rpt-hide-mobile { }

  @media (max-width:640px) {
    .g2  { grid-template-columns:1fr; }
    .g3  { grid-template-columns:1fr 1fr; }
    .g75 { grid-template-columns:1fr; }
    .rpt-card { padding:14px; }
    .rpt-hide-mobile { display:none !important; }
    main { padding:20px 12px 48px !important; }
  }

  @media print {
    @page { margin:12mm; size:A4; }
    .rpt-root { background:#fff !important; color:#111 !important; }
    .rpt-card { background:#f7f7f7 !important; border-color:#ddd !important; break-inside:avoid; }
    .rpt-inner { background:#eee !important; }
    header { position:static !important; }
    .rpt-no-print { display:none !important; }
    .rpt-muted { color:#555 !important; }
  }
`;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PremiumReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const report = await fetchReport(token);
  if (!report) notFound();

  const rd = report.reportData;
  const vs = rd.vehicleSummary;
  const dp = rd.driverUsageProfile;
  const ec = rd.economicSummary;

  const grade     = normalizeGrade(dp.drivingStyle.signals.batteryUsageGrade);
  const gColor    = gradeColor(grade);
  const driveScore = report.drivingStyleScore ?? dp.drivingStyle.score;
  const dcRatio   = dp.drivingStyle.signals.dcFastChargeRatio ?? null;
  const efc       = vs?.estimatedTotalFullCycles ?? null;
  const devPct    = report.consumptionDeviationPercent ?? dp.drivingStyle.signals.consumptionDeviationPercent;
  const totalCharges = dp.drivingStyle.signals.totalChargeCount ?? null;
  const energyBarPct = Math.min(100, Math.round(((ec.totalKwh ?? 0) / 5000) * 100));
  const vinDisplay   = report.vinLast5 ? `*****${report.vinLast5}` : null;
  const vinVerified  = report.identityLevel === 'vin_matched' && !!vinDisplay;
  const verif        = rd.verificationSummary;
  const createdAt    = new Date(report.createdAt).toLocaleDateString('tr-TR');

  const nextInsp = report.nextInspectionDate
    ? new Date(report.nextInspectionDate).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
    : null;
  const lastServLabel = report.lastServiceDate
    ? new Date(report.lastServiceDate).toLocaleDateString('tr-TR')
    : report.lastServiceKm
    ? `${report.lastServiceKm.toLocaleString('tr-TR')} km'de`
    : null;
  const nextServKm = report.lastServiceKm != null ? report.lastServiceKm + 15000 : null;

  return (
    <div className="rpt-root">
      {/* Inject styles */}
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ── Navbar ── */}
      <header style={{
        position:'sticky', top:0, zIndex:50,
        display:'flex', justifyContent:'space-between', alignItems:'center',
        padding:'0 16px', height:'56px', gap:8,
        background:'#0f1415', borderBottom:'1px solid rgba(255,255,255,0.08)',
      }}>
        <span className="rpt-sg rpt-cyan" style={{ fontSize:'18px', fontWeight:700, flexShrink:0 }}>DMyC</span>
        <span className="rpt-label rpt-cyan rpt-hide-mobile" style={{ borderBottom:'2px solid #71ffe8', paddingBottom:'2px' }}>
          EV KARNESİ · PREMİUM RAPOR
        </span>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span className="rpt-label rpt-muted rpt-hide-mobile" style={{ fontSize:'10px' }}>
            {report.id.slice(-8).toUpperCase()}
          </span>
          <div className="rpt-no-print"><PrintButton /></div>
        </div>
      </header>

      <main style={{ maxWidth:'1200px', margin:'0 auto', padding:'40px 24px 64px' }}>

        {/* ── 1. Araç Kimliği ── */}
        <section className="g75" style={{ marginBottom:'48px' }}>
          {/* Sol */}
          <div style={{ display:'flex', flexDirection:'column', justifyContent:'center' }}>
            {vinVerified && (
              <div style={{
                display:'inline-flex', alignItems:'center', gap:'6px',
                padding:'4px 12px', background:'rgba(0,80,71,0.25)',
                border:'1px solid rgba(113,255,232,0.2)', borderRadius:'999px',
                marginBottom:'20px', width:'fit-content',
              }}>
                <span className="rpt-cyan" style={{ fontSize:'14px' }}>✓</span>
                <span className="rpt-label rpt-cyan">VIN DOĞRULANDI · {vinDisplay}</span>
              </div>
            )}
            <h1 className="rpt-sg" style={{ fontSize:'40px', fontWeight:700, lineHeight:'48px', letterSpacing:'-0.02em', color:'#dfe3e4', marginBottom:'8px' }}>
              {report.brand} {report.model}
            </h1>
            <p className="rpt-muted" style={{ fontSize:'16px', marginBottom:'32px' }}>
              {report.variantDisplayName} · Premium EV Analizi
            </p>
            <div className="g2">
              <div className="rpt-card" style={{ padding:'16px' }}>
                <p className="rpt-label rpt-muted" style={{ marginBottom:'4px' }}>Sistem Yaşı</p>
                <p className="rpt-sg" style={{ fontSize:'18px', fontWeight:600 }}>{vs?.vehicleAgeYears ?? '—'} Yıl</p>
              </div>
              <div className="rpt-card" style={{ padding:'16px' }}>
                <p className="rpt-label rpt-muted" style={{ marginBottom:'4px' }}>Odometre</p>
                <p className="rpt-sg" style={{ fontSize:'18px', fontWeight:600 }}>{vs ? formatKm(vs.odometerKm) : '—'}</p>
              </div>
            </div>
          </div>

          {/* Sağ: görsel + batarya badge */}
          <div style={{ position:'relative' }}>
            <div className="rpt-border" style={{ borderRadius:'12px', overflow:'hidden', background:'#1c2021', aspectRatio:'4/3' }}>
              {report.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={relativeUrl(report.imageUrl)!} alt={`${report.brand} ${report.model}`} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              ) : (
                <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#3b4a46', fontSize:'14px' }}>
                  Görsel yok
                </div>
              )}
            </div>
            <div style={{
              position:'absolute', bottom:'-16px', right:'-16px',
              background:'#00e5cc', color:'#003730',
              padding:'20px 24px', borderRadius:'12px',
              boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
              textAlign:'center',
            }}>
              <p className="rpt-label" style={{ marginBottom:'4px', color:'#003730' }}>BATARYA NOTU</p>
              <p className="rpt-sg" style={{ fontSize:'40px', fontWeight:700, lineHeight:1, color:'#003730' }}>{grade}</p>
            </div>
          </div>
        </section>

        {/* ── 2. 3-Kolon Grid ── */}
        <section className="g3" style={{ marginBottom:'48px', marginTop:'24px' }}>

          {/* Şoför Profili */}
          <div className="rpt-card" style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <h3 className="rpt-sg" style={{ fontSize:'18px', fontWeight:600 }}>Şoför Profili</h3>
              <span style={{ fontSize:'20px' }}>👤</span>
            </div>
            <div className="rpt-inner" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'16px' }}>
              <span className="rpt-mono rpt-cyan" style={{ fontSize:'48px', fontWeight:700, lineHeight:1 }}>
                {driveScore ?? '—'}
              </span>
              <span className="rpt-label rpt-muted" style={{ marginTop:'8px' }}>
                {report.drivingStyleLabel ?? dp.drivingStyle.label}
              </span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {[
                { label: 'DC Hızlı Şarj', value: dcRatio != null ? `%${dcRatio}` : '—', highlight: false },
                { label: 'Tüketim Sapması', value: devPct != null ? `${devPct > 0 ? '+' : ''}%${devPct}` : '—', highlight: devPct != null && devPct <= 0 },
                { label: 'EFC (Çevrim)', value: efc ? String(Math.round(efc)) : '—', highlight: false },
              ].map(row => (
                <div key={row.label} className="rpt-sep" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span className="rpt-muted" style={{ fontSize:'14px' }}>{row.label}</span>
                  <span className="rpt-mono" style={{ fontSize:'14px', color: row.highlight ? '#91ffae' : '#dfe3e4' }}>{row.value}</span>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span className="rpt-muted" style={{ fontSize:'14px' }}>Batarya Notu</span>
                <span style={{ padding:'2px 8px', background:`${gColor}18`, color:gColor, borderRadius:'4px', fontWeight:700, fontSize:'14px' }}>
                  {grade}
                </span>
              </div>
            </div>
          </div>

          {/* Ekonomik Özet */}
          <div className="rpt-card" style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <h3 className="rpt-sg" style={{ fontSize:'18px', fontWeight:600 }}>Ekonomik Özet</h3>
              <span style={{ fontSize:'20px' }}>💼</span>
            </div>
            <div>
              <p className="rpt-label rpt-muted" style={{ marginBottom:'4px' }}>Toplam Mesafe</p>
              <p className="rpt-mono" style={{ fontSize:'20px', fontWeight:600 }}>
                {vs ? `${(vs.annualKm * vs.vehicleAgeYears).toLocaleString('tr-TR')} km` : '—'}
              </p>
            </div>
            <div className="g2" style={{ gap:'12px' }}>
              <div className="rpt-inner" style={{ padding:'12px' }}>
                <p className="rpt-label rpt-muted" style={{ fontSize:'9px', marginBottom:'4px' }}>ENERJİ MALİYETİ</p>
                <p className="rpt-mono" style={{ fontSize:'14px' }}>{formatTL(ec.currentTariffCost)}</p>
              </div>
              <div style={{ background:'#1c2021', padding:'12px', borderRadius:'8px', border:'1px solid rgba(145,255,174,0.2)' }}>
                <p className="rpt-label" style={{ fontSize:'9px', color:'#91ffae', marginBottom:'4px' }}>TASARRUF</p>
                <p className="rpt-mono" style={{ fontSize:'14px', color:'#91ffae' }}>{formatTL(ec.estimatedSavingsTl)}</p>
              </div>
            </div>
            <div style={{ marginTop:'auto', paddingTop:'16px', borderTop:'1px solid rgba(59,74,70,0.3)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span className="rpt-muted" style={{ fontSize:'14px' }}>Toplam Enerji</span>
                <span className="rpt-mono" style={{ fontSize:'14px' }}>
                  {ec.totalKwh ? `${Math.round(ec.totalKwh).toLocaleString('tr-TR')} kWh` : '—'}
                </span>
              </div>
              <div style={{ width:'100%', background:'#1c2021', height:'6px', borderRadius:'999px', marginTop:'8px', overflow:'hidden' }}>
                <div style={{ background:'#71ffe8', height:'100%', width:`${energyBarPct}%`, borderRadius:'999px' }} />
              </div>
            </div>
          </div>

          {/* Araç Durumu */}
          <div className="rpt-card" style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'4px' }}>
              <h3 className="rpt-sg" style={{ fontSize:'18px', fontWeight:600 }}>Araç Durumu</h3>
              <span style={{ fontSize:'20px' }}>📊</span>
            </div>
            <div className="g2" style={{ gap:'8px' }}>
              {[
                { label:'ŞARJ SEANSLAR', value: totalCharges != null ? `${totalCharges} adet` : '—' },
                { label:'WLTP MENZİL', value: report.wltpRangeKm ? `${report.wltpRangeKm} km` : '—' },
                { label:'YILLIK KM', value: vs ? formatKm(vs.annualKm) : '—' },
                { label:'PRATİK MENZİL', value: vs?.practicalRangeKm ? `${vs.practicalRangeKm} km` : '—' },
              ].map(item => (
                <div key={item.label} className="rpt-inner" style={{ padding:'12px' }}>
                  <span className="rpt-label rpt-muted" style={{ fontSize:'9px', display:'block', marginBottom:'2px' }}>{item.label}</span>
                  <span className="rpt-mono" style={{ fontSize:'13px' }}>{item.value}</span>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginTop:'8px' }}>
              {[
                lastServLabel ? { icon:'🔧', label:'SON SERVİS', value: lastServLabel } : null,
                nextInsp ? { icon:'📅', label:'SONRAKİ MUAYENE', value: nextInsp } : null,
                nextServKm ? { icon:'🔄', label:'SONRAKİ BAKIM', value: `${nextServKm.toLocaleString('tr-TR')} km` } : null,
              ].filter(Boolean).map(item => (
                <div key={item!.label} style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <div className="rpt-inner" style={{ width:'32px', height:'32px', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'4px', flexShrink:0 }}>
                    <span style={{ fontSize:'14px' }}>{item!.icon}</span>
                  </div>
                  <div>
                    <p className="rpt-label rpt-muted" style={{ fontSize:'9px', lineHeight:1, marginBottom:'2px' }}>{item!.label}</p>
                    <p style={{ fontSize:'14px', color:'#dfe3e4' }}>{item!.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. Analiz Notu ── */}
        <section style={{ marginBottom:'48px' }}>
          <div style={{
            background:'rgba(38,43,44,0.4)', padding:'32px', borderRadius:'12px',
            border:'1px solid rgba(255,255,255,0.08)',
            borderLeft:'4px solid #71ffe8',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px' }}>
              <span style={{ fontSize:'22px' }}>📈</span>
              <h3 className="rpt-sg" style={{ fontSize:'18px', fontWeight:600 }}>Uzman Analiz Notu</h3>
            </div>
            <p style={{ fontSize:'16px', lineHeight:'28px', maxWidth:'800px', color:'#dfe3e4' }}>
              {dp.summary}
            </p>
          </div>
        </section>

        {/* ── 4. Doğrulama ── */}
        {verif && (
          <section style={{ marginBottom:'48px' }}>
            <div className="rpt-card" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px' }}>
              <div>
                <p className="rpt-label rpt-cyan" style={{ marginBottom:'4px' }}>
                  ✓ DOĞRULANMIŞ RAPOR · {verif.verificationLevel.toUpperCase()}
                </p>
                <p className="rpt-muted" style={{ fontSize:'12px' }}>Token: {verif.shareToken}</p>
              </div>
              <div className="rpt-label rpt-muted" style={{ fontSize:'10px', textAlign:'right' }}>
                <p>{new Date(verif.generatedAt).toLocaleDateString('tr-TR')}</p>
                <p>{dp.confidence.toUpperCase()}</p>
              </div>
            </div>
          </section>
        )}

        {/* ── Footer ── */}
        <footer style={{ borderTop:'1px solid rgba(59,74,70,0.5)', paddingTop:'40px', display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:'16px' }}>
          <div>
            <p className="rpt-sg" style={{ fontSize:'18px', fontWeight:600, marginBottom:'12px' }}>DMyC Digital Mobility Control</p>
            <p className="rpt-label rpt-muted" style={{ marginBottom:'4px' }}>
              RAPOR ID: <span style={{ color:'#dfe3e4' }}>{report.id.slice(-8).toUpperCase()}</span>
            </p>
            <p className="rpt-label rpt-muted" style={{ marginBottom:'16px' }}>
              OLUŞTURMA: <span style={{ color:'#dfe3e4' }}>{createdAt}</span>
            </p>
            <p style={{ fontSize:'10px', color:'rgba(132,148,144,0.6)', fontStyle:'italic' }}>
              © 2025 DMyC Digital Mobility Control. Tüm hakları saklıdır.
            </p>
          </div>
          <div className="rpt-card" style={{ textAlign:'right' }}>
            <p className="rpt-label rpt-cyan" style={{ fontSize:'10px', marginBottom:'4px' }}>DOĞRULAMAK İÇİN</p>
            <p className="rpt-mono rpt-muted" style={{ fontSize:'11px' }}>
              dmyc.digital/reports/premium/{report.id}
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
