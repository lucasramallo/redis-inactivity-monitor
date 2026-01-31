import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import type { Chat } from 'src/types/types';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redisClient: Redis;
  private redisSubscriber: Redis;

  constructor() {
    this.redisClient = new Redis({
      host: 'localhost',
      port: 6379,
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        if (times > 3) {
          this.logger.error(
            '❌ Redis is not reachable after multiple attempts.',
          );
          return null;
        }
        return Math.min(times * 100, 3000);
      },
    });

    this.redisSubscriber = new Redis({
      host: 'localhost',
      port: 6379,
    });

    this.redisClient.on('connect', () => {
      this.logger.log('✅ Connected to Redis server');
    });

    this.redisClient.on('error', (err) => {
      this.logger.error('❌ Error:', err.message);
    });
  }

  async onModuleInit() {
    await this.enableKeyspaceNotifications();
    await this.subscribeToExpirationEvents();
  }

  async onModuleDestroy() {
    await this.redisClient.quit();
    await this.redisSubscriber.quit();
  }

  /**
   * Enables keyspace notifications in Redis
   * (specifically for expired events - Ex)
   */
  private async enableKeyspaceNotifications() {
    try {
      await this.redisClient.config('SET', 'notify-keyspace-events', 'Ex');
      this.logger.log('🔔 Keyspace notifications enabled');
    } catch (error) {
      this.logger.error('❌ Error enabling keyspace notifications:', error);
    }
  }

  /**
   * Subscribes to Redis key expiration event channel
   * Pattern: __keyevent@0__:expired
   */
  private async subscribeToExpirationEvents() {
    await this.redisSubscriber.subscribe('__keyevent@0__:expired');
    this.logger.log('👂 Monitoring expiration events...');

    this.redisSubscriber.on('message', (channel, expiredKey) => {
      if (channel === '__keyevent@0__:expired') {
        this.handleExpiredKey(expiredKey);
      }
    });
  }

  /**
   * Processes an expired key event
   * @param key - The key that has just expired
   */
  private handleExpiredKey(key: string) {
    if (key.startsWith('chat:')) {
      const userId = key.replace('chat:', '');
      this.logger.warn('⏰ TIMEOUT DETECTADO!');
      this.logger.warn(`┌─────────────────────────────────────┐`);
      this.logger.warn(`│ Chat expirado!                      │`);
      this.logger.warn(`│ Usuário: ${userId.padEnd(24)} │`);
      this.logger.warn(`│ Tempo de inatividade: 1 minuto      │`);
      this.logger.warn(`└─────────────────────────────────────┘`);
    }
  }

  /**
   * Creates or updates a chat key with TTL (time to live)
   * Resets the inactivity timer if the key already exists
   *
   * @param userId - The ID of the user
   * @param timeoutSeconds - Inactivity timeout in seconds (default: 60)
   * @returns Object with chat information
   */
  async createOrUpdateChat(userId: string, timeoutSeconds = 60) {
    const key = `chat:${userId}`;

    const existingChat = await this.redisClient.get(key);

    let chat: Chat;

    if (existingChat) {
      chat = JSON.parse(existingChat) as Chat;
      chat.updatedAt = new Date().toISOString();
    } else {
      chat = {
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
      };
    }

    await this.redisClient.set(key, JSON.stringify(chat), 'EX', timeoutSeconds);

    return {
      userId,
      key,
      expiresIn: timeoutSeconds,
    };
  }

  async addMessage(
    userId: string,
    from: 'user' | 'bot',
    content: string,
    timeoutSeconds = 60,
  ) {
    const key = `chat:${userId}`;

    const chatRaw = await this.redisClient.get(key);

    if (!chatRaw) {
      throw new NotFoundException('Chat not found for user: ' + userId);
    }

    const chat: Chat = JSON.parse(chatRaw) as Chat;

    chat.messages.push({
      id: randomUUID(),
      from,
      content,
      timestamp: new Date().toISOString(),
    });

    chat.updatedAt = new Date().toISOString();

    await this.redisClient.set(key, JSON.stringify(chat), 'EX', timeoutSeconds);

    return chat;
  }

  /**
   * Checks if a user's chat is currently active (key still exists)
   *
   * @param userId - The ID of the user
   * @returns true if the chat is active, false otherwise
   */
  async isChatActive(userId: string): Promise<boolean> {
    const key = `chat:${userId}`;
    const exists = await this.redisClient.exists(key);
    return exists === 1;
  }

  /**
   * Gets the remaining time to live (in seconds) for a chat key
   *
   * @param userId - The ID of the user
   * @returns TTL in seconds (-1 = no expiration, -2 = key does not exist)
   */
  async getTimeToLive(userId: string): Promise<number> {
    const key = `chat:${userId}`;
    return await this.redisClient.ttl(key);
  }

  /**
   * Manually ends/terminates a chat by deleting the key
   *
   * @param userId - The ID of the user whose chat should be ended
   */
  async endChat(userId: string) {
    const key = `chat:${userId}`;
    await this.redisClient.del(key);
    this.logger.log(`🔴 Chat ended manually for user: ${userId}`);
  }
}
