import { useRef, useState } from 'react'
import { Camera, X, Trash2, Images } from 'lucide-react'
import { useAnimals, updateAnimal } from '@/db/hooks/useAnimals'
import { useEnclosures, updateEnclosure } from '@/db/hooks/useEnclosures'
import { usePlants, updatePlant } from '@/db/hooks/usePlants'
import { cn } from '@/lib/utils'
import CropModal from '@/components/CropModal'
import type { AppPhoto } from '@/types'
import { v4 as uuidv4 } from 'uuid'

type SubjectType = 'all' | 'animal' | 'enclosure' | 'plant'

interface PhotoEntry {
  photo: AppPhoto
  subjectId: string
  subjectName: string
  subjectType: 'animal' | 'enclosure' | 'plant'
  subjectThumb?: string
}

// ── Add Photo Modal — pick subject, then crop ────────────────────────────────
function AddPhotoModal({
  animals, enclosures, plants, onClose,
}: {
  animals: ReturnType<typeof useAnimals>
  enclosures: ReturnType<typeof useEnclosures>
  plants: ReturnType<typeof usePlants>
  onClose: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<'animal' | 'enclosure' | 'plant'>('animal')
  const [selectedId, setSelectedId] = useState('')
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedId) return
    e.target.value = ''
    setCropSrc(URL.createObjectURL(file))
  }

  const handleCropConfirm = async (base64: string) => {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
    setSaving(true)
    const now = new Date().toISOString()
    const photo: AppPhoto = { id: uuidv4(), base64, takenAt: now, createdAt: now }

    if (tab === 'animal') {
      const a = animals?.find(x => x.id === selectedId)
      if (a) await updateAnimal(a.id, { photos: [...(a.photos ?? []), photo] })
    } else if (tab === 'enclosure') {
      const e = enclosures?.find(x => x.id === selectedId)
      if (e) await updateEnclosure(e.id, { photos: [...(e.photos ?? []), photo] })
    } else {
      const p = plants?.find(x => x.id === selectedId)
      if (p) await updatePlant(p.id, { photos: [...(p.photos ?? []), photo] })
    }

    setSaving(false)
    onClose()
  }

  const items =
    tab === 'animal' ? (animals ?? []).map(a => ({ id: a.id, name: a.name, thumb: a.thumbnailBase64 })) :
    tab === 'enclosure' ? (enclosures ?? []).map(e => ({ id: e.id, name: e.name, thumb: undefined })) :
    (plants ?? []).map(p => ({ id: p.id, name: p.name, thumb: p.thumbnailBase64 }))

  return (
    <>
      {cropSrc && (
        <CropModal
          src={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => { URL.revokeObjectURL(cropSrc); setCropSrc(null) }}
        />
      )}

      <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-end" onClick={onClose}>
        <div
          className="w-full bg-gray-900 border-t border-gray-800 rounded-t-2xl p-4 pb-safe space-y-4 max-h-[75vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-100">Add Photo</p>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-200 p-1"><X size={20} /></button>
          </div>

          {/* Type tabs */}
          <div className="flex gap-2">
            {(['animal', 'enclosure', 'plant'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setSelectedId('') }}
                className={cn(
                  'flex-1 py-2 text-sm rounded-xl border capitalize transition-colors',
                  tab === t ? 'border-emerald-500 text-emerald-300 bg-emerald-500/10' : 'border-gray-700 text-gray-500 hover:bg-gray-800'
                )}
              >
                {t === 'animal' ? '🐾' : t === 'enclosure' ? '🏠' : '🌿'} {t}
              </button>
            ))}
          </div>

          {/* Subject list */}
          <div className="overflow-y-auto flex-1 space-y-1.5">
            {items.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-4">No {tab}s added yet.</p>
            ) : items.map(item => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id === selectedId ? '' : item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors text-left',
                  selectedId === item.id
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-gray-800 hover:bg-gray-800'
                )}
              >
                {item.thumb ? (
                  <img src={item.thumb} className="w-8 h-8 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0 text-sm">
                    {tab === 'animal' ? '🐾' : tab === 'enclosure' ? '🏠' : '🌿'}
                  </div>
                )}
                <span className="text-sm text-gray-200 truncate">{item.name}</span>
              </button>
            ))}
          </div>

          {/* Pick photo button */}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={!selectedId || saving}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Camera size={18} />
            {saving ? 'Saving…' : selectedId ? 'Choose Photo' : 'Select a subject first'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Photo Library ────────────────────────────────────────────────────────────
export default function PhotoLibrary() {
  const animals = useAnimals()
  const enclosures = useEnclosures()
  const plants = usePlants()
  const [filter, setFilter] = useState<SubjectType>('all')
  const [viewEntry, setViewEntry] = useState<PhotoEntry | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Flatten all photos from all entities
  const allPhotos: PhotoEntry[] = [
    ...(animals ?? []).flatMap(a =>
      (a.photos ?? []).map(p => ({
        photo: p,
        subjectId: a.id,
        subjectName: a.name,
        subjectType: 'animal' as const,
        subjectThumb: a.thumbnailBase64,
      }))
    ),
    ...(enclosures ?? []).flatMap(e =>
      (e.photos ?? []).map(p => ({
        photo: p,
        subjectId: e.id,
        subjectName: e.name,
        subjectType: 'enclosure' as const,
      }))
    ),
    ...(plants ?? []).flatMap(pl =>
      (pl.photos ?? []).map(p => ({
        photo: p,
        subjectId: pl.id,
        subjectName: pl.name,
        subjectType: 'plant' as const,
        subjectThumb: pl.thumbnailBase64,
      }))
    ),
  ].sort((a, b) => b.photo.takenAt.localeCompare(a.photo.takenAt))

  const filtered = filter === 'all' ? allPhotos : allPhotos.filter(e => e.subjectType === filter)

  const handleDelete = async (entry: PhotoEntry) => {
    setDeleting(true)
    if (entry.subjectType === 'animal') {
      const a = animals?.find(x => x.id === entry.subjectId)
      if (a) await updateAnimal(a.id, { photos: (a.photos ?? []).filter(p => p.id !== entry.photo.id) })
    } else if (entry.subjectType === 'enclosure') {
      const e = enclosures?.find(x => x.id === entry.subjectId)
      if (e) await updateEnclosure(e.id, { photos: (e.photos ?? []).filter(p => p.id !== entry.photo.id) })
    } else {
      const pl = plants?.find(x => x.id === entry.subjectId)
      if (pl) await updatePlant(pl.id, { photos: (pl.photos ?? []).filter(p => p.id !== entry.photo.id) })
    }
    setViewEntry(null)
    setDeleting(false)
  }

  const FILTER_TABS: { key: SubjectType; label: string }[] = [
    { key: 'all', label: `All (${allPhotos.length})` },
    { key: 'animal', label: '🐾 Animals' },
    { key: 'enclosure', label: '🏠 Enclosures' },
    { key: 'plant', label: '🌿 Plants' },
  ]

  return (
    <div className="min-h-full pb-24">
      {/* Full-screen photo viewer */}
      {viewEntry && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col" onClick={() => setViewEntry(null)}>
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black to-transparent">
            <button onClick={() => setViewEntry(null)} className="text-gray-300 p-2 -ml-2">
              <X size={22} />
            </button>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-200">{viewEntry.subjectName}</p>
              <p className="text-xs text-gray-500 capitalize">{viewEntry.subjectType}</p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); if (!deleting) handleDelete(viewEntry) }}
              disabled={deleting}
              className="flex items-center gap-1 text-red-400 text-sm px-3 py-1.5 rounded-xl hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={14} /> {deleting ? '…' : 'Delete'}
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
            <img
              src={viewEntry.photo.base64}
              className="max-w-full max-h-full object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {showAdd && (
        <AddPhotoModal
          animals={animals}
          enclosures={enclosures}
          plants={plants}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Header */}
      <div className="px-4 pt-6 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Photos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{allPhotos.length} photo{allPhotos.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="w-10 h-10 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
        >
          <Camera size={20} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto">
        {FILTER_TABS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors',
              filter === f.key ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 px-4">
          <Images size={40} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No photos yet</p>
          <p className="text-gray-600 text-sm mt-1 mb-6">Add photos to your animals, enclosures, or plants.</p>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 mx-auto bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            <Camera size={16} /> Add First Photo
          </button>
        </div>
      ) : (
        <div className="px-4 grid grid-cols-3 gap-1.5">
          {filtered.map(entry => (
            <button
              key={entry.photo.id}
              onClick={() => setViewEntry(entry)}
              className="relative aspect-square rounded-xl overflow-hidden active:scale-95 transition-transform"
            >
              <img
                src={entry.photo.base64}
                className="w-full h-full object-cover"
              />
              {/* Subject name label */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-3">
                <p className="text-[10px] text-white/90 truncate leading-tight">{entry.subjectName}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
