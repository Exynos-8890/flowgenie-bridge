# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/88f4e660-87ad-494b-8468-15e255cb79e9

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/88f4e660-87ad-494b-8468-15e255cb79e9) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with .

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/88f4e660-87ad-494b-8468-15e255cb79e9) and click on Share -> Publish.

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)

# Flowsmith 项目学习框架

根据您的工作区，我发现这是一个使用 Vite 构建的 React-TypeScript 应用，似乎是一个名为 "Flowsmith" 的流程图编辑器。以下是帮助您从宏观到微观理解它的学习框架：

## 1. 技术栈概览

该项目使用：
- **Vite**：现代前端构建工具
- **React**：UI 库
- **TypeScript**：带类型的 JavaScript
- **Tailwind CSS**：实用优先的 CSS 框架
- **shadcn/ui**：基于 Tailwind 的组件库
- **@xyflow/react**（ReactFlow）：用于创建基于节点的编辑器和流程图的库

## 2. 项目结构

### 核心结构
- **[`src`](src )**：主要源代码
  - **`components/`**：可复用 UI 组件
  - **`hooks/`**：自定义 React 钩子
  - **`lib/`**：工具函数
  - **`pages/`**：主应用页面
- **配置文件**：各种配置文件如 [`vite.config.ts`](vite.config.ts )、[`tailwind.config.ts`](tailwind.config.ts ) 等

## 3. 学习路径

### 第一步：了解基本架构
1. 从 [`src/main.tsx`](src/main.tsx ) 开始 - 这是入口点
2. 查看 [`src/App.tsx`](src/App.tsx ) - 根组件
3. 探索 [`src/pages/Index.tsx`](src/pages/Index.tsx ) - 主应用页面

### 第二步：核心概念和组件
1. 研究流程编辑器：
   - [`src/components/NodePanel.tsx`](src/components/NodePanel.tsx ) - 节点类型面板
   - [`src/components/TextNode.tsx`](src/components/TextNode.tsx ) - 文本节点实现
   - [`src/components/ProcessorNode.tsx`](src/components/ProcessorNode.tsx ) - 处理器节点实现
   - [`src/components/CustomEdge.tsx`](src/components/CustomEdge.tsx ) - 节点间的自定义边

2. 理解使用的 React 钩子：
   - src/hooks/use-mobile.ts - 检测移动设备
   - [`src/hooks/use-toast.ts`](src/hooks/use-toast.ts ) - 管理提示通知

### 第三步：UI 组件和设计系统
1. 查看 [`src/components/ui`](src/components/ui ) 中的 shadcn/ui 组件
2. 学习 [`tailwind.config.ts`](tailwind.config.ts ) 中的 Tailwind 配置

## 4. 需要学习的关键概念

### React 基础
- 组件和 JSX
- Props 和 state
- Hooks（useState, useCallback, useRef）
- Context API

### TypeScript 基础
- 类型和接口
- 类型推断
- 泛型
- 类型注解

### ReactFlow 概念
- 节点和边
- 自定义节点类型
- 回调和事件

### 项目特定功能
- 节点创建和管理
- 拖放功能
- 节点配置面板
- 边连接

## 5. 如何运行和实验

根据 [`README.md`](README.md ) 中的说明，您可以：
1. 安装依赖：`npm i`
2. 启动开发服务器：`npm run dev`
3. 进行修改并实时查看效果

## 后续步骤

首先运行项目并直观探索其功能。然后开始检查代码，从主页面 [`src/pages/Index.tsx`](src/pages/Index.tsx ) 开始，逐步研究它使用的组件。专注于一次理解一小部分，而不是试图一次性掌握所有内容。

您想要我深入解释这个框架的哪一部分吗？