import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSession, loginUser, SESSION_COOKIE, SESSION_DAYS } from '@/lib/auth/session'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = loginSchema.parse(await request.json())
    const user = await loginUser(body.email, body.password)
    const token = await createSession(user.id)
    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    })
    setSessionCookie(response, token)
    return response
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Login failed' },
      { status: 401 }
    )
  }
}
