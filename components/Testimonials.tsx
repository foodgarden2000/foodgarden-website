import React from 'react';
import { REVIEWS } from '../constants';
import { Star, Quote } from 'lucide-react';

const Testimonials: React.FC = () => {
  return (
    <section className="py-24 bg-brand-cream relative">
      <div className="container mx-auto px-4 md:px-8">
        <div className="text-center mb-16">
           <h3 className="text-brand-gold font-sans font-bold uppercase tracking-[0.2em] text-xs mb-3">Testimonials</h3>
           <h2 className="text-4xl md:text-5xl font-serif font-bold text-brand-black">Words from our Guests</h2>
           <div className="w-24 h-px bg-brand-gold mx-auto mt-6"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {REVIEWS.map((review) => (
            <div key={review.id} className="bg-white p-10 rounded-sm shadow-xl relative group hover:-translate-y-2 transition-transform duration-300 border-t-2 border-transparent hover:border-brand-gold">
              <Quote className="absolute top-8 right-8 text-brand-gold/20 fill-current w-12 h-12 group-hover:text-brand-gold/40 transition-colors" />
              
              <div className="flex text-brand-gold mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "" : "text-gray-200"} />
                ))}
              </div>
              
              <p className="text-gray-600 mb-8 italic relative z-10 font-serif text-lg leading-relaxed">
                "{review.comment}"
              </p>
              
              <div className="flex items-center mt-auto">
                <div className="w-12 h-12 rounded-full bg-brand-black text-brand-gold flex items-center justify-center font-bold font-serif text-xl shadow-lg">
                  {review.name.charAt(0)}
                </div>
                <div className="ml-4">
                  <h4 className="font-bold text-brand-black font-sans uppercase text-sm tracking-wider">{review.name}</h4>
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Verified Guest</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;