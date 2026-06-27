'use client';

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        background: 'rgba(113,255,232,0.12)',
        border: '1px solid rgba(113,255,232,0.3)',
        color: '#71ffe8',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.06em',
        padding: '6px 14px',
        borderRadius: 20,
        cursor: 'pointer',
        fontFamily: 'Inter, sans-serif',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      PDF Kaydet
    </button>
  );
}
