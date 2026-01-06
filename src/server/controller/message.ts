/**
 * 消息控制器
 * Message Controller
 *
 * 处理用户消息，协调 Agent 和消息发送
 * Handles user messages and coordinates Agent and message sending
 */

import type { AgentInvoker, MessageSender, MessageEvent } from '../types';

/**
 * 消息控制器类
 * Message Controller Class
 */
export class MessageController {
  // 用户会话存储（thread_id 映射）
  private userSessions = new Map<string, string>();

  constructor(
    private readonly agentInvoker: AgentInvoker,
    private readonly messageSender: MessageSender
  ) {}

  /**
   * 处理消息
   * Handle message
   * @param event 消息事件
   */
  async handleMessage(event: MessageEvent): Promise<void> {
    const { userId, chatId, message } = event;

    console.log(`🎯 Handling message - User: ${userId}, Chat: ${chatId}`);

    try {
      // 1. 获取或创建 thread_id
      const threadId = this.getOrCreateThreadId(userId);

      // 2. 发送初始"思考中..."消息（使用卡片消息以支持更新）
      const { messageId } = await this.messageSender.sendCardMessage(
        chatId,
        '💭 思考中...\n\nThinking...'
      );

      console.log(`📤 Initial message sent - Message ID: ${messageId}`);

      // 3. 调用 Agent（流式）
      const responseStream = this.agentInvoker.chat(userId, message, { threadId });

      // 4. 流式更新消息
      let fullContent = '';
      let updateCount = 0;

      for await (const response of responseStream) {
        if (response.type === 'token') {
          fullContent += response.content;
          updateCount++;

          // 每 5 个 token 更新一次（节流）
          if (updateCount % 5 === 0) {
            await this.throttledUpdate(messageId, fullContent);
          }
        } else if (response.type === 'final') {
          // 最终更新
          await this.messageSender.updateMessage(messageId, fullContent || '✅ 完成');
          console.log('✅ Message processing completed');
        }
      }
    } catch (error) {
      console.error('❌ Failed to handle message:', error);

      // 尝试发送错误消息
      try {
        await this.messageSender.sendTextMessage(
          chatId,
          `❌ Error occurred, please try again later`
        );
      } catch (sendError) {
        console.error('❌ Failed to send error message:', sendError);
      }
    }
  }

  /**
   * 获取或创建 thread_id
   * Get or create thread_id for user
   * @param userId 用户 ID
   * @returns thread_id
   */
  private getOrCreateThreadId(userId: string): string {
    if (!this.userSessions.has(userId)) {
      const threadId = `thread_${userId}_${Date.now()}`;
      this.userSessions.set(userId, threadId);
      console.log(`🆕 Created new session - User: ${userId}, Thread: ${threadId}`);
    }
    return this.userSessions.get(userId)!;
  }

  /**
   * 节流更新消息
   * Throttled message update
   * @param messageId 消息 ID
   * @param content 消息内容
   */
  private async throttledUpdate(messageId: string, content: string): Promise<void> {
    try {
      await this.messageSender.updateMessage(messageId, content);
    } catch (error) {
      console.error('❌ Failed to update message:', error);
      // 更新失败不影响整体流程
    }
  }
}
