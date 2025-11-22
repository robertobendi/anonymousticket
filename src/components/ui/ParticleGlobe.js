import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Plus Sign Component - Always faces camera (billboard effect)
 */
function PlusSign({ position }) {
  const meshRef = useRef();
  const { camera } = useThree();

  // Make plus sign always face the camera
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.lookAt(camera.position);
    }
  });

  return (
    <group ref={meshRef} position={position}>
      {/* Horizontal line */}
      <mesh>
        <planeGeometry args={[0.12, 0.03]} />
        <meshBasicMaterial 
          color="#ffffff" 
          transparent 
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Vertical line */}
      <mesh>
        <planeGeometry args={[0.03, 0.12]} />
        <meshBasicMaterial 
          color="#ffffff" 
          transparent 
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/**
 * 3D Particle Globe Component with Plus Signs
 * Creates a rotating globe made of white plus signs that always face the camera
 */
function ParticleGlobe() {
  const groupRef = useRef();
  const particleCount = 800; // Tasteful amount - not overwhelming

  // Generate particles in a sphere shape
  const particles = useMemo(() => {
    const radius = 4.5; // Much bigger - will overflow the page
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
      // Spherical coordinates for even distribution
      const theta = Math.random() * Math.PI * 2; // Azimuth angle
      const phi = Math.acos(Math.random() * 2 - 1); // Polar angle
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      particles.push([x, y, z]);
    }
    
    return particles;
  }, []);

  // Rotate the globe
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15; // Slow, smooth rotation
      groupRef.current.rotation.x += delta * 0.03; // Subtle tilt
    }
  });

  return (
    <group ref={groupRef}>
      {particles.map((position, i) => (
        <PlusSign key={i} position={position} />
      ))}
    </group>
  );
}

export default ParticleGlobe;

