/**
 * Agent 日志记录器
 * Agent Logger
 *
 * 根据环境变量控制是否记录日志
 * 在非 production 环境下记录 Agent 调用的详细信息
 */

import { appendFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * 日志记录器
 * Logger
 */
export class AgentLogger {
  private logDir = 'logs';
  private logFile: string;
  private enabled: boolean;

  constructor(threadId: string) {
    // 只在非 production 环境下启用日志
    this.enabled = process.env.NODE_ENV !== 'production';

    console.log(`Logging enabled: ${this.enabled}`);

    if (!this.enabled) {
      this.logFile = '';
      return;
    }

    // 确保日志目录存在
    if (!existsSync(this.logDir)) {
      mkdir(this.logDir, { recursive: true });
    }

    // 按 threadId 创建日志文件（同一个 thread 共用一个日志文件）
    this.logFile = join(this.logDir, `${threadId}.log`);
  }

  /**
   * 记录 chunk
   */
  async logChunk(chunk: unknown, index: number): Promise<void> {
    if (!this.enabled) return;

    const timestamp = this.getLocalTimestamp();
    const logEntry = {
      timestamp,
      index,
      chunk,
    };

    try {
      await appendFile(this.logFile, JSON.stringify(logEntry, null, 2) + '\n');
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  /**
   * 获取本地时间戳
   */
  private getLocalTimestamp(): string {
    const now = new Date();
    return now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  /**
   * 记录消息
   */
  async logMessage(message: string): Promise<void> {
    if (!this.enabled) return;

    const timestamp = this.getLocalTimestamp();
    const logEntry = `[${timestamp}] ${message}\n`;

    try {
      await appendFile(this.logFile, logEntry);
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  /**
   * 记录错误
   */
  async logError(error: unknown): Promise<void> {
    if (!this.enabled) return;

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    await this.logMessage(`❌ Error: ${errorMessage}\n${errorStack}`);
  }
}
