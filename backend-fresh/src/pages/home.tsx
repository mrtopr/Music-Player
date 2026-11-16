import { Hono } from 'hono'

export const Home = new Hono()

Home.get('/', (c) => {
  return c.json({
    success: true,
    message: 'Mehfil Backend (Fresh) is running',
    docs: '/docs',
    version: '1.0.0',
  })
})
