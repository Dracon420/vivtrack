import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Wifi, Camera, Keyboard, X } from 'lucide-react'
import { useNFC, isNFCSupported } from '@/hooks/useNFC'
import { db } from '@/db/database'
import jsQR from 'jsqr'
import { cn } from '@/lib/utils'

type Mode = 'choose' | 'nfc' | 'qr' | 'manual'

export default function Scanner() {
  const navigate = useNavigate()
  const { startScan, stopScan, scanning, error: nfcError } = useNFC()
  const [mode, setMode] = useState<Mode>('choose')
  const [manualToken, setManualToken] = useState('')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [looking, setLooking] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)

  const handleToken = useCallback(async (token: string) => {
    setLooking(true)
    const animal = await db.animals.where('qrCodeToken').equals(token).first()
    if (animal) {
      navigate(`/animals/${animal.id}/log`)
    } else {
      setCameraError('No animal found for this code.')
      setLooking(false)
    }
  }, [navigate])

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  const startQRScan = useCallback(async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      const tick = () => {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas || video.readyState < 2) {
          rafRef.current = requestAnimationFrame(tick)
          return
        }
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(video, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, canvas.width, canvas.height, { inversionAttempts: 'dontInvert' })
        if (code?.data) {
          const url = new URL(code.data, window.location.origin)
          const token = url.searchParams.get('token')
          if (token) {
            stopCamera()
            handleToken(token)
            return
          }
        }
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch {
      setCameraError('Camera access denied. Please allow camera permissions and try again.')
    }
  }, [handleToken, stopCamera])

  useEffect(() => {
    if (mode === 'qr') startQRScan()
    return () => { stopCamera(); stopScan() }
  }, [mode, startQRScan, stopCamera, stopScan])

  useEffect(() => {
    if (mode === 'nfc') {
      startScan(handleToken)
    }
  }, [mode, startScan, handleToken])

  return (
    <div className="min-h-full">
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button onClick={() => { stopCamera(); navigate(-1) }} className="text-gray-400 hover:text-gray-200 p-1">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold text-gray-100">Scan Enclosure</h1>
        {mode !== 'choose' && (
          <button onClick={() => { stopCamera(); stopScan(); setMode('choose') }} className="ml-auto text-gray-500 p-1">
            <X size={20} />
          </button>
        )}
      </div>

      {mode === 'choose' && (
        <div className="px-4 space-y-3">
          <p className="text-sm text-gray-400 mb-6">
            Scan the QR code or NFC tag on your enclosure to quickly log a care event.
          </p>

          {isNFCSupported && (
            <button
              onClick={() => setMode('nfc')}
              className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col items-center gap-3 hover:border-emerald-500/40 transition-colors"
            >
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <Wifi size={28} className="text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-100">Scan NFC Tag</p>
                <p className="text-xs text-gray-500 mt-1">Hold phone near the NFC tag</p>
              </div>
            </button>
          )}

          <button
            onClick={() => setMode('qr')}
            className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col items-center gap-3 hover:border-emerald-500/40 transition-colors"
          >
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Camera size={28} className="text-blue-400" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-100">Scan QR Code</p>
              <p className="text-xs text-gray-500 mt-1">Point camera at the QR label</p>
            </div>
          </button>

          <button
            onClick={() => setMode('manual')}
            className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-3 hover:border-gray-700 transition-colors"
          >
            <Keyboard size={20} className="text-gray-500" />
            <p className="text-sm text-gray-400">Enter token manually</p>
          </button>

          {!isNFCSupported && (
            <p className="text-xs text-gray-600 text-center mt-4">
              NFC scanning is available on Android Chrome. Use QR codes on iOS.
            </p>
          )}
        </div>
      )}

      {mode === 'nfc' && (
        <div className="px-4 flex flex-col items-center gap-6 pt-12">
          <div className={cn(
            'w-32 h-32 rounded-full flex items-center justify-center transition-all',
            scanning ? 'bg-emerald-500/20 animate-pulse' : 'bg-gray-800'
          )}>
            <Wifi size={48} className={scanning ? 'text-emerald-400' : 'text-gray-600'} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-100">{scanning ? 'Ready to scan' : 'Starting NFC...'}</p>
            <p className="text-sm text-gray-500 mt-1">Hold your phone near the NFC tag on the enclosure</p>
          </div>
          {nfcError && <p className="text-red-400 text-sm text-center">{nfcError}</p>}
        </div>
      )}

      {mode === 'qr' && (
        <div className="px-4 space-y-4">
          {cameraError ? (
            <div className="text-center py-12">
              <p className="text-red-400">{cameraError}</p>
              <button onClick={startQRScan} className="mt-4 text-emerald-400 text-sm">Try again</button>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              {/* Scan overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-emerald-400 rounded-xl opacity-70" />
              </div>
              {looking && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          )}
          <p className="text-center text-sm text-gray-500">Point the camera at the QR code on your enclosure</p>
        </div>
      )}

      {mode === 'manual' && (
        <div className="px-4 space-y-4">
          <p className="text-sm text-gray-400">Enter the animal's QR token (found in the animal profile).</p>
          <input
            type="text"
            value={manualToken}
            onChange={e => setManualToken(e.target.value)}
            placeholder="Paste token here..."
            className="w-full bg-gray-900 border border-gray-800 text-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 font-mono"
          />
          <button
            onClick={() => { if (manualToken.trim()) handleToken(manualToken.trim()) }}
            disabled={!manualToken.trim() || looking}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors"
          >
            {looking ? 'Looking up...' : 'Look Up Animal'}
          </button>
        </div>
      )}
    </div>
  )
}
