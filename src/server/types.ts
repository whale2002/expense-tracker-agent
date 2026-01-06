/**
 * Server 层类型定义
 * Server Layer Type Definitions
 */

/**
 * 消息事件
 * Message Event
 */
export interface MessageEvent {
  /** 用户 Open ID */
  userId: string;
  /** 聊天 ID */
  chatId: string;
  /** 消息内容 */
  message: string;
}

/**
 * Agent 响应
 * Agent Response
 */
export interface AgentResponse {
  /** 响应类型 */
  type: 'token' | 'tool' | 'final';
  /** 响应内容 */
  content: string;
  /** 工具名称（仅在工具调用时） */
  toolName?: string;
  /** 工具输入（仅在工具调用时） */
  toolInput?: Record<string, unknown>;
  /** 工具输出（仅在工具调用时） */
  toolOutput?: Record<string, unknown>;
}

/**
 * Agent 调用器接口
 * Agent Invoker Interface
 */
export interface AgentInvoker {
  /**
   * 与 Agent 对话
   * Chat with Agent
   * @param userId 用户 ID
   * @param message 消息内容
   * @param config 可选配置
   */
  chat(
    userId: string,
    message: string,
    config?: {
      threadId?: string;
    }
  ): AsyncGenerator<AgentResponse>;
}

/**
 * 消息发送器接口
 * Message Sender Interface
 */
export interface MessageSender {
  /**
   * 发送文本消息
   * Send text message
   * @param chatId 聊天 ID
   * @param text 消息内容
   * @returns 消息 ID
   */
  sendTextMessage(chatId: string, text: string): Promise<{ messageId: string }>;

  /**
   * 发送卡片消息
   * Send card message
   * @param chatId 聊天 ID
   * @param content 消息内容
   * @returns 消息 ID
   */
  sendCardMessage(chatId: string, content: string): Promise<{ messageId: string }>;

  /**
   * 更新消息
   * Update message
   * @param messageId 消息 ID
   * @param content 新内容
   */
  updateMessage(messageId: string, content: string): Promise<void>;
}
