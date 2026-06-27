'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, RotateCw, ExternalLink } from 'lucide-react';
import {
  fetchMaintenanceCandidates,
  updateMaintenanceCandidate,
  type MaintenanceCandidate,
} from '../lib/adminReviewApi';

const STATUS_FILTER_OPTIONS = [
  { value: 'pending',      label: 'Bekleyenler' },
  { value: 'approved',     label: 'Onaylananlar' },
  { value: 'rejected',     label: 'Reddedilenler' },
  { value: 'needs_source', label: 'Kaynak Gerekli' },
];

const CONFIDENCE_COLORS: Record<string, string> = {
  official_manual:    '#4ade80',
  official_web:       '#86efac',
  dealer_source:      '#facc15',
  community_unverified: '#f97316',
  research_needed:    '#ef4444',
};

const RULE_TYPE_LABELS: Record<string, string> = {
  periodic_visit:   'Periyodik Bakım',
  item_schedule:    'Kalem Takvimi',
  condition_based:  'Durum Bazlı',
  manual_required:  'Manuel Gerekli',
};

function confidenceBadge(confidence: string) {
  const color = CONFIDENCE_COLORS[confidence] ?? '#849495';
  return (
    <span style={{ color, fontWeight: 600, fontSize: 11 }}>
      {confidence.replace(/_/g, ' ').toUpperCase()}
    </span>
  );
}

