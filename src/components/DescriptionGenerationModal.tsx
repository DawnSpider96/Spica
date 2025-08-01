import React, { useState } from 'react';
import { X, Send, Loader } from 'lucide-react';
import { LLMService } from '../services/llmService';
import type { Scene, Character, Star, DraftTab } from '../types';

interface DescriptionGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (description: string) => void;
  targetEvent: {
    text: string;
    dialogue?: string;
  };
  contextParams: {
    scene: Scene;
    characters: Character[];
    checkedStars: Star[];
    recentTabs: DraftTab[];
  };
}

export const DescriptionGenerationModal: React.FC<DescriptionGenerationModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  targetEvent,
  contextParams
}) => {
  const [promptText, setPromptText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!promptText.trim()) return;

    setIsGenerating(true);
    try {
      const response = await LLMService.generateEventDescription(
        targetEvent,
        promptText,
        contextParams
      );
      
      onGenerate(response.description);
      onClose();
    } catch (error) {
      console.error('Failed to generate description:', error);
      alert(`Failed to generate description: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleGenerate();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content description-generation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Generate Event Description</h3>
          <button 
            className="icon-button"
            onClick={onClose}
            disabled={isGenerating}
          >
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="target-event-info">
            <h4>Target Event:</h4>
            <div className="event-preview">
              <p className="event-text">{targetEvent.text}</p>
              {targetEvent.dialogue && (
                <p className="event-dialogue">"{targetEvent.dialogue}"</p>
              )}
            </div>
          </div>

          <div className="prompt-section">
            <label htmlFor="prompt-input">Your Prompt:</label>
            <textarea
              id="prompt-input"
              className="prompt-textarea"
              placeholder="Describe what kind of description you want for this event..."
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isGenerating}
              rows={4}
            />
            <div className="prompt-hint">
              <small>
                Tip: Press Ctrl+Enter (or Cmd+Enter) to generate
              </small>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="button button-secondary"
            onClick={onClose}
            disabled={isGenerating}
          >
            Cancel
          </button>
          <button 
            className="button button-primary"
            onClick={handleGenerate}
            disabled={!promptText.trim() || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader size={16} className="spinner" />
                Generating...
              </>
            ) : (
              <>
                <Send size={16} />
                Generate Description
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}; 