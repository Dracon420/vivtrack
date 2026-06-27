import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'

export default function ScanRedirect() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const animal = useLiveQuery(
    () => token ? db.animals.where('qrCodeToken').equals(token).first() : undefined,
    [token]
  )

  useEffect(() => {
    if (animal === undefined) return
    if (animal) {
      navigate(`/animals/${animal.id}/log`, { replace: true })
    } else {
      navigate('/scanner', { replace: true })
    }
  }, [animal, navigate])

  return (
    <div className="flex items-center justify-center h-screen bg-gray-950">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Looking up animal...</p>
      </div>
    </div>
  )
}
