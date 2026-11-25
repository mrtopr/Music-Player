import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

// Automatically load .env in Node runtime if process.env.DATABASE_URL is not set
if (typeof process !== 'undefined' && !process.env.DATABASE_URL && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile()
  } catch {
    // .env might not exist in production or containerized environments
  }
}

const isEdgeRuntime =
  typeof (globalThis as any).WebSocketPair !== 'undefined' ||
  (typeof caches !== 'undefined' && (typeof process === 'undefined' || !process.release?.name))

let _edgePrisma: PrismaClient | null = null

function getEdgePrisma(): PrismaClient {
  if (_edgePrisma) return _edgePrisma
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured in Worker secrets')
  }
  const adapter = new PrismaNeon({ connectionString })
  _edgePrisma = new PrismaClient({ adapter })
  return _edgePrisma
}

const _nodePrisma = isEdgeRuntime ? null : new PrismaClient()

export const prisma: PrismaClient = isEdgeRuntime
  ? new Proxy({} as PrismaClient, {
      get(_target, prop) {
        const client = getEdgePrisma() as any
        const value = client[prop]
        return typeof value === 'function' ? value.bind(client) : value
      },
    })
  : (_nodePrisma as PrismaClient)
