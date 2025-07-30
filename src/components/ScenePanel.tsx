import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Edit } from 'lucide-react';

interface SceneItemProps {
  tabId: string;
  index: number;
}

const SceneItem: React.FC<SceneItemProps> = ({ tabId, index }) => {
  const { draftTabs, removeFromScene, openModal } = useAppStore();
  const tab = draftTabs.find(t => t.id === tabId);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tabId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (!tab) return null;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="scene-item card"
    >
      <div className="scene-item-header">
        <div 
          className="drag-handle"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </div>
        <span className="scene-order">#{index + 1}</span>
        <h4 className="scene-item-title">{tab.title}</h4>
        <div className="scene-item-actions">
          <button 
            className="icon-button"
            onClick={() => openModal('tab', tab.id)}
          >
            <Edit size={14} />
          </button>
          <button 
            className="icon-button"
            onClick={() => removeFromScene(tabId)}
          >
            <X size={14} />
          </button>
        </div>
      </div>
      
      <p className="scene-item-preview text-sm text-muted">
        {tab.content.length > 120 
          ? `${tab.content.substring(0, 120)}...`
          : tab.content || 'Empty content'
        }
      </p>
      
      {tab.metadata?.type && (
        <span className="scene-item-type-badge">{tab.metadata.type}</span>
      )}
    </div>
  );
};

export const ScenePanel: React.FC = () => {
  const { sceneTabIds, reorderScene } = useAppStore();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sceneTabIds.indexOf(active.id as string);
      const newIndex = sceneTabIds.indexOf(over.id as string);
      
      reorderScene(oldIndex, newIndex);
    }
  };

  return (
    <div className="panel scene-panel">
      <div className="panel-header">
        <h2 className="panel-title">Scene ({sceneTabIds.length})</h2>
      </div>
      
      <div className="panel-content">
        <DndContext 
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={sceneTabIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="scene-items">
              {sceneTabIds.map((tabId, index) => (
                <SceneItem 
                  key={tabId} 
                  tabId={tabId} 
                  index={index}
                />
              ))}
              
              {sceneTabIds.length === 0 && (
                <div className="empty-state">
                  <p className="text-muted">
                    No items in your scene yet. Add draft tabs from the working area.
                  </p>
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}; 