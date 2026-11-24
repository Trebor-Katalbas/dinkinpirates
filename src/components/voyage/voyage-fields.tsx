'use client'

import { useId } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { parseReclubUrl } from '@/lib/reclub'

export const VISIBILITY_HELP =
  'Publishing this link shares it on the Dock and our Facebook page. Roster and slots are managed on Reclub.'

export const TITLE_MAX = 80

/** Empty input is valid (the link is optional). Returns the canonical URL or an error. */
export function checkReclubInput(raw: string): { url: string | null; error: string | null } {
  if (!raw.trim()) return { url: null, error: null }
  const parsed = parseReclubUrl(raw)
  return parsed.ok ? { url: parsed.url, error: null } : { url: null, error: parsed.error }
}

export function ReclubUrlField({
  value,
  onChange,
  label = 'Reclub open-play link',
  optional = true,
}: {
  value: string
  onChange: (v: string) => void
  label?: string
  optional?: boolean
}) {
  const id = useId()
  const { error } = checkReclubInput(value)
  const showError = Boolean(error) && value.trim().length > 0
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {optional ? <span className="font-normal text-ink/60">(optional)</span> : null}
      </Label>
      <Input
        id={id}
        type="url"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        placeholder="https://reclub.co/…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={showError || undefined}
        aria-describedby={`${id}-hint`}
        className="h-11 bg-white/80 text-base"
      />
      <p
        id={`${id}-hint`}
        className={showError ? 'text-sm text-bounty-red' : 'text-xs text-ink/65'}
        aria-live="polite"
      >
        {showError
          ? error
          : 'Paste the https://reclub.co link to your open play. We only redirect to it.'}
      </p>
    </div>
  )
}

export function VoyageTitleField({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const id = useId()
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        Voyage title <span className="font-normal text-ink/60">(optional)</span>
      </Label>
      <Input
        id={id}
        value={value}
        maxLength={TITLE_MAX}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Friday night dinks"
        className="h-11 bg-white/80 text-base"
      />
    </div>
  )
}

export function VisibilityToggle({
  checked,
  onCheckedChange,
  disabled,
}: {
  checked: boolean
  onCheckedChange: (v: boolean) => void
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="rounded-xl border border-ink/15 bg-white/60 p-3">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <Label htmlFor={id} className="text-base">
          List publicly on the Dock
        </Label>
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          aria-describedby={`${id}-help`}
        />
      </div>
      <p id={`${id}-help`} className="mt-1 text-sm text-ink/75">
        {VISIBILITY_HELP}
      </p>
    </div>
  )
}
