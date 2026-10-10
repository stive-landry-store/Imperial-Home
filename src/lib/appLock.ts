const KEY = 'ih-app-lock'

function toBase64(buffer: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0))
}

export async function lockSupported() {
  try {
    return Boolean(window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()))
  } catch {
    return false
  }
}

export function lockEnabled() {
  return Boolean(localStorage.getItem(KEY))
}

export async function enableLock(label: string) {
  const challenge = crypto.getRandomValues(new Uint8Array(32))
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'Impérial Home' },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: label || 'imperial-home', displayName: label || 'Impérial Home' },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null
  if (!credential) return false
  localStorage.setItem(KEY, toBase64(credential.rawId))
  return true
}

export function disableLock() {
  localStorage.removeItem(KEY)
}

export async function unlock() {
  const stored = localStorage.getItem(KEY)
  if (!stored) return true
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ type: 'public-key', id: fromBase64(stored) }],
        userVerification: 'required',
        timeout: 60_000,
      },
    })
    return Boolean(assertion)
  } catch {
    return false
  }
}
