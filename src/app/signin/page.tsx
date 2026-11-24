import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SignInForm } from '@/components/site/sign-in-form'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = { title: 'Sign in' }

export default function SignInPage() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-8 sm:py-12">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <SignInForm />
      </Suspense>
    </div>
  )
}
