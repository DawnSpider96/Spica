import React, { useState, useEffect } from 'react';
import { useAppStore } from '../stores';
import { X, Plus, Trash2, MessageSquare, Hash, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';

export const ModalEditor: React.FC = () => {
  const { 
    draft_tabs,
    characters,
    stars,
    idea_bank,
    ui,
    closeModal,
    updateDraftTab,
    updateCharacter,
    updateStar,
    deleteDraftTab,
    deleteCharacter,
    deleteStar,
    addTimelineEvent,
    updateTimelineEvent,
    deleteTimelineEvent,
    addDescription,
    updateDescription,
    deleteDescription
  } = useAppStore();

  const [localState, setLocalState] = useState<any>({});
  const [expandedDialogues, setExpandedDialogues] = useState<Set<number>>(new Set());

  const modal = ui.activeModal;
  const isOpen = modal !== null;

  const currentEntity = isOpen ? (
    modal.type === 'tab' ? draft_tabs[modal.id] :
    modal.type === 'character' ? characters[modal.id] :
    modal.type === 'star' ? stars[modal.id] :
    null
  ) : null;

  // Determine if the current tab is read-only (in scene or bank, not in workbench)
  const isTabReadOnly = modal?.type === 'tab' && currentEntity ? (
    // Tab is read-only if it has a scene_id (in scene) OR is in idea bank
    (currentEntity as any).scene_id !== undefined || idea_bank.stored_draft_tab_ids.includes(modal.id)
  ) : false;

  // Initialize local state when modal opens
  useEffect(() => {
    if (currentEntity) {
      setLocalState({ ...currentEntity });
    } else {
      setLocalState({});
    }
  }, [currentEntity]);

  const handleSave = () => {
    if (!modal || !currentEntity) return;
    
    // Don't save if tab is read-only
    if (isTabReadOnly) {
      closeModal();
      return;
    }

    switch (modal.type) {
      case 'tab':
        updateDraftTab(modal.id, localState);
        break;
      case 'character':
        updateCharacter(modal.id, localState);
        break;
      case 'star':
        updateStar(modal.id, localState);
        break;
    }
    closeModal();
  };

  const handleDelete = () => {
    if (!modal || !currentEntity) return;

    const confirmMessage = `Are you sure you want to delete this ${modal.type}? This action cannot be undone.`;
    if (!window.confirm(confirmMessage)) return;

    switch (modal.type) {
      case 'tab':
        deleteDraftTab(modal.id);
        break;
      case 'character':
        deleteCharacter(modal.id);
        break;
      case 'star':
        deleteStar(modal.id);
        break;
    }
    closeModal();
  };

  const handleAddTimelineEvent = () => {
    if (modal?.type !== 'tab') return;
    
    const newEvent = {
      text: 'New event',
      dialogue: '',
      associated_stars: []
    };
    
    setLocalState((prev: any) => ({
      ...prev,
      timeline: [...(prev.timeline || []), { ...newEvent, id: `temp-${Date.now()}` }]
    }));
  };

  const handleUpdateTimelineEvent = (index: number, updates: any) => {
    setLocalState((prev: any) => ({
      ...prev,
      timeline: prev.timeline.map((event: any, i: number) => 
        i === index ? { ...event, ...updates } : event
      )
    }));
  };

  const handleDeleteTimelineEvent = (index: number) => {
    setLocalState((prev: any) => ({
      ...prev,
      timeline: prev.timeline.filter((_: any, i: number) => i !== index)
    }));
  };

  const handleAddDescription = () => {
    if (modal?.type !== 'tab') return;
    
    const newDescription = {
      text: 'New description',
      is_important: false,
      origin_star_id: undefined
    };
    
    setLocalState((prev: any) => ({
      ...prev,
      descriptions: [...(prev.descriptions || []), { ...newDescription, id: `temp-${Date.now()}` }]
    }));
  };

  const handleUpdateDescription = (index: number, updates: any) => {
    setLocalState((prev: any) => ({
      ...prev,
      descriptions: prev.descriptions.map((desc: any, i: number) => 
        i === index ? { ...desc, ...updates } : desc
      )
    }));
  };

  const handleDeleteDescription = (index: number) => {
    setLocalState((prev: any) => ({
      ...prev,
      descriptions: prev.descriptions.filter((_: any, i: number) => i !== index)
    }));
  };

  const handleAddCharacterField = () => {
    if (modal?.type !== 'character') return;
    
    const key = prompt('Field name:');
    if (key && key.trim()) {
      setLocalState((prev: any) => ({
        ...prev,
        fields: { ...prev.fields, [key.trim()]: '' }
      }));
    }
  };

  const handleUpdateCharacterField = (key: string, value: string) => {
    setLocalState((prev: any) => ({
      ...prev,
      fields: { ...prev.fields, [key]: value }
    }));
  };

  const handleDeleteCharacterField = (key: string) => {
    setLocalState((prev: any) => {
      const newFields = { ...prev.fields };
      delete newFields[key];
      return { ...prev, fields: newFields };
    });
  };

  const handleAddCustomTag = () => {
    if (modal?.type !== 'star') return;
    
    const tag = prompt('Custom tag:');
    if (tag && tag.trim()) {
      setLocalState((prev: any) => ({
        ...prev,
        tags: {
          ...prev.tags,
          custom: [...(prev.tags.custom || []), tag.trim()]
        }
      }));
    }
  };

  const handleDeleteCustomTag = (index: number) => {
    setLocalState((prev: any) => ({
      ...prev,
      tags: {
        ...prev.tags,
        custom: prev.tags.custom.filter((_: string, i: number) => i !== index)
      }
    }));
  };

  const toggleDialogue = (index: number) => {
    setExpandedDialogues(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  if (!isOpen || !currentEntity) return null;

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            {isTabReadOnly ? 'View' : 'Edit'} {modal.type === 'tab' ? 'Draft Tab' :
                 modal.type === 'character' ? `Character: ${(currentEntity as any).name}` :
                 modal.type === 'star' ? `Star: ${(currentEntity as any).title}` : ''}
            {isTabReadOnly && <span className="text-muted"> (Read Only)</span>}
          </h3>
          <button className="icon-button" onClick={closeModal}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {modal.type === 'tab' && (
            <div className="tab-editor">
              {/* Timeline Events */}
              <div className="section mb-6">
                <div className="section-header-with-action">
                  <h4>Timeline Events</h4>
                  {!isTabReadOnly && (
                    <button 
                      className="button button-secondary"
                      onClick={handleAddTimelineEvent}
                    >
                      <Plus size={16} />
                      Add Event
                    </button>
                  )}
                </div>
                
                <div className="timeline-events">
                  {(localState.timeline || []).map((event: any, index: number) => (
                    <div key={index} className="timeline-event-editor">
                      <div className="event-header">
                        <span className="event-number">#{index + 1}</span>
                        {!isTabReadOnly && (
                          <button 
                            className="icon-button"
                            onClick={() => handleDeleteTimelineEvent(index)}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      
                      <div className="event-fields">
                        <div className="field">
                          <label>Event</label>
                          <TextareaAutosize
                            className="textarea"
                            placeholder="What happens..."
                            value={event.text}
                            onChange={(e) => handleUpdateTimelineEvent(index, { text: e.target.value })}
                            minRows={1}
                            readOnly={isTabReadOnly}
                          />
                        </div>
                        
                        <div className="field">
                          <button
                            type="button"
                            className="collapsible-label"
                            onClick={() => toggleDialogue(index)}
                          >
                            <MessageSquare size={14} />
                            <span>Dialogue</span>
                            {expandedDialogues.has(index) ? 
                              <ChevronUp size={14} /> : 
                              <ChevronDown size={14} />
                            }
                          </button>
                          {expandedDialogues.has(index) && (
                            <TextareaAutosize
                              className="textarea"
                              placeholder="What they say..."
                              value={event.dialogue || ''}
                              onChange={(e) => handleUpdateTimelineEvent(index, { dialogue: e.target.value })}
                              minRows={2}
                              readOnly={isTabReadOnly}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {(localState.timeline || []).length === 0 && (
                    <div className="empty-state">
                      <p className="text-muted">No timeline events yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Descriptions */}
              <div className="section mb-6">
                <div className="section-header-with-action">
                  <h4>Descriptions & Notes</h4>
                  {!isTabReadOnly && (
                    <button 
                      className="button button-secondary"
                      onClick={handleAddDescription}
                    >
                      <Plus size={16} />
                      Add Description
                    </button>
                  )}
                </div>
                
                <div className="descriptions">
                  {(localState.descriptions || []).map((desc: any, index: number) => (
                    <div key={index} className="description-editor">
                      <div className="description-header">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={desc.is_important}
                            onChange={(e) => handleUpdateDescription(index, { is_important: e.target.checked })}
                            disabled={isTabReadOnly}
                          />
                          Important
                        </label>
                        {!isTabReadOnly && (
                          <button 
                            className="icon-button"
                            onClick={() => handleDeleteDescription(index)}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      
                      <TextareaAutosize
                        className="textarea"
                        placeholder="Description or note..."
                        value={desc.text}
                        onChange={(e) => handleUpdateDescription(index, { text: e.target.value })}
                        minRows={2}
                        readOnly={isTabReadOnly}
                      />
                    </div>
                  ))}
                  
                  {(localState.descriptions || []).length === 0 && (
                    <div className="empty-state">
                      <p className="text-muted">No descriptions yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="section">
                <h4>Summary</h4>
                <TextareaAutosize
                  className="textarea"
                  placeholder="What does this draft tab achieve narratively? (LLM can generate this)"
                  value={localState.summary || ''}
                  onChange={(e) => setLocalState((prev: any) => ({ ...prev, summary: e.target.value }))}
                  minRows={3}
                />
              </div>
            </div>
          )}

          {modal.type === 'character' && (
            <div className="character-editor">
              <div className="field mb-4">
                <label>Name</label>
                <input
                  type="text"
                  className="input"
                  value={localState.name || ''}
                  onChange={(e) => setLocalState((prev: any) => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="section">
                <div className="section-header-with-action">
                  <h4>Character Fields</h4>
                  <button 
                    className="button button-secondary"
                    onClick={handleAddCharacterField}
                  >
                    <Plus size={16} />
                    Add Field
                  </button>
                </div>
                
                <div className="character-fields">
                  {Object.entries(localState.fields || {}).map(([key, value]) => (
                    <div key={key} className="character-field-editor">
                      <div className="field-header">
                        <span className="field-key">{key}</span>
                        <button 
                          className="icon-button"
                          onClick={() => handleDeleteCharacterField(key)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <TextareaAutosize
                        className="textarea"
                        placeholder={`${key}...`}
                        value={value as string}
                        onChange={(e) => handleUpdateCharacterField(key, e.target.value)}
                        minRows={2}
                      />
                    </div>
                  ))}
                  
                  {Object.keys(localState.fields || {}).length === 0 && (
                    <div className="empty-state">
                      <p className="text-muted">No character fields yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {modal.type === 'star' && (
            <div className="star-editor">
              <div className="field mb-4">
                <label>Title</label>
                <input
                  type="text"
                  className="input"
                  value={localState.title || ''}
                  onChange={(e) => setLocalState((prev: any) => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="field mb-4">
                <label>Content</label>
                <TextareaAutosize
                  className="textarea"
                  placeholder="The key fact or information..."
                  value={localState.body || ''}
                  onChange={(e) => setLocalState((prev: any) => ({ ...prev, body: e.target.value }))}
                  minRows={4}
                />
              </div>

              <div className="field mb-4">
                <label>Priority ({Math.round((localState.priority || 0) * 100)}%)</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={localState.priority || 0}
                  onChange={(e) => setLocalState((prev: any) => ({ ...prev, priority: parseFloat(e.target.value) }))}
                />
              </div>

              <div className="section mb-4">
                <h4>Tags</h4>
                
                <div className="tag-fields">
                  <div className="field">
                    <label style={{ color: 'white' }}>Scope</label>
                    <select
                      className="select"
                      style={{
                        backgroundColor: '#2d3a4a', // a soothing blue-gray
                        color: '#2d3a4a',
                        border: '1px solid #4a5a6a'
                      }}
                      value={localState.tags?.scope || 'CurrentScene'}
                      onChange={(e) => setLocalState((prev: any) => ({
                        ...prev,
                        tags: { ...prev.tags, scope: e.target.value }
                      }))}
                    >
                      <option value="CurrentScene">Current Scene</option>
                      <option value="FuturePlot">Future Plot</option>
                      <option value="Backstory">Backstory</option>
                      <option value="Worldbuilding">Worldbuilding</option>
                    </select>
                  </div>

                  <div className="field">
                    <label style={{ color: 'white' }}>Status</label>
                    <select
                      className="select"
                      style={{
                        backgroundColor: '#2d3a4a', // a soothing blue-gray
                        color: '#2d3a4a',
                        border: '1px solid #4a5a6a'
                      }}
                      value={localState.tags?.status || 'Active'}
                      onChange={(e) => setLocalState((prev: any) => ({
                        ...prev,
                        tags: { ...prev.tags, status: e.target.value }
                      }))}
                    >
                      <option value="Active">Active</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Deferred">Deferred</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="section">
                <div className="section-header-with-action">
                  <h4>Custom Tags</h4>
                  <button 
                    className="button button-secondary"
                    onClick={handleAddCustomTag}
                  >
                    <Plus size={16} />
                    Add Tag
                  </button>
                </div>
                
                <div className="custom-tags">
                  {(localState.tags?.custom || []).map((tag: string, index: number) => (
                    <div key={index} className="custom-tag-editor">
                      <span className="tag">{tag}</span>
                      <button 
                        className="icon-button"
                        onClick={() => handleDeleteCustomTag(index)}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  
                  {(localState.tags?.custom || []).length === 0 && (
                    <div className="empty-state">
                      <p className="text-muted">No custom tags yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {!isTabReadOnly && (
            <button className="button button-danger" onClick={handleDelete}>
              Delete
            </button>
          )}
          <div className="modal-footer-right">
            {!isTabReadOnly && (
              <button className="button button-secondary" onClick={closeModal}>
                Cancel
              </button>
            )}
            <button className="button" onClick={handleSave}>
              {isTabReadOnly ? 'Close' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 