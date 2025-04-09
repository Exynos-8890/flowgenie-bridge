
import React from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Flowsmith from '@/components/Flowsmith';

const IndexPage = () => (
  <ReactFlowProvider>
    <Flowsmith />
  </ReactFlowProvider>
);

export default IndexPage;
