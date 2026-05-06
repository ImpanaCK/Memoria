import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Folder, Image as ImageIcon, Trash2, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedAlbums, setSelectedAlbums] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAlbums();
    }
  }, [user]);

  const fetchAlbums = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('albums')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlbums(data || []);
    } catch (error) {
      console.error('Error fetching albums:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlbum = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setIsSubmitting(true);
      const { data, error } = await supabase
        .from('albums')
        .insert([
          { 
            name: title, 
            description: description,
            user_id: user.id 
          }
        ])
        .select();

      if (error) throw error;
      
      setAlbums([data[0], ...albums]);
      setTitle('');
      setDescription('');
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error creating album:', error.message);
      alert('Failed to create album. Make sure the table exists in Supabase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedAlbums([]);
  };

  const handleAlbumClick = (album) => {
    if (isSelectionMode) {
      const isSelected = selectedAlbums.some(a => a.id === album.id);
      if (isSelected) {
        setSelectedAlbums(prev => prev.filter(a => a.id !== album.id));
      } else {
        setSelectedAlbums(prev => [...prev, album]);
      }
    } else {
      navigate(`/album/${album.id}`);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAlbums.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedAlbums.length} albums? All photos inside them will be permanently deleted.`)) return;

    setIsBulkDeleting(true);
    
    // We will keep track of successfully deleted album IDs to update the UI
    const successfullyDeletedIds = [];

    try {
      for (const album of selectedAlbums) {
        try {
          // 1. Fetch all photos for this specific album
          const { data: photos, error: fetchPhotosError } = await supabase
            .from('photos')
            .select('image_url')
            .eq('album_id', album.id);

          if (fetchPhotosError) throw fetchPhotosError;

          // 2. Extract file paths and delete from storage
          if (photos && photos.length > 0) {
            const filePaths = photos.map(photo => {
              const urlParts = photo.image_url.split('/public/photos/');
              return urlParts.length === 2 ? urlParts[1] : null;
            }).filter(Boolean);

            if (filePaths.length > 0) {
              const { error: storageError } = await supabase.storage
                .from('photos')
                .remove(filePaths);

              if (storageError) {
                 console.error("Storage deletion error for album", album.id, ":", storageError);
              }
            }
          }

          // 3. Delete photos from DB for this album
          await supabase
            .from('photos')
            .delete()
            .eq('album_id', album.id);

          // 4. Final Album Delete explicitly using .match() as requested
          const { error } = await supabase
            .from('albums')
            .delete()
            .match({ id: album.id });

          // 5. Error Alert
          if (error) {
            alert(`Failed to delete album "${album.name}": ${error.message}`);
            console.error(error);
          } else {
            // Only add to successful array if no error
            successfullyDeletedIds.push(album.id);
          }
        } catch (albumError) {
          console.error(`Error processing album ${album.id}:`, albumError.message);
          alert(`Error processing album "${album.name}": ${albumError.message}`);
        }
      }

      // 6. State Update: Ensure setAlbums is called ONLY after DB confirms
      if (successfullyDeletedIds.length > 0) {
        setAlbums(prev => prev.filter(a => !successfullyDeletedIds.includes(a.id)));
      }
      
      setSelectedAlbums([]);
      setIsSelectionMode(false);

    } catch (error) {
      console.error("Critical error during bulk deletion:", error.message);
      alert(`Critical error: ${error.message}`);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6">
          <div className="flex flex-wrap items-center gap-4">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-3xl font-bold text-white mr-2"
            >
              My Albums
            </motion.h1>
            
            {albums.length > 0 && (
              <button 
                onClick={toggleSelectionMode}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  isSelectionMode 
                    ? 'bg-slate-800 text-white border-slate-700' 
                    : 'bg-transparent text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                {isSelectionMode ? 'Cancel' : 'Select Albums'}
              </button>
            )}

            <AnimatePresence>
              {isSelectionMode && selectedAlbums.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="flex items-center gap-2 bg-red-600/90 hover:bg-red-500 disabled:bg-red-600/50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-lg"
                >
                  {isBulkDeleting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {isBulkDeleting ? 'Deleting...' : `Delete (${selectedAlbums.length})`}
                </motion.button>
              )}
            </AnimatePresence>

            <button
              onClick={() => setIsModalOpen(true)}
              disabled={isSelectionMode}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 disabled:bg-primary-600/50 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-primary-600/20 ml-auto md:ml-0"
            >
              <Plus className="w-4 h-4" />
              New Album
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {user?.user_metadata?.avatar_url && (
                <img src={user.user_metadata.avatar_url} alt="Profile" className="w-10 h-10 rounded-full border border-slate-700" />
              )}
              <div className="text-sm hidden md:block">
                <p className="font-medium text-white">{user?.user_metadata?.full_name || user?.email}</p>
              </div>
            </div>
            <button 
              onClick={signOut}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors border border-slate-700"
            >
              Sign Out
            </button>
          </div>
        </header>

        <main>
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : albums.length === 0 ? (
            <div className="text-slate-500 text-center py-20 border-2 border-dashed border-slate-800 rounded-2xl">
              <Folder className="w-12 h-12 mx-auto mb-4 text-slate-600" />
              <h3 className="text-lg font-medium text-slate-300 mb-2">No albums yet</h3>
              <p className="mb-6">Create your first album to start organizing your memories.</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-slate-100"
              >
                <Plus className="w-4 h-4" />
                Create Album
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {albums.map((album, index) => {
                const isSelected = selectedAlbums.some(a => a.id === album.id);
                
                return (
                  <motion.div
                    key={album.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleAlbumClick(album)}
                    className={`group relative bg-slate-900 border-2 rounded-2xl overflow-hidden transition-all cursor-pointer ${
                      isSelectionMode && isSelected 
                        ? 'border-primary-500 scale-[0.98]' 
                        : 'border-slate-800 hover:border-primary-500/50'
                    }`}
                  >
                    <div className="aspect-[4/3] bg-slate-800 relative overflow-hidden">
                      {album.cover_image_url ? (
                        <img 
                          src={album.cover_image_url} 
                          alt={album.name}
                          className={`w-full h-full object-cover transition-transform duration-500 ${
                            isSelectionMode ? '' : 'group-hover:scale-105'
                          }`}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                          <ImageIcon className="w-12 h-12 opacity-50" />
                        </div>
                      )}
                      
                      {!isSelectionMode && (
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}

                      {/* Selection Overlay */}
                      <AnimatePresence>
                        {isSelectionMode && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={`absolute inset-0 transition-colors ${
                              isSelected ? 'bg-primary-500/20' : 'bg-black/40 hover:bg-black/60'
                            }`}
                          >
                            <div className="absolute top-4 left-4">
                              <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                                isSelected ? 'bg-primary-500 text-white' : 'bg-white/50 text-transparent border border-white'
                              }`}>
                                <Check className="w-4 h-4" />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="p-5 relative z-10 bg-slate-900">
                      <h3 className="text-lg font-medium text-white mb-1 truncate">{album.name}</h3>
                      <p className="text-sm text-slate-400 line-clamp-2">
                        {album.description || 'No description provided.'}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Create Album Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-800">
                <h2 className="text-xl font-semibold text-white">Create New Album</h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleCreateAlbum} className="p-6">
                <div className="mb-4">
                  <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-2">
                    Album Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="e.g. Summer Vacation 2026"
                  />
                </div>
                
                <div className="mb-6">
                  <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none h-24"
                    placeholder="Where did you go? What was the occasion?"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !title.trim()}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium bg-primary-600 hover:bg-primary-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSubmitting && (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                    Create Album
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
