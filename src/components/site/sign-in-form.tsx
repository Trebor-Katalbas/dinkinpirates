'use client'

import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Compass } from '@/components/site/compass'
import { safeCallbackUrl } from '@/components/site/safe-callback'

const AUTH_ERRORS: Record<string, string> = {
  CredentialsSignin: 'That email did not work. Check it and try again.',
  OAuthAccountNotLinked: 'That email is already linked to another sign-in method.',
  Configuration: 'Sign-in is not configured on this server yet.',
}

export function SignInForm() {
  const params = useSearchParams()
  const callbackUrl = safeCallbackUrl(params.get('callbackUrl'))
  const errorCode = params.get('error')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [pending, setPending] = useState<'dev' | 'google' | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending('dev')
    try {
      await signIn('dev', { email, name, redirectTo: callbackUrl })
    } finally {
      setPending(null)
    }
  }

  return (
    <Card className="wanted-poster p-0">
      <CardHeader className="pt-6 text-center">
        <Compass className="mx-auto size-12 text-sea-deep" />
        <CardTitle className="font-display text-4xl text-sea-deep">Come aboard</CardTitle>
        <CardDescription>Sign in to claim courts and manage your voyages.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pb-6">
        {errorCode ? (
          <p
            role="alert"
            className="rounded-lg border border-bounty-red/40 bg-bounty-red/10 px-3 py-2 text-sm text-bounty-red"
          >
            {AUTH_ERRORS[errorCode] ?? 'Sign-in failed. Please try again.'}
          </p>
        ) : null}

        <Button
          type="button"
          variant="outline"
          className="tap w-full bg-white/70 text-base"
          disabled={pending !== null}
          onClick={() => {
            setPending('google')
            void signIn('google', { redirectTo: callbackUrl })
          }}
        >
          {pending === 'google' ? <Loader2 className="animate-spin" aria-hidden /> : <GoogleMark />}
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 text-xs text-ink/60">
          <Separator className="flex-1 bg-ink/20" />
          <span>or use your email</span>
          <Separator className="flex-1 bg-ink/20" />
        </div>

        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <div className="space-y-1.5">
            <Label htmlFor="signin-email">Email</Label>
            <Input
              id="signin-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 bg-white/80 text-base"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="signin-name">
              Name <span className="font-normal text-ink/60">(optional)</span>
            </Label>
            <Input
              id="signin-name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 bg-white/80 text-base"
              maxLength={60}
            />
          </div>
          <Button
            type="submit"
            className="tap w-full text-base"
            disabled={pending !== null || !email}
          >
            {pending === 'dev' ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Sign in
          </Button>
          <p className="text-center text-xs text-ink/60">
            Email sign-in is available for development builds.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M22.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h6c-.3 1.4-1.1 2.6-2.2 3.4v2.8h3.6c2.1-1.9 3.2-4.8 3.2-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.9C3.8 20.5 7.6 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.7 14c-.2-.7-.4-1.3-.4-2s.1-1.4.4-2V7.1H2C1.4 8.6 1 10.2 1 12s.4 3.4 1 4.9L5.7 14z"
      />
      <path
        fill="#EA4335"
        d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2C17.5 2.1 15 1 12 1 7.6 1 3.8 3.5 2 7.1L5.7 10c.9-2.6 3.4-4.6 6.3-4.6z"
      />
    </svg>
  )
}
