import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Animal } from '@/types'

export default function ScanRedirect() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  const [looked, setLooked] = useState(false)

  useEffect(() => {
    if (!token) { navigate('/scanner', { replace: true }); return }
    supabase.from('animals').select('data').eq('qr_code_token', token).maybeSingle().then(({ data }) => {
      setLooked(true)
      const animal = data?.data as Animal | undefined
      if (animal) {
        navigate(`/animals/${animal.id}/log`, { replace: true })
      } else {
        navigate('/scanner', { replace: true })
      }
    })
  }, [token, navigate])

  if (looked) return null

  return (
    <div className="flex items-center justify-center h-screen bg-gray-950">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Looking up animal...</p>
      </div>
    </div>
  )
}
