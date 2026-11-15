/**
 * 部署配置加载器
 *
 * 从项目根目录的 deploy.config.json 读取应用级配置（如站长账号密码），
 * 在进程启动最早期注入 process.env。这样源码中 80+ 处 process.env.USERNAME /
 * process.env.PASSWORD 无需任何改动即可从固定配置文件取值。
 *
 * 优先级：真实环境变量 > 配置文件（若平台/系统已注入同名变量，则不覆盖）。
 * 目的：发布工具不注入环境变量、且发布包不含 .env 时，账号密码仍能正常工作。
 *
 * 纯 CommonJS，供 server.js（运行时）与 next.config.js（构建期）共同引用。
 */
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'deploy.config.json');

function loadDeployConfig() {
  let applied = [];
  try {
    if (!fs.existsSync(CONFIG_PATH)) return applied;
    const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    for (const [key, value] of Object.entries(cfg || {})) {
      if (value === undefined || value === null || value === '') continue;
      // 环境变量优先：仅当未设置时才用配置文件兜底
      if (process.env[key] === undefined || process.env[key] === '') {
        process.env[key] = String(value);
        applied.push(key);
      }
    }
  } catch (e) {
    // 配置文件损坏不应导致启动失败，仅告警
    console.warn('[deploy-config] failed to load deploy.config.json:', e.message);
  }
  return applied;
}

module.exports = { loadDeployConfig };
