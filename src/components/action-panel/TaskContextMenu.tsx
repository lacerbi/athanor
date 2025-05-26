// AI Summary: Wrapper component around VariantsContextMenu to handle task-specific variant selection
import React from 'react';
import { TaskData } from '../../types/taskTypes';
import VariantsContextMenu from './VariantsContextMenu';
import { useLogStore } from '../../stores/logStore';

interface TaskContextMenuProps {
  task: TaskData;
  x: number;
  y: number;
  onClose: () => void;
  onSelectVariant: (variantId: string) => void;
  activeVariantId?: string;
}

const TaskContextMenu: React.FC<TaskContextMenuProps> = ({
  task,
  x,
  y,
  onClose,
  onSelectVariant,
  activeVariantId,
}) => {
  const { addLog } = useLogStore();

  const handleVariantSelect = (variantId: string) => {
    const variant = task.variants.find((v) => v.id === variantId);
    if (variant) {
      addLog(`Selected variant '${variant.label}' for task '${task.label}'`);
    }
    onSelectVariant(variantId);
  };

  return (
    <VariantsContextMenu
      x={x}
      y={y}
      menuTitle={`${task.label} Variants`}
      variants={task.variants}
      activeVariantId={activeVariantId}
      onClose={onClose}
      onSelectVariant={handleVariantSelect}
    />
  );
};

export default TaskContextMenu;
