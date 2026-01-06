/**
 * 服务器启动入口
 * Server Entry Point
 */

import dotenv from 'dotenv';
dotenv.config();

import { ServerApp } from './app';

/**
 * 主函数
 * Main function
 */
async function main() {
  try {
    // 检查必要的环境变量
    const requiredEnvVars = [
      'OPENAI_API_KEY',
      'OPENAI_BASE_URL',
      'MODEL_NAME',
      'FEISHU_APP_ID',
      'FEISHU_APP_SECRET',
      'FEISHU_APP_TOKEN',
      'FEISHU_TABLE_ID',
    ];


    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      console.error('❌ 缺少必要的环境变量:');
      console.error('❌ Missing required environment variables:');
      missingVars.forEach((varName) => {
        console.error(`   - ${varName}`);
      });
      console.error('');
      console.error('请检查 .env 文件并配置所有必要的环境变量');
      console.error('Please check .env file and configure all required environment variables');
      process.exit(1);
    }

    // 创建并启动服务器
    const app = new ServerApp();
    const port = parseInt(process.env.SERVER_PORT || '3000', 10);

    await app.start(port);

    // 优雅退出处理
    process.on('SIGINT', async () => {
      console.log('');
      console.log('⚠️  收到 SIGINT 信号，正在关闭服务器...');
      console.log('⚠️  Received SIGINT signal, shutting down server...');
      await app.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('');
      console.log('⚠️  收到 SIGTERM 信号，正在关闭服务器...');
      console.log('⚠️  Received SIGTERM signal, shutting down server...');
      await app.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// 运行主函数
main();
