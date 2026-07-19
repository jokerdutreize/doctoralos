import { theme } from '../styles/theme'
import Card from '../components/ui/Card'

export default function Reports() {
  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.color.text, margin: 0 }}>Reports</h1>
        <div style={{ fontSize: 13, color: theme.color.text2, marginTop: 3 }}>
          Clinical reports and patient summaries
        </div>
      </div>
      <Card>
        <div style={{ textAlign: 'center', padding: '48px 0', color: theme.color.muted, fontSize: 14 }}>
          Report generation coming in the next update.
        </div>
      </Card>
    </div>
  )
}
