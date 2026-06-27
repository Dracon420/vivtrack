import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Home, PawPrint, LayoutGrid, Sprout, MoreHorizontal, X, Bug, Dna, DollarSign, Download, Settings, BookOpen, ScanLine } from 'lucide-react'
import { cn } from '@/lib/utils'

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink to={to} end={to === '/'}
      className={({ isActive }) => cn(
        'flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-0 flex-1',
        isActive ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'
      )}>
      <span className="w-6 h-6 flex items-center justify-center">{icon}</span>
      <span className="text-[11px] font-medium truncate">{label}</span>
    </NavLink>
  )
}

const MORE_ITEMS = [
  { to: '/colonies', icon: <Bug size={22} />, label: 'Colonies', desc: 'Feeders, frozen & CUC' },
  { to: '/scanner', icon: <ScanLine size={22} />, label: 'Scanner', desc: 'Scan QR / NFC tags' },
  { to: '/species', icon: <BookOpen size={22} />, label: 'Species', desc: 'Browse care guides' },
  { to: '/breeding', icon: <Dna size={22} />, label: 'Breeding', desc: 'Pairs, clutches & eggs' },
  { to: '/expenses', icon: <DollarSign size={22} />, label: 'Expenses', desc: 'Track costs' },
  { to: '/export', icon: <Download size={22} />, label: 'Export', desc: 'PDF, CSV & backup' },
  { to: '/settings', icon: <Settings size={22} />, label: 'Settings', desc: 'Preferences & account' },
]

export default function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const navigate = useNavigate()

  const go = (to: string) => { setMoreOpen(false); navigate(to) }

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
      )}

      {/* More drawer — slides up from bottom */}
      <div className={cn(
        'fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-800 rounded-t-2xl transition-transform duration-300',
        moreOpen ? 'translate-y-0' : 'translate-y-full'
      )}>
        <div className="flex justify-between items-center px-4 pt-4 pb-3">
          <span className="text-sm font-semibold text-gray-200">More</span>
          <button onClick={() => setMoreOpen(false)} className="text-gray-400 hover:text-gray-200 p-1 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 px-4 pb-safe">
          {MORE_ITEMS.map(item => (
            <button key={item.to} onClick={() => go(item.to)}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gray-800 hover:bg-gray-700 active:scale-95 transition-all">
              <span className="text-emerald-400">{item.icon}</span>
              <div className="text-center">
                <p className="text-xs text-gray-200 font-semibold">{item.label}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom bar — 5 equal tabs */}
      <nav className="flex-shrink-0 bg-gray-900/95 backdrop-blur border-t border-gray-800 pb-safe">
        <div className="flex items-stretch px-1 pt-1 pb-1">
          <NavItem to="/" icon={<Home size={22} />} label="Home" />
          <NavItem to="/animals" icon={<PawPrint size={22} />} label="Animals" />
          <NavItem to="/plants" icon={<Sprout size={22} />} label="Plants" />
          <NavItem to="/enclosures" icon={<LayoutGrid size={22} />} label="Enclosures" />
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-gray-500 hover:text-gray-300 transition-colors flex-1">
            <span className="w-6 h-6 flex items-center justify-center"><MoreHorizontal size={22} /></span>
            <span className="text-[11px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  )
}
