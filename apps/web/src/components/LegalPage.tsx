import Link from 'next/link';

type Section = {
  id: string;
  title: string;
  paragraphs: string[];
};

type LegalDoc = {
  title: string;
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  sections: Section[];
};

export default function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#080f10',
      color: '#c8d8da',
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    }}>
      {/* Navbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(8,15,16,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '12px 24px',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/yatay-logo.png" alt="DMyC" style={{ height: 26, width: 'auto' }} />
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>|</span>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{doc.title}</span>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>
        {/* Header */}
        <h1 style={{
          fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 700,
          color: '#dbfcff', marginBottom: 8, lineHeight: 1.3,
        }}>
          {doc.title}
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 48 }}>
          Sürüm {doc.version} · Yürürlük tarihi: {doc.effectiveDate} · Son güncelleme: {doc.lastUpdated}
        </p>

        {/* Table of contents */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10, padding: '20px 24px', marginBottom: 48,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', marginBottom: 12 }}>
            İÇİNDEKİLER
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {doc.sections.map(s => (
              <a key={s.id} href={`#${s.id}`} style={{
                color: '#71ffe8', fontSize: 13, textDecoration: 'none',
                opacity: 0.8,
              }}>
                {s.title}
              </a>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          {doc.sections.map(s => (
            <section key={s.id} id={s.id}>
              <h2 style={{
                fontSize: 16, fontWeight: 700, color: '#dbfcff',
                marginBottom: 16, paddingBottom: 8,
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}>
                {s.title}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {s.paragraphs.map((p, i) => (
                  <p key={i} style={{
                    fontSize: 14, lineHeight: 1.75, color: '#b0c4c6', margin: 0,
                    paddingLeft: p.startsWith('•') ? 8 : 0,
                  }}>
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Footer nav */}
        <div style={{
          marginTop: 64, paddingTop: 24,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', gap: 24, flexWrap: 'wrap',
        }}>
          <Link href="/kullanim-kosullari" style={{ color: '#71ffe8', fontSize: 13, textDecoration: 'none', opacity: 0.7 }}>
            Kullanım Koşulları
          </Link>
          <Link href="/kvkk" style={{ color: '#71ffe8', fontSize: 13, textDecoration: 'none', opacity: 0.7 }}>
            KVKK Aydınlatma Metni
          </Link>
        </div>
      </div>
    </div>
  );
}
