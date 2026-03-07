// server/src/services/auth.service.ts
import { z } from "zod";
import { SignJWT, jwtVerify } from "jose";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*\W)/),
  name: z.string().min(2).max(100),
});

export class AuthService {
  private readonly jwtSecret: Uint8Array;

  constructor(jwtSecret: string) {
    if (jwtSecret.length < 32) {
      throw new Error("JWT secret must be at least 32 characters");
    }
    this.jwtSecret = new TextEncoder().encode(jwtSecret);
  }

  async register(input: unknown): Promise<User> {
    const data = registerSchema.parse(input);

    const existing = await db.users.findByEmail(data.email);
    if (existing) {
      throw new ConflictError("Email already registered");
    }

    const passwordHash = await Bun.password.hash(data.password, {
      algorithm: "argon2id",
      memoryCost: 65536,
      timeCost: 3,
    });

    return db.users.create({
      email: data.email.toLowerCase(),
      passwordHash,
      name: data.name,
      role: "user",
    });
  }

  async login(input: unknown): Promise<AuthTokens> {
    const data = loginSchema.parse(input);

    const user = await db.users.findByEmail(data.email.toLowerCase());
    if (!user) {
      await Bun.password.hash(data.password); // Timing attack prevention
      throw new UnauthorizedError("Invalid credentials");
    }

    const valid = await Bun.password.verify(data.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const session = await db.sessions.create({ userId: user.id });

    return {
      accessToken: await this.createAccessToken(user, session.id),
      refreshToken: await this.createRefreshToken(user, session.id),
    };
  }

  private async createAccessToken(
    user: User,
    sessionId: string,
  ): Promise<string> {
    return new SignJWT({ sub: user.id, role: user.role, sessionId })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(this.jwtSecret);
  }

  private async createRefreshToken(
    user: User,
    sessionId: string,
  ): Promise<string> {
    return new SignJWT({ sub: user.id, sessionId, type: "refresh" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(this.jwtSecret);
  }
}
