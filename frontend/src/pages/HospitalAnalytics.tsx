import { theme } from '../styles/theme'
import HospitalDashboard from '../components/hospital/HospitalDashboard'

export default function HospitalAnalytics() {
  return (
    <div>
      <div style={{ padding: '24px 28px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.color.text, margin: '0 0 4px' }}>
          Hospital Analytics
        </h1>
        <div style={{ fontSize: 13, color: theme.color.text2, marginBottom: 20 }}>
          Program-wide statistics and cohort analysis
        </div>
      </div>
      <HospitalDashboard />
    </div>
  )
}
