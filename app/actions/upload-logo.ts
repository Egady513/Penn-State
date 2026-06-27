'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { EVENT_ID } from '@/lib/eventId'

export interface UploadResult {
  url?: string
  error?: string
}

/**
 * Upload a sponsor/event logo to the public `event-assets` bucket.
 *
 * Runs server-side with the SERVICE-ROLE client so it bypasses storage RLS —
 * this is why it can't silently fail the way the old client-side upload did.
 * Used by both the registration hole-sponsor flow and the admin Sponsors page.
 */
export async function uploadSponsorLogo(formData: FormData): Promise<UploadResult> {
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'No file provided.' }
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: 'Logo must be under 5 MB.' }
  }

  const admin = createAdminClient()
  const ext = (file.name.split('.').pop() || 'png').toLowerCase()
  const path = `${EVENT_ID}/sponsors/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error } = await admin.storage
    .from('event-assets')
    .upload(path, buffer, {
      contentType: file.type || 'image/png',
      upsert: true,
    })

  if (error) return { error: error.message }

  const { data } = admin.storage.from('event-assets').getPublicUrl(path)
  return { url: data.publicUrl }
}
