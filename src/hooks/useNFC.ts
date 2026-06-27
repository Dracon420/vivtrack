import { useState, useCallback } from 'react'

export const isNFCSupported = typeof window !== 'undefined' && 'NDEFReader' in window

interface NFCHookResult {
  supported: boolean
  scanning: boolean
  error: string | null
  startScan: (onRead: (token: string) => void) => Promise<void>
  stopScan: () => void
  writeTag: (url: string) => Promise<void>
}

export function useNFC(): NFCHookResult {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortController = { current: null as AbortController | null }

  const startScan = useCallback(async (onRead: (token: string) => void) => {
    if (!isNFCSupported) {
      setError('NFC is not supported on this device')
      return
    }
    try {
      setScanning(true)
      setError(null)
      abortController.current = new AbortController()

      // @ts-expect-error NDEFReader not in standard TS types
      const ndef = new NDEFReader()
      await ndef.scan({ signal: abortController.current.signal })

      ndef.onreading = (event: { message: { records: { recordType: string; data: DataView }[] } }) => {
        for (const record of event.message.records) {
          if (record.recordType === 'url') {
            const decoder = new TextDecoder()
            const url = decoder.decode(record.data)
            const params = new URLSearchParams(url.split('?')[1] ?? '')
            const token = params.get('token')
            if (token) onRead(token)
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'NFC scan failed')
      setScanning(false)
    }
  }, [])

  const stopScan = useCallback(() => {
    abortController.current?.abort()
    setScanning(false)
  }, [])

  const writeTag = useCallback(async (url: string) => {
    if (!isNFCSupported) throw new Error('NFC not supported')
    // @ts-expect-error NDEFReader not in standard TS types
    const ndef = new NDEFReader()
    await ndef.write({ records: [{ recordType: 'url', data: url }] })
  }, [])

  return { supported: isNFCSupported, scanning, error, startScan, stopScan, writeTag }
}
