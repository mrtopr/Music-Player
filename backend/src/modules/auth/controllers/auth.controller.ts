import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { prisma } from '../../../common/prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'mehfil-super-secret-jwt-key'

export class AuthController {
  public controller: OpenAPIHono

  constructor() {
    this.controller = new OpenAPIHono()
  }

  public initRoutes() {
    this.controller.openapi(
      createRoute({
        method: 'post',
        path: '/auth/register',
        tags: ['Auth'],
        summary: 'Register a new user',
        request: {
          body: {
            content: {
              'application/json': {
                schema: z.object({
                  name: z.string().min(2),
                  email: z.string().email(),
                  password: z.string().min(6)
                })
              }
            }
          }
        },
        responses: {
          201: {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean(),
                  token: z.string().optional(),
                  user: z.any().optional(),
                  message: z.string().optional()
                })
              }
            }
          },
          400: {
            description: 'Bad Request',
            content: { 'application/json': { schema: z.object({ success: z.boolean(), message: z.string() }) } }
          },
          500: {
            description: 'Internal Error',
            content: { 'application/json': { schema: z.object({ success: z.boolean(), message: z.string() }) } }
          }
        }
      }),
      async (ctx) => {
        const { name, email, password } = ctx.req.valid('json')
        try {
          const existing = await prisma.user.findUnique({ where: { email } })
          if (existing) return ctx.json({ success: false, message: 'Email already exists' }, 400)

          const salt = await bcrypt.genSalt(10)
          const passwordHash = await bcrypt.hash(password, salt)

          const user = await prisma.user.create({
            data: {
              name,
              email,
              passwordHash,
              profileImageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
            }
          })

          const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
          return ctx.json({
            success: true,
            token,
            user: { id: user.id, name: user.name, email: user.email, profileImageUrl: user.profileImageUrl }
          }, 201)
        } catch (error) {
          console.error('[Auth Error] Register:', error)
          return ctx.json({ success: false, message: 'Internal server error' }, 500)
        }
      }
    )

    this.controller.openapi(
      createRoute({
        method: 'post',
        path: '/auth/login',
        tags: ['Auth'],
        summary: 'Login user',
        request: {
          body: {
            content: {
              'application/json': {
                schema: z.object({
                  email: z.string().email(),
                  password: z.string()
                })
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Login successful',
            content: { 'application/json': { schema: z.object({ success: z.boolean(), token: z.string().optional(), user: z.any().optional(), message: z.string().optional() }) } }
          },
          401: {
            description: 'Unauthorized',
            content: { 'application/json': { schema: z.object({ success: z.boolean(), message: z.string() }) } }
          },
          500: {
            description: 'Internal Error',
            content: { 'application/json': { schema: z.object({ success: z.boolean(), message: z.string() }) } }
          }
        }
      }),
      async (ctx) => {
        const { email, password } = ctx.req.valid('json')
        try {
          const user = await prisma.user.findUnique({ where: { email } })
          if (!user) return ctx.json({ success: false, message: 'Invalid credentials' }, 401)

          const isMatch = await bcrypt.compare(password, user.passwordHash)
          if (!isMatch) return ctx.json({ success: false, message: 'Invalid credentials' }, 401)

          const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
          return ctx.json({
            success: true,
            token,
            user: { id: user.id, name: user.name, email: user.email, profileImageUrl: user.profileImageUrl }
          }, 200)
        } catch (error) {
          return ctx.json({ success: false, message: 'Internal server error' }, 500)
        }
      }
    )

    this.controller.openapi(
      createRoute({
        method: 'get',
        path: '/auth/me',
        tags: ['Auth'],
        summary: 'Get current user profile',
        responses: {
          200: {
            description: 'User found',
            content: { 'application/json': { schema: z.object({ success: z.boolean(), user: z.any() }) } }
          },
          401: {
            description: 'Unauthorized',
            content: { 'application/json': { schema: z.object({ success: z.boolean(), message: z.string() }) } }
          },
          404: {
            description: 'User not found',
            content: { 'application/json': { schema: z.object({ success: z.boolean(), message: z.string() }) } }
          }
        }
      }),
      async (ctx) => {
        const authHeader = ctx.req.header('Authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return ctx.json({ success: false, message: 'Unauthorized' }, 401)
        }

        const token = authHeader.split(' ')[1]
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
          const user = await prisma.user.findUnique({ where: { id: decoded.userId } })

          if (!user) return ctx.json({ success: false, message: 'User not found' }, 404)

          return ctx.json({
            success: true,
            user: { id: user.id, name: user.name, email: user.email, profileImageUrl: user.profileImageUrl }
          }, 200)
        } catch (error) {
          return ctx.json({ success: false, message: 'Invalid token' }, 401)
        }
      }
    )

    this.controller.openapi(
      createRoute({
        method: 'patch',
        path: '/auth/me',
        tags: ['Auth'],
        summary: 'Update current user profile',
        request: {
          body: {
            content: {
              'application/json': {
                schema: z.object({
                  name: z.string().optional(),
                  profileImageUrl: z.string().url().optional()
                })
              }
            }
          }
        },
        responses: {
          200: {
            description: 'User updated',
            content: { 'application/json': { schema: z.object({ success: z.boolean(), user: z.any() }) } }
          },
          401: {
            description: 'Unauthorized',
            content: { 'application/json': { schema: z.object({ success: z.boolean(), message: z.string() }) } }
          },
          500: {
            description: 'Internal Error',
            content: { 'application/json': { schema: z.object({ success: z.boolean(), message: z.string() }) } }
          }
        }
      }),
      async (ctx) => {
        const authHeader = ctx.req.header('Authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return ctx.json({ success: false, message: 'Unauthorized' }, 401)
        }

        const token = authHeader.split(' ')[1]
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
          const { name, profileImageUrl } = ctx.req.valid('json')
          
          const user = await prisma.user.update({
            where: { id: decoded.userId },
            data: {
              ...(name && { name }),
              ...(profileImageUrl && { profileImageUrl })
            }
          })

          return ctx.json({
            success: true,
            user: { id: user.id, name: user.name, email: user.email, profileImageUrl: user.profileImageUrl }
          }, 200)
        } catch (error) {
          console.error('[Auth Error] Update Profile:', error)
          return ctx.json({ success: false, message: 'Internal server error' }, 500)
        }
      }
    )

    // ── Forgot Password ──────────────────────────────────────────────
    this.controller.openapi(
      createRoute({
        method: 'post',
        path: '/auth/forgot-password',
        tags: ['Auth'],
        summary: 'Request a password reset token',
        request: {
          body: {
            content: {
              'application/json': {
                schema: z.object({ email: z.string().email() })
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Reset token generated',
            content: { 'application/json': { schema: z.object({ success: z.boolean(), message: z.string() }) } }
          },
          500: {
            description: 'Internal Error',
            content: { 'application/json': { schema: z.object({ success: z.boolean(), message: z.string() }) } }
          }
        }
      }),
      async (ctx) => {
        const { email } = ctx.req.valid('json')
        try {
          const user = await prisma.user.findUnique({ where: { email } })

          // Always return success to prevent email enumeration
          if (!user) {
            console.log(`\n⚠️  [Password Reset] No account found for email: ${email}\n   → Make sure you use the exact email you registered with.\n`)
            return ctx.json({ success: true, message: 'If that email exists, a reset link has been sent.' }, 200)
          }

          // Invalidate any existing unused tokens for this user
          await prisma.passwordResetToken.updateMany({
            where: { userId: user.id, used: false },
            data: { used: true }
          })

          // Generate a secure random token
          const token = crypto.randomBytes(32).toString('hex')
          const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

          await prisma.passwordResetToken.create({
            data: { token, userId: user.id, expiresAt }
          })

          // In production: send email. For now, log to console for testing.
          const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth?reset=${token}`
          console.log('\n🔑 [Password Reset] Token for', email)
          console.log('   Reset URL:', resetUrl)
          console.log('   Token expires at:', expiresAt.toISOString(), '\n')

          return ctx.json({ success: true, message: 'If that email exists, a reset link has been sent.' }, 200)
        } catch (error) {
          console.error('[Auth Error] Forgot Password:', error)
          return ctx.json({ success: false, message: 'Internal server error' }, 500)
        }
      }
    )

    // ── Reset Password ───────────────────────────────────────────────
    this.controller.openapi(
      createRoute({
        method: 'post',
        path: '/auth/reset-password',
        tags: ['Auth'],
        summary: 'Reset password using a valid token',
        request: {
          body: {
            content: {
              'application/json': {
                schema: z.object({
                  token: z.string(),
                  newPassword: z.string().min(6)
                })
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Password reset',
            content: { 'application/json': { schema: z.object({ success: z.boolean(), message: z.string() }) } }
          },
          400: {
            description: 'Invalid or expired token',
            content: { 'application/json': { schema: z.object({ success: z.boolean(), message: z.string() }) } }
          },
          500: {
            description: 'Internal Error',
            content: { 'application/json': { schema: z.object({ success: z.boolean(), message: z.string() }) } }
          }
        }
      }),
      async (ctx) => {
        const { token, newPassword } = ctx.req.valid('json')
        try {
          const resetRecord = await prisma.passwordResetToken.findUnique({ where: { token } })

          if (!resetRecord || resetRecord.used || resetRecord.expiresAt < new Date()) {
            return ctx.json({ success: false, message: 'This reset link is invalid or has expired.' }, 400)
          }

          const passwordHash = await bcrypt.hash(newPassword, 12)

          await prisma.$transaction([
            prisma.user.update({ where: { id: resetRecord.userId }, data: { passwordHash } }),
            prisma.passwordResetToken.update({ where: { id: resetRecord.id }, data: { used: true } })
          ])

          return ctx.json({ success: true, message: 'Password updated successfully. You can now log in.' }, 200)
        } catch (error) {
          console.error('[Auth Error] Reset Password:', error)
          return ctx.json({ success: false, message: 'Internal server error' }, 500)
        }
      }
    )
  }
}
