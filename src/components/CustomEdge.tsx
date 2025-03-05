
import React, { memo } from 'react';
import { EdgeProps, getBezierPath, BaseEdge } from '@xyflow/react';

const CustomEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}: EdgeProps) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      className={selected ? 'selected' : ''}
    />
  );
});

export default CustomEdge;
