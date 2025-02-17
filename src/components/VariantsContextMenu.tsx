// AI Summary: Generic context menu component for displaying and selecting variants.
// Handles positioning, keyboard navigation, and selection with viewport boundary detection.
import React, { useEffect, useState } from 'react';
import { UI } from '../utils/constants';
import { useLogStore } from '../stores/logStore';

export interface Variant {
  id: string;
  label: string;
  tooltip?: string;
}

interface VariantsContextMenuProps {
  x: number;
  y: number;
  menuTitle: string;
  variants: Variant[];
  activeVariantId?: string;
  onClose: () => void;
  onSelectVariant: (variantId: string) => void;
}

const VariantsContextMenu: React.FC<VariantsContextMenuProps> = ({
  x,
  y,
  menuTitle,
  variants,
  activeVariantId,
  onClose,
  onSelectVariant,
}) => {
  const [position, setPosition] = useState({ x, y });
  const { addLog } = useLogStore();

  // Calculate menu position accounting for viewport boundaries
  useEffect(() => {
    // Get window dimensions
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Get menu dimensions once it's rendered
    const menu = document.querySelector(
      '.variants-context-menu'
    ) as HTMLElement;
    if (!menu) return;

    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;

    // Calculate position to keep menu within viewport
    const adjustedX = Math.min(x, windowWidth - menuWidth - UI.menu.padding);
    const adjustedY = Math.min(y, windowHeight - menuHeight - UI.menu.padding);

    setPosition({
      x: Math.max(UI.menu.padding, adjustedX),
      y: Math.max(UI.menu.padding, adjustedY),
    });
  }, [x, y]);

  // Handle clicking outside the menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.variants-context-menu')) {
        onClose();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const menuItems = document.querySelectorAll('.variant-menu-item');
        const currentIndex = Array.from(menuItems).findIndex(
          (item) => item === document.activeElement
        );

        let nextIndex: number;
        if (event.key === 'ArrowDown') {
          nextIndex =
            currentIndex < menuItems.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex =
            currentIndex > 0 ? currentIndex - 1 : menuItems.length - 1;
        }

        (menuItems[nextIndex] as HTMLElement).focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSelectVariant = (variant: Variant) => {
    //addLog(`Selected variant '${variant.label}'`);
    onSelectVariant(variant.id);
    onClose();
  };

  return (
    <div
      className="variants-context-menu fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[200px]"
      style={{
        left: position.x,
        top: position.y,
        maxWidth: UI.menu.maxWidth,
      }}
      role="menu"
      aria-label={menuTitle}
    >
      <div className="px-3 py-2 border-b border-gray-100 font-medium text-sm text-gray-600">
        {menuTitle}
      </div>
      <div className="py-1" role="none">
        {variants.map((variant) => (
          <button
            key={variant.id}
            className={`variant-menu-item w-full px-4 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${
              variant.id === activeVariantId ? 'bg-blue-50 font-medium' : ''
            }`}
            onClick={() => handleSelectVariant(variant)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectVariant(variant);
              }
            }}
            role="menuitem"
            aria-current={variant.id === activeVariantId}
            title={variant.tooltip || variant.label}
          >
            {variant.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default VariantsContextMenu;
