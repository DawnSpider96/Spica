import React from 'react';
import { useAppStore } from '../stores';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Edit, MessageSquare, FileText } from 'lucide-react';

interface SceneItemProps {
  tabId: string;
  index: number;
}

const SceneItem: React.FC<SceneItemProps> = ({ tabId, index }) => {
  const { draft_tabs, removeTabFromScene, openModal } = useAppStore();
  const tab = draft_tabs[tabId];
  
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
        <h4 className="scene-item-title">Draft Tab {index + 1}</h4>
        <div className="scene-item-stats">
          <span className="stat-item">
            <FileText size={12} />
            {tab.timeline.length}
          </span>
          {tab.timeline.some(e => e.dialogue) && (
            <span className="stat-item">
              <MessageSquare size={12} />
              {tab.timeline.filter(e => e.dialogue).length}
            </span>
          )}
        </div>
        <div className="scene-item-actions">
          <button 
            className="icon-button"
            onClick={() => openModal('tab', tab.id)}
          >
            <Edit size={14} />
          </button>
          <button 
            className="icon-button"
            onClick={() => removeTabFromScene(tabId)}
          >
            <X size={14} />
          </button>
        </div>
      </div>
      
      {/* Timeline Preview */}
      <div className="scene-item-preview">
        {tab.timeline.length > 0 ? (
          <div className="timeline-preview">
            {tab.timeline.slice(0, 2).map((event) => (
              <div key={event.id} className="timeline-event-preview">
                <span className="event-text">{event.text}</span>
                {event.dialogue && (
                  <span className="event-dialogue">
                    "{event.dialogue.length > 25 ? 
                      `${event.dialogue.substring(0, 25)}...` : 
                      event.dialogue}"
                  </span>
                )}
              </div>
            ))}
            {tab.timeline.length > 2 && (
              <div className="timeline-more text-xs text-muted">
                +{tab.timeline.length - 2} more
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">Empty timeline</p>
        )}
        
        {/* Descriptions count */}
        {tab.descriptions.length > 0 && (
          <div className="descriptions-indicator text-xs text-muted">
            {tab.descriptions.length} description{tab.descriptions.length !== 1 ? 's' : ''}
          </div>
        )}
        
        {/* Plan step fulfillment */}
        {tab.fulfilled_plan_steps.length > 0 && (
          <div className="plan-steps-indicator text-xs">
            ✓ Fulfills {tab.fulfilled_plan_steps.length} plan step{tab.fulfilled_plan_steps.length !== 1 ? 's' : ''}
          </div>
      )}
      </div>
    </div>
  );
};

export const ScenePanel: React.FC = () => {
  const { 
    scenes, 
    active_scene_id, 
    getDraftTabsForScene, 
    reorderSceneTabs 
  } = useAppStore();

  const activeScene = active_scene_id ? scenes[active_scene_id] : null;
  const sceneTabs = activeScene ? getDraftTabsForScene(activeScene.id) : [];
  const sceneTabIds = activeScene ? activeScene.draft_tab_ids : [];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && active_scene_id) {
      const oldIndex = sceneTabIds.indexOf(active.id as string);
      const newIndex = sceneTabIds.indexOf(over.id as string);
      
      reorderSceneTabs(active_scene_id, oldIndex, newIndex);
    }
  };

  if (!activeScene) {
    return (
      <div className="panel scene-panel">
        <div className="panel-header">
          <h2 className="panel-title">Scene</h2>
        </div>
        <div className="panel-content">
          <div className="empty-state">
            <p className="text-muted">No active scene</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel scene-panel">
      <div className="panel-header">
        <h2 className="panel-title">Scene ({sceneTabIds.length})</h2>
        <div className="panel-subtitle text-sm text-muted">
          {activeScene.name}
        </div>
      </div>
      
      <div className="panel-content">
        {/* Scene Info */}
        {(activeScene.setting || activeScene.backstory) && (
          <div className="scene-info mb-4">
            {activeScene.setting && (
              <div className="scene-setting text-sm">
                <strong>Setting:</strong> {activeScene.setting}
              </div>
            )}
            {activeScene.backstory && (
              <div className="scene-backstory text-sm">
                <strong>Context:</strong> {activeScene.backstory}
              </div>
            )}
          </div>
        )}

        {/* Scene Plan */}
        {activeScene.plan.raw_text && (
          <div className="scene-plan mb-4">
            <h4 className="text-sm font-medium">Plan</h4>
            <div className="plan-text text-sm text-muted">
              {activeScene.plan.raw_text.length > 150 ? 
                `${activeScene.plan.raw_text.substring(0, 150)}...` :
                activeScene.plan.raw_text
              }
            </div>
          </div>
        )}

        {/* Draft Tabs in Scene */}
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
        
        {/* Scene Stats */}
        {sceneTabIds.length > 0 && (
          <div className="scene-stats text-xs text-muted mt-4">
            Total: {sceneTabs.reduce((acc, tab) => acc + tab.timeline.length, 0)} events
            {sceneTabs.some(tab => tab.timeline.some(e => e.dialogue)) && (
              <> • {sceneTabs.reduce((acc, tab) => acc + tab.timeline.filter(e => e.dialogue).length, 0)} dialogues</>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 