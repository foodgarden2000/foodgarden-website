import React from 'react';

const About: React.FC = () => {
  return (
    <section id="about" className="py-24 bg-brand-cream overflow-hidden relative">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          
          {/* Image Grid with Premium Frame */}
          <div className="w-full lg:w-1/2 relative">
            <div className="absolute -top-4 -left-4 w-24 h-24 border-t-2 border-l-2 border-brand-gold/30"></div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 border-b-2 border-r-2 border-brand-gold/30"></div>
            
            <div className="grid grid-cols-2 gap-6 relative z-10">
              <img 
                src="https://images.unsplash.com/photo-1559339352-11d035aa65de?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80" 
                alt="Restaurant Ambiance" 
                className="w-full h-72 md:h-96 object-cover rounded-sm shadow-2xl transform translate-y-12"
              />
              <img 
                src="https://images.unsplash.com/photo-1577106263724-2c8e03bfe9cf?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80" 
                alt="Chef plating food" 
                className="w-full h-72 md:h-96 object-cover rounded-sm shadow-2xl"
              />
            </div>
          </div>

          {/* Text Content */}
          <div className="w-full lg:w-1/2 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-4 mb-4">
               <span className="h-px w-12 bg-brand-gold"></span>
               <h3 className="text-brand-gold font-sans font-bold uppercase tracking-[0.2em] text-xs">Our Story</h3>
            </div>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-brand-black mb-8 leading-tight">
              Culinary Excellence in <br/> <span className="text-brand-gold italic">Jhumri Telaiya</span>
            </h2>
            
            <p className="text-gray-600 leading-relaxed mb-6 font-sans font-light text-lg">
              Welcome to <span className="font-bold text-brand-dark">’food garden</span>, where passion meets the plate. Located in the heart of Koderma, we bring you a dining experience that blends traditional Indian flavors with modern culinary techniques. 
            </p>
            <p className="text-gray-600 leading-relaxed mb-10 font-sans font-light text-lg">
              Whether you are craving spicy Chinese starters, a hearty Indian main course, or just want to relax with festive snacks, our menu is designed to "Test Your Taste". We pride ourselves on our warm hospitality, elegant ambiance, and commitment to hygiene.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 border-t border-brand-gold/20 pt-8">
              <div className="text-center lg:text-left">
                <span className="block text-4xl font-display text-brand-gold font-bold mb-1">10+</span>
                <span className="text-[10px] md:text-xs uppercase tracking-widest text-brand-dark font-bold">Years Exp.</span>
              </div>
              <div className="text-center lg:text-left border-l border-brand-gold/20 pl-8">
                <span className="block text-4xl font-display text-brand-gold font-bold mb-1">100+</span>
                <span className="text-[10px] md:text-xs uppercase tracking-widest text-brand-dark font-bold">Unique Dishes</span>
              </div>
              <div className="text-center lg:text-left border-l border-brand-gold/20 pl-8">
                <span className="block text-4xl font-display text-brand-gold font-bold mb-1">4.8</span>
                <span className="text-[10px] md:text-xs uppercase tracking-widest text-brand-dark font-bold">Star Rating</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default About;