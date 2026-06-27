import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Home, PawPrint, ScanLine, LayoutGrid, MoreHorizontal, X, Bug, Dna, Heart, DollarSign, Download, Settings, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItemProps {
  to: string
  icon: React.ReactNode
  label: string
}

function NavItem({ to, icon, label }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-0',
          isActive
            ? 'text-emerald-400'
            : 'text-gray-500 dark:text-gray-500 hover:text-gray-300'
        )
      }
    >
      <span className="w-6 h-6 flex items-center justify-center">{icon}</span>
      <span className="text-xs font-medium truncate">{label}</span>
    </NavLink>
  )
}

const moreItems = [
  { to: '/colonies', icon: <Bug size={20} />, label: 'Colonies' },
  { to: '/species', icon: <BookOpen size={20} />, label: 'Species' },
  { to: '/breeding', icon: <Dna size={20} />, label: 'Breeding' },
  { to: '/expenses', icon: <DollarSign size={20} />, label: 'Expenses' },
  { to: '/export', icon: <Download size={20} />, label: 'Export' },
  { to: '/settings', icon: <Settings size={20} />, label: 'Settings' },
]

export default function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const navigate = useNavigate()

  const handleMoreNavigation = (to: string) => {
    setMoreOpen(false)
    navigate(to)
  }

  return (
    <>
      {/* More drawer overlay */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More drawer */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-800 rounded-t-2xl transition-transform duration-300',
          moreOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        <div className="flex justify-between items-center px-4 pt-4 pb-2">
          <span className="text-sm font-semibold text-gray-300">More</span>
          <button onClick={() => setMoreOpen(false)} className="text-gray-400 p-1">
            <X size={20} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 px-4 pb-6 pb-safe">
          {moreItems.map(item => (
            <button
              key={item.to}
              onClick={() => handleMoreNavigation(item.to)}
              className="flex flex-col items-center gap-1.5 p-4 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              <span className="text-emerald-400">{item.icon}</span>
              <span className="text-xs text-gray-300 font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom navigation bar */}
      <nav className="flex-shrink-0 bg-gray-900 border-t border-gray-800 pb-safe">
        <div className="flex items-center justify-around px-2 pt-1 pb-1">
          <NavItem to="/" icon={<Home size={22} />} label="Home" />
          <NavItem to="/animals" icon={<PawPrint size={22} />} label="Animals" />

          {/* Central scan button */}
          <NavLink
            to="/scanner"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 -mt-3',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors',
                    isActive
                      ? 'bg-emerald-400 text-gray-950'
                      : 'bg-emerald-500 text-white hover:bg-emerald-400'
                  )}
                >
                  <ScanLine size={26} />
                </span>
                <span className="text-xs font-medium text-gray-500 mt-0.5">Scan</span>
              </>
            )}
          </NavLink>

          <NavItem to="/enclosures" icon={<LayoutGrid size={22} />} label="Enclosures" />

          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-gray-500 hover:text-gray-300 transition-colors"
          >
            <span className="w-6 h-6 flex items-center justify-center"><MoreHorizontal size={22} /></span>
            <span className="text-xs font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  )
}
