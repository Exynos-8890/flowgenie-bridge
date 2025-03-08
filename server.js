
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { join } = require('path');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const { v4: uuidv4 } = require('uuid');

// 配置数据库
const dbFile = join(__dirname, 'data/db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);

// 初始化服务器
const app = express();
const PORT = process.env.API_PORT || 3001;

// 中间件
app.use(cors());
app.use(bodyParser.json());

// 初始化数据库
async function initDB() {
  await db.read();
  
  // 如果数据库为空，初始化结构
  db.data ||= { 
    flows: [],
    nodes: [], 
    edges: [],
    processors: []
  };
  
  await db.write();
}

// API 路由

// 1. 获取所有流程
app.get('/api/flows', async (req, res) => {
  await db.read();
  res.json(db.data.flows);
});

// 2. 创建新流程
app.post('/api/flows', async (req, res) => {
  await db.read();
  
  const newFlow = {
    id: uuidv4(),
    name: req.body.name || '未命名流程',
    description: req.body.description || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  db.data.flows.push(newFlow);
  await db.write();
  
  res.status(201).json(newFlow);
});

// 3. 获取特定流程
app.get('/api/flows/:id', async (req, res) => {
  await db.read();
  const flow = db.data.flows.find(f => f.id === req.params.id);
  
  if (!flow) {
    return res.status(404).json({ message: '流程未找到' });
  }
  
  // 获取该流程相关的节点和连接
  const nodes = db.data.nodes.filter(n => n.flowId === req.params.id);
  const edges = db.data.edges.filter(e => e.flowId === req.params.id);
  
  res.json({
    ...flow,
    nodes,
    edges
  });
});

// 4. 更新流程
app.put('/api/flows/:id', async (req, res) => {
  await db.read();
  const index = db.data.flows.findIndex(f => f.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ message: '流程未找到' });
  }
  
  db.data.flows[index] = {
    ...db.data.flows[index],
    name: req.body.name || db.data.flows[index].name,
    description: req.body.description || db.data.flows[index].description,
    updatedAt: new Date().toISOString()
  };
  
  await db.write();
  res.json(db.data.flows[index]);
});

// 5. 删除流程
app.delete('/api/flows/:id', async (req, res) => {
  await db.read();
  const index = db.data.flows.findIndex(f => f.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ message: '流程未找到' });
  }
  
  // 删除相关的节点和连接
  db.data.nodes = db.data.nodes.filter(n => n.flowId !== req.params.id);
  db.data.edges = db.data.edges.filter(e => e.flowId !== req.params.id);
  
  // 删除流程
  db.data.flows.splice(index, 1);
  await db.write();
  
  res.status(204).send();
});

// 6. 保存整个流程图 (节点和连接)
app.post('/api/flows/:id/save', async (req, res) => {
  await db.read();
  const { nodes, edges } = req.body;
  const flowId = req.params.id;
  
  // 更新流程的时间戳
  const flowIndex = db.data.flows.findIndex(f => f.id === flowId);
  if (flowIndex === -1) {
    return res.status(404).json({ message: '流程未找到' });
  }
  
  db.data.flows[flowIndex].updatedAt = new Date().toISOString();
  
  // 删除该流程的所有现有节点和连接
  db.data.nodes = db.data.nodes.filter(n => n.flowId !== flowId);
  db.data.edges = db.data.edges.filter(e => e.flowId !== flowId);
  
  // 添加新的节点和连接
  const nodesWithFlowId = nodes.map(node => ({
    ...node,
    flowId
  }));
  
  const edgesWithFlowId = edges.map(edge => ({
    ...edge,
    flowId
  }));
  
  db.data.nodes.push(...nodesWithFlowId);
  db.data.edges.push(...edgesWithFlowId);
  
  await db.write();
  
  res.json({
    message: '流程图已保存',
    flow: db.data.flows[flowIndex],
    nodes: nodesWithFlowId,
    edges: edgesWithFlowId
  });
});

// 7. 执行处理器节点
app.post('/api/processors/execute', async (req, res) => {
  const { processorId, inputNodes, outputNodeId } = req.body;
  
  await db.read();
  
  // 获取处理器节点
  const processor = db.data.nodes.find(n => n.id === processorId && n.type === 'processor');
  
  if (!processor) {
    return res.status(404).json({ message: '处理器节点未找到' });
  }
  
  // 获取输入内容
  const inputContents = inputNodes.map(id => {
    const node = db.data.nodes.find(n => n.id === id);
    return node ? node.data.content : '';
  }).filter(Boolean).join('\n\n');
  
  // 处理器类型
  const processorType = processor.data.type || 'summary';
  const promptTemplate = processor.data.prompt || '';
  
  // 模拟处理逻辑
  let result = '';
  
  try {
    // 根据处理器类型执行不同的操作
    switch (processorType) {
      case 'summary':
        result = `这是对文本的摘要: ${inputContents.substring(0, 100)}...`;
        break;
      case 'translate':
        result = `翻译结果: ${inputContents}`;
        break;
      case 'refine':
        result = `优化结果: ${inputContents}`;
        break;
      default:
        result = `处理结果: ${inputContents}`;
    }
    
    // 如果有自定义提示词，追加到结果中
    if (promptTemplate) {
      result += `\n\n根据提示词 "${promptTemplate}" 处理`;
    }
    
    // 更新输出节点
    if (outputNodeId) {
      const outputIndex = db.data.nodes.findIndex(n => n.id === outputNodeId);
      if (outputIndex !== -1) {
        db.data.nodes[outputIndex].data.content = result;
        await db.write();
      }
    }
    
    res.json({
      success: true,
      result,
      outputNodeId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 启动服务器
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`后端API服务运行在 http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('数据库初始化失败:', err);
});
