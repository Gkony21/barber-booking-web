import type { TFunction } from 'i18next'
import { ApiError, NetworkError } from '../api/client'

/**
 * A Greek message for the person. The API's "detail" is English and meant for developers, so it
 * is never shown: errors with a known code get their own text, the rest a line by status.
 */
export function errorMessage(error: unknown, t: TFunction): string {
  if (error instanceof NetworkError) return t('common.networkError')
  if (!(error instanceof ApiError)) return t('common.genericError')
  if (error.code && t(`errors.${error.code}`, { defaultValue: '' })) return t(`errors.${error.code}`)
  if (error.status === 429) return t('errors.RATE_LIMITED')
  if (error.status === 404) return t('errors.notFound')
  if (error.status === 403) return t('errors.forbidden')
  if (error.status === 409) return t('errors.CONFLICT')
  if (error.status === 400 || error.status === 422) return t('errors.invalid')
  return t('common.genericError')
}

/** True when the API refused with this code, e.g. hasCode(error, 'SLOT_TAKEN'). */
export function hasCode(error: unknown, code: string): boolean {
  return error instanceof ApiError && error.code === code
}
