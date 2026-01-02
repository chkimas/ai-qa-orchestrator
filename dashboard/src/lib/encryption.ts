import crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16

function getMasterKey(): Buffer {
  const secret = process.env.VAULT_MASTER_KEY
  if (!secret) {
    throw new Error('CRITICAL: VAULT_MASTER_KEY is missing from environment.')
  }
  return crypto.createHash('sha256').update(String(secret)).digest()
}

export function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(IV_LENGTH)
    const key = getMasterKey()

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    return `${iv.toString('hex')}:${encrypted}`
  } catch (error) {
    console.error('[ARGUS Security] Encryption failure:', error)
    throw error
  }
}

export function decrypt(encryptedText: string | null): string | null {
  if (!encryptedText || !encryptedText.includes(':')) return null

  try {
    const [ivHex, dataHex] = encryptedText.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const key = getMasterKey()

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)

    let decrypted = decipher.update(dataHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    console.error('[ARGUS Security] Decryption failure:', error)
    return null
  }
}
