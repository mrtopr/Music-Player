import { Context, Next } from 'hono'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'mehfil-super-secret-jwt-key'

export const requireAuth = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, message: 'Unauthorized. No token provided.' }, 401)
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    
    // Inject userId into context variables
    c.set('userId', decoded.userId)
    
    await next()
  } catch (error) {
    return c.json({ success: false, message: 'Unauthorized. Invalid token.' }, 401)
  }
}
