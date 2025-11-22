import { Suspense, memo } from 'react';
import { Canvas } from '@react-three/fiber';
import ParticleGlobe from './ParticleGlobe';

/**
 * Hero Globe Component with Three.js Canvas
 * Partially visible 3D particle globe for homepage hero
 */
const HeroGlobe = memo(() => {
  return (
    <div className="w-full h-full overflow-hidden pointer-events-none">
      <Canvas
        camera={{ position: [4, 0, 8], fov: 50 }} // Adjusted for bigger globe
        style={{ width: '100%', height: '100%' }}
        gl={{ 
          alpha: false, // No transparency on black bg
          antialias: true,
          powerPreference: 'high-performance'
        }}
        dpr={[1, 1.5]} // Balanced performance
      >
        <Suspense fallback={null}>
          {/* Subtle lighting */}
          <ambientLight intensity={0.5} />
          <pointLight position={[5, 5, 5]} intensity={0.4} />
          <pointLight position={[-5, -5, -5]} intensity={0.25} />
          
          {/* Particle Globe */}
          <ParticleGlobe />
        </Suspense>
      </Canvas>
    </div>
  );
});

HeroGlobe.displayName = 'HeroGlobe';

export default HeroGlobe;

