import * as esbuild from 'esbuild'
import { glob } from 'glob'
import { copyFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'

async function build() {
  // 清理 dist 目录
  console.log('🧹 Cleaning dist directory...')

  // 获取所有需要打包的入口文件
  const entryPoints = [
    'src/server/index.ts',
    'src/agent.ts',
  ]

  // 使用 esbuild 打包
  console.log('📦 Building with esbuild...')

  for (const entry of entryPoints) {
    const outFile = entry.replace('src/', 'dist/').replace('.ts', '.js')

    await esbuild.build({
      entryPoints: [entry],
      outfile: outFile,
      bundle: false,
      platform: 'node',
      target: 'ES2022',
      format: 'esm',
      sourcemap: true,
      logLevel: 'info',
    })

    console.log(`✅ Built ${entry} -> ${outFile}`)
  }

  // 复制其他非 TypeScript 文件（如果需要）
  console.log('✨ Build complete!')
}

build().catch((err) => {
  console.error('❌ Build failed:', err)
  process.exit(1)
})
