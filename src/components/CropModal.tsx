import { useRef, useState, useCallback, useEffect } from 'react'
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react'

const CROP_PX = 272
const OUT_PX = 512

interface Props {
  src: string
  onConfirm: (base64: string) => void
  onCancel: () => void
}

export default function CropModal({ src, onConfirm, onCancel }: Props) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [ready, setReady] = useState(false)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null)
  // pinch tracking
  const pinch = useRef<{ d: number; s: number } | null>(null)
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map())

  const minScale = useCallback(() => {
    const img = imgRef.current
    if (!img || img.naturalWidth === 0) return 1
    return Math.max(CROP_PX / img.naturalWidth, CROP_PX / img.naturalHeight)
  }, [])

  const clamp = (ox: number, oy: number, s: number) => {
    const img = imgRef.current
    if (!img) return { x: ox, y: oy }
    const hw = Math.max(0, (img.naturalWidth * s - CROP_PX) / 2)
    const hh = Math.max(0, (img.naturalHeight * s - CROP_PX) / 2)
    return { x: Math.max(-hw, Math.min(hw, ox)), y: Math.max(-hh, Math.min(hh, oy)) }
  }

  useEffect(() => {
    if (!ready) return
    const ms = minScale()
    setScale(ms)
    setOffset({ x: 0, y: 0 })
  }, [ready, minScale])

  const applyZoom = (factor: number) => {
    const ms = minScale()
    setScale(prev => {
      const next = Math.max(ms, Math.min(8, prev * (1 + factor)))
      setOffset(o => clamp(o.x, o.y, next))
      return next
    })
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (activePointers.current.size === 1) {
      drag.current = { sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y }
      pinch.current = null
    } else if (activePointers.current.size === 2) {
      drag.current = null
      const pts = Array.from(activePointers.current.values())
      const d = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      pinch.current = { d, s: scale }
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (activePointers.current.size === 2 && pinch.current) {
      const pts = Array.from(activePointers.current.values())
      const d = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      const ms = minScale()
      const next = Math.max(ms, Math.min(8, pinch.current.s * (d / pinch.current.d)))
      setOffset(o => clamp(o.x, o.y, next))
      setScale(next)
    } else if (drag.current) {
      const dx = e.clientX - drag.current.sx
      const dy = e.clientY - drag.current.sy
      setOffset(clamp(drag.current.ox + dx, drag.current.oy + dy, scale))
    }
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(e.pointerId)
    drag.current = null
    pinch.current = null
  }

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    applyZoom(e.deltaY > 0 ? -0.08 : 0.08)
  }

  const handleConfirm = () => {
    const img = imgRef.current
    if (!img) return
    const srcX = img.naturalWidth / 2 - (CROP_PX / 2 + offset.x) / scale
    const srcY = img.naturalHeight / 2 - (CROP_PX / 2 + offset.y) / scale
    const srcW = CROP_PX / scale
    const srcH = CROP_PX / scale
    const canvas = document.createElement('canvas')
    canvas.width = OUT_PX
    canvas.height = OUT_PX
    canvas.getContext('2d')!.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, OUT_PX, OUT_PX)
    onConfirm(canvas.toDataURL('image/jpeg', 0.85))
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" style={{ touchAction: 'none' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-950 border-b border-gray-800" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <button onClick={onCancel} className="text-gray-400 hover:text-white p-2 -ml-2 transition-colors">
          <X size={22} />
        </button>
        <p className="text-sm font-semibold text-gray-100">Crop Photo</p>
        <button
          onClick={handleConfirm}
          className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-4 py-1.5 rounded-xl transition-colors"
        >
          <Check size={16} /> Use
        </button>
      </div>

      {/* Crop canvas */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-black px-4">
        {/* Crop frame */}
        <div
          style={{
            width: CROP_PX,
            height: CROP_PX,
            position: 'relative',
            overflow: 'hidden',
            cursor: 'grab',
            flexShrink: 0,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        >
          <img
            ref={imgRef}
            src={src}
            onLoad={() => setReady(true)}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
              transformOrigin: 'center',
              maxWidth: 'none',
              pointerEvents: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
            draggable={false}
          />
          {/* Frame overlay: white border + rule-of-thirds grid */}
          <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.65)' }}>
            {/* Horizontal thirds */}
            <div className="absolute left-0 right-0" style={{ top: '33.33%', height: 1, background: 'rgba(255,255,255,0.2)' }} />
            <div className="absolute left-0 right-0" style={{ top: '66.66%', height: 1, background: 'rgba(255,255,255,0.2)' }} />
            {/* Vertical thirds */}
            <div className="absolute top-0 bottom-0" style={{ left: '33.33%', width: 1, background: 'rgba(255,255,255,0.2)' }} />
            <div className="absolute top-0 bottom-0" style={{ left: '66.66%', width: 1, background: 'rgba(255,255,255,0.2)' }} />
          </div>
        </div>

        <p className="text-xs text-gray-600">Drag to reposition · Pinch or scroll to zoom</p>

        {/* Zoom controls */}
        <div className="flex items-center gap-5">
          <button
            onClick={() => applyZoom(-0.2)}
            className="w-11 h-11 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white active:scale-90 transition-all"
          >
            <ZoomOut size={20} />
          </button>
          <span className="text-sm text-gray-500 w-16 text-center tabular-nums">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => applyZoom(0.2)}
            className="w-11 h-11 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white active:scale-90 transition-all"
          >
            <ZoomIn size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
