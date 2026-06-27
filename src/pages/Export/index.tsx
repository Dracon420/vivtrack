import { Download, FileText, FileSpreadsheet, Archive } from 'lucide-react'

export default function Export() {
  return (
    <div className="min-h-full pb-4">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-100">Export & Backup</h1>
        <p className="text-sm text-gray-500 mt-0.5">Export care sheets, CSV data, and JSON backups</p>
      </div>

      <div className="px-4 space-y-3">
        {[
          { icon: <FileText size={24} className="text-red-400" />, title: 'PDF Care Sheets', desc: 'Generate printable care sheets for vets, transport, or rehoming', label: 'Coming soon' },
          { icon: <FileSpreadsheet size={24} className="text-green-400" />, title: 'CSV Export', desc: 'Export all care events and records to a spreadsheet', label: 'Coming soon' },
          { icon: <Archive size={24} className="text-blue-400" />, title: 'JSON Backup', desc: 'Complete data backup — import to restore or transfer to a new device', label: 'Coming soon' },
        ].map(item => (
          <div key={item.title} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4 opacity-60">
            {item.icon}
            <div className="flex-1">
              <p className="font-medium text-gray-200">{item.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
            </div>
            <span className="text-xs text-gray-600 shrink-0">{item.label}</span>
          </div>
        ))}

        <div className="mt-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
          <p className="text-sm text-emerald-300 font-medium">Your data is stored locally</p>
          <p className="text-xs text-emerald-600 mt-1">All VivTrack data lives on your device in IndexedDB. Export/backup features are coming in Phase 5 of development.</p>
        </div>
      </div>
    </div>
  )
}
