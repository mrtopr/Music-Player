import { PrismaClient } from '@prisma/client'

// Automatically load .env in Node runtime if process.env.DATABASE_URL is not set
if (typeof process !== 'undefined' && !process.env.DATABASE_URL && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile()
  } catch {
    // .env might not exist in production or containerized environments
  }
}

export const prisma = new PrismaClient()
