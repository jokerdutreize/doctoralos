import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { theme } from '../styles/theme'
import { usePatient } from '../contexts/PatientContext'
import Card from '../components/ui/Card'
import { generateAppointments, type AppointmentRecord, type AppointmentType } from '../utils/wltAdapters'

const TYPE_META: Record<AppointmentType, { labelKey: string; color: string; bg: string; abbr: string }> = {
  outpatient:        { labelKey: 'appointments.typeOutpatient', color: '#1565C0', bg: '#E3F2FD', abbr: 'OPD'  },
  labs:              { labelKey: 'appointments.typeLabs',       color: '#00695C', bg: '#E0F2F1', abbr: 'LAB'  },
  biopsy:            { labelKey: 'appointments.typeBiopsy',     color: '#E65100', bg: '#FFF3E0', abbr: 'BX'   },
  imaging:           { labelKey: 'appointments.typeImaging',    color: '#6A1B9A', bg: '#F3E5F5', abbr: 'IMG'  },
  multidisciplinary: { labelKey: 'appointments.typeMdt',        color: '#37474F', bg: '#ECEFF1', abbr: 'MDT'  },
}

type FilterMode = 'all' | 'upcoming' | 'completed'

function ApptRow({ appt, isLast }: { appt: AppointmentRecord; isLast: boolean }) {
  const { t } = useTranslation()
  const meta   = TYPE_META[appt.type]
  const done   = appt.status === 'completed'
  const today  = new Date().toISOString().split('T')[0]
  const isToday = appt.date === today

  const statusLabel =
    done                         ? t('appointments.statusCompleted') :
    appt.status === 'cancelled'  ? t('appointments.statusCancelled') :
                                   t('appointments.statusScheduled')

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '48px 110px 1fr auto',
      alignItems: 'center',
      gap: 14,
      padding: '13px 4px',
      borderBottom: isLast ? 'none' : `1px solid ${theme.color.border}`,
      opacity: done ? 0.72 : 1,
    }}>
      {/* Modality badge */}
      <div style={{
        width: 44, height: 44, borderRadius: theme.r.sm,
        background: done ? theme.color.bg : meta.bg,
        color: done ? theme.color.muted : meta.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 800, letterSpacing: '0.02em', flexShrink: 0,
      }}>
        {meta.abbr}
      </div>

      {/* Date + time */}
      <div style={{ flexShrink: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 700,
          color: isToday ? theme.color.primary : theme.color.text,
        }}>
          {appt.date}
        </div>
        <div style={{ fontSize: 11, color: theme.color.muted, marginTop: 2 }}>
          {appt.time}
        </div>
        {isToday && (
          <div style={{
            fontSize: 9, fontWeight: 700, color: theme.color.primary,
            textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2,
          }}>
            Today
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: theme.color.text }}>
            {t(meta.labelKey)}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: theme.r.xl,
            color: meta.color, background: done ? theme.color.bg : meta.bg,
            border: `1px solid ${meta.color}30`,
          }}>
            {meta.abbr}
          </span>
        </div>
        <div style={{ fontSize: 12, color: theme.color.text2, marginBottom: 2 }}>
          {appt.department} · {appt.provider}
        </div>
        <div style={{
          fontSize: 11.5, color: theme.color.muted,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {appt.notes}
        </div>
      </div>

      {/* Status chip */}
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: theme.r.xl,
          color: done ? theme.color.success : appt.status === 'cancelled' ? theme.color.danger : theme.color.primary,
          background: done ? theme.color.successBg : appt.status === 'cancelled' ? theme.color.dangerBg : theme.color.primaryBg,
        }}>
          {statusLabel}
        </span>
      </div>
    </div>
  )
}

function KpiCard({ label, value, color }: { label: string; value: string | number; color: string; bg: string }) {
  return (
    <div style={{
      background: theme.color.surface, border: `1px solid ${theme.color.border}`,
      borderRadius: theme.r.md, padding: '12px 16px', textAlign: 'center', flex: 1,
    }}>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: theme.color.muted, marginTop: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
    </div>
  )
}

