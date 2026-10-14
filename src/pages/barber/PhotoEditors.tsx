import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { mediaUrl } from '../../api/client'
import { barberMeApi } from '../../api/endpoints'
import type { Barber } from '../../api/types'
import { Avatar } from '../../components/Avatar'
import { Button } from '../../components/Button'
import { Notice } from '../../components/States'
import { errorMessage } from '../../lib/errors'
import { prepareImage, UnsupportedImageError } from '../../lib/image'

export const MAX_PHOTOS = 20

function useUploadError() {
  const { t } = useTranslation()
  return (error: unknown) => (error instanceof UnsupportedImageError ? t('barber.photos.unsupported') : errorMessage(error, t))
}

export function AvatarEditor({ barber }: { barber: Barber }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const describe = useUploadError()

  const onDone = (updated: Barber) => queryClient.setQueryData(['barber', 'me'], updated)
  const upload = useMutation({
    mutationFn: async (file: File) => barberMeApi.setAvatar(await prepareImage(file, 1024)),
    onSuccess: onDone,
  })
  const remove = useMutation({ mutationFn: barberMeApi.removeAvatar, onSuccess: onDone })
  const busy = upload.isPending || remove.isPending

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <Avatar name={barber.name} url={barber.avatarUrl} size={88} />
        <div className="flex flex-col items-start gap-1">
          <input
            ref={input}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label={t('barber.photos.avatar')}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) upload.mutate(file)
              e.target.value = ''
            }}
          />
          <Button variant="secondary" className="min-h-11 text-sm" disabled={busy} onClick={() => input.current?.click()}>
            {barber.avatarUrl ? t('barber.photos.changeAvatar') : t('barber.photos.addAvatar')}
          </Button>
          {barber.avatarUrl && (
            <Button variant="ghost" className="min-h-11 px-0 text-sm" disabled={busy} onClick={() => remove.mutate()}>
              {t('barber.photos.removeAvatar')}
            </Button>
          )}
        </div>
      </div>
      {(upload.isError || remove.isError) && <Notice tone="error">{describe(upload.error ?? remove.error)}</Notice>}
    </section>
  )
}

export function WorkPhotosEditor() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const describe = useUploadError()
  const photos = useQuery({ queryKey: ['barber', 'photos'], queryFn: barberMeApi.photos })
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const count = photos.data?.length ?? 0
  const room = MAX_PHOTOS - count
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['barber', 'photos'] })

  // One at a time, so a slow connection shows progress and a failure keeps the earlier ones.
  async function uploadAll(files: File[]) {
    const batch = files.slice(0, room)
    setError(null)
    try {
      for (let i = 0; i < batch.length; i++) {
        setProgress({ current: i + 1, total: batch.length })
        await barberMeApi.addPhoto(await prepareImage(batch[i]))
        await refresh()
      }
    } catch (e) {
      setError(describe(e))
    } finally {
      setProgress(null)
    }
  }

  const remove = useMutation({ mutationFn: barberMeApi.deletePhoto, onSuccess: refresh })

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-3xl leading-none font-extrabold uppercase">{t('barber.photos.workTitle')}</h2>
        <span className="text-sm text-muted">{t('barber.photos.count', { count, max: MAX_PHOTOS })}</span>
      </div>
      <p className="text-sm text-muted">{t('barber.photos.workBody', { max: MAX_PHOTOS })}</p>

      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-label={t('barber.photos.add')}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          if (files.length) void uploadAll(files)
          e.target.value = ''
        }}
      />

      <ul className="grid grid-cols-3 gap-2">
        {room > 0 && (
          <li>
            <button
              type="button"
              disabled={progress !== null}
              onClick={() => input.current?.click()}
              className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line text-sm font-semibold text-accent hover:border-accent disabled:text-faint"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              {t('barber.photos.add')}
            </button>
          </li>
        )}
        {photos.data?.map((photo) => (
          <li key={photo.id} className="relative">
            <img src={mediaUrl(photo.url)} alt="" loading="lazy" className="aspect-square w-full rounded-xl bg-surface object-cover" />
            <button
              type="button"
              aria-label={t('barber.photos.remove')}
              disabled={remove.isPending}
              onClick={() => window.confirm(t('barber.photos.confirmRemove')) && remove.mutate(photo.id)}
              className="absolute top-1 right-1 flex size-9 items-center justify-center rounded-full bg-ground/80 text-ink backdrop-blur"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      {progress && <Notice>{t('barber.photos.uploading', progress)}</Notice>}
      {room <= 0 && <Notice>{t('barber.photos.full', { max: MAX_PHOTOS })}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      {remove.isError && <Notice tone="error">{errorMessage(remove.error, t)}</Notice>}
      <p className="text-xs text-muted">{t('barber.photos.consent')}</p>
    </section>
  )
}
