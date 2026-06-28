import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import PrintButton from './PrintButton';

// ─── Types ────────────────────────────────────────────────────────────────────

type KaskoEstimate = {
  estimatedMin: number;
  estimatedMax: number;
  ageFactor: number;
  batteryFactor: number;
  kmFactor: number;
} | null;

type KaskoReportRow = {
  id: string;
  vehicleId: string;
  createdAt: string;
  brand: string;
  model: string;
  variant: string;
  variantDisplayName: string;
  imageUrl: string | null;
  yearFrom: number | null;
  wltpRangeKm: number | null;
  listPriceTry: string | null;
  listPriceYear: number | null;
  vinLast5: string | null;
  identityLevel: string;
  odometerKm: number | null;
  vehicleAgeYears: number | null;
  annualKm: number | null;
  monthlyKm: number | null;
  city: string | null;
  cityTrafficClass: string | null;
  totalEfc: string | null;
  dcChargeRatio: string | null;
  batteryUsageGrade: string | null;
  acChargeCount: number | null;
  dcChargeCount: number | null;
  highSocChargeCount: number | null;
  lowSocChargeCount: number | null;
  nextInspectionDate: string | null;
  lastInspectionDate: string | null;
  inspectionResult: string | null;
  lastServiceKm: number | null;
  lastServiceDate: string | null;
  serviceEventCount: number;
  vehiclePhotoUrls: string[];
  kondisyon: number;
  estimate: KaskoEstimate;
};

// ─── Data fetch ───────────────────────────────────────────────────────────────

const API_BASE = process.env.DMYC_API_URL ?? 'http://127.0.0.1:4311';

