
FROM node:lts-alpine
ENV NODE_ENV=development
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
# 安装所有依赖
RUN npm install --silent
COPY . .
EXPOSE 8080
# 添加后端API所需的环境变量
ENV API_PORT=3001
# 确保目录权限正确
RUN mkdir -p /usr/src/app/data
RUN chown -R node /usr/src/app
USER node
# 同时启动前端和后端
CMD ["npm", "run", "dev"]