export default function Appointments() {
  const { selected } = usePatient()
  const [filter, setFilter] = useState<FilterMode>('all')
  const { t } = useTranslation()

  const appointments = useMemo(() => selected ? generateAppointments(selected) : [], [selected])

  const upcoming  = appointments.filter(a => a.status === 'scheduled')
  const completed = appointments.filter(a => a.status === 'completed')
  const next      = upcoming[0]

  const visible = useMemo(() => {
    if (filter === 'upcoming')  return upcoming
    if (filter === 'completed') return completed
    return appointments
  }, [filter, appointments, upcoming, completed])

  const filters: Array<{ id: FilterMode; label: string; count: number }> = [
    { id: 'all',       label: t('appointments.all'),       count: appointments.length },
    { id: 'upcoming',  label: t('appointments.upcoming'),  count: upcoming.length     },
    { id: 'completed', label: t('appointments.completed'), count: completed.length    },
  ]

  const colHeaders = [
    t('appointments.colType'),
    t('appointments.colDateTime'),
    t('appointments.colDetails'),
    t('appointments.colStatus'),
  ]

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.color.text, margin: 0 }}>{t('appointments.title')}</h1>
        <div style={{ fontSize: 13, color: theme.color.text2, marginTop: 3 }}>
          {selected
            ? `${selected.name} · ${t('appointments.subtitle')}`
            : t('appointments.subtitle')}
        </div>
      </div>

      {!selected ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '48px 0', color: theme.color.muted, fontSize: 14 }}>
            {t('common.selectPatient')}
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* KPI row */}
          <div style={{ display: 'flex', gap: 12 }}>
            <KpiCard label={t('appointments.total')}     value={appointments.length} color={theme.color.primary} bg={theme.color.primaryBg as string} />
            <KpiCard label={t('appointments.upcoming')}  value={upcoming.length}     color={theme.color.primary} bg={theme.color.primaryBg as string} />
            <KpiCard label={t('appointments.completed')} value={completed.length}    color={theme.color.success} bg={theme.color.successBg as string} />
            {next && (
              <div style={{
                background: theme.color.surface, border: `1px solid ${theme.color.border}`,
                borderRadius: theme.r.md, padding: '12px 16px', flex: 2,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: theme.r.sm, flexShrink: 0,
                  background: TYPE_META[next.type].bg, color: TYPE_META[next.type].color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800,
                }}>
                  {TYPE_META[next.type].abbr}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: theme.color.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('appointments.nextAppointment')}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: theme.color.text, marginTop: 2 }}>
                    {next.date} at {next.time}
                  </div>
                  <div style={{ fontSize: 12, color: theme.color.text2 }}>
                    {next.department}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Filter tabs + appointment list */}
          <div style={{
            background: theme.color.surface,
            border: `1px solid ${theme.color.border}`,
            borderRadius: theme.r.lg,
            overflow: 'hidden',
          }}>
            {/* Tabs */}
            <div style={{
              display: 'flex', gap: 4, padding: '12px 16px',
              borderBottom: `1px solid ${theme.color.border}`,
              background: theme.color.bg,
            }}>
              {filters.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  style={{
                    padding: '5px 14px', borderRadius: theme.r.sm, cursor: 'pointer',
                    fontSize: 12, fontWeight: 600,
                    background: filter === f.id ? theme.color.primary : 'transparent',
                    color: filter === f.id ? '#fff' : theme.color.text2,
                    border: filter === f.id ? 'none' : `1px solid ${theme.color.border}`,
                    transition: 'all .12s',
                  }}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>

            {/* Column headers */}
            <div style={{
              display: 'grid', gridTemplateColumns: '48px 110px 1fr auto',
              gap: 14, padding: '8px 20px',
              borderBottom: `1px solid ${theme.color.border}`,
              background: theme.color.surface,
            }}>
              {colHeaders.map(h => (
                <div key={h} style={{
                  fontSize: 10, fontWeight: 700, color: theme.color.muted,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {h}
                </div>
              ))}
            </div>

            {/* Rows */}
            <div style={{ padding: '4px 20px' }}>
              {visible.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center', color: theme.color.muted, fontSize: 13 }}>
                  {t('appointments.noAppointments')}
                </div>
              ) : (
                visible.map((appt, i) => (
                  <ApptRow key={appt.id} appt={appt} isLast={i === visible.length - 1} />
                ))
              )}
            </div>
          </div>

          <div style={{ fontSize: 11, color: theme.color.muted, textAlign: 'center', paddingBottom: 4 }}>
            {t('appointments.disclaimer')}
          </div>
        </div>
      )}
    </div>
  )
}
