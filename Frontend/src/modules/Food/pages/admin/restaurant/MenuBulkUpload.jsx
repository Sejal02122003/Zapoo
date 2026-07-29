import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminAPI, uploadAPI } from '../../../../../services/api/index.js';
import { 
  Loader2, 
  UploadCloud, 
  FileSpreadsheet, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  Save, 
  X, 
  Layers, 
  Check, 
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@food/components/ui/dialog";

const initialSingleItemForm = () => ({
  name: '',
  price: '',
  categoryName: '',
  foodType: 'Veg',
  description: '',
  image: '',
  isAvailable: true,
  preparationTime: '20 mins',
  variants: []
});

const MenuBulkUpload = () => {
  const [activeTab, setActiveTab] = useState('bulk'); // 'bulk' | 'single' | 'manage'
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  
  // Bulk Upload State
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [menuData, setMenuData] = useState([]);
  const [totalQueued, setTotalQueued] = useState(0);

  // Single Item Upload State
  const [singleForm, setSingleForm] = useState(initialSingleItemForm());
  const [singleImageFile, setSingleImageFile] = useState(null);
  const [singleImagePreview, setSingleImagePreview] = useState('');
  const [isSubmittingSingle, setIsSubmittingSingle] = useState(false);
  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantPrice, setNewVariantPrice] = useState('');

  // Manage / Edit Items State
  const [existingItems, setExistingItems] = useState([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState(null);

  // Polling ref to track interval
  const pollRef = useRef(null);

  useEffect(() => {
    fetchRestaurants();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchExistingItems(selectedRestaurant);
    } else {
      setExistingItems([]);
    }
  }, [selectedRestaurant]);

  const fetchRestaurants = async () => {
    try {
      const res = await adminAPI.getApprovedRestaurants({ limit: 1000 });
      if (res?.data?.success) {
        const list = res.data.data?.restaurants || res.data.restaurants || [];
        setRestaurants(list);
        if (list.length > 0 && !selectedRestaurant) {
          setSelectedRestaurant(list[0]._id || list[0].id);
        }
      }
    } catch {
      toast.error('Failed to fetch restaurants');
    }
  };

  const fetchExistingItems = async (restaurantId) => {
    if (!restaurantId) return;
    try {
      setIsLoadingItems(true);
      const res = await adminAPI.getFoods({ restaurantId, limit: 1000 });
      const items = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : (res?.data?.foods || []);
      setExistingItems(items);
    } catch (err) {
      console.error('Failed to fetch menu items:', err);
    } finally {
      setIsLoadingItems(false);
    }
  };

  /**
   * Poll backend every 5s for AI generated images
   */
  const startPolling = useCallback((restaurantId) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res = await adminAPI.getMenuItemsStatus(restaurantId);
        if (!res?.data?.success) return;

        const statusMap = res.data.data;

        setMenuData(prev => {
          let anyPending = false;
          const updated = prev.map(section => ({
            ...section,
            items: section.items.map(item => {
              const newUrl = statusMap[item.id];
              if (newUrl && !item.image) {
                return { ...item, image: newUrl, imageFailed: false };
              }
              if (!item.image && !newUrl) {
                anyPending = true;
              }
              return item;
            })
          }));

          if (!anyPending && pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }

          return updated;
        });
      } catch {
        // Silently ignore poll errors
      }
    }, 5000);
  }, []);

  // --- BULK UPLOAD HANDLERS ---
  const handleFileChange = (e) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedRestaurant) return toast.error('Please select a restaurant first');
    if (!file) return toast.error('Please select an Excel or CSV file');

    setIsUploading(true);
    setMenuData([]);
    setTotalQueued(0);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }

    try {
      const res = await adminAPI.uploadMenuBulk(selectedRestaurant, file);
      if (res?.data?.success) {
        toast.success(res.data.message);
        setMenuData(res.data.menu || []);
        setTotalQueued(res.data.queuedJobsCount || 0);

        if (res.data.queuedJobsCount > 0) {
          startPolling(selectedRestaurant);
        }
        fetchExistingItems(selectedRestaurant);
      } else {
        toast.error(res?.data?.message || 'Failed to upload menu');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error uploading file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRegenerate = async (itemId, sectionIndex, itemIndex) => {
    setMenuData(prev =>
      prev.map(section => ({
        ...section,
        items: section.items.map(item =>
          item.id === itemId ? { ...item, image: '', imageFailed: false } : item
        )
      }))
    );

    try {
      const res = await adminAPI.regenerateMenuItemImage(selectedRestaurant, sectionIndex, itemIndex, itemId);
      if (res?.data?.success) {
        toast.success('Regenerating image...');
        startPolling(selectedRestaurant);
      }
    } catch {
      toast.error('Failed to regenerate');
    }
  };

  const handleDownloadTemplate = () => {
    const headers = 'Name,Description,Price,Category Name,Food Type (Veg/Non-Veg),Preparation Time,Is Available (TRUE/FALSE),"Variants (Name:Price, ...)","Add-ons (Name:Price, ...)"';
    const row1 = 'Chicken Dum Biryani,Authentic slow-cooked chicken,350,Biryani,Non-Veg,30 mins,TRUE,"Half:180, Full:350","Raita:30, Extra Masala:20"';
    const row2 = 'Paneer Tikka,Grilled cottage cheese cubes,280,Starters,Veg,20 mins,TRUE,"Mint Chutney:10"';
    const row3 = 'Paneer Pizza,Cheesy paneer loaded pizza,349,Pizza,Veg,20 mins,TRUE,';
    const csvContent = `${headers}\n${row1}\n${row2}\n${row3}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample-menu-template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- SINGLE ITEM HANDLERS ---
  const handleAddVariantToSingle = () => {
    if (!newVariantName.trim() || !newVariantPrice) return;
    setSingleForm(prev => ({
      ...prev,
      variants: [...prev.variants, { name: newVariantName.trim(), price: Number(newVariantPrice) }]
    }));
    setNewVariantName('');
    setNewVariantPrice('');
  };

  const handleRemoveVariantFromSingle = (index) => {
    setSingleForm(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index)
    }));
  };

  const handleSubmitSingleItem = async (e) => {
    e.preventDefault();
    if (!selectedRestaurant) return toast.error('Please select a restaurant');
    if (!singleForm.name.trim()) return toast.error('Food item name is required');
    if (!singleForm.price || Number(singleForm.price) <= 0) return toast.error('Valid price is required');

    setIsSubmittingSingle(true);
    try {
      let finalImageUrl = singleForm.image.trim();
      if (singleImageFile) {
        toast.info('Uploading food image...');
        const uploadRes = await uploadAPI.uploadMedia(singleImageFile, { folder: "foods" });
        finalImageUrl = uploadRes?.data?.data?.url || uploadRes?.data?.url || finalImageUrl;
      }

      const payload = {
        restaurantId: selectedRestaurant,
        name: singleForm.name.trim(),
        price: Number(singleForm.price),
        categoryName: singleForm.categoryName.trim() || 'General',
        foodType: singleForm.foodType,
        description: singleForm.description.trim(),
        image: finalImageUrl,
        isAvailable: singleForm.isAvailable,
        preparationTime: singleForm.preparationTime || '20 mins',
        variants: singleForm.variants
      };

      const res = await adminAPI.createFood(payload);
      if (res?.data?.success || res?.status === 200 || res?.status === 201) {
        toast.success(`"${singleForm.name}" added to menu successfully!`);
        setSingleForm(initialSingleItemForm());
        setSingleImageFile(null);
        setSingleImagePreview('');
        fetchExistingItems(selectedRestaurant);
      } else {
        toast.error(res?.data?.message || 'Failed to add item');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add item to menu');
    } finally {
      setIsSubmittingSingle(false);
    }
  };

  // --- EDIT & MANAGE HANDLERS ---
  const handleOpenEditModal = (item) => {
    setEditingItem({
      id: item._id || item.id,
      name: item.name || '',
      price: item.price != null ? String(item.price) : '',
      categoryName: item.categoryName || item.category || '',
      foodType: item.foodType === 'Veg' ? 'Veg' : 'Non-Veg',
      description: item.description || '',
      image: item.image || item.imageUrl || (Array.isArray(item.images) ? item.images[0] : '') || '',
      isAvailable: item.isAvailable !== false,
      preparationTime: item.preparationTime || '20 mins'
    });
    setEditImageFile(null);
    setEditImagePreview('');
    setShowEditModal(true);
  };

  const handleSaveEditedItem = async (e) => {
    e.preventDefault();
    if (!editingItem || !editingItem.id) return;
    if (!editingItem.name.trim()) return toast.error('Item name is required');
    if (!editingItem.price || Number(editingItem.price) <= 0) return toast.error('Valid price is required');

    setIsSavingEdit(true);
    try {
      let finalImageUrl = editingItem.image.trim();
      if (editImageFile) {
        toast.info('Uploading updated food image...');
        const uploadRes = await uploadAPI.uploadMedia(editImageFile, { folder: "foods" });
        finalImageUrl = uploadRes?.data?.data?.url || uploadRes?.data?.url || finalImageUrl;
      }

      const payload = {
        name: editingItem.name.trim(),
        price: Number(editingItem.price),
        categoryName: editingItem.categoryName.trim() || 'General',
        foodType: editingItem.foodType,
        description: editingItem.description.trim(),
        image: finalImageUrl,
        isAvailable: editingItem.isAvailable,
        preparationTime: editingItem.preparationTime
      };

      const res = await adminAPI.updateFood(editingItem.id, payload);
      if (res?.data?.success || res?.status === 200) {
        toast.success('Item updated successfully!');
        setShowEditModal(false);
        setEditingItem(null);
        setEditImageFile(null);
        setEditImagePreview('');
        fetchExistingItems(selectedRestaurant);
      } else {
        toast.error(res?.data?.message || 'Failed to update item');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save edits');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;
    setDeletingItemId(itemId);
    try {
      const res = await adminAPI.deleteFood(itemId);
      if (res?.data?.success || res?.status === 200) {
        toast.success('Item deleted from menu');
        fetchExistingItems(selectedRestaurant);
      } else {
        toast.error(res?.data?.message || 'Failed to delete item');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error deleting item');
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleToggleItemAvailability = async (item) => {
    const itemId = item._id || item.id;
    const newStatus = !item.isAvailable;
    try {
      await adminAPI.updateFood(itemId, { isAvailable: newStatus });
      toast.success(`Status updated to ${newStatus ? 'Available' : 'Out of Stock'}`);
      fetchExistingItems(selectedRestaurant);
    } catch {
      toast.error('Failed to update availability');
    }
  };

  const filteredExistingItems = useMemo(() => {
    if (!itemSearchQuery.trim()) return existingItems;
    const query = itemSearchQuery.toLowerCase().trim();
    return existingItems.filter(item => 
      (item.name && item.name.toLowerCase().includes(query)) ||
      (item.categoryName && item.categoryName.toLowerCase().includes(query))
    );
  }, [existingItems, itemSearchQuery]);

  // Stats from bulk menu state
  const allItems = menuData.flatMap(s => s.items);
  const doneCount = allItems.filter(i => !!i.image).length;
  const pendingCount = allItems.filter(i => !i.image && !i.imageFailed).length;
  const failedCount = allItems.filter(i => i.imageFailed).length;
  const progress = totalQueued > 0 ? Math.round((doneCount / (doneCount + pendingCount + failedCount)) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Menu & Food Item Management</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Upload bulk CSV/Excel or add & edit single menu items directly</p>
        </div>
        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-100 active:scale-95 transition-all"
        >
          <FileSpreadsheet className="w-4 h-4 text-green-600" /> Download CSV Template
        </button>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex bg-gray-100 p-1.5 rounded-2xl gap-2 max-w-2xl">
        <button
          onClick={() => setActiveTab('bulk')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'bulk' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <UploadCloud className="w-4 h-4 text-blue-600" /> Bulk Excel/CSV Upload
        </button>
        <button
          onClick={() => setActiveTab('single')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'single' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Plus className="w-4 h-4 text-green-600" /> Add Single Item
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'manage' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Layers className="w-4 h-4 text-amber-600" /> Manage Menu ({existingItems.length})
        </button>
      </div>

      {/* Global Restaurant Selector */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <label className="text-sm font-bold text-gray-800 uppercase tracking-wider whitespace-nowrap">Target Restaurant:</label>
        <select
          value={selectedRestaurant}
          onChange={(e) => setSelectedRestaurant(e.target.value)}
          className="w-full sm:w-80 h-11 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500/20 px-4"
        >
          <option value="">-- Select Restaurant --</option>
          {restaurants.map(r => (
            <option key={r._id || r.id} value={r._id || r.id}>{r.restaurantName || r.name}</option>
          ))}
        </select>
      </div>

      {/* TAB 1: BULK EXCEL/CSV UPLOAD */}
      {activeTab === 'bulk' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Select Excel or CSV File</label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="w-full h-24 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-sm font-semibold text-gray-500 hover:border-blue-500 hover:bg-blue-50/50 transition-colors">
                    <UploadCloud className="w-8 h-8 text-blue-500" />
                    {file ? <span className="font-bold text-gray-900">{file.name}</span> : 'Drag & Drop or Click to Select CSV/Excel File'}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleUpload}
                disabled={isUploading || !file || !selectedRestaurant}
                className="flex items-center gap-2 px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50"
              >
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 text-amber-400" />}
                {isUploading ? 'Processing File...' : 'Upload & Generate AI Images'}
              </button>
            </div>
          </div>

          {/* Bulk Results & AI Polling Grid */}
          <AnimatePresence>
            {menuData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6"
              >
                {totalQueued > 0 && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                      <span className="text-blue-600">AI Image Generation Progress</span>
                      <span className="text-gray-500">{doneCount} / {doneCount + pendingCount + failedCount} done ({progress}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}

                <div className="space-y-8 mt-4">
                  {menuData.map((section, sIdx) => (
                    <div key={section.name} className="space-y-4">
                      <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight border-b pb-2">{section.name}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {section.items.map((item, iIdx) => (
                          <div key={item.id} className="flex gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                            <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-200 shrink-0 relative flex flex-col items-center justify-center">
                              {item.image ? (
                                <>
                                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                  <button
                                    onClick={() => handleRegenerate(item.id, sIdx, iIdx)}
                                    className="absolute bottom-1 right-1 w-6 h-6 bg-black/60 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-black transition-colors"
                                    title="Regenerate"
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                  </button>
                                </>
                              ) : (
                                <div className="flex flex-col items-center justify-center text-gray-400 gap-1.5">
                                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                  <span className="text-[9px] font-bold uppercase tracking-widest text-center leading-tight">AI<br />Generating</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 py-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`w-3 h-3 border-2 flex items-center justify-center ${item.type === 'veg' ? 'border-green-600' : 'border-red-600'}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${item.type === 'veg' ? 'bg-green-600' : 'bg-red-600'}`} />
                                </span>
                                <h4 className="font-bold text-gray-900 truncate">{item.name}</h4>
                              </div>
                              <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-2">{item.description}</p>
                              <div className="font-black text-sm text-gray-900">₹{item.price}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* TAB 2: ADD SINGLE MENU ITEM FORM */}
      {activeTab === 'single' && (
        <form onSubmit={handleSubmitSingleItem} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
          <div className="border-b pb-4">
            <h2 className="text-xl font-black text-gray-900">Add Single Food Item</h2>
            <p className="text-xs text-gray-500 mt-1">Directly add a new item to this restaurant's menu</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Item Name */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase">Food Item Name *</label>
              <input
                type="text"
                placeholder="e.g. Paneer Butter Masala"
                value={singleForm.name}
                onChange={(e) => setSingleForm({ ...singleForm, name: e.target.value })}
                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>

            {/* Category Name */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase">Category Name *</label>
              <input
                type="text"
                placeholder="e.g. Main Course, Starters, Beverages"
                value={singleForm.categoryName}
                onChange={(e) => setSingleForm({ ...singleForm, categoryName: e.target.value })}
                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>

            {/* Price */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase">Price (₹) *</label>
              <input
                type="number"
                min="1"
                placeholder="250"
                value={singleForm.price}
                onChange={(e) => setSingleForm({ ...singleForm, price: e.target.value })}
                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>

            {/* Food Type */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase">Food Type</label>
              <div className="flex gap-4 items-center h-11">
                {['Veg', 'Non-Veg'].map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer text-sm font-bold">
                    <input
                      type="radio"
                      name="foodTypeSingle"
                      checked={singleForm.foodType === type}
                      onChange={() => setSingleForm({ ...singleForm, foodType: type })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className={type === 'Veg' ? 'text-green-700' : 'text-red-700'}>{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Preparation Time */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase">Prep Time</label>
              <input
                type="text"
                placeholder="e.g. 20 mins"
                value={singleForm.preparationTime}
                onChange={(e) => setSingleForm({ ...singleForm, preparationTime: e.target.value })}
                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Food Image Upload / URL */}
            <div className="space-y-2 col-span-1 md:col-span-2 border-t border-b py-3">
              <label className="text-xs font-bold text-gray-700 uppercase">Food Image (Upload File or Enter URL)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                {/* File Upload Option */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">📁 Upload Image File</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setSingleImageFile(f);
                        setSingleImagePreview(URL.createObjectURL(f));
                      }
                    }}
                    className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                </div>

                {/* Direct Image URL Option */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">🔗 Or Enter Image URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={singleForm.image}
                    onChange={(e) => setSingleForm({ ...singleForm, image: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-gray-50 text-xs font-semibold focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Preview Thumbnail */}
              {(singleImagePreview || singleForm.image) && (
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-xs font-semibold text-gray-500">Preview:</span>
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 shadow-sm">
                    <img src={singleImagePreview || singleForm.image} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setSingleImageFile(null);
                        setSingleImagePreview('');
                        setSingleForm({ ...singleForm, image: '' });
                      }}
                      className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] hover:bg-red-700"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 uppercase">Description</label>
            <textarea
              rows={3}
              placeholder="Detailed description of ingredients, flavor profile..."
              value={singleForm.description}
              onChange={(e) => setSingleForm({ ...singleForm, description: e.target.value })}
              className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Variants section */}
          <div className="space-y-3 border-t pt-4">
            <label className="text-xs font-bold text-gray-700 uppercase">Optional Variants (e.g. Half / Full)</label>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Variant Name (e.g. Full)"
                value={newVariantName}
                onChange={(e) => setNewVariantName(e.target.value)}
                className="flex-1 h-10 px-3 rounded-lg border text-sm"
              />
              <input
                type="number"
                placeholder="Price (₹)"
                value={newVariantPrice}
                onChange={(e) => setNewVariantPrice(e.target.value)}
                className="w-28 h-10 px-3 rounded-lg border text-sm"
              />
              <button
                type="button"
                onClick={handleAddVariantToSingle}
                className="px-4 h-10 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-bold text-xs"
              >
                + Add
              </button>
            </div>

            {singleForm.variants.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {singleForm.variants.map((v, idx) => (
                  <span key={idx} className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 font-bold text-xs rounded-full">
                    {v.name}: ₹{v.price}
                    <button type="button" onClick={() => handleRemoveVariantFromSingle(idx)} className="text-blue-500 hover:text-blue-900">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Availability Toggle */}
          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="isAvailableSingle"
              checked={singleForm.isAvailable}
              onChange={(e) => setSingleForm({ ...singleForm, isAvailable: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <label htmlFor="isAvailableSingle" className="text-sm font-bold text-gray-800 cursor-pointer">
              Item is Available for Orders
            </label>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isSubmittingSingle}
              className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmittingSingle ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              {isSubmittingSingle ? 'Saving...' : 'Add Single Menu Item'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: MANAGE & EDIT MENU ITEMS */}
      {activeTab === 'manage' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="text-xl font-black text-gray-900">Restaurant Menu Items</h2>
              <p className="text-xs text-gray-500 mt-1">View, edit price/details, or delete single items</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search menu items..."
                value={itemSearchQuery}
                onChange={(e) => setItemSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border text-xs font-semibold"
              />
            </div>
          </div>

          {isLoadingItems ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : filteredExistingItems.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="font-bold">No menu items found for this restaurant.</p>
              <p className="text-xs mt-1">Use the "Add Single Item" or "Bulk Upload" tab to add foods.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredExistingItems.map((item) => {
                const img = item.image || item.imageUrl || (Array.isArray(item.images) ? item.images[0] : '') || 'https://via.placeholder.com/150';
                return (
                  <div key={item._id || item.id} className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 hover:bg-gray-50 flex gap-4 transition-all">
                    <img src={img} alt={item.name} className="w-20 h-20 rounded-xl object-cover bg-gray-200 shrink-0" />
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className={`w-3 h-3 border-2 flex items-center justify-center ${item.foodType === 'Veg' ? 'border-green-600' : 'border-red-600'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${item.foodType === 'Veg' ? 'bg-green-600' : 'bg-red-600'}`} />
                          </span>
                          <span className="text-[10px] font-bold uppercase bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                            {item.categoryName || item.category || 'General'}
                          </span>
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm truncate">{item.name}</h4>
                        <div className="font-black text-gray-900 text-sm mt-0.5">₹{item.price}</div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-2">
                        <button
                          onClick={() => handleToggleItemAvailability(item)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.isAvailable !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {item.isAvailable !== false ? 'Available' : 'Out of Stock'}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Item"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item._id || item.id)}
                            disabled={deletingItemId === (item._id || item.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete Item"
                          >
                            {deletingItemId === (item._id || item.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* EDIT SINGLE MENU ITEM MODAL */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900">Edit Single Menu Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <form onSubmit={handleSaveEditedItem} className="space-y-4 mt-2">
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase">Item Name *</label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full h-10 px-3 border rounded-xl bg-gray-50 text-sm font-semibold mt-1"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase">Category Name</label>
                <input
                  type="text"
                  value={editingItem.categoryName}
                  onChange={(e) => setEditingItem({ ...editingItem, categoryName: e.target.value })}
                  className="w-full h-10 px-3 border rounded-xl bg-gray-50 text-sm font-semibold mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase">Price (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    value={editingItem.price}
                    onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                    className="w-full h-10 px-3 border rounded-xl bg-gray-50 text-sm font-semibold mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase">Food Type</label>
                  <select
                    value={editingItem.foodType}
                    onChange={(e) => setEditingItem({ ...editingItem, foodType: e.target.value })}
                    className="w-full h-10 px-3 border rounded-xl bg-gray-50 text-sm font-semibold mt-1"
                  >
                    <option value="Veg">Veg</option>
                    <option value="Non-Veg">Non-Veg</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 border-t border-b py-2 my-2">
                <label className="text-xs font-bold text-gray-700 uppercase">Food Image (Upload File or Enter URL)</label>
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">📁 Upload New Image File</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setEditImageFile(f);
                          setEditImagePreview(URL.createObjectURL(f));
                        }
                      }}
                      className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">🔗 Or Enter Image URL</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={editingItem.image}
                      onChange={(e) => setEditingItem({ ...editingItem, image: e.target.value })}
                      className="w-full h-9 px-3 border rounded-xl bg-gray-50 text-xs font-semibold"
                    />
                  </div>
                </div>

                {(editImagePreview || editingItem.image) && (
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-xs font-semibold text-gray-500">Preview:</span>
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 shadow-sm">
                      <img src={editImagePreview || editingItem.image} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setEditImageFile(null);
                          setEditImagePreview('');
                          setEditingItem({ ...editingItem, image: '' });
                        }}
                        className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] hover:bg-red-700"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase">Description</label>
                <textarea
                  rows={2}
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full p-3 border rounded-xl bg-gray-50 text-sm font-semibold mt-1"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="editIsAvailable"
                  checked={editingItem.isAvailable}
                  onChange={(e) => setEditingItem({ ...editingItem, isAvailable: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="editIsAvailable" className="text-sm font-bold text-gray-800 cursor-pointer">
                  Available for Customer Orders
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-sm rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl disabled:opacity-50"
                >
                  {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MenuBulkUpload;
