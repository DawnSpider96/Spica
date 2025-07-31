import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../stores';
import { X, User, Brain, MessageCircle, Heart, Users, Zap } from 'lucide-react';

interface EventContextMenuProps {
  eventId: string;
  tabId: string;
  eventText: string;
  position: { x: number; y: number };
  onClose: () => void;
}

const CONSTRAINT_TYPES = [
  { id: 'character_behavior', label: 'Behavior', icon: Brain, description: 'How character acts in situations' },
  { id: 'character_dialogue', label: 'Dialogue', icon: MessageCircle, description: 'How character speaks/language patterns' },
  { id: 'character_emotion', label: 'Emotional', icon: Heart, description: 'How character processes/expresses emotions' },
  { id: 'character_social', label: 'Social', icon: Users, description: 'How character interacts with others' },
  { id: 'character_physical', label: 'Physical', icon: Zap, description: 'Physical capabilities/limitations' }
] as const;

export const EventContextMenu: React.FC<EventContextMenuProps> = ({
  eventId,
  tabId,
  eventText,
  position,
  onClose
}) => {
  const { 
    characters, 
    detectCharactersInEvent, 
    createCharacterConstraint, 
    createStar 
  } = useAppStore();
  
  const [showConstraintForm, setShowConstraintForm] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [constraintType, setConstraintType] = useState<typeof CONSTRAINT_TYPES[number]['id']>('character_behavior');
  const [constraintTitle, setConstraintTitle] = useState('');
  const [constraintDescription, setConstraintDescription] = useState('');
  const [situationContext, setSituationContext] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [menuPosition, setMenuPosition] = useState(position);
  
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Smart positioning function
  const getSmartPosition = (pos: { x: number; y: number }, isForm: boolean) => {
    const menuWidth = isForm ? 500 : 300;
    const menuHeight = isForm ? 600 : 200;
    const padding = 20;
    
    let x = pos.x;
    let y = pos.y;
    
    // Adjust for right edge
    if (x + menuWidth > window.innerWidth - padding) {
      x = window.innerWidth - menuWidth - padding;
    }
    
    // Adjust for left edge
    if (x < padding) {
      x = padding;
    }
    
    // Adjust for bottom edge
    if (y + menuHeight > window.innerHeight - padding) {
      y = window.innerHeight - menuHeight - padding;
    }
    
    // Adjust for top edge
    if (y < padding) {
      y = padding;
    }
    
    return { x, y };
  };
  
  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!showConstraintForm) return; // Only draggable in form mode
    
    setIsDragging(true);
    const rect = menuRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !showConstraintForm) return;
    
    const newPosition = {
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    };
    
    setMenuPosition(newPosition);
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Add/remove global mouse handlers for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);
  
  // Detect characters in event text
  const detectedCharacterIds = detectCharactersInEvent(eventText);
  const detectedCharacters = detectedCharacterIds.map((id: string) => characters[id]).filter(Boolean);
  const allCharacters = Object.values(characters);
  
  // Set first detected character as default
  useEffect(() => {
    if (detectedCharacterIds.length > 0 && !selectedCharacter) {
      setSelectedCharacter(detectedCharacterIds[0]);
    }
  }, [detectedCharacterIds, selectedCharacter]);
  
  // Smart positioning on mount
  useEffect(() => {
    const smartPosition = getSmartPosition(position, showConstraintForm);
    setMenuPosition(smartPosition);
  }, [position, showConstraintForm]);
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);
  
  const handleCreateConstraint = () => {
    if (!selectedCharacter || !constraintTitle.trim() || !constraintDescription.trim()) {
      return;
    }
    
    createCharacterConstraint(eventId, tabId, selectedCharacter, {
      type: constraintType,
      title: constraintTitle.trim(),
      description: constraintDescription.trim(),
      situationContext: situationContext.trim() || undefined,
      constraintTags: situationContext.trim() ? [situationContext.trim()] : []
    });
    
    onClose();
  };
  
  const handleCreateGeneralNote = () => {
    createStar({
      title: `Note: ${eventText.substring(0, 30)}...`,
      body: `Related to event: "${eventText}"`,
      tags: {
        characters: detectedCharacterIds,
        scope: 'CurrentScene',
        status: 'Active',
        custom: []
      },
      priority: 0.5,
      is_checked: true,
      origin_draft_tab_id: tabId
    });
    
    onClose();
  };
  
  if (showConstraintForm) {
    return (
      <div 
        ref={menuRef}
        className={`event-context-menu constraint-form ${isDragging ? 'dragging' : ''}`}
        style={{
          position: 'fixed',
          left: menuPosition.x,
          top: menuPosition.y,
          zIndex: 1000,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      >
        <div 
          className="context-menu-header draggable-header"
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <h3>Add Character Constraint</h3>
          <div className="header-actions">
            <span className="drag-hint text-xs text-muted">↕ Drag to move</span>
            <button onClick={onClose} className="icon-button">
              <X size={16} />
            </button>
          </div>
        </div>
        
        <div className="constraint-form-content">
          {/* Event Reference */}
          <div className="event-reference">
            <label className="text-xs text-muted">Event:</label>
            <p className="text-sm">{eventText}</p>
          </div>
          
          {/* Character Selection */}
          <div className="form-group">
            <label>Character</label>
            <select 
              value={selectedCharacter} 
              onChange={(e) => setSelectedCharacter(e.target.value)}
              className="form-control"
            >
              <option value="">Select character...</option>
              {detectedCharacters.length > 0 && (
                <optgroup label="Detected in Event">
                  {detectedCharacters.map((char: any) => (
                    <option key={char.id} value={char.id}>{char.name}</option>
                  ))}
                </optgroup>
              )}
              <optgroup label="All Characters">
                {allCharacters.map(char => (
                  <option key={char.id} value={char.id}>{char.name}</option>
                ))}
              </optgroup>
            </select>
          </div>
          
          {/* Constraint Type */}
          <div className="form-group">
            <label>Constraint Type</label>
            <div className="constraint-types">
              {CONSTRAINT_TYPES.map(type => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    className={`constraint-type-button ${constraintType === type.id ? 'active' : ''}`}
                    onClick={() => setConstraintType(type.id)}
                  >
                    <Icon size={16} />
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="constraint-type-description text-xs text-muted">
              {CONSTRAINT_TYPES.find(t => t.id === constraintType)?.description}
            </p>
          </div>
          
          {/* Constraint Title */}
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={constraintTitle}
              onChange={(e) => setConstraintTitle(e.target.value)}
              placeholder="e.g., Avoids confrontation when upset"
              className="form-control"
            />
          </div>
          
          {/* Constraint Description */}
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={constraintDescription}
              onChange={(e) => setConstraintDescription(e.target.value)}
              placeholder="Describe the character constraint in detail..."
              className="form-control"
              rows={3}
            />
          </div>
          
          {/* Situation Context */}
          <div className="form-group">
            <label>Situation Context <span className="text-muted">(optional)</span></label>
            <input
              type="text"
              value={situationContext}
              onChange={(e) => setSituationContext(e.target.value)}
              placeholder="e.g., when angry, in public, with authority"
              className="form-control"
            />
          </div>
          
          {/* Actions */}
          <div className="form-actions">
            <button 
              onClick={() => setShowConstraintForm(false)}
              className="btn btn-secondary"
            >
              Back
            </button>
            <button 
              onClick={handleCreateConstraint}
              className="btn btn-primary"
              disabled={!selectedCharacter || !constraintTitle.trim() || !constraintDescription.trim()}
            >
              Create Constraint
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      ref={menuRef}
      className="event-context-menu"
      style={{
        position: 'fixed',
        left: menuPosition.x,
        top: menuPosition.y,
        zIndex: 1000
      }}
    >
      <div className="context-menu-header">
        <h4>Event Actions</h4>
        <button onClick={onClose} className="icon-button">
          <X size={14} />
        </button>
      </div>
      
      <div className="context-menu-options">
        <button 
          className="context-menu-option"
          onClick={() => setShowConstraintForm(true)}
        >
          <Brain size={16} />
          <div>
            <div>Add Character Constraint</div>
            <div className="text-xs text-muted">Create behavioral rule for character</div>
          </div>
        </button>
        
        <button 
          className="context-menu-option"
          onClick={handleCreateGeneralNote}
        >
          <User size={16} />
          <div>
            <div>Create General Note</div>
            <div className="text-xs text-muted">Add star about this event</div>
          </div>
        </button>
      </div>
      
      {detectedCharacters.length > 0 && (
        <div className="detected-characters">
          <div className="text-xs text-muted">Detected characters:</div>
          <div className="character-tags">
            {detectedCharacters.map((char: any) => (
              <span key={char.id} className="character-tag">
                {char.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 