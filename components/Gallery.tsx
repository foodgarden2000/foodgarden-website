
import React, { useState, useEffect } from 'react';
import { GALLERY_SHEET_URL, getOptimizedImageURL } from '../constants';
import { GalleryItem } from '../types';
import { Loader2, X, ZoomIn, ChevronDown, ChevronUp } from 'lucide-react';

const Gallery: React.FC = () => {
  const [images, setImages] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);
  const [visibleCount, setVisibleCount] = useState(6);

  // Fallback images if sheet fetch fails
  const fallbackImages: GalleryItem[] = [
    { image: "https://images.unsplash.com/photo-1550966871-3ed3c47e2ce2?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80", caption: "Ambiance" },
    { image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80", caption: "Signature Dish" },
    { image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80", caption: "Fine Dining" },
    { image: "https://images.unsplash.com/photo-1544148103-0773bf10d330?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80", caption: "Family Seating" },
    { image: "https://images.unsplash.com/photo-1552566626-52f8b828add9?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80", caption: "Live Kitchen" },
    { image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80", caption: "Festive Vibes" }
  ];

  useEffect(() => {
    const fetchGallery = async () => {
      setLoading(true);
      try {
        const response = await fetch(GALLERY_SHEET_URL);
        if (!response.ok) throw new Error('Failed to fetch gallery sheet');
        
        const csvText = await response.text();
        const parsedImages = parseCSV(csvText);
        
        if (parsedImages.length > 0) {
          setImages(parsedImages);
        } else {
          setImages(fallbackImages);
        }
      } catch (err) {
        console.error("Gallery fetch error:", err);
        setImages(fallbackImages);
      } finally {
        setLoading(false);
      }
    };

    fetchGallery();
  }, []);

  const parseCSV = (csvText: string): GalleryItem[] => {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return [];

    const splitLine = (line: string) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
          result.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else current += char;
      }
      result.push(current.trim().replace(/^"|"$/g, ''));
      return result;
    };

    const headers = splitLine(lines[0]).map(h => h.toLowerCase().trim());
    const imgIdx = headers.findIndex(h => h.includes('image') || h.includes('url') || h.includes('photo') || h.includes('link'));
    const captionIdx = headers.findIndex(h => h.includes('caption') || h.includes('title') || h.includes('name'));

    return lines.slice(1).map(line => {
      if (!line.trim()) return null;
      const row = splitLine(line);
      const rawUrl = row[imgIdx] || '';
      if (!rawUrl) return null;

      return {
        image: getOptimizedImageURL(rawUrl),
        caption: row[captionIdx] || ''
      };
    }).filter(item => item !== null) as GalleryItem[];
  };

  const handleSeeLess = () => {
    setVisibleCount(6);
    const gallerySection = document.getElementById('gallery');
    if (gallerySection) {
      gallerySection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const visibleImages = images.slice(0, visibleCount);

  return (
    <section id="gallery" className="py-24 bg-brand-cream relative border-t border-brand-gold/10">
      <div className="container mx-auto px-4 md:px-8">
        <div className="text-center mb-16">
           <h3 className="text-brand-gold font-sans font-bold uppercase tracking-[0.2em] text-xs mb-3">A Feast for the Eyes</h3>
           <h2 className="text-5xl font-serif font-bold text-brand-black">Our Gallery</h2>
           <div className="w-24 h-px bg-brand-gold mx-auto mt-6"></div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-12 h-12 text-brand-gold animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[250px]">
              {visibleImages.map((item, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setSelectedImage(item)}
                  className={`relative group overflow-hidden rounded-sm cursor-pointer shadow-md bg-gray-200 ${idx % 7 === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}
                >
                  <img 
                    src={item.image} 
                    alt={item.caption || `Chef's Jalsa Gallery ${idx + 1}`} 
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://picsum.photos/600/600?random=${idx + 50}`;
                    }}
                    className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105"
                  />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-brand-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4 text-center">
                    <div className="border border-white/30 p-3 rounded-full mb-3 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                      <ZoomIn className="text-white w-6 h-6" />
                    </div>
                    {item.caption && (
                      <span className="text-white font-serif font-medium tracking-wide text-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-75 border-b border-brand-gold pb-1">
                        {item.caption}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination Buttons */}
            <div className="mt-16 text-center flex justify-center gap-6">
               {/* See More Button */}
              {images.length > visibleCount && (
                <button 
                  onClick={() => setVisibleCount(prev => prev + 6)}
                  className="group flex items-center gap-2 px-10 py-4 border border-brand-gold text-brand-gold font-bold uppercase tracking-widest text-xs hover:bg-brand-gold hover:text-brand-black transition-all duration-300 shadow-md hover:shadow-xl rounded-sm"
                >
                   See More Photos <ChevronDown className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
                </button>
              )}
              
              {/* See Less Button */}
              {visibleCount > 6 && (
                <button 
                  onClick={handleSeeLess}
                  className="group flex items-center gap-2 px-10 py-4 border border-brand-dark/20 text-brand-dark font-bold uppercase tracking-widest text-xs hover:bg-brand-dark hover:text-white transition-all duration-300 shadow-sm hover:shadow-lg rounded-sm"
                >
                  See Less <ChevronUp className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            onClick={() => setSelectedImage(null)}
            className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors p-2"
          >
            <X size={32} />
          </button>
          
          <div className="relative max-w-6xl max-h-[90vh] w-full flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img 
              src={selectedImage.image} 
              alt={selectedImage.caption || "Gallery View"} 
              className="max-w-full max-h-[80vh] object-contain rounded shadow-2xl border border-gray-800"
            />
            {selectedImage.caption && (
              <p className="text-white mt-6 font-display text-2xl tracking-wide">
                {selectedImage.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default Gallery;
