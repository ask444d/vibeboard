import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Layout } from './components/layout/Layout'
import { Overview } from './pages/Overview'
import { ProjectsPage } from './pages/Projects'
import { ProjectPage } from './pages/ProjectPage'
import { TasksPage } from './pages/TasksPage'
import { IdeasPage } from './pages/IdeasPage'
import { SessionsPage } from './pages/SessionsPage'
import { ActivityPage } from './pages/ActivityPage'
import { SettingsPage } from './pages/SettingsPage'
import { Onboarding } from './pages/Onboarding'
import { useStore } from './store/useStore'

function AppRoutes(){
  const hasOnboarded = useStore(s=>s.hasOnboarded)
  const initializeIfEmpty = useStore(s=>s.initializeIfEmpty)
  const [showOnboarding, setShowOnboarding]=useState(false)

  useEffect(()=>{
    initializeIfEmpty()
    if(!hasOnboarded){
      setShowOnboarding(true)
    }
  },[hasOnboarded, initializeIfEmpty])

  // also allow manual reopen via query? keep onboarding as full-screen when needed
  if(showOnboarding){
    return <Onboarding onDone={()=> setShowOnboarding(false)} />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:code" element={<ProjectPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/ideas" element={<IdeasPage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/integrations" element={<Navigate to="/settings#integrations" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App(){
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
