import { PlatformConfig } from './types';

// 各AI平台的配置
export const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  deepseek: {
    name: 'DeepSeek',
    url: 'https://chat.deepseek.com',
    selector: {
      input: 'textarea[placeholder*="发送消息"]',
      submit: 'button[type="submit"]',
      answer: '.ds-markdown',
      loading: '.ds-loading',
    },
  },
  doubao: {
    name: '豆包',
    url: 'https://www.doubao.com',
    selector: {
      input: 'textarea[placeholder*="输入"]',
      submit: 'button.send-btn',
      answer: '.message-content',
      loading: '.loading-indicator',
    },
  },
  yuanbao: {
    name: '元宝',
    url: 'https://yuanbao.tencent.com',
    selector: {
      input: 'textarea[placeholder*="输入"]',
      submit: 'button.send',
      answer: '.chat-message-content',
      loading: '.chat-loading',
    },
  },
  tongyi: {
    name: '通义千问',
    url: 'https://tongyi.aliyun.com',
    selector: {
      input: 'textarea[placeholder*="输入"]',
      submit: 'button.send-btn',
      answer: '.message-content',
      loading: '.loading',
    },
  },
  wenxin: {
    name: '文心一言',
    url: 'https://yiyan.baidu.com',
    selector: {
      input: 'textarea[placeholder*="输入"]',
      submit: 'button.send',
      answer: '.chat-message-content',
      loading: '.loading-indicator',
    },
  },
  nano: {
    name: '纳米',
    url: 'https://www.n.cn',
    selector: {
      input: 'textarea[placeholder*="输入"]',
      submit: 'button.send',
      answer: '.message-content',
      loading: '.loading',
    },
  },
  kimi: {
    name: 'Kimi',
    url: 'https://kimi.moonshot.cn',
    selector: {
      input: 'textarea[placeholder*="输入"]',
      submit: 'button.send',
      answer: '.message-content',
      loading: '.loading',
    },
  },
  zhipu: {
    name: '智谱',
    url: 'https://chatglm.cn',
    selector: {
      input: 'textarea[placeholder*="输入"]',
      submit: 'button.send',
      answer: '.message-content',
      loading: '.loading',
    },
  },
};
