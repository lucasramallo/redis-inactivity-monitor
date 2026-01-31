import { Module } from '@nestjs/common';
import { ChatController } from './api/chat.controller';
import { RedisService } from './infra/redis.service';

@Module({
  imports: [],
  controllers: [ChatController],
  providers: [RedisService],
})
export class AppModule {}