export function AdminMaintenanceCandidatesConsole({
  initialCandidates,
}: {
  initialCandidates: MaintenanceCandidate[];
}) {
  const [candidates, setCandidates] = useState(initialCandidates);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  async function reload(status: string) {
    setLoading(true);
    try {
      const data = await fetchMaintenanceCandidates(status);
      setCandidates(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(
    id: string,
    adminStatus: 'approved' | 'rejected' | 'needs_source',
  ) {
    setActionId(id);
    try {
      await updateMaintenanceCandidate(id, { adminStatus, adminNote: noteMap[id] ?? undefined });
      setCandidates((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="admin-console">
      {/* ── Başlık ── */}
      <div className="admin-console-header">
        <h1 className="admin-console-title">Bakım Adayları</h1>
        <p style={{ color: '#849495', fontSize: 13, margin: 0 }}>
          LLM / Gemini çıktısından gelen bakım kural adayları. Admin onayı ile{' '}
          <code>maintenance_rules</code> tablosuna geçer.
        </p>
      </div>

      {/* ── Filtreler ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUS_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`admin-pill-btn${statusFilter === opt.value ? ' active' : ''}`}
            onClick={() => {
              setStatusFilter(opt.value);
              void reload(opt.value);
            }}
          >
            {opt.label}
          </button>
        ))}
        <button
          className="admin-icon-btn"
          title="Yenile"
          onClick={() => void reload(statusFilter)}
        >
          <RotateCw size={15} />
        </button>
      </div>

      {/* ── Liste ── */}
      {loading ? (
        <p style={{ color: '#849495' }}>Yükleniyor…</p>
      ) : candidates.length === 0 ? (
        <p style={{ color: '#849495' }}>Bu kategoride aday yok.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {candidates.map((c) => {
            const isExpanded = expanded === c.id;
            const isActing = actionId === c.id;

            return (
              <div key={c.id} className="admin-candidate-card">
                {/* ── Üst satır ── */}
                <div
                  style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}
                  onClick={() => setExpanded(isExpanded ? null : c.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, color: '#e2e8f0' }}>
                        {c.brand} {c.model}{c.variant ? ` ${c.variant}` : ''}
                      </span>
                      <span className="admin-tag">{RULE_TYPE_LABELS[c.ruleType] ?? c.ruleType}</span>
                      {c.itemCode && (
                        <span className="admin-tag admin-tag-blue">{c.itemCode.replace(/_/g, ' ')}</span>
                      )}
                      {c.researchNeeded && (
                        <span className="admin-tag admin-tag-warn">Araştırma Gerekli</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
                      {c.intervalKm && (
                        <span style={{ color: '#849495', fontSize: 12 }}>
                          Her {c.intervalKm.toLocaleString('tr-TR')} km
                        </span>
                      )}
                      {c.intervalMonths && (
                        <span style={{ color: '#849495', fontSize: 12 }}>
                          Her {c.intervalMonths} ay
                        </span>
                      )}
                      {c.firstDueKm && (
                        <span style={{ color: '#849495', fontSize: 12 }}>
                          İlk: {c.firstDueKm.toLocaleString('tr-TR')} km
                        </span>
                      )}
                    </div>

                    <div style={{ marginTop: 4 }}>
                      {confidenceBadge(c.sourceConfidence)}
                      {c.matchStatus !== 'exact' && (
                        <span style={{ color: '#849495', fontSize: 11, marginLeft: 8 }}>
                          eşleşme: {c.matchStatus}{c.matchScore != null ? ` (${c.matchScore})` : ''}
                        </span>
                      )}
                    </div>

                    {(c.specDisplayName || c.canonicalDisplayName) && (
                      <div style={{ color: '#4ade80', fontSize: 12, marginTop: 2 }}>
                        → {c.specDisplayName ?? c.canonicalDisplayName}
                      </div>
                    )}
                  </div>

                  <span style={{ color: '#849495', fontSize: 18, userSelect: 'none' }}>
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>

                {/* ── Detay ── */}
                {isExpanded && (
                  <div style={{ marginTop: 12, borderTop: '1px solid #1a2e2f', paddingTop: 12 }}>
                    {c.sourceQuote && (
                      <blockquote style={{
                        borderLeft: '3px solid #0d6e75',
                        paddingLeft: 12,
                        color: '#cbd5e1',
                        fontSize: 12,
                        margin: '0 0 10px',
                        fontStyle: 'italic',
                      }}>
                        {c.sourceQuote}
                      </blockquote>
                    )}

                    {c.sourceUrl && (
                      <a
                        href={c.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#22d3ee', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}
                      >
                        <ExternalLink size={12} />
                        {c.sourceName ?? c.sourceUrl}
                        <span style={{ color: '#849495', fontSize: 11 }}>({c.sourceDepth.replace(/_/g, ' ')})</span>
                      </a>
                    )}

                    {c.warnings && c.warnings.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        {c.warnings.map((w, i) => (
                          <div key={i} style={{ color: '#f97316', fontSize: 11 }}>⚠ {w}</div>
                        ))}
                      </div>
                    )}

                    {c.missingFields && c.missingFields.length > 0 && (
                      <div style={{ color: '#849495', fontSize: 11, marginBottom: 8 }}>
                        Eksik alanlar: {c.missingFields.join(', ')}
                      </div>
                    )}

                    {c.adminNote && (
                      <div style={{ color: '#facc15', fontSize: 12, marginBottom: 8 }}>
                        Not: {c.adminNote}
                      </div>
                    )}

                    {/* Admin notu giriş alanı */}
                    {c.adminStatus === 'pending' && (
                      <textarea
                        placeholder="Admin notu (isteğe bağlı)…"
                        value={noteMap[c.id] ?? ''}
                        onChange={(e) => setNoteMap((prev) => ({ ...prev, [c.id]: e.target.value }))}
                        style={{
                          width: '100%',
                          background: '#0a1a1b',
                          border: '1px solid #1a2e2f',
                          borderRadius: 6,
                          color: '#e2e8f0',
                          fontSize: 12,
                          padding: '6px 8px',
                          resize: 'vertical',
                          minHeight: 56,
                          marginBottom: 10,
                          boxSizing: 'border-box',
                        }}
                      />
                    )}

                    {/* Aksiyon butonları */}
                    {c.adminStatus === 'pending' && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          className="admin-action-btn admin-action-approve"
                          disabled={isActing}
                          onClick={() => void handleAction(c.id, 'approved')}
                        >
                          <CheckCircle2 size={14} />
                          Onayla → Kurala Ekle
                        </button>
                        <button
                          className="admin-action-btn admin-action-warn"
                          disabled={isActing}
                          onClick={() => void handleAction(c.id, 'needs_source')}
                        >
                          <AlertCircle size={14} />
                          Kaynak Gerekli
                        </button>
                        <button
                          className="admin-action-btn admin-action-reject"
                          disabled={isActing}
                          onClick={() => void handleAction(c.id, 'rejected')}
                        >
                          <XCircle size={14} />
                          Reddet
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