async function fetchReport(reportId: string): Promise<KaskoReportRow | null> {
  try {
    const res = await fetch(`${API_BASE}/public/kasko-reports/${reportId}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<KaskoReportRow>;
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
    title: `${report.brand} ${report.model} – Kasko Değer Karnesi | DMyC`,
    description: `${report.variantDisplayName} için tahmini kasko değeri ve EV kondüsyon analizi`,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function gradeColor(grade: string | null) {
  if (!grade || grade === 'unknown') return '#849490';
  if (grade === 'A+') return '#71ffe8';
  if (grade === 'A') return '#4ade80';
  if (grade === 'B+') return '#a3e635';
  if (grade === 'B') return '#facc15';
  if (grade === 'C') return '#fb923c';
  return '#f87171';
}

function gradeLabel(grade: string | null) {
  if (!grade || grade === 'unknown') return '—';
  return grade;
}

function formatDate(iso: string | null | undefined, fallback = '—') {
  if (!iso) return fallback;
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function safetyIndex(grade: string | null, dcPct: number, inspectionResult: string | null): number {
  const base: Record<string, number> = {
    'A+': 100, 'A': 90, 'B+': 80, 'B': 67, 'C': 52, 'D': 36, 'unknown': 70,
  };
  let score = base[grade ?? 'unknown'] ?? 70;
  score -= Math.max(0, (dcPct - 25) / 10) * 2;
  if (inspectionResult === 'passed') score += 3;
  else if (inspectionResult === 'failed') score -= 8;
  return Math.round(Math.min(100, Math.max(0, score)));
}

function scoreLabel(score: number): { text: string; color: string } {
  if (score >= 90) return { text: 'Mükemmel', color: '#71ffe8' };
  if (score >= 78) return { text: 'İyi', color: '#4ade80' };
  if (score >= 63) return { text: 'Orta', color: '#facc15' };
  if (score >= 45) return { text: 'Zayıf', color: '#fb923c' };
  return { text: 'Kritik', color: '#f87171' };
}

function dcPercent(ratio: string | null | undefined): number {
  if (!ratio) return 0;
  return Math.round(Number(ratio) * 100);
}

function efc(totalEfc: string | null | undefined): number {
  if (!totalEfc) return 0;
  return Math.round(Number(totalEfc));
}

function ageYears(row: KaskoReportRow): number {
  if (row.vehicleAgeYears != null) return Math.max(0, Math.round(Number(row.vehicleAgeYears)));
  if (row.yearFrom != null) return Math.max(0, new Date().getFullYear() - row.yearFrom);
  return 0;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;700&family=JetBrains+Mono:wght@500;600&display=swap');
  *, *::before, *::after { box-sizing:border-box; }
  .rpt-root { background:#080F10; color:#dfe3e4; font-family:'Inter',sans-serif; min-height:100vh; -webkit-font-smoothing:antialiased; }
  .rpt-sg { font-family:'Space Grotesk',sans-serif; }
  .rpt-mono { font-family:'JetBrains Mono',monospace; }
  .rpt-muted { color:#849490; }
  .rpt-cyan { color:#71ffe8; }
  .rpt-label { font-size:11px; letter-spacing:0.08em; font-weight:700; text-transform:uppercase; }
  .rpt-card { background:#181c1d; padding:24px; border-radius:12px; border:1px solid rgba(255,255,255,0.08); }
  .rpt-card:hover { border-color:rgba(0,229,204,0.25); transition:border-color 0.3s; }
  .rpt-inner { background:#1c2021; border-radius:8px; border:1px solid rgba(59,74,70,0.3); padding:16px; }
  .rpt-sep { border-bottom:1px solid rgba(59,74,70,0.2); }

  /* ── Responsive grid yardımcı sınıfları ── */
  .g2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .g3 { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
  .g4 { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
  .g2-header { display:grid; grid-template-columns:1fr 1fr; gap:24px; }

  @media (max-width:640px) {
    .g2 { grid-template-columns:1fr; }
    .g3 { grid-template-columns:1fr 1fr; }
    .g4 { grid-template-columns:1fr 1fr; }
    .g2-header { grid-template-columns:1fr; }
    .rpt-card { padding:16px; }
    .rpt-hide-mobile { display:none !important; }
  }

  /* ── Print / PDF ── */
  @media print {
    @page { margin:12mm; size:A4; }
    .rpt-root { background:#fff !important; color:#111 !important; }
    .rpt-card { background:#f7f7f7 !important; border-color:#ddd !important; break-inside:avoid; }
    .rpt-inner { background:#eee !important; }
    .rpt-navbar { position:static !important; }
    .rpt-no-print { display:none !important; }
    .rpt-muted { color:#555 !important; }
    a { text-decoration:none; }
  }
`;

// ─── Battery Grade Bar ────────────────────────────────────────────────────────

const GRADE_SEGMENTS = [
  { label: 'A+', color: '#71ffe8', width: 14 },
  { label: 'A',  color: '#4ade80', width: 15 },
  { label: 'B+', color: '#a3e635', width: 15 },
  { label: 'B',  color: '#facc15', width: 17 },
  { label: 'C',  color: '#fb923c', width: 20 },
  { label: 'D',  color: '#f87171', width: 19 },
];

function GradeBar({ grade, efcVal }: { grade: string | null; efcVal: number }) {
  const markerLeft = Math.min(99, Math.max(1, (efcVal / 500) * 100));
  const active = grade === 'unknown' ? null : grade;

  let cumWidth = 0;
  const segments = GRADE_SEGMENTS.map((seg) => {
    const start = cumWidth;
    cumWidth += seg.width;
    const isActive = seg.label === active;
    return { ...seg, start, isActive };
  });

  return (
    <div>
      {/* Bar */}
      <div style={{ position: 'relative', height: 12, borderRadius: 6, overflow: 'visible', display: 'flex', gap: 2 }}>
        {segments.map((seg) => (
          <div
            key={seg.label}
            style={{
              flex: seg.width,
              background: seg.color,
              borderRadius: 4,
              opacity: seg.isActive ? 1 : 0.25,
              transition: 'opacity 0.2s',
              position: 'relative',
            }}
          />
        ))}
        {/* EFC marker */}
        <div
          style={{
            position: 'absolute',
            left: `${markerLeft}%`,
            top: -6,
            transform: 'translateX(-50%)',
            width: 2,
            height: 24,
            background: 'rgba(255,255,255,0.7)',
            borderRadius: 1,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `${markerLeft}%`,
            top: -22,
            transform: 'translateX(-50%)',
            background: 'rgba(30,35,36,0.9)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 4,
            padding: '2px 6px',
            fontSize: 10,
            whiteSpace: 'nowrap',
            color: '#dfe3e4',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          {efcVal} EFC (dönem)
        </div>
      </div>
      {/* Labels */}
      <div style={{ display: 'flex', gap: 2, marginTop: 6 }}>
        {segments.map((seg) => (
          <div
            key={seg.label}
            style={{
              flex: seg.width,
              textAlign: 'center',
              fontSize: 10,
              fontWeight: 700,
              color: seg.isActive ? seg.color : '#849490',
            }}
          >
            {seg.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Circular Gauge ───────────────────────────────────────────────────────────

function CircularGauge({ score, color }: { score: number; color: string }) {
  const R = 45;
  const C = 2 * Math.PI * R; // 282.74
  const offset = C * (1 - score / 100);

  return (
    <svg width={120} height={120} viewBox="0 0 120 120" style={{ display: 'block', margin: '0 auto' }}>
      {/* Track */}
      <circle
        cx={60} cy={60} r={R}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={10}
      />
      {/* Fill */}
      <circle
        cx={60} cy={60} r={R}
        fill="none"
        stroke={color}
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={C.toFixed(2)}
        strokeDashoffset={offset.toFixed(2)}
        transform="rotate(-90 60 60)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      {/* Score text */}
      <text
        x={60} y={55}
        textAnchor="middle"
        fill={color}
        fontSize={22}
        fontWeight={700}
        fontFamily="Space Grotesk, sans-serif"
      >
        {score}
      </text>
      <text
        x={60} y={72}
        textAnchor="middle"
        fill="#849490"
        fontSize={10}
        fontFamily="Inter, sans-serif"
      >
        / 100
      </text>
    </svg>
  );
}

// ─── Factor Badge ─────────────────────────────────────────────────────────────

function FactorRow({ label, value, pct, color = '#71ffe8' }: {
  label: string; value: string; pct: number; color?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <div style={{ width: 90, fontSize: 11, color: '#849490', flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <div style={{ width: 50, textAlign: 'right', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color }}>{value}</div>
    </div>
  );
}

// ─── Stat Cell ────────────────────────────────────────────────────────────────

function StatCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: '#849490', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', color: '#dfe3e4' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#849490', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function KaskoReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const r = await fetchReport(token);
  if (!r) notFound();

  const gradeVal = r.batteryUsageGrade ?? 'unknown';
  const dcPct    = dcPercent(r.dcChargeRatio);
  const efcVal   = efc(r.totalEfc);
  const age      = ageYears(r);
  const kondisyonScore = r.kondisyon;
  const safetyScore    = safetyIndex(gradeVal, dcPct, r.inspectionResult);
  const kondLabel      = scoreLabel(kondisyonScore);
  const safeLabel      = scoreLabel(safetyScore);

  const listPrice = r.listPriceTry ? Number(r.listPriceTry) : null;
  const est       = r.estimate;

  const totalCharges = (r.acChargeCount ?? 0) + (r.dcChargeCount ?? 0);

  // Model-yaş uyumsuzluk guard: araç üretim yılından beklenen yaş ile verilen yaş 2+ yıl farklıysa uyar
  const expectedAge = r.yearFrom ? new Date().getFullYear() - r.yearFrom : null;
  const ageInconsistent = expectedAge !== null && age !== null && Math.abs(expectedAge - age) >= 2;

  // Km yorumu: 20k altı az, 40k üstü yoğun, 60k üstü çok yoğun
  const annualKm = r.annualKm ?? 0;
  const kmContextNote =
    annualKm >= 60000 ? `Bu araç yaşına göre çok yüksek kilometre kullanımı gösteriyor (yıllık ~${Math.round(annualKm / 1000)}k km). Değer hesabında kilometre faktörü baskın etki yarattı.`
    : annualKm >= 40000 ? `Bu araç yıllık ortalamanın üzerinde kullanılmış (~${Math.round(annualKm / 1000)}k km/yıl). Bu yoğun kullanım değer hesabını aşağı çekiyor.`
    : null;

  const hasInspection = !!(r.lastInspectionDate || r.nextInspectionDate || r.inspectionResult);
  const hasService    = r.serviceEventCount > 0 || r.lastServiceKm != null;

  return (
    <div className="rpt-root">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ── Navbar ── */}
      <div className="rpt-navbar" style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(8,15,16,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg,#71ffe8 0%,#00b3a4 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 13, color: '#080F10', fontFamily: 'Space Grotesk, sans-serif',
          }}>D</div>
          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', flexShrink: 0 }}>DMyC</span>
          <span style={{
            background: 'rgba(113,255,232,0.12)', color: '#71ffe8',
            fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
            letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0,
          }} className="rpt-hide-mobile">Kasko Değer Karnesi</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 11, color: '#849490' }} className="rpt-hide-mobile">{formatDate(r.createdAt)}</div>
          <div className="rpt-no-print"><PrintButton /></div>
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px 64px' }}>

        {/* ── Vehicle Header ── */}
        <div className="g2-header" style={{ marginBottom: 28 }}>
          {/* Image + grade badge */}
          <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#181c1d', border: '1px solid rgba(255,255,255,0.08)', minHeight: 220, aspectRatio: '16/9' }}>
            {r.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={relativeUrl(r.imageUrl)!} alt={`${r.brand} ${r.model}`} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', padding: 12 }} />
            ) : (
              <div style={{ width: '100%', height: '100%', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#849490', fontSize: 13 }}>
                Araç Görseli
              </div>
            )}
            {/* Grade badge */}
            <div style={{
              position: 'absolute', bottom: 12, right: 12,
              background: gradeColor(gradeVal),
              color: '#080F10',
              fontFamily: 'Space Grotesk, sans-serif',
              fontWeight: 700, fontSize: 18,
              width: 44, height: 44, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
            }}>
              {gradeLabel(gradeVal)}
            </div>
          </div>

          {/* Vehicle info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div className="rpt-label rpt-muted" style={{ marginBottom: 4 }}>{r.brand}</div>
              <div className="rpt-sg" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>{r.model}</div>
              <div style={{ fontSize: 13, color: '#849490', marginTop: 4 }}>{r.variantDisplayName}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
              <div className="rpt-inner" style={{ padding: '10px 14px' }}>
                <div className="rpt-label rpt-muted" style={{ marginBottom: 2, fontSize: 10 }}>Araç Yaşı</div>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif' }}>{age} yıl</div>
              </div>
              <div className="rpt-inner" style={{ padding: '10px 14px' }}>
                <div className="rpt-label rpt-muted" style={{ marginBottom: 2, fontSize: 10 }}>Kilometre</div>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif' }}>{formatKm(r.odometerKm)}</div>
              </div>
              <div className="rpt-inner" style={{ padding: '10px 14px' }}>
                <div className="rpt-label rpt-muted" style={{ marginBottom: 2, fontSize: 10 }}>Şehir</div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif' }}>{r.city ?? '—'}</div>
              </div>
              <div className="rpt-inner" style={{ padding: '10px 14px' }}>
                <div className="rpt-label rpt-muted" style={{ marginBottom: 2, fontSize: 10 }}>WLTP Menzil</div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif' }}>{r.wltpRangeKm ? `${r.wltpRangeKm} km` : '—'}</div>
              </div>
            </div>

            {/* Identity level */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                padding: '3px 8px', borderRadius: 20,
                background: r.identityLevel === 'verified' ? 'rgba(113,255,232,0.12)' : 'rgba(255,255,255,0.06)',
                color: r.identityLevel === 'verified' ? '#71ffe8' : '#849490',
              }}>
                {r.identityLevel === 'verified' ? 'Doğrulanmış' : 'Tahmini Rapor'}
              </div>
              {r.vinLast5 && (
                <div style={{ fontSize: 10, color: '#849490', fontFamily: 'JetBrains Mono, monospace' }}>
                  VIN …{r.vinLast5}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Model-yaş uyumsuzluk uyarısı ── */}
        {ageInconsistent && (
          <div style={{
            background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 16,
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>⚠</span>
            <div style={{ fontSize: 12, color: '#fed7aa', lineHeight: 1.6 }}>
              <strong>Model-yaş uyumsuzluğu:</strong> {r.yearFrom} model yılı için beklenen araç yaşı yaklaşık {expectedAge} yıl, ancak raporda {age} yıl görünüyor. Doğru sonuç için model yılı bilgisini kontrol edin.
            </div>
          </div>
        )}

        {/* ── Scores Row ── */}
        <div className="g2" style={{ marginBottom: 20 }}>
          {/* EV Kondisyon Skoru */}
          <div className="rpt-card">
            <div className="rpt-label rpt-muted" style={{ marginBottom: 16 }}>EV Kondüsyon Skoru</div>
            <CircularGauge score={kondisyonScore} color={kondLabel.color} />
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <span style={{
                fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
                background: `${kondLabel.color}22`, color: kondLabel.color,
              }}>
                {kondLabel.text}
              </span>
            </div>
            <div style={{ marginTop: 20 }}>
              <FactorRow
                label="Batarya"
                value={gradeLabel(gradeVal)}
                pct={kondisyonScore}
                color={gradeColor(gradeVal)}
              />
              <FactorRow
                label="DC Şarj"
                value={`${dcPct}%`}
                pct={Math.max(0, 100 - dcPct)}
                color={dcPct > 50 ? '#fb923c' : '#71ffe8'}
              />
              <FactorRow
                label="EFC (Dönem)"
                value={`${efcVal}`}
                pct={Math.max(0, 100 - (efcVal / 500) * 100)}
                color={efcVal > 400 ? '#fb923c' : efcVal > 200 ? '#facc15' : '#71ffe8'}
              />
            </div>
          </div>

          {/* Safety Index */}
          <div className="rpt-card">
            <div className="rpt-label rpt-muted" style={{ marginBottom: 16 }}>Kasko Risk Ön Endeksi</div>
            <CircularGauge score={safetyScore} color={safeLabel.color} />
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <span style={{
                fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
                background: `${safeLabel.color}22`, color: safeLabel.color,
              }}>
                {safeLabel.text}
              </span>
            </div>
            <div style={{ marginTop: 20 }}>
              <FactorRow
                label="Muayene"
                value={r.inspectionResult === 'passed' ? 'Geçti' : r.inspectionResult === 'failed' ? 'Kaldı' : 'Doğrulanmadı'}
                pct={r.inspectionResult === 'passed' ? 100 : r.inspectionResult === 'failed' ? 15 : 0}
                color={r.inspectionResult === 'passed' ? '#4ade80' : r.inspectionResult === 'failed' ? '#f87171' : '#849490'}
              />
              <FactorRow
                label="Batarya Notu"
                value={gradeVal === 'unknown' ? 'Doğrulanmadı' : gradeLabel(gradeVal)}
                pct={gradeVal === 'unknown' ? 0 : safetyScore}
                color={gradeVal === 'unknown' ? '#849490' : gradeColor(gradeVal)}
              />
              <FactorRow
                label="DC Bağımlılık"
                value={`${dcPct}%`}
                pct={Math.max(0, 100 - dcPct * 1.5)}
                color={dcPct > 40 ? '#fb923c' : '#71ffe8'}
              />
            </div>
          </div>
        </div>

        {/* ── Battery Grade Bar ── */}
        <div className="rpt-card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <div className="rpt-label rpt-muted" style={{ marginBottom: 4 }}>Batarya Kullanım Notu</div>
              <div style={{ fontSize: 12, color: '#849490', lineHeight: 1.5 }}>EFC, bataryanın yaklaşık tam şarj döngüsü karşılığıdır. 500 EFC referans alınarak batarya kullanım yoğunluğu yorumlanır. <strong style={{ color: '#dfe3e4' }}>Gösterilen EFC değeri yalnızca DMyC&apos;de kayıtlı kullanım dönemine aittir; aracın ömür boyu toplam döngü sayısı değildir.</strong></div>
            </div>
            <div style={{
              fontSize: 28, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif',
              color: gradeColor(gradeVal),
            }}>
              {gradeLabel(gradeVal)}
            </div>
          </div>
          <GradeBar grade={gradeVal} efcVal={efcVal} />

          {/* Şarj istatistikleri */}
          <div className="g4" style={{ marginTop: 20 }}>
            <StatCell label="AC Şarj" value={String(r.acChargeCount ?? '—')} />
            <StatCell label="DC Şarj" value={String(r.dcChargeCount ?? '—')} />
            <StatCell label="Yüksek SOC" value={String(r.highSocChargeCount ?? '—')} sub="şarj sayısı" />
            <StatCell label="Düşük SOC" value={String(r.lowSocChargeCount ?? '—')} sub="şarj sayısı" />
          </div>
        </div>

        {/* ── Kasko Değer Tahmini ── */}
        <div className="rpt-card" style={{ marginBottom: 20 }}>
          <div className="rpt-label rpt-muted" style={{ marginBottom: 16 }}>Tahmini Kasko Değeri</div>

          {est ? (
            <>
              {/* Main estimate band */}
              <div style={{
                background: 'rgba(113,255,232,0.06)',
                border: '1px solid rgba(113,255,232,0.2)',
                borderRadius: 12, padding: '20px 24px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 20,
              }}>
                <div>
                  <div style={{ fontSize: 11, color: '#849490', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Tahmini Değer Aralığı</div>
                  <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 28, color: '#71ffe8' }}>
                    {formatTL(est.estimatedMin)}
                  </div>
                  <div style={{ fontSize: 13, color: '#849490', margin: '4px 0' }}>–</div>
                  <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 28, color: '#71ffe8' }}>
                    {formatTL(est.estimatedMax)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#849490', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Referans Liste Fiyatı</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, color: '#dfe3e4' }}>
                    {listPrice ? formatTL(listPrice) : '—'}
                  </div>
                  {r.listPriceYear && (
                    <div style={{ fontSize: 11, color: '#849490', marginTop: 2 }}>{r.listPriceYear} model yılı fiyatı</div>
                  )}
                </div>
              </div>

              {/* Km bağlam notu */}
              {kmContextNote && (
                <div style={{
                  background: 'rgba(250,204,21,0.07)', border: '1px solid rgba(250,204,21,0.2)',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                  fontSize: 12, color: '#fde68a', lineHeight: 1.6,
                }}>
                  {kmContextNote}
                </div>
              )}

              {/* Depreciation factors */}
              <div className="g3">
                <div className="rpt-inner">
                  <div style={{ fontSize: 10, color: '#849490', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Yaş Faktörü</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 600, color: '#dfe3e4' }}>
                    ×{est.ageFactor.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, color: '#849490', marginTop: 2 }}>{age} yıl amortisman</div>
                </div>
                <div className="rpt-inner">
                  <div style={{ fontSize: 10, color: '#849490', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Batarya Faktörü</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 600, color: gradeColor(gradeVal) }}>
                    ×{est.batteryFactor.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, color: '#849490', marginTop: 2 }}>Not: {gradeLabel(gradeVal)}</div>
                </div>
                <div className="rpt-inner">
                  <div style={{ fontSize: 10, color: '#849490', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>KM Faktörü</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 600, color: '#dfe3e4' }}>
                    ×{est.kmFactor.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, color: '#849490', marginTop: 2 }}>
                    {r.annualKm ? `${Math.round(r.annualKm / 1000)}k km/yıl` : '—'}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{
              background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 24,
              textAlign: 'center', color: '#849490', fontSize: 13,
            }}>
              Liste fiyatı eksik — tahmini değer hesaplanamadı.
            </div>
          )}
        </div>

        {/* ── Araç Durumu ── */}
        <div className="g2" style={{ marginBottom: 20 }}>
          {/* Muayene */}
          <div className="rpt-card">
            <div className="rpt-label rpt-muted" style={{ marginBottom: 14 }}>Muayene Durumu</div>
            {hasInspection ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#849490' }}>Son Muayene</span>
                  <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>{formatDate(r.lastInspectionDate)}</span>
                </div>
                <div className="rpt-sep" />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#849490' }}>Sonraki Muayene</span>
                  <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: '#71ffe8' }}>{formatDate(r.nextInspectionDate)}</span>
                </div>
                <div className="rpt-sep" />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#849490' }}>Sonuç</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                    background: r.inspectionResult === 'passed' ? 'rgba(74,222,128,0.15)' : r.inspectionResult === 'failed' ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.06)',
                    color: r.inspectionResult === 'passed' ? '#4ade80' : r.inspectionResult === 'failed' ? '#f87171' : '#849490',
                  }}>
                    {r.inspectionResult === 'passed' ? 'Geçti' : r.inspectionResult === 'failed' ? 'Kaldı' : '—'}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 13, color: '#849490', fontStyle: 'italic' }}>
                  DMyC&apos;de kayıtlı muayene verisi yok.
                </div>
                <div style={{ fontSize: 11, color: '#4b5a57', lineHeight: 1.6 }}>
                  TÜVTÜRK muayene sonucu sisteme girildiğinde bu bölüm otomatik güncellenir ve Kasko Risk Ön Endeksi puanına yansır.
                </div>
              </div>
            )}
          </div>

          {/* Bakım */}
          <div className="rpt-card">
            <div className="rpt-label rpt-muted" style={{ marginBottom: 14 }}>Bakım Geçmişi</div>
            {hasService ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#849490' }}>Toplam Bakım</span>
                  <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif' }}>{r.serviceEventCount}</span>
                </div>
                <div className="rpt-sep" />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#849490' }}>Son Bakım KM</span>
                  <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>{formatKm(r.lastServiceKm)}</span>
                </div>
                <div className="rpt-sep" />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#849490' }}>Son Bakım Tarihi</span>
                  <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>{formatDate(r.lastServiceDate)}</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 13, color: '#849490', fontStyle: 'italic' }}>
                  Kullanıcı tarafından henüz bakım kaydı girilmedi.
                </div>
                <div style={{ fontSize: 11, color: '#4b5a57', lineHeight: 1.6 }}>
                  Servis ziyaretleri DMyC&apos;ye eklendikçe bakım geçmişi bu raporda görünür hale gelir.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Araç Fotoğrafları ── */}
        {r.vehiclePhotoUrls && r.vehiclePhotoUrls.length > 0 && (
          <div className="rpt-card" style={{ marginBottom: 20 }}>
            <div className="rpt-label rpt-muted" style={{ marginBottom: 4 }}>Araç Fotoğrafları</div>
            <div style={{ fontSize: 11, color: '#4b5a57', marginBottom: 16 }}>
              Kullanıcı tarafından sağlanan fotoğraflar · GPS/EXIF verisi kaldırıldı
            </div>
            <div className="g2" style={{ gap: 10 }}>
              {(['Ön', 'Arka', 'Sol Yan', 'Sağ Yan'] as const).map((label, i) => {
                const url = r.vehiclePhotoUrls[i];
                if (!url) return null;
                return (
                  <div key={label} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '4/3', background: '#111c1d' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <div style={{
                      position: 'absolute', bottom: 8, left: 8,
                      background: 'rgba(8,15,16,0.75)', backdropFilter: 'blur(6px)',
                      borderRadius: 6, padding: '3px 8px',
                      fontSize: 10, fontWeight: 700, color: '#dfe3e4',
                    }}>
                      {label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Veri Kapsamı ── */}
        <div style={{
          background: 'rgba(113,255,232,0.04)', borderRadius: 10,
          border: '1px solid rgba(113,255,232,0.12)', padding: '14px 18px', marginBottom: 20,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#71ffe8', textTransform: 'uppercase', marginBottom: 8 }}>
            Bu Raporun Veri Kapsamı
          </div>
          <div style={{ fontSize: 11, color: '#849490', lineHeight: 1.7 }}>
            Bu rapor yalnızca araç kullanım ve değerleme sinyallerini içerir.
            <strong style={{ color: '#dfe3e4' }}> TC kimlik numarası, ruhsat, tam şase/VIN, adres, doğum tarihi, ehliyet ve poliçe bilgisi bulunmaz.</strong>
            <br />
            Kimlik ve ruhsat doğrulaması sigorta şirketinin kendi başvuru kanalı üzerinden yürütülür.
            DMyC bu rapor aracılığıyla sigorta aracılığı veya resmi teklif vermez.
          </div>
        </div>

        {/* ── Sürüş Özeti ── */}
        <div className="rpt-card" style={{ marginBottom: 28 }}>
          <div className="rpt-label rpt-muted" style={{ marginBottom: 16 }}>Kullanım Profili</div>
          <div className="g4" style={{ gap: 16 }}>
            <StatCell label="Toplam KM" value={formatKm(r.odometerKm)} />
            <StatCell label="Yıllık KM" value={r.annualKm ? `${Math.round(r.annualKm / 1000)}k` : '—'} sub="km/yıl" />
            <StatCell label="DC Şarj Oranı" value={`${dcPct}%`} sub="fast charge" />
            <StatCell label="İzlenen Şarj" value={totalCharges > 0 ? String(totalCharges) : '—'} sub="DMyC dönemi" />
          </div>
        </div>

        {/* ── Veri Güven Seviyesi ── */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.06)', padding: '16px 20px', marginBottom: 20,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#849490', textTransform: 'uppercase', marginBottom: 12 }}>
            Rapor Veri Güven Seviyesi
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
            {[
              { label: 'Araç bilgisi', value: 'Kullanıcı beyanı' },
              { label: 'Kilometre', value: 'Kullanıcı beyanı' },
              { label: 'Şarj / EFC verisi', value: 'DMyC kayıtlı dönem' },
              { label: 'Bakım verisi', value: hasService ? 'DMyC kayıtlı' : 'Girilmemiş' },
              { label: 'Muayene verisi', value: hasInspection ? 'DMyC kayıtlı' : 'Girilmemiş' },
              { label: 'Değer hesabı', value: 'Tahmini model' },
            ].map(({ label, value }) => {
              const isConfirmed = value === 'DMyC kayıtlı' || value === 'DMyC kayıtlı dönem';
              const isMissing   = value === 'Girilmemiş';
              return (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#849490' }}>{label}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                    background: isConfirmed ? 'rgba(74,222,128,0.12)' : isMissing ? 'rgba(255,255,255,0.06)' : 'rgba(250,204,21,0.1)',
                    color: isConfirmed ? '#4ade80' : isMissing ? '#4b5a57' : '#fde68a',
                  }}>{value}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Feragat ── */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.06)', padding: '16px 20px',
          fontSize: 11, color: '#849490', lineHeight: 1.6, marginBottom: 32,
        }}>
          <strong style={{ color: '#dfe3e4' }}>Feragat:</strong> Bu rapor bilgi amaçlı ön değerlendirmedir; sigorta teklifi, eksper raporu veya resmi kasko değer belgesi değildir.
          Tahmini değer; araç yaşı, kilometre, batarya kullanım sinyalleri ve kullanıcı/uygulama verilerine göre hesaplanır.
          Nihai teklif ve değer; sigorta şirketi, eksper değerlendirmesi ve ilgili resmi kurumsal kaynaklar tarafından belirlenir.
          <br />Hesaplama tarihi: {formatDate(r.createdAt)}.
        </div>

        {/* ── Footer ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6,
              background: 'linear-gradient(135deg,#71ffe8 0%,#00b3a4 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 10, color: '#080F10',
            }}>D</div>
            <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'Space Grotesk, sans-serif' }}>DMyC</span>
            <span style={{ fontSize: 11, color: '#849490' }}>EV Karnesi</span>
          </div>
          <div style={{ fontSize: 11, color: '#849490' }}>
            dmyc.digital · Elektrikli Araç Sağlığı ve Değer Analizi
          </div>
        </div>
      </div>
    </div>
  );
}
