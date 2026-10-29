import { pushApi } from '../api/endpoints'

/**
 * Phone notifications in this browser. Where they cannot work, says why, so the barber knows what
 * to do: on an iPhone they need the app on the home screen first (Apple's rule).
 */
export type PushState =
  | 'unsupported' // this browser cannot receive them (or the app is not installed as a PWA here)
  | 'ios-install' // iPhone/iPad: add FADE to the home screen first
  | 'blocked' // the user said no; only the browser's settings can undo that
  | 'off'
  | 'on'

export function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

async function registration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!('serviceWorker' in navigator)) return undefined
  return navigator.serviceWorker.getRegistration()
}

export async function pushState(): Promise<PushState> {
  if (isIos() && !isStandalone()) return 'ios-install'
  if (typeof Notification === 'undefined' || !('PushManager' in window)) return 'unsupported'
  const worker = await registration()
  if (!worker) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  return (await worker.pushManager.getSubscription()) ? 'on' : 'off'
}

/** Asks permission, subscribes this browser and tells the API where to send. */
export async function enablePush(): Promise<PushState> {
  const worker = await registration()
  if (!worker) return 'unsupported'
  if ((await Notification.requestPermission()) !== 'granted') return 'blocked'
  const { publicKey } = await pushApi.key()
  const subscription =
    (await worker.pushManager.getSubscription()) ??
    (await worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromBase64Url(publicKey) }))
  await pushApi.subscribe(subscription.toJSON())
  return 'on'
}

export async function disablePush(): Promise<PushState> {
  const subscription = await (await registration())?.pushManager.getSubscription()
  if (subscription) {
    await pushApi.unsubscribe(subscription.endpoint)
    await subscription.unsubscribe()
  }
  return 'off'
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = (value + '='.repeat((4 - (value.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const bytes = atob(base64)
  const out = new Uint8Array(new ArrayBuffer(bytes.length))
  for (let i = 0; i < bytes.length; i++) out[i] = bytes.charCodeAt(i)
  return out
}
