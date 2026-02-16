import { NavCategory } from './types';

export const categories: NavCategory[] = [
  {
    id: 'dev-tools',
    name: '开发工具',
    icon: '🛠️',
    links: [
      {
        title: 'GitHub',
        url: 'https://github.com',
        description: '全球最大的代码托管平台',
      },
      {
        title: 'VS Code',
        url: 'https://code.visualstudio.com',
        description: '强大的代码编辑器',
      },
      {
        title: 'Stack Overflow',
        url: 'https://stackoverflow.com',
        description: '开发者问答社区',
      },
      {
        title: 'CodePen',
        url: 'https://codepen.io',
        description: '前端代码演示平台',
      },
    ],
  },
  {
    id: 'design',
    name: '设计资源',
    icon: '🎨',
    links: [
      {
        title: 'Figma',
        url: 'https://www.figma.com',
        description: '协作式设计工具',
      },
      {
        title: 'Dribbble',
        url: 'https://dribbble.com',
        description: '设计师作品展示平台',
      },
      {
        title: 'Behance',
        url: 'https://www.behance.net',
        description: 'Adobe旗下创意平台',
      },
      {
        title: 'Unsplash',
        url: 'https://unsplash.com',
        description: '免费高质量图片库',
      },
    ],
  },
  {
    id: 'learning',
    name: '学习平台',
    icon: '📚',
    links: [
      {
        title: 'MDN',
        url: 'https://developer.mozilla.org',
        description: 'Web开发文档',
      },
      {
        title: 'freeCodeCamp',
        url: 'https://www.freecodecamp.org',
        description: '免费编程学习',
      },
      {
        title: 'Coursera',
        url: 'https://www.coursera.org',
        description: '在线课程平台',
      },
      {
        title: 'YouTube',
        url: 'https://www.youtube.com',
        description: '视频学习资源',
      },
    ],
  },
  {
    id: 'productivity',
    name: '效率工具',
    icon: '⚡',
    links: [
      {
        title: 'Notion',
        url: 'https://www.notion.so',
        description: '全能笔记工具',
      },
      {
        title: 'Trello',
        url: 'https://trello.com',
        description: '项目管理看板',
      },
      {
        title: 'Slack',
        url: 'https://slack.com',
        description: '团队协作工具',
      },
      {
        title: 'ChatGPT',
        url: 'https://chat.openai.com',
        description: 'AI助手',
      },
    ],
  },
  {
    id: 'cloud',
    name: '云服务',
    icon: '☁️',
    links: [
      {
        title: 'Vercel',
        url: 'https://vercel.com',
        description: '前端部署平台',
      },
      {
        title: 'Netlify',
        url: 'https://www.netlify.com',
        description: 'Web应用托管',
      },
      {
        title: 'AWS',
        url: 'https://aws.amazon.com',
        description: '亚马逊云服务',
      },
      {
        title: 'Google Cloud',
        url: 'https://cloud.google.com',
        description: '谷歌云平台',
      },
    ],
  },
  {
    id: 'ai-tools',
    name: 'AI工具',
    icon: '🤖',
    links: [
      {
        title: 'Claude',
        url: 'https://claude.ai',
        description: 'Anthropic AI助手',
      },
      {
        title: 'Midjourney',
        url: 'https://www.midjourney.com',
        description: 'AI绘画工具',
      },
      {
        title: 'Hugging Face',
        url: 'https://huggingface.co',
        description: 'AI模型社区',
      },
      {
        title: 'Stable Diffusion',
        url: 'https://stability.ai',
        description: '开源AI图像生成',
      },
    ],
  },
];
