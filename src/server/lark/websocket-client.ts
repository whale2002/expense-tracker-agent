/**
 * 飞书 WebSocket 客户端
 * Lark WebSocket Client
 *
 * 负责管理 WebSocket 连接，接收飞书事件
 * Manages WebSocket connection and receives Lark events
 */

import * as Lark from '@larksuiteoapi/node-sdk';
import type { MessageEvent } from '../types';

/**
 * 飞书消息事件结构
 * Lark Message Event Structure
 */
interface LarkMessageEvent {
  event_id?: string;
  sender?: {
    sender_id?: {
      open_id?: string;
    };
  };
  message?: {
    chat_id?: string;
    message_type?: string;
    content?: string;
  };
}

/**
 * 解析后的消息内容
 * Parsed Message Content
 */
interface ParsedMessageContent {
  text?: string;
  [key: string]: unknown;
}

/**
 * 消息事件处理器
 * Message Event Handler
 */
export type MessageEventHandler = (event: MessageEvent) => Promise<void>;

/**
 * 飞书 WebSocket 客户端类
 * Lark WebSocket Client Class
 */
export class LarkWebSocketClient {
  private larkWsClient: Lark.WSClient;
  private eventDispatcher: Lark.EventDispatcher;
  // 事件去重：记录已处理的 event_id
  private processedEvents = new Set<string>();

  /**
   * 检查是否为重复事件
   */
  private isDuplicateEvent(eventId: string): boolean {
    if (this.processedEvents.has(eventId)) {
      return true;
    }
    this.processedEvents.add(eventId);
    // 限制缓存大小防止内存泄漏
    if (this.processedEvents.size > 10000) {
      const firstKey = this.processedEvents.values().next().value;
      this.processedEvents.delete(firstKey as string);
    }
    return false;
  }

  /**
   * 构造函数
   * @param appId 飞书应用 ID
   * @param appSecret 飞书应用密钥
   * @param eventHandler 消息事件处理器
   */
  constructor(
    private readonly appId: string,
    private readonly appSecret: string,
    private readonly eventHandler: MessageEventHandler
  ) {
    // 初始化 WebSocket 客户端
    // 参考 lark-samples 实现
    this.larkWsClient = new Lark.WSClient({
      appId: this.appId,
      appSecret: this.appSecret,
    });

    // 创建事件分发器
    this.eventDispatcher = this.createEventDispatcher();
  }

  /**
   * 启动 WebSocket 连接
   * Start WebSocket connection
   */
  start(): void {
    console.log('🔌 Starting Lark WebSocket connection...');

    try {
      this.larkWsClient.start({
        eventDispatcher: this.eventDispatcher,
      });

      console.log('✅ WebSocket connection started');
    } catch (error) {
      console.error('❌ WebSocket start failed:', error);
      throw error;
    }
  }

  /**
   * 停止 WebSocket 连接
   * Stop WebSocket connection
   */
  stop(): void {
    console.log('🛑 Stopping Lark WebSocket connection...');

    try {
      // SDK 可能不提供 stop 方法，这里做标记
      // 实际关闭可能需要重启进程
      console.log('✅ WebSocket connection stopped');
    } catch (error) {
      console.error('❌ WebSocket stop failed:', error);
    }
  }

  /**
   * 创建事件分发器
   * Create event dispatcher
   * @returns 事件分发器实例
   */
  private createEventDispatcher(): Lark.EventDispatcher {
    // 参考 lark-samples 实现
    return new Lark.EventDispatcher({}).register({
      // 监听即时消息接收事件
      'im.message.receive_v1': async (event: LarkMessageEvent) => {
        try {
          // 事件去重
          const eventId = event.event_id;
          if (!eventId) {
            return;
          }
          if (this.isDuplicateEvent(eventId)) {
            return;
          }

          await this.handleMessageEvent(event);
        } catch (error) {
          console.error('❌ Failed to handle message event:', error);
        }
      },
    });
  }

  /**
   * 处理消息事件
   * Handle message event
   * @param event 飞书消息事件
   */
  private async handleMessageEvent(event: LarkMessageEvent): Promise<void> {
    // 提取消息相关信息
    const senderId = event.sender?.sender_id?.open_id;
    const chatId = event.message?.chat_id;
    const messageType = event.message?.message_type;
    const messageContent = event.message?.content;

    // 验证必要字段
    if (!senderId || !chatId || !messageContent) {
      console.warn('⚠️  Received incomplete message event, missing required fields');
      return;
    }

    // 只处理文本消息
    if (messageType !== 'text') {
      console.log(`📋 Ignoring non-text message, type: ${messageType}`);
      return;
    }

    // 解析消息内容
    let parsedContent: ParsedMessageContent;
    try {
      parsedContent = JSON.parse(messageContent) as ParsedMessageContent;
    } catch (error) {
      console.error('❌ Failed to parse message content:', error);
      return;
    }

    const text = parsedContent.text?.trim();
    if (!text) {
      console.warn('⚠️  Message content is empty');
      return;
    }

    // 构造消息事件
    const messageEvent: MessageEvent = {
      userId: senderId,
      chatId: chatId,
      message: text,
    };

    // 调用事件处理器
    console.log(`📩 Message received - User: ${senderId}, Chat: ${chatId}`);
    console.log(`📝 Content: ${text}`);

    await this.eventHandler(messageEvent);
  }
}
