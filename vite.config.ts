// Vite 的设置：开发时的小服务器 + 打包。
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // 用相对路径，这样打包结果放在网站的任何一层目录里（例如 /play/）都能打开
  base: './',
  build: {
    // 打包出来的代码和样式要能在这些浏览器上运行（和小样用的 es2020 一样宽）。
    // 不写的话，打包工具会把样式改成只有新浏览器才认识的写法：例如把 @media (max-width: 520px)
    // 改成 (width <= 520px)，旧一点的 iPhone / iPad（iOS 16.3 及以前）上手机版的排版就全乱了。
    target: ['es2020', 'chrome87', 'edge88', 'firefox78', 'safari14'],
    // three.js 本身就有 500 多 KB，把提醒的门槛调高一点，免得每次打包都看到警告
    chunkSizeWarningLimit: 900,
  },
  server: {
    // 只让开发服务器盯着正式工程用到的文件，不去管主页和小样各自的 node_modules
    watch: { ignored: ['**/home/**', '**/prototype/dist/**', '**/prototype/node_modules/**'] },
  },
  test: {
    // 测试文件和被测的文件放在一起，名字以 .test.ts 结尾
    include: ['src/**/*.test.ts'],
  },
});
