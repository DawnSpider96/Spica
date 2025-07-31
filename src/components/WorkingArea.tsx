import React, { useState } from 'react';
import { useAppStore } from '../stores';
import { useHotkeys } from 'react-hotkeys-hook';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Send, Plus, Edit, PlayCircle, Trash2, MessageSquare, Eye, Archive, ArrowLeft, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';

interface SortableWorkbenchTabProps {
  tab: any;
  scenes: any;
  openModal: (type: "tab" | "star" | "character", id: string) => void;
  addTabToScene: (tabId: string, sceneId: string) => void;
  moveTabToIdeaBank: (tabId: string) => void;
  deleteDraftTab: (tabId: string) => void;
  active_scene_id: string | undefined;
}

const SortableWorkbenchTab: React.FC<SortableWorkbenchTabProps> = ({ 
  tab, scenes, openModal, addTabToScene, moveTabToIdeaBank, deleteDraftTab, active_scene_id 
}) => {
  console.log('SortableWorkbenchTab rendering:', tab.id); // Debug
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  console.log('SortableWorkbenchTab sortable:', { tabId: tab.id, attributes, listeners, isDragging }); // Debug

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="draft-tab-card card">
      <div className="tab-header">
        <div 
          className="drag-handle"
          {...attributes}
          {...listeners}
          style={{ cursor: 'grab', marginRight: '8px' }}
        >
          <GripVertical size={16} />
        </div>
        <h4 className="tab-title">
          {tab.scene_id ? 
            `Tab from ${scenes[tab.scene_id]?.name || 'Unknown Scene'}` :
            'Workbench Tab'
          }
        </h4>
        <div className="tab-meta">
          <span className="tab-stats">
            {tab.timeline.length} events
            {tab.descriptions.length > 0 && `, ${tab.descriptions.length} notes`}
          </span>
        </div>
      </div>
      
      {/* Timeline Preview */}
      <div className="tab-content-preview">
        {tab.timeline.length > 0 ? (
          <div className="timeline-preview">
            {tab.timeline.slice(0, 3).map((event: any) => (
              <div key={event.id} className="event-preview">
                <span className="event-text">
                  {event.text.length > 50 ? event.text.substring(0, 50) + '...' : event.text}
                </span>
                {event.dialogue && (
                  <MessageSquare size={12} className="dialogue-icon" />
                )}
              </div>
            ))}
            {tab.timeline.length > 3 && (
              <div className="event-preview text-muted">
                +{tab.timeline.length - 3} more events
              </div>
            )}
          </div>
        ) : (
          <div className="empty-timeline">
            <p className="text-muted">No events yet</p>
          </div>
        )}
      </div>
      
      <div className="tab-actions">
        <button 
          className="button button-secondary"
          onClick={() => openModal('tab', tab.id)}
        >
          <Edit size={14} />
          Edit
        </button>
        
        {active_scene_id && (
          <button 
            className="button button-secondary"
            onClick={() => addTabToScene(tab.id, active_scene_id)}
          >
            <PlayCircle size={14} />
            Add to Scene
          </button>
        )}
        
        <button 
          className="button button-secondary"
          onClick={() => moveTabToIdeaBank(tab.id)}
        >
          <Archive size={14} />
          Move to Bank
        </button>
        
        <button 
          className="button button-danger"
          onClick={() => deleteDraftTab(tab.id)}
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </div>
  );
};

interface SortableIdeaBankTabProps {
  tab: any;
  scenes: any;
  openModal: (type: "tab" | "star" | "character", id: string) => void;
  moveTabFromIdeaBank: (tabId: string, sceneId: string) => void;
  moveTabToWorkbench: (tabId: string) => void;
  deleteDraftTab: (tabId: string) => void;
  active_scene_id: string | undefined;
}

interface SortableSceneTabProps {
  tab: any;
  index: number;
  scenes: any;
  openModal: (type: "tab" | "star" | "character", id: string) => void;
  moveTabToWorkbench: (tabId: string) => void;
  moveTabToIdeaBank: (tabId: string) => void;
  deleteDraftTab: (tabId: string) => void;
  active_scene_id: string | undefined;
}

