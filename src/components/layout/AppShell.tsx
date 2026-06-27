import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function AppShell() {
  return (
    <div className="flex flex-col h-full bg-gray-950 dark:bg-gray-950">
      {/* Fills the iPhone notch / Dynamic Island area with the app background */}
      <div className="shrink-0 bg-gray-950" style={{ height: 'env(safe-area-inset-top)' }} />
      <main className="flex-1 scroll-area">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
