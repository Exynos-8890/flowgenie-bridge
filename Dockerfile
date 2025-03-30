# 基础镜像：使用官方Node.js长期支持版的Alpine Linux变体，体积更小
FROM node:lts-alpine

# 设置环境变量：指定当前运行环境为开发环境，这会影响某些npm包的行为
ENV NODE_ENV=development

# 设置工作目录：在容器内创建并设置/usr/src/app为工作目录
WORKDIR /usr/src/app

# 复制依赖文件：只复制package.json和锁定文件到工作目录，这样可以利用Docker缓存机制
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]

# 移除--production标志，不移动node_modules
# 安装依赖：安装项目所需的npm包，--silent参数减少安装过程中的日志输出
RUN npm install --silent

# 更新browserslist数据库：使前端工具能够正确识别目标浏览器
RUN npx update-browserslist-db@latest

# 复制项目文件：将当前目录下的所有文件复制到容器的工作目录中
COPY . .

# 暴露端口：声明容器将监听的网络端口，这里是8080端口
EXPOSE 8080

# 修改所有权：将工作目录的所有权更改为node用户，提高安全性
RUN chown -R node /usr/src/app

# 切换用户：从root切换到权限较低的node用户运行应用，这是安全最佳实践
USER node

# 容器启动命令：当容器启动时执行npm run dev命令，启动开发服务器
CMD ["npm", "run", "dev"]