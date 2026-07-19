import { Routes, Route } from 'react-router-dom'
import { PatientProvider }    from './contexts/PatientContext'
import { AuthProvider }       from './contexts/AuthContext'
import { ThemeProvider }      from './contexts/ThemeContext'
import Layout                 from './components/layout/Layout'
import ProtectedRoute         from './components/auth/ProtectedRoute'
import ErrorBoundary          from './components/ui/ErrorBoundary'

// Pages
import Login                 from './pages/Login'
import DoctorDashboard       from './pages/DoctorDashboard'
import PatientList           from './pages/PatientList'
import PatientProfileLayout  from './pages/patients/PatientProfileLayout'
import ClinicalTimeline      from './pages/ClinicalTimeline'
import RiskPrediction        from './pages/RiskPrediction'
import InterventionSimulator from './pages/InterventionSimulator'
import Laboratory            from './pages/Laboratory'
import Medication            from './pages/Medication'
import Imaging               from './pages/Imaging'
import Alerts                from './pages/Alerts'
import DigitalTwin           from './pages/DigitalTwin'
import Appointments          from './pages/Appointments'
import HospitalAnalytics     from './pages/HospitalAnalytics'
import Research              from './pages/Research'
import Reports               from './pages/Reports'
import Settings              from './pages/Settings'
import AuditLogs             from './pages/AuditLogs'

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <PatientProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected */}
          <Route path="/*" element={
            <ProtectedRoute>
              <Layout>
                <ErrorBoundary>
                <Routes>
                  <Route path="/"                 element={<DoctorDashboard />} />
                  <Route path="/patients"         element={<PatientList />} />
                  <Route path="/patients/:id/*"   element={<PatientProfileLayout />} />
                  <Route path="/appointments"     element={<Appointments />} />
                  <Route path="/alerts"           element={<Alerts />} />
                  <Route path="/timeline"         element={<ClinicalTimeline />} />
                  <Route path="/laboratory"       element={<Laboratory />} />
                  <Route path="/medication"       element={<Medication />} />
                  <Route path="/imaging"          element={<Imaging />} />
                  <Route path="/risk"             element={<RiskPrediction />} />
                  <Route path="/digital-twin"     element={<DigitalTwin />} />
                  <Route path="/intervention"     element={<InterventionSimulator />} />
                  <Route path="/research"         element={<Research />} />
                  <Route path="/analytics"        element={<HospitalAnalytics />} />
                  <Route path="/reports"          element={<Reports />} />
                  <Route path="/settings"         element={<Settings />} />
                  <Route path="/audit"            element={<AuditLogs />} />
                </Routes>
                </ErrorBoundary>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </PatientProvider>
    </AuthProvider>
    </ThemeProvider>
  )
}