const SortableSceneTab: React.FC<SortableSceneTabProps> = ({ 
  tab, index, scenes, openModal, moveTabToWorkbench, moveTabToIdeaBank, deleteDraftTab, active_scene_id 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="draft-tab-card card">
      <div className="tab-header">
        <div 
          className="drag-handle"
          {...attributes}
          {...listeners}
          style={{ 
            cursor: 'grab',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            borderRadius: '4px',
            color: 'var(--text-muted)',
            transition: 'all 0.2s ease',
            userSelect: 'none',
            minWidth: '20px',
            minHeight: '20px',
            marginRight: '8px'
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          ⋮⋮
        </div>
        <h4 className="tab-title">
          #{index + 1}: {tab.timeline.length > 0 ? tab.timeline[0].text.substring(0, 30) : 'Empty tab'}
          {tab.timeline[0]?.text.length > 30 ? '...' : ''}
        </h4>
        <div className="tab-meta">
          <span className="tab-stats">
            {tab.timeline.length} events
            {tab.descriptions.length > 0 && `, ${tab.descriptions.length} notes`}
          </span>
        </div>
      </div>
      
      {/* Timeline Preview */}
      <div className="tab-content-preview">
        {tab.timeline.length > 0 ? (
          <div className="timeline-preview">
            {tab.timeline.slice(0, 2).map((timelineEvent: any) => (
              <div key={timelineEvent.id} className="timeline-event-preview">
                <span className="event-text">{timelineEvent.text}</span>
                {timelineEvent.dialogue && (
                  <span className="event-dialogue">
                    <MessageSquare size={12} />
                    "{timelineEvent.dialogue.length > 25 ? 
                      `${timelineEvent.dialogue.substring(0, 25)}...` : 
                      timelineEvent.dialogue}"
                  </span>
                )}
              </div>
            ))}
            {tab.timeline.length > 2 && (
              <div className="timeline-more text-sm text-muted">
                +{tab.timeline.length - 2} more events
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">Empty timeline</p>
        )}
      </div>
      
      <div className="tab-actions">
        <button 
          className="button button-secondary"
          onClick={() => openModal('tab', tab.id)}
        >
          <Edit size={14} />
          Edit
        </button>
        
        <button 
          className="button button-secondary"
          onClick={() => moveTabToWorkbench(tab.id)}
        >
          <ArrowLeft size={14} />
          Move to Workbench
        </button>
        
        <button 
          className="button button-secondary"
          onClick={() => moveTabToIdeaBank(tab.id)}
        >
          <Archive size={14} />
          Move to Bank
        </button>
        
        <button 
          className="button button-danger"
          onClick={() => deleteDraftTab(tab.id)}
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </div>
  );
};

const SortableIdeaBankTab: React.FC<SortableIdeaBankTabProps> = ({ 
  tab, scenes, openModal, moveTabFromIdeaBank, moveTabToWorkbench, deleteDraftTab, active_scene_id 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="draft-tab-card card">
      <div className="tab-header">
        <div 
          className="drag-handle"
          {...attributes}
          {...listeners}
          style={{ cursor: 'grab', marginRight: '8px' }}
        >
          <GripVertical size={16} />
        </div>
        <h4 className="tab-title">
          Banked: {tab.timeline.length > 0 ? tab.timeline[0].text.substring(0, 30) : 'Empty tab'}
          {tab.timeline[0]?.text.length > 30 ? '...' : ''}
        </h4>
        <div className="tab-meta">
          <span className="tab-stats">
            {tab.timeline.length} events
            {tab.descriptions.length > 0 && `, ${tab.descriptions.length} notes`}
          </span>
        </div>
      </div>
      
      {/* Timeline Preview */}
      <div className="tab-content-preview">
        {tab.timeline.length > 0 ? (
          <div className="timeline-preview">
            {tab.timeline.slice(0, 3).map((event: any) => (
              <div key={event.id} className="event-preview">
                <span className="event-text">
                  {event.text.length > 50 ? event.text.substring(0, 50) + '...' : event.text}
                </span>
                {event.dialogue && (
                  <MessageSquare size={12} className="dialogue-icon" />
                )}
              </div>
            ))}
            {tab.timeline.length > 3 && (
              <div className="event-preview text-muted">
                +{tab.timeline.length - 3} more events
              </div>
            )}
          </div>
        ) : (
          <div className="empty-timeline">
            <p className="text-muted">No events yet</p>
          </div>
        )}
      </div>
      
      <div className="tab-actions">
        <button 
          className="button button-secondary"
          onClick={() => openModal('tab', tab.id)}
        >
          <Edit size={14} />
          Edit
        </button>
        
        {active_scene_id && (
          <button 
            className="button button-secondary"
            onClick={() => moveTabFromIdeaBank(tab.id, active_scene_id)}
          >
            <PlayCircle size={14} />
            Add to Scene
          </button>
        )}
        
        <button 
          className="button button-secondary"
          onClick={() => moveTabToWorkbench(tab.id)}
        >
          <ArrowLeft size={14} />
          Move to Workbench
        </button>
        
        <button 
          className="button button-danger"
          onClick={() => deleteDraftTab(tab.id)}
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>
      
      <div className="tab-meta text-xs text-muted">
        Banked from: {tab.scene_id ? scenes[tab.scene_id]?.name || 'Unknown Scene' : 'Workbench'}
      </div>
    </div>
  );
};

export const WorkingArea: React.FC = () => {
  const { 
    draft_tabs,
    scenes,
    active_scene_id,
    idea_bank,
    isLoading, 
    sendPrompt, 
    createDraftTab, 
    openModal, 
    addTabToScene, // Fixed from moveTabToScene
    deleteDraftTab,
    moveTabToIdeaBank,
    moveTabFromIdeaBank,
    moveTabToWorkbench, // New function for moving to workbench
    buildLLMContext,
    getWorkbenchTabs, // New function for workbench tabs
    getDraftTabsForScene, // New function for scene tabs
    reorderWorkbenchTabs,
    reorderIdeaBankTabs,
    reorderSceneTabs,
    ui
  } = useAppStore();
  
  const [promptText, setPromptText] = useState('');
  const [bankCollapsed, setBankCollapsed] = useState(false);
  const activeScene = active_scene_id ? scenes[active_scene_id] : null;

  const workbenchTabs = getWorkbenchTabs();
  const workbenchTabIds = workbenchTabs.map(tab => tab.id);

  const ideaBankTabs = idea_bank.stored_draft_tab_ids
    .map(id => draft_tabs[id])
    .filter(Boolean);
  const ideaBankTabIds = idea_bank.stored_draft_tab_ids;

  const handleWorkbenchDragEnd = (event: DragEndEvent) => {
    console.log('Workbench drag end called:', event); // Debug
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = workbenchTabIds.indexOf(active.id as string);
      const newIndex = workbenchTabIds.indexOf(over.id as string);
      
      console.log('Workbench reordering:', { oldIndex, newIndex, workbenchTabIds }); // Debug
      
      // Create new order array
      const newOrder = [...workbenchTabIds];
      const [movedTabId] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, movedTabId);
      
      reorderWorkbenchTabs(newOrder);
    }
  };

  const handleIdeaBankDragEnd = (event: DragEndEvent) => {
    console.log('IdeaBank drag end called:', event); // Debug
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = ideaBankTabIds.indexOf(active.id as string);
      const newIndex = ideaBankTabIds.indexOf(over.id as string);
      
      console.log('IdeaBank reordering:', { oldIndex, newIndex, ideaBankTabIds }); // Debug
      
      // Create new order array
      const newOrder = [...ideaBankTabIds];
      const [movedTabId] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, movedTabId);
      
      reorderIdeaBankTabs(newOrder);
    }
  };

  const handleSceneDragEnd = (event: DragEndEvent) => {
    console.log('Scene drag end called:', event); // Debug
    const { active, over } = event;

    if (over && active.id !== over.id && active_scene_id) {
      const sceneTabs = getDraftTabsForScene(active_scene_id);
      const sceneTabIds = sceneTabs.map(tab => tab.id);
      
      const oldIndex = sceneTabIds.indexOf(active.id as string);
      const newIndex = sceneTabIds.indexOf(over.id as string);
      
      console.log('Scene reordering:', { oldIndex, newIndex, sceneTabIds }); // Debug
      
      // Create new order array
      const newOrder = [...sceneTabIds];
      const [movedTabId] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, movedTabId);
      
      reorderSceneTabs(active_scene_id, newOrder);
    }
  };

  const handleSendPrompt = async () => {
    if (!promptText.trim() || isLoading || !active_scene_id) return;
    
    await sendPrompt(promptText.trim(), active_scene_id);
    setPromptText('');
  };

  useHotkeys('cmd+enter, ctrl+enter', (e) => {
    e.preventDefault();
    handleSendPrompt();
  }, { enableOnFormTags: ['textarea'] });

  const handleCreateDraftTab = () => {
    createDraftTab(); // Fixed - no arguments needed for workbench tabs
  };

  return (
    <div className="panel working-area">
      <div className="panel-header">
        <h2 className="panel-title">Working Area</h2>
        {activeScene && (
          <div className="panel-subtitle text-sm text-muted">
            Scene: {activeScene.name}
          </div>
        )}
      </div>
      
      <div className="panel-content">
        {/* Context Preview Toggle */}
        {ui.showContextPreview && active_scene_id && (
          <div className="context-preview mb-4">
            <div className="context-preview-header">
              <h4>LLM Context Preview</h4>
              <button 
                className="button button-secondary"
                onClick={() => useAppStore.getState().toggleContextPreview()}
              >
                <Eye size={14} />
                Hide
              </button>
            </div>
            <pre className="context-preview-content">
              {buildLLMContext(active_scene_id)}
            </pre>
          </div>
        )}

        {/* Prompt Area */}
        <div className="prompt-area mb-4">
          <div className="prompt-input-container">
            <TextareaAutosize
              className="textarea"
              placeholder="Enter your prompt here... (Cmd+Enter to send)"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              minRows={3}
              maxRows={8}
              disabled={isLoading || !active_scene_id}
            />
            <div className="prompt-actions">
              <button 
                className="button button-secondary"
                onClick={() => useAppStore.getState().toggleContextPreview()}
              >
                <Eye size={16} />
                {ui.showContextPreview ? 'Hide' : 'Preview'} Context
              </button>
              <button 
                className="button"
                onClick={handleSendPrompt}
                disabled={!promptText.trim() || isLoading || !active_scene_id}
              >
                {isLoading ? (
                  <>
                    <div className="spinner" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Draft Tabs */}
        <div className="draft-tabs">
          <div className="section-header-with-action">
            <h3>Workbench ({getWorkbenchTabs().length})</h3>
            <button 
              className="button button-secondary"
              onClick={handleCreateDraftTab}
            >
              <Plus size={16} />
              New Draft
            </button>
          </div>

          <div className="draft-tabs-list">
            <DndContext 
              collisionDetection={closestCenter}
              onDragEnd={handleWorkbenchDragEnd}
            >
              <SortableContext 
                items={workbenchTabIds}
                strategy={verticalListSortingStrategy}
              >
                {workbenchTabs.map(tab => (
                  <SortableWorkbenchTab 
                    key={tab.id} 
                    tab={tab} 
                    scenes={scenes} 
                    openModal={openModal} 
                    addTabToScene={addTabToScene} 
                    moveTabToIdeaBank={moveTabToIdeaBank} 
                    deleteDraftTab={deleteDraftTab} 
                    active_scene_id={active_scene_id} 
                  />
                ))}
                
                {workbenchTabs.length === 0 && (
                  <div className="empty-state">
                    <p className="text-muted">No items in workbench. Send a prompt or create a draft tab to get started.</p>
                  </div>
                )}
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* Scene */}
        {active_scene_id && (
          <div className="scene-section">
            <div className="section-header-with-action">
              <h3>Scene: {scenes[active_scene_id]?.name} ({getDraftTabsForScene(active_scene_id).length})</h3>
            </div>

            <div className="scene-tabs-list">
              <DndContext 
                collisionDetection={closestCenter}
                onDragEnd={handleSceneDragEnd}
              >
                <SortableContext 
                  items={getDraftTabsForScene(active_scene_id).map(tab => tab.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {getDraftTabsForScene(active_scene_id).map((tab, index) => (
                    <SortableSceneTab 
                      key={tab.id} 
                      tab={tab}
                      index={index}
                      scenes={scenes} 
                      openModal={openModal} 
                      moveTabToWorkbench={moveTabToWorkbench} 
                      moveTabToIdeaBank={moveTabToIdeaBank} 
                      deleteDraftTab={deleteDraftTab} 
                      active_scene_id={active_scene_id} 
                    />
                  ))}
                </SortableContext>
              </DndContext>
              
              {getDraftTabsForScene(active_scene_id).length === 0 && (
                <div className="empty-state">
                  <p className="text-muted">
                    No tabs in this scene yet. Move tabs from the workbench to build your scene.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Idea Bank */}
        <div className="idea-bank">
          <button 
            className="section-header-collapsible"
            onClick={() => setBankCollapsed(!bankCollapsed)}
          >
            <h3>Idea Bank ({idea_bank.stored_draft_tab_ids.length})</h3>
            {bankCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </button>

          {!bankCollapsed && (
            <div className="idea-bank-list">
              <DndContext 
                collisionDetection={closestCenter}
                onDragEnd={handleIdeaBankDragEnd}
              >
                <SortableContext 
                  items={ideaBankTabIds}
                  strategy={verticalListSortingStrategy}
                >
                  {ideaBankTabs.map(tab => (
                    <SortableIdeaBankTab 
                      key={tab.id} 
                      tab={tab} 
                      scenes={scenes} 
                      openModal={openModal} 
                      moveTabFromIdeaBank={moveTabFromIdeaBank} 
                      moveTabToWorkbench={moveTabToWorkbench} 
                      deleteDraftTab={deleteDraftTab} 
                      active_scene_id={active_scene_id} 
                    />
                  ))}
                  
                  {ideaBankTabs.length === 0 && (
                    <div className="empty-state">
                      <p className="text-muted">
                        No tabs in idea bank. Use "Move to Bank" to store draft tabs here without deleting them.
                      </p>
                    </div>
                  )}
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 