// src/shared/shared.module.ts
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  providers: [],
  exports: [],
})
export class SharedModule {}
