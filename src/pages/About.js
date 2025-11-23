import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { THEME } from '@lib/themeColors';
import AnimatedCard from '@components/ui/AnimatedCard';
import { FiInfo } from 'react-icons/fi';
import Navbar from '@layouts/Navbar';

const ABOUT_CONTENT = [
  {
    id: 1,
    title: "How it Works - Core Concept",
    text: "NodePass validates tickets via NFC in three steps: identification with a smartphone, validation, and confirmation. The process, prioritizing customer anonymity, automates reading, checking, and payment—enhancing passenger check-in speed and safety.",
    image: "/src/assets/img/overview.png"
  },
  {
    id: 2,
    title: "Core Concept - Step 1",
    text: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    image: "https://placehold.co/600x400/2b2b2b/FFF?text=Step+2"
  }
];

const About = memo(() => {
  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: THEME.background }}
    >
      <Navbar />
      
      <div className="flex-grow p-4 md:p-8 max-w-6xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: THEME.text }}>
            About Our Service
          </h1>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: THEME.textMuted }}>
            Learn how our anonymous ticketing system protects your privacy while ensuring a seamless travel experience.
          </p>
        </motion.div>

        <div className="space-y-12">
          {ABOUT_CONTENT.map((item, index) => (
            <AnimatedCard
              key={item.id}
              delay={index * 0.1}
              className="overflow-hidden rounded-2xl border-2"
              style={{ 
                backgroundColor: THEME.card,
                borderColor: THEME.border
              }}
            >
              <div className={`flex flex-col ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 p-6 md:p-8 items-center`}>
                <div className="w-full md:w-1/2">
                  <div className="aspect-video rounded-xl overflow-hidden bg-gray-800 shadow-lg">
                    <img 
                      src={item.image} 
                      alt={item.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                </div>
                
                <div className="w-full md:w-1/2 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full" style={{ backgroundColor: `${THEME.accent}20` }}>
                      <FiInfo size={24} style={{ color: THEME.accent }} />
                    </div>
                    <h2 className="text-2xl font-bold" style={{ color: THEME.text }}>
                      {item.title}
                    </h2>
                  </div>
                  
                  <p className="text-lg leading-relaxed" style={{ color: THEME.textMuted }}>
                    {item.text}
                  </p>
                </div>
              </div>
            </AnimatedCard>
          ))}
        </div>
      </div>
    </div>
  );
});

About.displayName = 'About';

export default About;

