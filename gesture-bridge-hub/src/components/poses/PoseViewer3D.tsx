import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';

const Skeleton = () => {
  // Simple T-pose-like placeholder
  const points: [number, number, number][] = [
    [0, 1.2, 0], [0, 0.8, 0],
    [0, 0.8, 0], [-0.5, 0.8, 0],
    [0, 0.8, 0], [0.5, 0.8, 0],
    [0, 0.8, 0], [0, 0.2, 0],
    [0, 0.2, 0], [-0.2, -0.6, 0],
    [0, 0.2, 0], [0.2, -0.6, 0],
  ];
  return (
    <group>
      <Line points={points} color={"hsl(var(--primary))"} lineWidth={3} dashed={false} />
    </group>
  );
};

export const PoseViewer3D = () => {
  return (
    <div className="h-80 w-full rounded-lg border bg-card overflow-hidden">
      <Canvas camera={{ position: [2, 2, 2], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5,5,5]} intensity={0.7} />
        <Skeleton />
        <OrbitControls enablePan={false} />
      </Canvas>
    </div>
  );
};
