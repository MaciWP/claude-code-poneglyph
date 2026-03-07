# Authentication

Password hashing, JWT token management, and session cookie patterns.

## Password Hashing (Bun Native)

```typescript
interface PasswordConfig {
  algorithm: 'argon2id'
  memoryCost: number
  timeCost: number
}

const PASSWORD_CONFIG: PasswordConfig = {
  algorithm: 'argon2id',
  memoryCost: 65536, // 64 MB
  timeCost: 3,       // 3 iterations
}

async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, PASSWORD_CONFIG)
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await Bun.password.verify(password, hash)
  } catch {
    return false // Fail secure
  }
}

// Complete login flow
async function login(email: string, password: string): Promise<AuthResult> {
  const user = await db.users.findByEmail(email)

  // Constant-time comparison to prevent timing attacks
  if (!user) {
    // Hash anyway to prevent user enumeration
    await Bun.password.hash(password, PASSWORD_CONFIG)
    throw new UnauthorizedError('Invalid credentials')
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    await recordFailedLogin(user.id)
    throw new UnauthorizedError('Invalid credentials')
  }

  await clearFailedLogins(user.id)
  return createSession(user)
}
```

## JWT Token Management

```typescript
import { SignJWT, jwtVerify, JWTPayload } from 'jose'

interface TokenPayload extends JWTPayload {
  sub: string
  role: string
  sessionId: string
}

const JWT_SECRET = new TextEncoder().encode(Bun.env.JWT_SECRET)
const JWT_ISSUER = 'claude-code-poneglyph'
const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY = '7d'

async function createAccessToken(user: User, sessionId: string): Promise<string> {
  return new SignJWT({
    sub: user.id,
    role: user.role,
    sessionId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET)
}

async function createRefreshToken(user: User, sessionId: string): Promise<string> {
  return new SignJWT({
    sub: user.id,
    sessionId,
    type: 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_SECRET)
}

async function verifyToken(token: string): Promise<TokenPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
    })
    return payload as TokenPayload
  } catch (error) {
    if (error instanceof Error && error.name === 'JWTExpired') {
      throw new UnauthorizedError('Token expired')
    }
    throw new UnauthorizedError('Invalid token')
  }
}

// Token refresh flow
async function refreshTokens(refreshToken: string): Promise<TokenPair> {
  const payload = await verifyToken(refreshToken)

  if (payload.type !== 'refresh') {
    throw new UnauthorizedError('Invalid token type')
  }

  // Verify session still valid
  const session = await db.sessions.find(payload.sessionId)
  if (!session || session.revokedAt) {
    throw new UnauthorizedError('Session revoked')
  }

  const user = await db.users.find(payload.sub)
  return {
    accessToken: await createAccessToken(user, session.id),
    refreshToken: await createRefreshToken(user, session.id),
  }
}
```

## Secure Session Cookies

```typescript
import { Elysia } from 'elysia'

const COOKIE_OPTIONS = {
  httpOnly: true,      // Prevent XSS access
  secure: true,        // HTTPS only
  sameSite: 'strict',  // Prevent CSRF
  path: '/',
  maxAge: 3600,        // 1 hour
} as const

const app = new Elysia()
  .post('/login', async ({ body, cookie }) => {
    const { user, sessionId } = await authenticate(body)
    const token = await createAccessToken(user, sessionId)

    cookie.session.set({
      value: token,
      ...COOKIE_OPTIONS,
    })

    return { success: true, user: sanitizeUser(user) }
  })
  .post('/logout', ({ cookie }) => {
    cookie.session.set({
      value: '',
      ...COOKIE_OPTIONS,
      maxAge: 0, // Expire immediately
    })
    return { success: true }
  })
```

## Key Rules

| Rule | Why |
|------|-----|
| Always hash with argon2id | bcrypt/scrypt are weaker for modern hardware |
| Hash on failed lookup too | Prevents user enumeration via timing |
| JWT secret >= 32 chars | Short secrets are brute-forceable |
| Access token: 15m max | Limits damage window if stolen |
| Refresh token: 7d max | Revocable via session table |
| httpOnly + secure + sameSite | Defense-in-depth for cookies |
