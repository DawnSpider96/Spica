import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { X } from 'lucide-react';

export const ModalEditor: React.FC = () => {
  const { 
    ui,
    draftTabs,
    blueprint,
    closeModal,
    updateDraftTab,
    deleteDraftTab,
    updateCharacter,
    deleteCharacter,
    updateStar,
    deleteStar
  } = useAppStore();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    name: '',
    description: '',
    tags: '',
  });

  const activeModal = ui.activeModal;
  const isOpen = !!activeModal;

  // Load data when modal opens
  useEffect(() => {
    if (!activeModal) {
      setFormData({ title: '', content: '', name: '', description: '', tags: '' });
      return;
    }

    const { type, id } = activeModal;

    if (type === 'tab') {
      const tab = draftTabs.find(t => t.id === id);
      if (tab) {
        setFormData({
          title: tab.title,
          content: tab.content,
          name: '',
          description: '',
          tags: '',
        });
      }
    } else if (type === 'character') {
      const character = blueprint.characters.find(c => c.id === id);
      if (character) {
        setFormData({
          title: '',
          content: '',
          name: character.name,
          description: character.description,
          tags: character.tags?.join(', ') || '',
        });
      }
    } else if (type === 'star') {
      const star = blueprint.stars.find(s => s.id === id);
      if (star) {
        setFormData({
          title: star.title,
          content: star.content,
          name: '',
          description: '',
          tags: star.tags?.join(', ') || '',
        });
      }
    }
  }, [activeModal, draftTabs, blueprint]);

  const handleSave = () => {
    if (!activeModal) return;

    const { type, id } = activeModal;

    if (type === 'tab') {
      updateDraftTab(id, {
        title: formData.title,
        content: formData.content,
      });
    } else if (type === 'character') {
      updateCharacter(id, {
        name: formData.name,
        description: formData.description,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      });
    } else if (type === 'star') {
      updateStar(id, {
        title: formData.title,
        content: formData.content,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      });
    }

    closeModal();
  };

  const handleDelete = () => {
    if (!activeModal) return;

    const confirmed = window.confirm('Are you sure you want to delete this item?');
    if (!confirmed) return;

    const { type, id } = activeModal;

    if (type === 'tab') {
      deleteDraftTab(id);
    } else if (type === 'character') {
      deleteCharacter(id);
    } else if (type === 'star') {
      deleteStar(id);
    }

    closeModal();
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  const getModalTitle = () => {
    if (!activeModal) return '';
    
    switch (activeModal.type) {
      case 'tab': return 'Edit Draft Tab';
      case 'character': return 'Edit Character';
      case 'star': return 'Edit Note';
      default: return 'Edit Item';
    }
  };

  return (
    <div className="modal-backdrop" onClick={closeModal}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{getModalTitle()}</h3>
          <button className="icon-button" onClick={closeModal}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Tab Editor */}
          {activeModal?.type === 'tab' && (
            <>
              <div className="form-field mb-4">
                <label className="form-label">Title</label>
                <input
                  className="input"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Enter title..."
                />
              </div>
              <div className="form-field mb-4">
                <label className="form-label">Content</label>
                <textarea
                  className="textarea"
                  value={formData.content}
                  onChange={(e) => handleChange('content', e.target.value)}
                  placeholder="Enter content..."
                  rows={12}
                />
              </div>
            </>
          )}

          {/* Character Editor */}
          {activeModal?.type === 'character' && (
            <>
              <div className="form-field mb-4">
                <label className="form-label">Name</label>
                <input
                  className="input"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Character name..."
                />
              </div>
              <div className="form-field mb-4">
                <label className="form-label">Description</label>
                <textarea
                  className="textarea"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Character description..."
                  rows={8}
                />
              </div>
              <div className="form-field mb-4">
                <label className="form-label">Tags (comma-separated)</label>
                <input
                  className="input"
                  value={formData.tags}
                  onChange={(e) => handleChange('tags', e.target.value)}
                  placeholder="protagonist, hero, warrior..."
                />
              </div>
            </>
          )}

          {/* Star Editor */}
          {activeModal?.type === 'star' && (
            <>
              <div className="form-field mb-4">
                <label className="form-label">Title</label>
                <input
                  className="input"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Note title..."
                />
              </div>
              <div className="form-field mb-4">
                <label className="form-label">Content</label>
                <textarea
                  className="textarea"
                  value={formData.content}
                  onChange={(e) => handleChange('content', e.target.value)}
                  placeholder="Note content..."
                  rows={8}
                />
              </div>
              <div className="form-field mb-4">
                <label className="form-label">Tags (comma-separated)</label>
                <input
                  className="input"
                  value={formData.tags}
                  onChange={(e) => handleChange('tags', e.target.value)}
                  placeholder="important, plot, character-development..."
                />
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button 
            className="button button-danger"
            onClick={handleDelete}
          >
            Delete
          </button>
          <button 
            className="button button-secondary"
            onClick={closeModal}
          >
            Cancel
          </button>
          <button 
            className="button"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}; 