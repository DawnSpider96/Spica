import React from 'react';
import { Star, Plus, Trash2, Edit } from 'lucide-react';
import { useAppStore } from '../stores';

export const StarsPanel: React.FC = () => {
  const { 
    stars, 
    createStar, 
    deleteStar, 
    toggleStarChecked,
    openModal 
  } = useAppStore();

  const starsList = Object.values(stars);
  const checkedStars = starsList.filter(star => star.is_checked);
  const uncheckedStars = starsList.filter(star => !star.is_checked);

  const handleCreateStar = () => {
    createStar({
      title: 'New Star',
      body: '',
      is_checked: false,
      priority: 0
    });
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

        {/* Checked Stars */}
        {checkedStars.length > 0 && (
          <div className="stars-section">
            <h3 className="section-title">Active Stars ({checkedStars.length})</h3>
            <div className="stars-list">
              {checkedStars
                .sort((a, b) => b.priority - a.priority)
                .map(star => (
                  <div key={star.id} className={`star-card card ${star.is_checked ? 'checked' : ''}`}>
                    <div className="star-header">
                      <button 
                        className={`star-checkbox ${star.is_checked ? 'checked' : ''}`}
                        onClick={() => toggleStarChecked(star.id)}
                      >
                        <Star size={20} fill={star.is_checked ? "currentColor" : "none"} />
                      </button>
                      <h4 className="star-title">{star.title}</h4>
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
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Unchecked Stars */}
        {uncheckedStars.length > 0 && (
          <div className="stars-section">
            <h3 className="section-title">All Stars ({uncheckedStars.length})</h3>
            <div className="stars-list">
              {uncheckedStars
                .sort((a, b) => b.created_at - a.created_at)
                .map(star => (
                  <div key={star.id} className={`star-card card ${star.is_checked ? 'checked' : ''}`}>
                    <div className="star-header">
                      <button 
                        className={`star-checkbox ${star.is_checked ? 'checked' : ''}`}
                        onClick={() => toggleStarChecked(star.id)}
                      >
                        <Star size={20} fill={star.is_checked ? "currentColor" : "none"} />
                      </button>
                      <h4 className="star-title">{star.title}</h4>
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
                  </div>
                ))}
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