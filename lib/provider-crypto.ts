import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

export type EncryptedSecret = {
  ciphertext: string
  iv: string
  tag: string
  suffix: string
}

function encryptionKey() {
  const secret = process.env.PROVIDER_KEY_ENCRYPTION_SECRET
  if (!secret) throw new Error('PROVIDER_KEY_ENCRYPTION_SECRET is not configured')
  return createHash('sha256').update(secret).digest()
}

export function encryptProviderKey(value: string): EncryptedSecret {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return {
    ciphertext: ciphertext.toString('base64url'),
    iv: iv.toString('base64url'),
    tag: cipher.getAuthTag().toString('base64url'),
    suffix: value.slice(-4),
  }
}

export function decryptProviderKey(secret: EncryptedSecret) {
  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(secret.iv, 'base64url'),
  )
  decipher.setAuthTag(Buffer.from(secret.tag, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(secret.ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}
