// AI Summary: Wrapper component around VariantsContextMenu to handle prompt-specific variant selection.
import React from 'react';
import { PromptData } from '../types/promptTypes';
import VariantsContextMenu from './VariantsContextMenu';
import { useLogStore } from '../stores/logStore';

interface PromptContextMenuProps {
  prompt: PromptData;
  x: number;
  y: number;
  onClose: () => void;
  onSelectVariant: (variantId: string) => void;
  activeVariantId?: string;
}

const PromptContextMenu: React.FC<PromptContextMenuProps> = ({
  prompt,
  x,
  y,
  onClose,
  onSelectVariant,
  activeVariantId,
}) => {
  const { addLog } = useLogStore();
  
  const handleVariantSelect = (variantId: string) => {
    const variant = prompt.variants.find(v => v.id === variantId);
    if (variant) {
      addLog(`Selected variant '${variant.label}' for prompt '${prompt.label}'`);
    }
    onSelectVariant(variantId);
  };

  return (
    <VariantsContextMenu
      x={x}
      y={y}
      menuTitle={`${prompt.label} Variants`}
      variants={prompt.variants}
      activeVariantId={activeVariantId}
      onClose={onClose}
      onSelectVariant={handleVariantSelect}
    />
  );
};

export default PromptContextMenu;
