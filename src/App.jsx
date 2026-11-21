import React from 'react'
import { Routes, Route } from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout'
import Landing from './screens/Landing'
import Login from './screens/Login'
import Dashboard from './screens/Dashboard'
import RiskMapPage from './screens/RiskMapPage'
import Prediction from './screens/Prediction'
import Alerts from './screens/Alerts'
import VoiceAlerts from './screens/VoiceAlerts'
import Analytics from './screens/Analytics'
import Locations from './screens/Locations'
import AIInsights from './screens/AIInsights'
import Admin from './screens/Admin'
import SettingsPage from './screens/SettingsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/map" element={<RiskMapPage />} />
        <Route path="/prediction" element={<Prediction />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/voice-alerts" element={<VoiceAlerts />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/locations" element={<Locations />} />
        <Route path="/ai-insights" element={<AIInsights />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Landing />} />
    </Routes>
  )
}