import type { RedisService } from '../infra/redis.service';

export class ChatService {
  private TIMEOUT_SECONDS = 60;

  constructor(private readonly redisService: RedisService) {}

  public async createChat(userId: string) {
    return await this.redisService.createOrUpdateChat(
      userId,
      this.TIMEOUT_SECONDS,
    );
  }

  public async receiveMessage(userId: string) {
    return await this.redisService.createOrUpdateChat(
      userId,
      this.TIMEOUT_SECONDS,
    );
  }
}
