import React, { useState } from 'react';
import { useAppStore } from '../stores';
import { useHotkeys } from 'react-hotkeys-hook';
import { Send, Plus, Edit, PlayCircle, Trash2, MessageSquare, Eye, Archive, ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';

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
    moveTabToScene, // Updated from addTabToScene
    deleteDraftTab,
    moveTabToIdeaBank,
    moveTabFromIdeaBank,
    moveTabToWorkbench, // New function for moving to workbench
    buildLLMContext,
    getWorkbenchTabs, // New function for workbench tabs
    getDraftTabsForScene, // New function for scene tabs
    ui
  } = useAppStore();
  
  const [promptText, setPromptText] = useState('');
  const [bankCollapsed, setBankCollapsed] = useState(false);
  const activeScene = active_scene_id ? scenes[active_scene_id] : null;


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
    createDraftTab('New Draft');
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
            {getWorkbenchTabs().map(tab => (
              <div key={tab.id} className="draft-tab-card card">
                <div className="tab-header">
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
                      {tab.timeline.slice(0, 3).map((event, index) => (
                        <div key={event.id} className="timeline-event-preview">
                          <span className="event-text">{event.text}</span>
                          {event.dialogue && (
                            <span className="event-dialogue">
                              <MessageSquare size={12} />
                              "{event.dialogue.length > 30 ? 
                                `${event.dialogue.substring(0, 30)}...` : 
                                event.dialogue}"
                            </span>
                          )}
                        </div>
                      ))}
                      {tab.timeline.length > 3 && (
                        <div className="timeline-more text-sm text-muted">
                          +{tab.timeline.length - 3} more events
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">Empty timeline</p>
                  )}
                  
                  {/* Summary */}
                  {tab.summary && (
                    <div className="tab-summary text-sm">
                      <strong>Summary:</strong> {tab.summary}
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
                      onClick={() => moveTabToScene(tab.id, active_scene_id)}
                    >
                      <PlayCircle size={14} />
                      Move to Scene
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
                
                <div className="tab-meta text-xs text-muted">
                  Created: {new Date(tab.created_at).toLocaleDateString()}
                  {tab.updated_at !== tab.created_at && (
                    <>
                      {' • '}
                      Updated: {new Date(tab.updated_at).toLocaleDateString()}
                    </>
                  )}
                </div>
              </div>
            ))}
            
                          {getWorkbenchTabs().length === 0 && (
                <div className="empty-state">
                  <p className="text-muted">No items in workbench. Send a prompt or create a draft tab to get started.</p>
                </div>
              )}
            </div>
        </div>

        {/* Scene */}
        {active_scene_id && (
          <div className="scene-section">
            <div className="section-header-with-action">
              <h3>Scene: {scenes[active_scene_id]?.name} ({getDraftTabsForScene(active_scene_id).length})</h3>
            </div>

            <div className="scene-tabs-list">
              {getDraftTabsForScene(active_scene_id).map((tab, index) => (
                <div key={tab.id} className="draft-tab-card card">
                  <div className="tab-header">
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
                        {tab.timeline.slice(0, 2).map((event, idx) => (
                          <div key={event.id} className="timeline-event-preview">
                            <span className="event-text">{event.text}</span>
                            {event.dialogue && (
                              <span className="event-dialogue">
                                <MessageSquare size={12} />
                                "{event.dialogue.length > 25 ? 
                                  `${event.dialogue.substring(0, 25)}...` : 
                                  event.dialogue}"
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
              ))}
              
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
            {idea_bank.stored_draft_tab_ids.map(tabId => {
              const tab = draft_tabs[tabId];
              if (!tab) return null;
              
              return (
                <div key={tab.id} className="draft-tab-card card">
                  <div className="tab-header">
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
                        {tab.timeline.slice(0, 2).map((event, index) => (
                          <div key={event.id} className="timeline-event-preview">
                            <span className="event-text">{event.text}</span>
                            {event.dialogue && (
                              <span className="event-dialogue">
                                <MessageSquare size={12} />
                                "{event.dialogue.length > 25 ? 
                                  `${event.dialogue.substring(0, 25)}...` : 
                                  event.dialogue}"
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
                      onClick={() => moveTabFromIdeaBank(tab.id)}
                    >
                      <Edit size={14} />
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
            })}
            
            {idea_bank.stored_draft_tab_ids.length === 0 && (
              <div className="empty-state">
                <p className="text-muted">
                  No tabs in idea bank. Use "Move to Bank" to store draft tabs here without deleting them.
                </p>
              </div>
            )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 