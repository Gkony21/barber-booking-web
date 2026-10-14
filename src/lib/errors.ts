import type { TFunction } from 'i18next'
import { ApiError, NetworkError } from '../api/client'

/** A message for the user. Known cases get Greek copy; anything else a generic line. */
export function errorMessage(error: unknown, t: TFunction): string {
  if (error instanceof NetworkError) return t('common.networkError')
  if (error instanceof ApiError && error.code === 'WEAK_PASSWORD') return t('auth.weakPassword')
  if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.message) return error.message
  return t('common.genericError')
}
