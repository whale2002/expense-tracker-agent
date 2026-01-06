/**
 * 服务器应用
 * Server Application
 *
 * 集成所有组件，启动服务器
 * Integrates all components and starts the server
 */

import express from 'express';
import { agent } from '../agent';
import { LarkWebSocketClient } from './lark/websocket-client';
import { LarkMessageSender } from './lark/lark-sender';
import { MessageController } from './controller/message';
import { LangChainAgentInvoker } from './service/agent-invoker';

/**
 * 服务器应用类
 * Server Application Class
 */
export class ServerApp {
  private larkWsClient: LarkWebSocketClient;
  private messageController: MessageController;
  private app: express.Express;

  constructor() {
    console.log('🔧 Initializing server components...');

    // 1. 创建 Agent 调用器
    const agentInvoker = new LangChainAgentInvoker(agent);
    console.log('✅ Agent invoker created');

    // 2. 创建飞书消息发送器
    const appId = process.env.FEISHU_APP_ID;
    const appSecret = process.env.FEISHU_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error('缺少 FEISHU_APP_ID 或 FEISHU_APP_SECRET 环境变量');
    }

    const messageSender = new LarkMessageSender(appId, appSecret);
    console.log('✅ Lark message sender created');

    // 3. 创建消息控制器
    this.messageController = new MessageController(agentInvoker, messageSender);
    console.log('✅ Message controller created');

    // 4. 创建 WebSocket 客户端
    this.larkWsClient = new LarkWebSocketClient(
      appId,
      appSecret,
      this.messageController.handleMessage.bind(this.messageController)
    );
    console.log('✅ WebSocket client created');

    // 5. 初始化 Express 应用
    this.app = express();
    this.setupRoutes();
    console.log('✅ Express app initialized');
  }

  /**
   * 设置路由
   * Setup routes
   */
  private setupRoutes(): void {
    // 健康检查端点
    this.app.get('/health', (_req, res) => {
      res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    });

    // 根路径
    this.app.get('/', (_req, res) => {
      res.json({
        name: 'Expense Tracker Bot Server',
        version: '1.0.0',
        status: 'running',
      });
    });
  }

  /**
   * 启动服务器
   * Start server
   * @param port 端口号
   */
  async start(port: number = 3000): Promise<void> {
    console.log('🚀 Starting server...');

    // 启动 HTTP 服务器
    this.app.listen(port, () => {
      console.log('');
      console.log('========================================');
      console.log('✅ Server started successfully!');
      console.log('========================================');
      console.log(`🌐 HTTP server running at: http://localhost:${port}`);
      console.log(`🔍 Health check: http://localhost:${port}/health`);
      console.log('========================================');
      console.log('');
    });

    // 启动 WebSocket 连接
    this.larkWsClient.start();
  }

  /**
   * 停止服务器
   * Stop server
   */
  async stop(): Promise<void> {
    console.log('🛑 Stopping server...');

    // 停止 WebSocket 连接
    this.larkWsClient.stop();
    console.log('✅ Server stopped');
  }
}
