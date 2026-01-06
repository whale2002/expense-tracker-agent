/**
 * 飞书消息发送器
 * Lark Message Sender
 *
 * 负责向飞书发送消息和更新消息
 * Sends and updates messages to Lark
 */

import * as Lark from '@larksuiteoapi/node-sdk';
import type { MessageSender } from '../types';

/**
 * 生成飞书卡片消息格式
 * Generate Lark card message format
 * @param content 消息内容
 * @returns 卡片消息对象
 */
function generateCardMessage(content: string) {
  return {
    schema: '2.0',
    config: {
      update_multi: true,
      streaming_mode: false,
    },
    body: {
      direction: 'vertical',
      padding: '12px 12px 12px 12px',
      elements: [
        {
          tag: 'markdown',
          content,
          text_align: 'left',
          text_size: 'normal',
          margin: '0px 0px 0px 0px',
        },
      ],
    },
  };
}

/**
 * 飞书消息发送器类
 * Lark Message Sender Class
 */
export class LarkMessageSender implements MessageSender {
  private larkClient: Lark.Client;

  /**
   * 构造函数
   * @param appId 飞书应用 ID
   * @param appSecret 飞书应用密钥
   */
  constructor(
    private readonly appId: string,
    private readonly appSecret: string
  ) {
    // 初始化飞书客户端
    this.larkClient = new Lark.Client({
      appId: this.appId,
      appSecret: this.appSecret,
    });
  }

  /**
   * 发送文本消息
   * Send text message
   * @param chatId 聊天 ID
   * @param text 消息内容
   * @returns 消息 ID
   */
  async sendTextMessage(chatId: string, text: string): Promise<{ messageId: string }> {
    try {
      const response = await this.larkClient.im.message.create({
        data: {
          receive_id: chatId,
          msg_type: 'text',
          content: JSON.stringify({ text }),
        },
        params: {
          receive_id_type: 'chat_id',
        },
      });

      const messageId = response.data?.message_id;
      if (!messageId) {
        throw new Error('发送消息失败，未返回 message_id');
      }

      console.log(`✅ 文本消息已发送 - Message ID: ${messageId}`);
      console.log(`✅ Text message sent - Message ID: ${messageId}`);

      return { messageId };
    } catch (error) {
      console.error('❌ 发送文本消息失败:', error);
      console.error('❌ Failed to send text message:', error);
      throw error;
    }
  }

  /**
   * 发送卡片消息
   * Send card message
   * @param chatId 聊天 ID
   * @param content 消息内容
   * @returns 消息 ID
   */
  async sendCardMessage(chatId: string, content: string): Promise<{ messageId: string }> {
    try {
      const response = await this.larkClient.im.message.create({
        data: {
          receive_id: chatId,
          msg_type: 'interactive',
          content: JSON.stringify(generateCardMessage(content)),
        },
        params: {
          receive_id_type: 'chat_id',
        },
      });

      const messageId = response.data?.message_id;
      if (!messageId) {
        throw new Error('发送卡片消息失败，未返回 message_id');
      }

      console.log(`✅ 卡片消息已发送 - Message ID: ${messageId}`);
      console.log(`✅ Card message sent - Message ID: ${messageId}`);

      return { messageId };
    } catch (error) {
      console.error('❌ 发送卡片消息失败:', error);
      console.error('❌ Failed to send card message:', error);
      throw error;
    }
  }

  /**
   * 更新消息
   * Update message
   * @param messageId 消息 ID
   * @param content 新内容
   */
  async updateMessage(messageId: string, content: string): Promise<void> {
    try {
      await this.larkClient.im.message.patch({
        path: { message_id: messageId },
        data: {
          content: JSON.stringify(generateCardMessage(content)),
        },
      });

      console.log(`✅ 消息已更新 - Message ID: ${messageId}`);
      console.log(`✅ Message updated - Message ID: ${messageId}`);
    } catch (error) {
      console.error('❌ 更新消息失败:', error);
      console.error('❌ Failed to update message:', error);
      throw error;
    }
  }
}
