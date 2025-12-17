import React, { useState, useEffect } from 'react';
import { MENU_SHEET_URL, MENU_ITEMS } from '../constants';
import { MenuItem } from '../types';
import { Utensils, AlertCircle, Loader2, ArrowLeft, ChevronRight, ShoppingBag, ChevronDown, ChevronUp, X, MapPin, User, Phone, FileText, Minus, Plus } from 'lucide-react';

interface MenuProps {
  whatsappNumber: string;
}

const Menu: React.FC<MenuProps> = ({ whatsappNumber }) => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // State for Drill-Down Navigation (Page 1 vs Page 2)
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);

  // State for "See More" pagination
  const [visibleCount, setVisibleCount] = useState(6);

  // State for Order Modal
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedOrderItem, setSelectedOrderItem] = useState<MenuItem | null>(null);
  const [orderFormData, setOrderFormData] = useState({
    name: '',
    phone: '',
    address: '',
    quantity: 1,
    note: ''
  });

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        // Add timestamp to prevent caching of the Google Sheet CSV
        const response = await fetch(`${MENU_SHEET_URL}&t=${Date.now()}`);
        if (!response.ok) throw new Error('Failed to fetch menu data');
        
        const csvText = await response.text();
        const parsedItems = parseCSV(csvText);
        
        if (parsedItems.length > 0) {
          setItems(parsedItems);
          // Extract unique categories from data
          const cats = Array.from(new Set(parsedItems.map(item => item.category))).filter(Boolean).sort();
          setUniqueCategories(cats);
        } else {
          throw new Error('No items found');
        }
      } catch (err) {
        console.error("Error loading menu:", err);
        setError(true);
        // Fallback to static data
        setItems(MENU_ITEMS);
        const cats = Array.from(new Set(MENU_ITEMS.map(item => item.category))).filter(Boolean).sort();
        setUniqueCategories(cats);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, []);

  // Optimized Google Drive Image URL Converter
  const getOptimizedImageURL = (url: string) => {
    if (!url) return '';
    const cleanUrl = url.trim();
    if (cleanUrl.includes('drive.google.com') || cleanUrl.includes('docs.google.com')) {
      // Regex to catch /d/ID, id=ID, open?id=ID
      const idMatch = cleanUrl.match(/\/d\/(.*?)\/|\/d\/(.*?)$|id=(.*?)(&|$)/);
      const id = idMatch ? (idMatch[1] || idMatch[2] || idMatch[3]) : null;
      if (id) {
        return `https://lh3.googleusercontent.com/d/${id}=w1000`;
      }
    }
    return cleanUrl;
  };

  // CSV Parser with Fill-Down Logic and Background Support
  const parseCSV = (csvText: string): MenuItem[] => {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return [];

    const splitLine = (line: string) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      return result;
    };

    const headers = splitLine(lines[0]).map(h => h.toLowerCase().trim());
    
    // Header Detection
    const getIndex = (keys: string[]) => headers.findIndex(h => keys.some(k => h.includes(k)));
    
    // Core Columns
    const catIdx = headers.findIndex(h => h === 'category' || (h.includes('category') && !h.includes('sub') && !h.includes('bg') && !h.includes('background')));
    const finalCatIdx = catIdx === -1 ? headers.findIndex(h => h.includes('category') && !h.includes('bg') && !h.includes('background')) : catIdx;
    
    const subCatIdx = getIndex(['subcategory', 'sub category']);
    const itemIdx = getIndex(['item', 'dish', 'name']);
    const variantIdx = getIndex(['variant', 'description']);
    const priceIdx = getIndex(['price', 'rate', 'cost']);
    const imgIdx = getIndex(['image', 'img', 'url', 'photo']); // Standard item image
    
    // New Background Columns - Broadened search
    const catBgIdx = getIndex(['category background', 'category image', 'cat bg', 'category-bg', 'cat_bg', 'cat image', 'cover', 'header image']);
    const itemBgIdx = getIndex(['item background', 'item bg', 'item-bg', 'card background', 'dish background']);

    let lastCategory = ''; 
    let lastCatBg = '';

    return lines.slice(1).map(line => {
      if (!line.trim()) return null;
      const row = splitLine(line);
      
      // Category Logic with Fill-Down
      const rawCategory = row[finalCatIdx]?.trim();
      let category = rawCategory;

      if (category) {
        // If explicit category is present
        if (category !== lastCategory) {
           // New category starting
           lastCategory = category;
           lastCatBg = ''; // Reset background for new category until found
        }
      } else if (lastCategory) {
        // Continuation of previous category
        category = lastCategory;
      } else {
        category = 'Other';
      }

      // Read Backgrounds
      let categoryBackgroundImage = row[catBgIdx]?.trim();
      const itemBackgroundImage = row[itemBgIdx]?.trim();

      // Category Background Fill-down logic
      if (categoryBackgroundImage) {
          lastCatBg = categoryBackgroundImage;
      } else {
          // Inherit from current category's known background
          categoryBackgroundImage = lastCatBg;
      }

      const name = row[itemIdx] || '';
      const price = row[priceIdx];
      const variant = row[variantIdx];
      const subcat = row[subCatIdx];
      const description = [variant, subcat].filter(Boolean).join(' • ');
      const rawImage = row[imgIdx];
      
      const image = getOptimizedImageURL(rawImage);
      const optimizedCatBg = getOptimizedImageURL(categoryBackgroundImage);
      const optimizedItemBg = getOptimizedImageURL(itemBackgroundImage);

      if (!name) return null;

      return {
        name,
        category,
        price: price ? (price.includes('₹') ? price : `₹${price}`) : '',
        description,
        image,
        isVegetarian: true,
        categoryBackgroundImage: optimizedCatBg,
        itemBackgroundImage: optimizedItemBg
      };
    }).filter(item => item !== null) as MenuItem[];
  };

  // Logic for Category Card Thumbnail (Grid View)
  const getCategoryDisplayImage = (category: string) => {
    // 1. Try to find an item in this category that explicitly has a category BG set
    // (Due to fill-down, most should have it if one does)
    const itemWithCatBg = items.find(item => item.category === category && item.categoryBackgroundImage);
    if (itemWithCatBg?.categoryBackgroundImage) return itemWithCatBg.categoryBackgroundImage;

    // 2. Fallback to first item image
    const itemWithImage = items.find(item => item.category === category && item.image && item.image.startsWith('http'));
    if (itemWithImage?.image) return itemWithImage.image;

    // 3. Fallback to random generator
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
        hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `https://picsum.photos/600/400?random=${Math.abs(hash)}`;
  };

  const getCategoryCount = (category: string) => {
    return items.filter(item => item.category === category).length;
  };

  const handleCategoryClick = (category: string) => {
    setActiveCategory(category);
    setVisibleCount(6);
    setTimeout(() => {
        const menuSection = document.getElementById('menu-content');
        if (menuSection) {
            const yOffset = -100;
            const y = menuSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({top: y, behavior: 'smooth'});
        }
    }, 50);
  };

  const handleBackToCategories = () => {
    setActiveCategory(null);
    setTimeout(() => {
        const menuTitle = document.getElementById('menu-title');
        if (menuTitle) {
            menuTitle.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 50);
  };

  const handleOpenOrderModal = (item: MenuItem) => {
    setSelectedOrderItem(item);
    setOrderFormData({
      name: '',
      phone: '',
      address: '',
      quantity: 1,
      note: ''
    });
    setIsOrderModalOpen(true);
  };

  const handleCloseOrderModal = () => {
    setIsOrderModalOpen(false);
    setSelectedOrderItem(null);
  };

  const handleOrderInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setOrderFormData(prev => ({ ...prev, [name]: value }));
  };

  const incrementQuantity = () => {
    setOrderFormData(prev => ({ ...prev, quantity: prev.quantity + 1 }));
  };

  const decrementQuantity = () => {
    setOrderFormData(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }));
  };

  const submitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderItem) return;

    const message = `*NEW ORDER - Chef's Jalsa* 🍽️
    
*Item:* ${selectedOrderItem.name}
*Price:* ${selectedOrderItem.price}
*Quantity:* ${orderFormData.quantity}

*Customer Details:*
👤 Name: ${orderFormData.name}
📞 Phone: ${orderFormData.phone}
📍 Address: ${orderFormData.address}
📝 Note: ${orderFormData.note || 'None'}`;

    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
    handleCloseOrderModal();
  };

  const handleSeeLess = () => {
    setVisibleCount(6);
    const listTop = document.getElementById('category-items-top');
    if (listTop) {
        const yOffset = -120;
        const y = listTop.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const displayedItems = activeCategory 
    ? items.filter(item => item.category === activeCategory)
    : [];

  const visibleItems = displayedItems.slice(0, visibleCount);

  // Helper to convert background strings to CSS styles
  const getStyleFromValue = (value: string | undefined, isOverlayNeeded = false) => {
      if (!value) return {};
      const isUrl = value.startsWith('http') || value.startsWith('data:') || value.startsWith('/');
      
      const style: React.CSSProperties = isUrl 
          ? { backgroundImage: `url(${value})`, backgroundSize: 'cover', backgroundPosition: 'center' } 
          : { background: value };
      
      return { style, isUrl };
  };

  // Determine Active Category Background (for Section)
  const activeCategoryBgValue = activeCategory 
    ? items.find(i => i.category === activeCategory && i.categoryBackgroundImage)?.categoryBackgroundImage 
    : null;
  
  const sectionBg = getStyleFromValue(activeCategoryBgValue);
  const showSectionOverlay = !!activeCategoryBgValue && sectionBg.isUrl;

  return (
    <section 
        id="menu" 
        className="py-24 bg-white min-h-screen relative transition-all duration-700 ease-in-out"
        style={sectionBg.style}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .card-hover-effect:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }
      `}</style>
      
      {/* Default Pattern Background (hidden if custom bg active) */}
      {!activeCategoryBgValue && (
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/food.png')] pointer-events-none"></div>
      )}

      {/* Overlay for Readability if Custom Background Image is set */}
      {showSectionOverlay && (
          <div className="absolute inset-0 bg-white/70 transition-opacity duration-700"></div>
      )}
      
      {/* If simple color background, add light tint to ensure readability if dark color */}
      {activeCategoryBgValue && !sectionBg.isUrl && (
           <div className="absolute inset-0 bg-white/10 pointer-events-none"></div>
      )}

      <div id="menu-content" className="container mx-auto px-4 md:px-8 relative z-10">
        
        {/* Header Section */}
        <div id="menu-title" className="text-center mb-16">
          <h3 className="text-brand-gold font-sans font-bold uppercase tracking-[0.2em] text-xs mb-3">Our Collections</h3>
          <h2 className="text-5xl md:text-6xl font-serif font-bold text-brand-black">
            {activeCategory ? activeCategory : "The Menu"}
          </h2>
          <div className="w-32 h-1 bg-gradient-to-r from-transparent via-brand-gold to-transparent mx-auto mt-6"></div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-16 h-16 text-brand-gold animate-spin mb-6" />
            <p className="text-brand-dark font-serif text-xl tracking-wide">Preparing the kitchen...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="text-center mb-12 bg-red-50 p-6 rounded-md border border-red-100 inline-block w-full max-w-2xl mx-auto shadow-sm">
            <p className="text-red-800 flex items-center justify-center gap-2 font-medium">
              <AlertCircle size={20} />
              Viewing offline menu. Some live specials might be missing.
            </p>
          </div>
        )}

        {!loading && (
          <>
            {/* PAGE 1: CATEGORIES GRID */}
            {!activeCategory && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
                {uniqueCategories.map((category) => (
                  <div 
                    key={category}
                    onClick={() => handleCategoryClick(category)}
                    className="group relative h-80 rounded-xl overflow-hidden cursor-pointer shadow-xl transition-all duration-500 transform bg-brand-black"
                  >
                    {/* Background Image with Zoom Effect */}
                    <div className="absolute inset-0 overflow-hidden">
                      <img 
                        src={getCategoryDisplayImage(category)} 
                        alt={category} 
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-70 group-hover:opacity-60"
                      />
                    </div>
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/50 to-transparent opacity-90 transition-opacity duration-300"></div>

                    {/* Gold Border Frame */}
                    <div className="absolute inset-4 border border-brand-gold/30 rounded-lg scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-500"></div>

                    {/* Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                      <h3 className="text-3xl md:text-4xl font-display font-bold text-white mb-2 tracking-wide text-shadow-gold translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                        {category}
                      </h3>
                      
                      <div className="w-12 h-0.5 bg-brand-gold my-4 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 delay-100"></div>
                      
                      <p className="text-brand-goldLight font-sans uppercase tracking-widest text-xs mb-8 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-200 translate-y-4 group-hover:translate-y-0">
                        {getCategoryCount(category)} Curated Items
                      </p>
                      
                      <button className="inline-flex items-center px-6 py-2 border border-white/50 text-white text-xs font-bold uppercase tracking-[0.2em] hover:bg-brand-gold hover:border-brand-gold hover:text-brand-black transition-all duration-300 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 delay-300">
                        Explore <ChevronRight size={14} className="ml-2" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PAGE 2: ITEMS LIST */}
            {activeCategory && (
              <div className="animate-fade-in">
                {/* Back Button */}
                <div id="category-items-top" className="mb-10 flex justify-start">
                  <button 
                    onClick={handleBackToCategories}
                    className="group flex items-center px-6 py-3 bg-white/80 backdrop-blur border border-gray-200 hover:border-brand-gold text-brand-dark rounded-full transition-all duration-300 font-bold text-xs uppercase tracking-widest shadow-sm hover:shadow-md"
                  >
                    <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Collections
                  </button>
                </div>

                {/* Items Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
                  {visibleItems.map((item, index) => {
                      const itemBg = getStyleFromValue(item.itemBackgroundImage);
                      const hasCustomItemBg = !!item.itemBackgroundImage;
                      
                      // Logic: If item has a background image, we want it visible.
                      // Use a dark overlay so white text pops. 
                      // If no background image, use standard layout.
                      const overlayClass = hasCustomItemBg && itemBg.isUrl 
                          ? 'bg-black/60' // Dark overlay for BG images, REMOVED BLUR
                          : '';
                          
                      const textColorClass = hasCustomItemBg && itemBg.isUrl
                          ? 'text-white'
                          : 'text-brand-black';

                      const subTextColorClass = hasCustomItemBg && itemBg.isUrl
                          ? 'text-gray-200'
                          : 'text-gray-500';

                      return (
                        <div 
                          key={index} 
                          className={`group flex flex-col h-full rounded-xl transition-all duration-300 ${hasCustomItemBg ? 'shadow-lg hover:shadow-2xl overflow-hidden' : 'bg-transparent'}`}
                          style={itemBg.style}
                        >
                          {/* Inner container */}
                          <div className={`flex flex-col h-full ${overlayClass}`}>
                              
                              {/* Image Area */}
                              <div className={`h-64 overflow-hidden relative shadow-lg mb-6 card-hover-effect transition-transform duration-300 ${hasCustomItemBg ? 'rounded-none mx-0 mt-0 shadow-none border-b border-white/10' : 'rounded-xl'}`}>
                                {item.image ? (
                                  <img 
                                    src={item.image} 
                                    alt={item.name} 
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = `https://picsum.photos/600/400?random=${index + 50}`;
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-brand-cream/50 text-brand-gold/50">
                                    <Utensils size={48} />
                                  </div>
                                )}
                                
                                {/* Gradient Overlay on Image Hover */}
                                <div className="absolute inset-0 bg-brand-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                    <button 
                                    onClick={() => handleOpenOrderModal(item)}
                                    className="px-6 py-3 bg-white text-brand-black font-bold uppercase tracking-widest text-xs transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:bg-brand-gold"
                                    >
                                        Order Now
                                    </button>
                                </div>
                              </div>

                              {/* Content Area */}
                              <div className={`flex-1 flex flex-col px-4 ${hasCustomItemBg ? 'pb-4' : 'px-2'}`}>
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className={`text-xl font-serif font-bold leading-tight group-hover:text-brand-gold transition-colors duration-300 ${textColorClass}`}>
                                    {item.name}
                                  </h4>
                                  <span className="text-lg font-bold text-brand-gold font-serif whitespace-nowrap ml-4">
                                    {item.price || ''}
                                  </span>
                                </div>
                                
                                {item.description && (
                                  <p className={`text-sm mb-4 line-clamp-2 leading-relaxed font-light ${subTextColorClass}`}>
                                    {item.description}
                                  </p>
                                )}
                                
                                <div className={`mt-auto pt-4 border-t border-dashed flex items-center justify-between ${hasCustomItemBg ? 'border-white/20' : 'border-gray-200'}`}>
                                  <span className={`text-[10px] uppercase tracking-widest font-semibold ${subTextColorClass}`}>
                                    {item.category}
                                  </span>
                                  
                                  <button 
                                    onClick={() => handleOpenOrderModal(item)}
                                    className="md:hidden flex items-center text-brand-gold font-bold text-xs uppercase tracking-wider"
                                  >
                                    <ShoppingBag size={14} className="mr-1" /> Add
                                  </button>
                                </div>
                              </div>
                          </div>
                        </div>
                      );
                  })}
                </div>

                {/* Pagination Controls */}
                <div className="mt-16 text-center flex justify-center gap-6">
                  {/* See More Button */}
                  {displayedItems.length > visibleCount && (
                    <button 
                      onClick={() => setVisibleCount(prev => prev + 6)}
                      className="group flex items-center gap-2 px-10 py-4 border border-brand-gold text-brand-gold font-bold uppercase tracking-widest text-xs hover:bg-brand-gold hover:text-brand-black transition-all duration-300 shadow-md hover:shadow-xl rounded-sm bg-white/50 backdrop-blur"
                    >
                      See More Dishes <ChevronDown className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
                    </button>
                  )}

                  {/* See Less Button */}
                  {visibleCount > 6 && (
                    <button 
                      onClick={handleSeeLess}
                      className="group flex items-center gap-2 px-10 py-4 border border-brand-dark/20 text-brand-dark font-bold uppercase tracking-widest text-xs hover:bg-brand-dark hover:text-white transition-all duration-300 shadow-sm hover:shadow-lg rounded-sm bg-white/50 backdrop-blur"
                    >
                      See Less <ChevronUp className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />
                    </button>
                  )}
                </div>

                {displayedItems.length === 0 && (
                  <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-400 italic font-serif">No items found in this category.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ORDER FORM MODAL */}
      {isOrderModalOpen && selectedOrderItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-brand-dark border border-brand-gold/50 rounded-xl shadow-[0_0_50px_rgba(212,175,55,0.2)] w-full max-w-lg relative overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-brand-black/50">
              <div>
                <h3 className="text-2xl font-display font-bold text-brand-gold">Order Details</h3>
                <p className="text-gray-400 text-sm mt-1">{selectedOrderItem.name}</p>
              </div>
              <button onClick={handleCloseOrderModal} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={submitOrder} className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-6">
                
                {/* Quantity */}
                <div className="flex items-center justify-between bg-black/30 p-4 rounded-lg border border-gray-700">
                   <span className="text-white font-medium">Quantity</span>
                   <div className="flex items-center gap-4">
                      <button type="button" onClick={decrementQuantity} className="p-2 bg-gray-700 rounded-full hover:bg-brand-gold hover:text-brand-black transition-colors">
                        <Minus size={16} />
                      </button>
                      <span className="text-xl font-bold text-brand-gold w-8 text-center">{orderFormData.quantity}</span>
                      <button type="button" onClick={incrementQuantity} className="p-2 bg-gray-700 rounded-full hover:bg-brand-gold hover:text-brand-black transition-colors">
                        <Plus size={16} />
                      </button>
                   </div>
                </div>

                {/* Customer Details */}
                <div className="space-y-4">
                   <div className="relative">
                      <User size={18} className="absolute left-3 top-3.5 text-gray-500" />
                      <input 
                        type="text" 
                        name="name" 
                        required 
                        placeholder="Your Name" 
                        value={orderFormData.name}
                        onChange={handleOrderInputChange}
                        className="w-full bg-black/40 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-brand-gold focus:outline-none transition-colors placeholder-gray-600 font-sans"
                      />
                   </div>
                   <div className="relative">
                      <Phone size={18} className="absolute left-3 top-3.5 text-gray-500" />
                      <input 
                        type="tel" 
                        name="phone" 
                        required 
                        placeholder="Phone Number" 
                        value={orderFormData.phone}
                        onChange={handleOrderInputChange}
                        className="w-full bg-black/40 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-brand-gold focus:outline-none transition-colors placeholder-gray-600 font-sans"
                      />
                   </div>
                   <div className="relative">
                      <MapPin size={18} className="absolute left-3 top-3.5 text-gray-500" />
                      <textarea 
                        name="address" 
                        required 
                        placeholder="Delivery Address (Full address with landmark)" 
                        value={orderFormData.address}
                        onChange={handleOrderInputChange}
                        className="w-full bg-black/40 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-brand-gold focus:outline-none transition-colors placeholder-gray-600 font-sans min-h-[80px]"
                      ></textarea>
                   </div>
                   <div className="relative">
                      <FileText size={18} className="absolute left-3 top-3.5 text-gray-500" />
                      <textarea 
                        name="note" 
                        placeholder="Special Instructions (e.g. Less spicy)" 
                        value={orderFormData.note}
                        onChange={handleOrderInputChange}
                        className="w-full bg-black/40 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-brand-gold focus:outline-none transition-colors placeholder-gray-600 font-sans min-h-[60px]"
                      ></textarea>
                   </div>
                </div>

              </div>
              
              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-gray-800">
                <button 
                  type="submit" 
                  className="w-full py-4 bg-brand-gold text-brand-black font-bold uppercase tracking-widest hover:bg-white transition-all duration-300 rounded shadow-lg text-sm flex items-center justify-center gap-2"
                >
                  Confirm Order on WhatsApp <ChevronRight size={18} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default Menu;