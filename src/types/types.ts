export type ChatMessageFrom = 'user' | 'bot' | 'system';

export type ChatMessage = {
  id: string;
  from: ChatMessageFrom;
  content: string;
  timestamp: string;
};

export type Chat = {
  userId: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
};
