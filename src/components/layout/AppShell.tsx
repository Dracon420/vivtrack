import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function AppShell() {
  return (
    <div className="flex flex-col h-full bg-gray-950 dark:bg-gray-950">
      <main className="flex-1 scroll-area">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
