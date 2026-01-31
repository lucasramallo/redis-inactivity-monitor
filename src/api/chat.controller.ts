import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { RedisService } from '../infra/redis.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly redisService: RedisService) {}

  /**
   * POST /chat/start
   * Inicia um novo chat ou reseta o timer de inatividade
   */
  @Post('start')
  @HttpCode(200)
  async startChat(@Body() body: { userId: string; timeoutSeconds?: number }) {
    const { userId, timeoutSeconds = 60 } = body;

    return await this.redisService.createOrUpdateChat(userId, timeoutSeconds);
  }

  /**
   * POST /chat/activity/:userId
   * Simula uma atividade do usuário (nova mensagem)
   * Reseta o timer de inatividade
   */
  @Post('activity/:userId')
  @HttpCode(200)
  async registerActivity(@Param('userId') userId: string) {
    const result = await this.redisService.createOrUpdateChat(userId, 60);

    return {
      ...result,
      message: 'Atividade registrada. Timer resetado.',
    };
  }

  /**
   * GET /chat/status/:userId
   * Verifica o status de um chat
   */
  @Get('status/:userId')
  async getChatStatus(@Param('userId') userId: string) {
    const isActive = await this.redisService.isChatActive(userId);
    const ttl = await this.redisService.getTimeToLive(userId);

    return {
      userId,
      isActive,
      timeRemaining: ttl > 0 ? ttl : 0,
      status: isActive ? 'active' : 'expired',
    };
  }

  /**
   * POST /chat/end/:userId
   * Encerra manualmente um chat
   */
  @Post('end/:userId')
  @HttpCode(200)
  async endChat(@Param('userId') userId: string) {
    await this.redisService.endChat(userId);

    return {
      userId,
      message: 'Chat encerrado manualmente',
    };
  }
}
