'use client'

import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { getJSON } from '@/components/site/fetch-json'
import type { UserDTO } from '@/types'

/** Current user profile (bounty + tier). Only fetched when signed in. */
export function useMe() {
  const { status } = useSession()
  return useQuery({
    queryKey: ['me'],
    queryFn: () => getJSON<UserDTO>('/api/me'),
    enabled: status === 'authenticated',
    staleTime: 60_000,
  })
}
