import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(private readonly config: ConfigService) {
    const connectionString = config.getOrThrow<string>('DATABASE_URL');

    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  enableShutdownHooks(app: INestApplication) {
    const shutdown = async () => {
      await this.$disconnect();
      await app.close();
    };

    process.on('SIGINT', () => void shutdown());
    process.on('SIGTERM', () => void shutdown());
  }
}
