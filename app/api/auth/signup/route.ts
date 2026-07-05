import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSession, loginUser, registerUser, SESSION_COOKIE, SESSION_DAYS } from '@/lib/auth/session'

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
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
    const body = authSchema.parse(await request.json())
    const user = await registerUser(body)
    const token = await createSession(user.id)
    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    })
    setSessionCookie(response, token)
    return response
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Signup failed' },
      { status: 400 }
    )
  }
}
