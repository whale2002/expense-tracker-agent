/**
 * LangChain Agent 调用器
 * LangChain Agent Invoker
 *
 * 封装 LangChain Agent 调用，处理流式响应
 * Wraps LangChain Agent calls and handles streaming responses
 */

import { ReactAgent } from 'langchain';
import type { AgentInvoker, AgentResponse } from '../types';

/**
 * LangChain 消息内容类型
 * LangChain Message Content Type
 */
type MessageContent =
  | string
  | Array<string | { type: string; text?: string }>
  | { type: string; text?: string };

/**
 * LangChain Agent 调用器实现
 * LangChain Agent Invoker Implementation
 */
export class LangChainAgentInvoker implements AgentInvoker {
  constructor(private readonly agent: ReactAgent) {}

  /**
   * 与 Agent 对话
   * Chat with Agent
   * @param userId 用户 ID
   * @param message 消息内容
   * @param config 可选配置
   */
  async *chat(
    userId: string,
    message: string,
    config?: { threadId?: string }
  ): AsyncGenerator<AgentResponse> {
    console.log(`🤖 调用 Agent - 用户: ${userId}`);
    console.log(`🤖 Invoking Agent - User: ${userId}`);
    console.log(`📝 消息: ${message}`);
    console.log(`📝 Message: ${message}`);

    // 生成或使用提供的 thread_id
    const threadId = config?.threadId || `thread_${userId}_${Date.now()}`;

    try {
      // 调用 agent.stream() 获取流式响应
      const stream = await this.agent.stream(
        {
          messages: [{ role: 'user', content: message }],
        },
        {
          configurable: {
            thread_id: threadId,
          },
        }
      );

      // 处理流式响应
      for await (const chunk of stream) {
        // chunk 结构示例：
        // {
        //   messages: [{ role: 'assistant', content: '...' }],
        //   ...
        // }

        if (chunk.messages && Array.isArray(chunk.messages)) {
          for (const msg of chunk.messages) {
            if (msg.role === 'assistant' && msg.content) {
              // 提取文本内容
              const content = this.extractTextContent(msg.content);

              if (content) {
                // 发送 token 响应
                yield {
                  type: 'token',
                  content,
                };
              }
            }
          }
        }
      }

      // 发送最终响应
      yield {
        type: 'final',
        content: '',
      };

      console.log('✅ Agent 响应完成');
      console.log('✅ Agent response completed');
    } catch (error) {
      console.error('❌ Agent 调用失败:', error);
      console.error('❌ Agent invocation failed:', error);
      throw error;
    }
  }

  /**
   * 提取文本内容
   * Extract text content from message
   * @param content 消息内容（可能是字符串或复杂对象）
   * @returns 提取的文本
   */
  private extractTextContent(content: MessageContent): string {
    // 如果是字符串，直接返回
    if (typeof content === 'string') {
      return content;
    }

    // 如果是数组，提取所有文本
    if (Array.isArray(content)) {
      return content
        .map((item) => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object' && item?.type === 'text') return item.text || '';
          return '';
        })
        .join('');
    }

    // 如果是对象，尝试提取文本
    if (typeof content === 'object' && content !== null) {
      if ('text' in content) return String(content.text);
    }

    return '';
  }
}
