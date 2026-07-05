import { createHash, randomBytes } from 'crypto'
import { eq, and, gt } from 'drizzle-orm'
import { getDb } from '@/lib/db/get-db'
import { users, sessions } from '@/lib/db/schema'

const SESSION_COOKIE = 'contextds_session'
const SESSION_DAYS = 30

export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSession(userId: string): Promise<string> {
  const db = await getDb()
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)

  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  })

  return token
}

export async function getUserFromSessionToken(token: string | undefined) {
  if (!token) return null

  const db = await getDb()
  const [session] = await db
    .select()
    .from(sessions)
    .where(
      and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date()))
    )
    .limit(1)

  if (!session) return null

  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1)
  return user ?? null
}

export async function registerUser(input: {
  email: string
  password: string
  name?: string
}) {
  const db = await getDb()
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email.toLowerCase()))
    .limit(1)

  if (existing[0]) {
    throw new Error('Email already registered')
  }

  const [user] = await db
    .insert(users)
    .values({
      email: input.email.toLowerCase(),
      name: input.name,
      passwordHash: hashPassword(input.password),
      emailVerified: false,
    })
    .returning()

  return user
}

export async function loginUser(email: string, password: string) {
  const db = await getDb()
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1)

  if (!user?.passwordHash || user.passwordHash !== hashPassword(password)) {
    throw new Error('Invalid email or password')
  }

  return user
}

export { SESSION_COOKIE, SESSION_DAYS }
