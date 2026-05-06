import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Upload, Image as ImageIcon, Loader2, X, Trash2, CheckSquare, Square, Check, Star } from 'lucide-react';

export default function Album() {
  const { id } = useParams();
  const { user } = useAuth();
  
  const [album, setAlbum] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Single Photo View State
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSettingCover, setIsSettingCover] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Bulk Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user && id) {
      fetchAlbumDetails();
      fetchPhotos();
    }
  }, [user, id]);

  const fetchAlbumDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('albums')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      setAlbum(data);
    } catch (error) {
      console.error("Error fetching album details:", error.message);
    }
  };

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('album_id', id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error("Error fetching photos:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);
    
    try {
      const uploadPromises = files.map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('photos')
          .getPublicUrl(filePath);

        const imageUrl = publicUrlData.publicUrl;

        const { data: photoData, error: dbError } = await supabase
          .from('photos')
          .insert([
            {
              album_id: id,
              user_id: user.id,
              image_url: imageUrl
            }
          ])
          .select()
          .single();

        if (dbError) throw dbError;
        
        if (photos.length === 0 && uploadPromises.length === 1) {
           await supabase
            .from('albums')
            .update({ cover_image_url: imageUrl })
            .eq('id', id);
        }

        return photoData;
      });

      const newPhotos = await Promise.all(uploadPromises);
      setPhotos(prev => [...newPhotos, ...prev]);
      
      if (photos.length === 0) {
        fetchAlbumDetails();
      }

    } catch (error) {
      console.error("Error uploading photos:", error.message);
      alert(`Failed to upload photos: ${error.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!selectedPhoto) return;
    if (!window.confirm("Are you sure you want to delete this photo?")) return;

    setIsDeleting(true);
    try {
      const urlParts = selectedPhoto.image_url.split('/public/photos/');
      if (urlParts.length !== 2) throw new Error("Could not parse file path from URL.");
      const filePath = urlParts[1];

      const { error: storageError } = await supabase.storage
        .from('photos')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', selectedPhoto.id);

      if (dbError) throw dbError;

      setPhotos(prev => prev.filter(p => p.id !== selectedPhoto.id));
      setSelectedPhoto(null);

    } catch (error) {
      console.error("Error deleting photo:", error.message);
      alert(`Failed to delete photo: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetCover = async () => {
    if (!selectedPhoto) return;
    setIsSettingCover(true);
    try {
      const { error } = await supabase
        .from('albums')
        .update({ cover_image_url: selectedPhoto.image_url })
        .eq('id', id);

      if (error) throw error;
      
      setAlbum(prev => ({ ...prev, cover_image_url: selectedPhoto.image_url }));
      
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error("Error setting cover:", error.message);
      alert("Failed to set cover image.");
    } finally {
      setIsSettingCover(false);
    }
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedPhotos([]); // Clear selection when toggling
  };

  const handlePhotoClick = (photo) => {
    if (isSelectionMode) {
      const isSelected = selectedPhotos.some(p => p.id === photo.id);
      if (isSelected) {
        setSelectedPhotos(prev => prev.filter(p => p.id !== photo.id));
      } else {
        setSelectedPhotos(prev => [...prev, photo]);
      }
    } else {
      setSelectedPhoto(photo);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPhotos.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedPhotos.length} photos?`)) return;

    setIsBulkDeleting(true);
    try {
      // 1. Extract file paths
      const filePaths = selectedPhotos.map(photo => {
        const urlParts = photo.image_url.split('/public/photos/');
        if (urlParts.length !== 2) throw new Error("Could not parse file path from URL.");
        return urlParts[1];
      });

      // 2. Storage Removal
      const { error: storageError } = await supabase.storage
        .from('photos')
        .remove(filePaths);

      if (storageError) throw storageError;

      // 3. Database Removal
      const selectedIds = selectedPhotos.map(p => p.id);
      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .in('id', selectedIds);

      if (dbError) throw dbError;

      // 4. Update UI
      setPhotos(prev => prev.filter(p => !selectedIds.includes(p.id)));
      setSelectedPhotos([]);
      setIsSelectionMode(false);

    } catch (error) {
      console.error("Error performing bulk deletion:", error.message);
      alert(`Failed to delete photos: ${error.message}`);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  if (!album && loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex justify-center items-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-medium">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <motion.h1 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-bold text-white mb-2"
              >
                {album?.name || 'Loading Album...'}
              </motion.h1>
              {album?.description && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-slate-400 max-w-2xl text-lg"
                >
                  {album.description}
                </motion.p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Conditional Bulk Delete Button */}
              <AnimatePresence>
                {isSelectionMode && selectedPhotos.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={handleBulkDelete}
                    disabled={isBulkDeleting}
                    className="flex items-center gap-2 bg-red-600/90 hover:bg-red-500 disabled:bg-red-600/50 text-white px-5 py-3 rounded-xl font-medium transition-all shadow-lg"
                  >
                    {isBulkDeleting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                    {isBulkDeleting ? 'Deleting...' : `Delete (${selectedPhotos.length})`}
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Toggle Selection Mode Button */}
              {photos.length > 0 && (
                <button 
                  onClick={toggleSelectionMode}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all border ${
                    isSelectionMode 
                      ? 'bg-slate-800 text-white border-slate-700' 
                      : 'bg-transparent text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {isSelectionMode ? 'Cancel' : 'Select'}
                </button>
              )}

              <input 
                type="file" 
                multiple 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || isSelectionMode}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 disabled:bg-primary-600/50 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-medium transition-all shadow-lg shadow-primary-600/20"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
                {uploading ? 'Uploading...' : 'Upload Photos'}
              </button>
            </div>
          </div>
        </header>

        <main>
          {loading && photos.length === 0 ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : photos.length === 0 ? (
            <div className="text-slate-500 text-center py-32 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
              <ImageIcon className="w-16 h-16 mx-auto mb-4 text-slate-600" />
              <h3 className="text-xl font-medium text-slate-300 mb-2">This album is empty</h3>
              <p className="mb-6 max-w-sm mx-auto">Upload your first photos to start filling up this album.</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 bg-slate-800 text-white px-6 py-3 rounded-xl font-medium transition-colors hover:bg-slate-700"
              >
                <Upload className="w-5 h-5" />
                Select Photos
              </button>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
              {photos.map((photo, index) => {
                const isSelected = selectedPhotos.some(p => p.id === photo.id);
                
                return (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: Math.min(index * 0.05, 0.5) }}
                    onClick={() => handlePhotoClick(photo)}
                    className={`break-inside-avoid rounded-2xl overflow-hidden bg-slate-900 group relative border-2 transition-all cursor-pointer ${
                      isSelectionMode && isSelected 
                        ? 'border-primary-500 scale-[0.98]' 
                        : 'border-slate-800 hover:border-primary-500/50'
                    }`}
                  >
                    <img 
                      src={photo.image_url} 
                      alt="Album photo" 
                      loading="lazy"
                      className={`w-full h-auto object-cover transition-transform duration-700 ${
                        isSelectionMode ? '' : 'group-hover:scale-105'
                      }`}
                    />
                    
                    {/* Selection Overlay */}
                    <AnimatePresence>
                      {isSelectionMode && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={`absolute inset-0 transition-colors ${
                            isSelected ? 'bg-primary-500/20' : 'bg-black/20 hover:bg-black/40'
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
                    
                    {/* Hover Overlay for Single View */}
                    {!isSelectionMode && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Single Photo View Modal */}
      <AnimatePresence>
        {selectedPhoto && !isSelectionMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPhoto(null)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-5xl max-h-full flex flex-col items-center justify-center pointer-events-none"
            >
              <div className="pointer-events-auto relative bg-slate-900 rounded-lg overflow-hidden border border-slate-800 shadow-2xl max-h-[85vh] w-auto inline-flex justify-center">
                <img 
                  src={selectedPhoto.image_url} 
                  alt="Full size view" 
                  className="object-contain max-h-[85vh] max-w-full h-auto w-auto"
                />
              </div>

              {/* Action Buttons */}
              <div className="absolute top-0 right-0 w-full flex justify-between items-start p-4 pointer-events-none h-full">
                <div className="pointer-events-auto flex items-center gap-3">
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex items-center gap-2 bg-red-600/90 hover:bg-red-500 text-white px-4 py-2 rounded-xl backdrop-blur-sm transition-colors shadow-lg"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                    {isDeleting ? 'Deleting...' : 'Delete Photo'}
                  </button>
                  <button
                    onClick={handleSetCover}
                    disabled={isSettingCover}
                    className="flex items-center gap-2 bg-primary-600/90 hover:bg-primary-500 text-white px-4 py-2 rounded-xl backdrop-blur-sm transition-colors shadow-lg"
                  >
                    {isSettingCover ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Star className="w-5 h-5" />
                    )}
                    {isSettingCover ? 'Setting...' : 'Set as Album Cover'}
                  </button>
                </div>

                <div className="pointer-events-auto">
                  <button
                    onClick={() => setSelectedPhoto(null)}
                    className="p-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full backdrop-blur-sm transition-colors shadow-lg"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl border border-slate-700 flex items-center gap-2"
          >
            <Check className="w-5 h-5 text-primary-400" />
            Cover Updated!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
