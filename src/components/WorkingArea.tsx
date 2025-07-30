import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useHotkeys } from 'react-hotkeys-hook';
import { Send, Plus, Edit, PlayCircle, Trash2 } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';

export const WorkingArea: React.FC = () => {
  const { 
    draftTabs, 
    isLoading, 
    sendPrompt, 
    addDraftTab, 
    openModal, 
    addToScene, 
    deleteDraftTab 
  } = useAppStore();
  
  const [promptText, setPromptText] = useState('');

  const handleSendPrompt = async () => {
    if (!promptText.trim() || isLoading) return;
    
    await sendPrompt(promptText.trim());
    setPromptText('');
  };

  useHotkeys('cmd+enter, ctrl+enter', (e) => {
    e.preventDefault();
    handleSendPrompt();
  }, { enableOnFormTags: ['textarea'] });

  const handleAddDraftTab = () => {
    addDraftTab({
      title: 'New Draft',
      content: '',
    });
  };

  return (
    <div className="panel working-area">
      <div className="panel-header">
        <h2 className="panel-title">Working Area</h2>
      </div>
      
      <div className="panel-content">
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
              disabled={isLoading}
            />
            <div className="prompt-actions">
              <button 
                className="button"
                onClick={handleSendPrompt}
                disabled={!promptText.trim() || isLoading}
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
            <h3>Draft Tabs ({draftTabs.length})</h3>
            <button 
              className="button button-secondary"
              onClick={handleAddDraftTab}
            >
              <Plus size={16} />
              New Draft
            </button>
          </div>

          <div className="draft-tabs-list">
            {draftTabs.map(tab => (
              <div key={tab.id} className="draft-tab-card card">
                <div className="tab-header">
                  <h4 className="tab-title">{tab.title}</h4>
                  {tab.metadata?.type && (
                    <span className="tab-type-badge">{tab.metadata.type}</span>
                  )}
                </div>
                
                <p className="tab-content-preview text-sm text-muted">
                  {tab.content.length > 150 
                    ? `${tab.content.substring(0, 150)}...`
                    : tab.content || 'Empty draft'
                  }
                </p>
                
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
                    onClick={() => addToScene(tab.id)}
                  >
                    <PlayCircle size={14} />
                    Add to Scene
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
                  Created: {new Date(tab.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
            
            {draftTabs.length === 0 && (
              <div className="empty-state">
                <p className="text-muted">No draft tabs yet. Send a prompt or create one manually.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 