import { Suspense } from 'react'
import { MockGoClient } from './mock-go-client'

export const metadata = { title: 'Opening Reclub (mock)' }

export default function MockGoPage({ params }: PageProps<'/mock/go/[id]'>) {
  return (
    <Suspense fallback={null}>
      {params.then(({ id }) => (
        <MockGoClient id={id} />
      ))}
    </Suspense>
  )
}
