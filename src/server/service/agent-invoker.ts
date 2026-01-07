/**
 * LangChain Agent 调用器
 * LangChain Agent Invoker
 *
 * 封装 LangChain Agent 调用，处理流式响应
 * Wraps LangChain Agent calls and handles streaming responses
 */

import { ReactAgent } from 'langchain';
import { AgentLogger } from '../utils/logger';
import type { AgentInvoker, AgentResponse } from '../types';

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
    console.log(`🤖 Invoking Agent - User: ${userId}`);
    console.log(`📝 Message: ${message}`);

    // 生成或使用提供的 thread_id
    const threadId = config?.threadId || `thread_${userId}_${Date.now()}`;

    // 创建日志记录器（使用 threadId，同一个 thread 共用日志文件）
    const logger = new AgentLogger(threadId);
    await logger.logMessage(`=== Agent Invocation Started ===`);
    await logger.logMessage(`User: ${userId}`);
    await logger.logMessage(`Message: ${message}`);
    await logger.logMessage(`Thread ID: ${threadId}`);

    try {
      // 调用 agent.stream() 获取流式响应
      const stream = await this.agent.stream(
        {
          messages: [{ role: 'user', content: message }],
        },
        {
          streamMode: 'messages',
          configurable: {
            thread_id: threadId,
          },
        }
      );

      // 处理流式响应
      let chunkIndex = 0;
      for await (const chunk of stream) {
        // 记录原始 chunk
        await logger.logChunk(chunk, chunkIndex++);

        // streamMode: 'messages' 时，chunk 是消息数组
        // 结构：[{ role, content, ... }]
        if (Array.isArray(chunk)) {
          for (const msg of chunk) {
            const msgType = (msg as unknown as { type?: string }).type;
            const content = msg.content as string;

            // 处理 AI 消息
            if (msgType === 'ai' && content && typeof content === 'string' && content.length > 0) {
              // 过滤掉空的 content（工具调用时的消息）
              if (!content.startsWith('{')) {
                yield {
                  type: 'token',
                  content,
                };
              }
            }
            // 处理工具消息
            else if (msgType === 'tool' && content) {
              // 解析工具返回结果并格式化显示
              try {
                const toolData = JSON.parse(content);
                const toolName = (msg as unknown as { name?: string }).name || 'Tool';

                // 格式化工具调用结果
                let formattedContent = `\n🔧 调用工具: ${toolName}\n`;

                if (toolData.status === 'success') {
                  formattedContent += `✅ ${toolData.message || '执行成功'}\n`;
                } else if (toolData.status === 'error') {
                  formattedContent += `❌ ${toolData.message || '执行失败'}\n`;
                }

                yield {
                  type: 'token',
                  content: formattedContent,
                };
              } catch {
                // 如果解析失败，显示原始内容
                yield {
                  type: 'token',
                  content: `\n🔧 工具返回: ${content}\n`,
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

      console.log('✅ Agent response completed');
      await logger.logMessage(`=== Agent Invocation Completed ===`);
    } catch (error) {
      console.error('❌ Agent invocation failed:', error);
      await logger.logMessage(`=== Agent Invocation Failed ===`);
      await logger.logError(error);
      throw error;
    }
  }
}
