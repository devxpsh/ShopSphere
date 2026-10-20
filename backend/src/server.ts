import { app } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

const server = app.listen(env.PORT, () => {
  console.log(
    `🚀 ShopSphere Backend running in ${env.NODE_ENV} mode on http://localhost:${env.PORT}`
  );
  console.log(`🩺 Health check available at http://localhost:${env.PORT}/api/v1/health`);
});

async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\nReceived ${signal}. Closing HTTP server and Prisma connection...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('✅ Graceful shutdown complete.');
    process.exit(0);
  });
}

process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
