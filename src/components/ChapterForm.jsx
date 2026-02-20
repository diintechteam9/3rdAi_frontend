import React, { useState } from 'react';
import { chapterService } from '../services/chapterService';

const ChapterForm = ({ chapter, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: chapter?.name || '',
    description: chapter?.description || '',
    shlokaCount: chapter?.shlokaCount || '',
    status: chapter?.status || 'active',
    image: null,
    clientId: chapter?.clientId || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('description', formData.description);
      data.append('shlokaCount', formData.shlokaCount);
      data.append('status', formData.status);
      data.append('clientId', formData.clientId);
      if (formData.image) data.append('image', formData.image);

      if (chapter?.id) {
        await chapterService.updateChapter(chapter.id, data);
      } else {
        await chapterService.createChapter(data);
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="p-3 border-b">
          <h2 className="text-lg font-semibold">
            {chapter?.id ? 'Edit Chapter' : 'Add Chapter'}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-3 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full p-2 border rounded text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full p-2 border rounded text-sm h-16 resize-none"
              rows="2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Shloka Count</label>
            <input
              type="number"
              value={formData.shlokaCount}
              onChange={(e) => setFormData({...formData, shlokaCount: e.target.value})}
              className="w-full p-2 border rounded text-sm"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="w-full p-2 border rounded text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFormData({...formData, image: e.target.files[0]})}
              className="w-full p-2 border rounded text-sm"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 border rounded text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChapterForm;