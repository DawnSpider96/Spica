import React from 'react';
import { Star, Plus, Trash2, Edit, Brain, MessageCircle, Heart, Users, Zap } from 'lucide-react';
import { useAppStore } from '../stores';

const CONSTRAINT_ICONS = {
  character_behavior: Brain,
  character_dialogue: MessageCircle,
  character_emotion: Heart,
  character_social: Users,
  character_physical: Zap
} as const;

export const StarsPanel: React.FC = () => {
  const { 
    stars, 
    characters,
    createStar, 
    deleteStar, 
    toggleStarChecked,
    openModal 
  } = useAppStore();

  const starsList = Object.values(stars);
  const checkedStars = starsList.filter(star => star.is_checked);
  const uncheckedStars = starsList.filter(star => !star.is_checked);
  
  // Separate constraint stars from regular stars
  const checkedConstraints = checkedStars.filter(star => star.constraint_type);
  const checkedRegular = checkedStars.filter(star => !star.constraint_type);
  const uncheckedConstraints = uncheckedStars.filter(star => star.constraint_type);
  const uncheckedRegular = uncheckedStars.filter(star => !star.constraint_type);
  
  const getCharacterName = (characterId: string) => {
    return characters[characterId]?.name || 'Unknown Character';
  };

  const handleCreateStar = () => {
    createStar({
      title: 'New Star',
      body: '',
      tags: {
        characters: [],
        scope: 'CurrentScene',
        status: 'Active',
        custom: []
      },
      is_checked: false,
      priority: 0
    });
  };
  
  const renderStarCard = (star: any) => {
    const isConstraint = !!star.constraint_type;
    const ConstraintIcon = star.constraint_type ? CONSTRAINT_ICONS[star.constraint_type] : null;
    
    return (
      <div key={star.id} className={`star-card card ${star.is_checked ? 'checked' : ''} ${isConstraint ? 'constraint-star' : ''}`}>
                  <div className="star-header">
            <button 
              className={`star-checkbox ${star.is_checked ? 'checked' : ''}`}
              onClick={() => toggleStarChecked(star.id)}
            >
              <Star size={20} fill={star.is_checked ? "currentColor" : "none"} />
            </button>
            
            <div className="star-title-section">
              <div className="star-title">
                {isConstraint && ConstraintIcon && (
                  <ConstraintIcon size={16} className="constraint-icon" />
                )}
                {star.title}
                {isConstraint && star.applies_to_character && (
                  <span className="constraint-character-badge">
                    {getCharacterName(star.applies_to_character)}
                  </span>
                )}
              </div>
              
              {isConstraint && star.situation_context && (
                <div className="constraint-situation-tags">
                  <span className="constraint-situation-tag">
                    {star.situation_context}
                  </span>
                </div>
              )}
            </div>
            
            <div className="star-meta">
              <span className="star-priority" style={{ opacity: star.priority }}>
                {Math.round(star.priority * 100)}%
              </span>
              <button 
                className="edit-button"
                onClick={() => openModal('star', star.id)}
              >
                <Edit size={16} />
              </button>
              <button 
                className="edit-button delete-button"
                onClick={() => deleteStar(star.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        
        {star.body && (
          <p className="star-content text-sm text-muted">
            {star.body.length > 80 ? 
              `${star.body.substring(0, 80)}...` : 
              star.body
            }
          </p>
        )}
        
        {isConstraint && star.source_event && (
          <div className="constraint-source">
            <span className="text-xs text-muted">
              From: "{star.source_event.event_text.substring(0, 50)}..."
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="panel stars-panel">
      <div className="panel-header">
        <h2 className="panel-title">Stars</h2>
      </div>

      <div className="panel-content">
        {/* Create New Star Button */}
        <div className="stars-create-section">
          <button 
            className="button button-primary"
            onClick={handleCreateStar}
          >
            <Plus size={16} />
            Add Star
          </button>
        </div>

        {/* Character Constraints */}
        {checkedConstraints.length > 0 && (
          <div className="stars-section">
            <h3 className="section-title">Character Constraints ({checkedConstraints.length})</h3>
            <div className="stars-list">
              {checkedConstraints
                .sort((a, b) => b.priority - a.priority)
                .map(renderStarCard)}
            </div>
          </div>
        )}

        {/* Active Stars */}
        {checkedRegular.length > 0 && (
          <div className="stars-section">
            <h3 className="section-title">Active Stars ({checkedRegular.length})</h3>
            <div className="stars-list">
              {checkedRegular
                .sort((a, b) => b.priority - a.priority)
                .map(renderStarCard)}
            </div>
          </div>
        )}

        {/* Inactive Constraints */}
        {uncheckedConstraints.length > 0 && (
          <div className="stars-section">
            <h3 className="section-title">Inactive Constraints ({uncheckedConstraints.length})</h3>
            <div className="stars-list">
              {uncheckedConstraints
                .sort((a, b) => b.created_at - a.created_at)
                .map(renderStarCard)}
            </div>
          </div>
        )}

        {/* All Stars */}
        {uncheckedRegular.length > 0 && (
          <div className="stars-section">
            <h3 className="section-title">All Stars ({uncheckedRegular.length})</h3>
            <div className="stars-list">
              {uncheckedRegular
                .sort((a, b) => b.created_at - a.created_at)
                .map(renderStarCard)}
            </div>
          </div>
        )}

        {starsList.length === 0 && (
          <div className="empty-state">
            <p className="text-muted">
              No stars yet. Create stars to track important story elements and facts.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}; 