import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../api/client'
import { theme } from '../styles/theme'
import LoadingSpinner from '../components/ui/LoadingSpinner'

interface AuditLog {
  id:             number
  user_email:     string | null
  user_name:      string
  action:         string
  action_display: string
  resource_type:  string
  resource_id:    string | null
  timestamp:      string
  ip_address:     string | null
  description:    string
}

interface AuditPage {
  count:    number
  next:     string | null
  previous: string | null
  results:  AuditLog[]
}

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  LOGIN:    { bg: '#E3F2FD', color: '#1565C0' },
  LOGOUT:   { bg: '#F3E5F5', color: '#6A1B9A' },
  CREATE:   { bg: '#E8F5E9', color: '#2E7D32' },
  UPDATE:   { bg: '#FFF3E0', color: '#E65100' },
  DELETE:   { bg: '#FFEBEE', color: '#C62828' },
  READ:     { bg: '#ECEFF1', color: '#37474F' },
  EXPORT:   { bg: '#F9FBE7', color: '#558B2F' },
}

function actionStyle(action: string) {
  return ACTION_COLORS[action] ?? { bg: '#F5F5F5', color: '#616161' }
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const TH: React.CSSProperties = {
  padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700,
  color: theme.color.muted, textTransform: 'uppercase', letterSpacing: '0.05em',
  borderBottom: `1px solid ${theme.color.border}`, background: theme.color.bg,
  whiteSpace: 'nowrap',
}
const TD: React.CSSProperties = {
  padding: '10px 14px', fontSize: 12.5, color: theme.color.text2,
  borderBottom: `1px solid ${theme.color.border}`, whiteSpace: 'nowrap',
}

export default function AuditLogs() {
  const [data, setData]       = useState<AuditPage | null>(null)
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetchLogs = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (search) params.set('search', search)
    apiFetch<AuditPage>(`/audit/logs/?${params}`)
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [page, search])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const totalPages = data ? Math.ceil(data.count / 25) : 0

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.color.text, margin: 0 }}>Audit Logs</h1>
          <div style={{ fontSize: 13, color: theme.color.text2, marginTop: 3 }}>
            System access and clinical action history
            {data && <span style={{ marginLeft: 8, color: theme.color.muted }}>— {data.count.toLocaleString()} events</span>}
          </div>
        </div>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search user, action, resource…"
          style={{
            padding: '8px 14px', borderRadius: theme.r.md, fontSize: 13,
            border: `1px solid ${theme.color.border}`, background: theme.color.surface,
            color: theme.color.text, width: 260, outline: 'none',
          }}
        />
      </div>

      {/* Table */}
      <div style={{
        background: theme.color.surface, border: `1px solid ${theme.color.border}`,
        borderRadius: theme.r.lg, overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '48px 0', display: 'flex', justifyContent: 'center' }}>
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div style={{ padding: '40px 24px', color: theme.color.danger, textAlign: 'center' }}>
            <strong>Failed to load audit logs</strong>
            <div style={{ fontSize: 12, marginTop: 4, color: theme.color.muted }}>{error}</div>
          </div>
        ) : !data || data.results.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: theme.color.muted, fontSize: 13 }}>
            No audit events recorded yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>Time</th>
                  <th style={TH}>User</th>
                  <th style={TH}>Action</th>
                  <th style={TH}>Resource</th>
                  <th style={TH}>Description</th>
                  <th style={TH}>IP</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map(log => {
                  const ac = actionStyle(log.action)
                  return (
                    <tr key={log.id}
                      onMouseEnter={e => (e.currentTarget.style.background = theme.color.bg)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={TD}>
                        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                          {fmtTime(log.timestamp)}
                        </span>
                      </td>
                      <td style={TD}>
                        <div style={{ fontWeight: 600, color: theme.color.text, fontSize: 12.5 }}>
                          {log.user_name}
                        </div>
                        {log.user_email && (
                          <div style={{ fontSize: 11, color: theme.color.muted }}>{log.user_email}</div>
                        )}
                      </td>
                      <td style={TD}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                          background: ac.bg, color: ac.color,
                        }}>
                          {log.action_display || log.action}
                        </span>
                      </td>
                      <td style={TD}>
                        <span style={{ color: theme.color.text }}>{log.resource_type}</span>
                        {log.resource_id && (
                          <span style={{ color: theme.color.muted, marginLeft: 4 }}>#{log.resource_id}</span>
                        )}
                      </td>
                      <td style={{ ...TD, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.description || '—'}
                      </td>
                      <td style={TD}>
                        <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
                          {log.ip_address || '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 16, fontSize: 13, color: theme.color.text2,
        }}>
          <span>Page {page} of {totalPages}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: '6px 14px', borderRadius: theme.r.md, fontSize: 13,
                border: `1px solid ${theme.color.border}`, background: theme.color.surface,
                color: page === 1 ? theme.color.muted : theme.color.text, cursor: page === 1 ? 'default' : 'pointer',
              }}
            >Previous</button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                padding: '6px 14px', borderRadius: theme.r.md, fontSize: 13,
                border: `1px solid ${theme.color.border}`, background: theme.color.surface,
                color: page === totalPages ? theme.color.muted : theme.color.text,
                cursor: page === totalPages ? 'default' : 'pointer',
              }}
            >Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
