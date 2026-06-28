import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useTheme } from '@/hooks/useTheme'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import AppShell from '@/components/layout/AppShell'
import Auth from '@/pages/Auth'

const Dashboard = lazy(() => import('@/pages/Dashboard'))
const AnimalList = lazy(() => import('@/pages/Animals'))
const AnimalProfile = lazy(() => import('@/pages/Animals/AnimalProfile'))
const AddAnimal = lazy(() => import('@/pages/Animals/AddAnimal'))
const QuickLog = lazy(() => import('@/pages/Animals/QuickLog'))
const EditAnimal = lazy(() => import('@/pages/Animals/EditAnimal'))
const EnclosureList = lazy(() => import('@/pages/Enclosures'))
const EnclosureDetail = lazy(() => import('@/pages/Enclosures/EnclosureDetail'))
const EnclosureForm = lazy(() => import('@/pages/Enclosures/EnclosureForm'))
const EditEnclosure = lazy(() => import('@/pages/Enclosures/EditEnclosure'))
const Scanner = lazy(() => import('@/pages/Scanner'))
const ScanRedirect = lazy(() => import('@/pages/Scanner/ScanRedirect'))
const SpeciesBrowser = lazy(() => import('@/pages/SpeciesBrowser'))
const SpeciesDetail = lazy(() => import('@/pages/SpeciesBrowser/SpeciesDetail'))
const Plants = lazy(() => import('@/pages/Plants'))
const PlantProfile = lazy(() => import('@/pages/Plants/PlantProfile'))
const Colonies = lazy(() => import('@/pages/Colonies'))
const Breeding = lazy(() => import('@/pages/Breeding'))
const Expenses = lazy(() => import('@/pages/Expenses'))
const Export = lazy(() => import('@/pages/Export'))
const Settings = lazy(() => import('@/pages/Settings'))
const PhotoLibrary = lazy(() => import('@/pages/Photos'))
const Tasks = lazy(() => import('@/pages/Tasks'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-32">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function AppRoutes() {
  useTheme()
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Auth />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/scan" element={
          <Suspense fallback={<PageLoader />}><ScanRedirect /></Suspense>
        } />
        <Route element={<AppShell />}>
          <Route index element={
            <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>
          } />
          <Route path="animals" element={
            <Suspense fallback={<PageLoader />}><AnimalList /></Suspense>
          } />
          <Route path="animals/add" element={
            <Suspense fallback={<PageLoader />}><AddAnimal /></Suspense>
          } />
          <Route path="animals/:id" element={
            <Suspense fallback={<PageLoader />}><AnimalProfile /></Suspense>
          } />
          <Route path="animals/:id/log" element={
            <Suspense fallback={<PageLoader />}><QuickLog /></Suspense>
          } />
          <Route path="animals/:id/edit" element={
            <Suspense fallback={<PageLoader />}><EditAnimal /></Suspense>
          } />
          <Route path="enclosures" element={
            <Suspense fallback={<PageLoader />}><EnclosureList /></Suspense>
          } />
          <Route path="enclosures/add" element={
            <Suspense fallback={<PageLoader />}><EnclosureForm /></Suspense>
          } />
          <Route path="enclosures/:id" element={
            <Suspense fallback={<PageLoader />}><EnclosureDetail /></Suspense>
          } />
          <Route path="enclosures/:id/edit" element={
            <Suspense fallback={<PageLoader />}><EditEnclosure /></Suspense>
          } />
          <Route path="scanner" element={
            <Suspense fallback={<PageLoader />}><Scanner /></Suspense>
          } />
          <Route path="species" element={
            <Suspense fallback={<PageLoader />}><SpeciesBrowser /></Suspense>
          } />
          <Route path="species/:id" element={
            <Suspense fallback={<PageLoader />}><SpeciesDetail /></Suspense>
          } />
          <Route path="plants" element={
            <Suspense fallback={<PageLoader />}><Plants /></Suspense>
          } />
          <Route path="plants/:id" element={
            <Suspense fallback={<PageLoader />}><PlantProfile /></Suspense>
          } />
          <Route path="colonies" element={
            <Suspense fallback={<PageLoader />}><Colonies /></Suspense>
          } />
          <Route path="breeding" element={
            <Suspense fallback={<PageLoader />}><Breeding /></Suspense>
          } />
          <Route path="expenses" element={
            <Suspense fallback={<PageLoader />}><Expenses /></Suspense>
          } />
          <Route path="export" element={
            <Suspense fallback={<PageLoader />}><Export /></Suspense>
          } />
          <Route path="settings" element={
            <Suspense fallback={<PageLoader />}><Settings /></Suspense>
          } />
          <Route path="photos" element={
            <Suspense fallback={<PageLoader />}><PhotoLibrary /></Suspense>
          } />
          <Route path="tasks" element={
            <Suspense fallback={<PageLoader />}><Tasks /></Suspense>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
