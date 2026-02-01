import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  barColor?: string; // Used as the blob color
}

export const Visualizer: React.FC<VisualizerProps> = ({ analyser, isActive, barColor = '#818cf8' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    // We use a resize observer or just grab rect in draw loop if needed, 
    // but for performance, we set it once here. 
    // If responsive resizing is critical during window resize, this needs a listener.
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const bufferLength = analyser ? analyser.frequencyBinCount : 0;
    const dataArray = analyser ? new Uint8Array(bufferLength) : new Uint8Array(0);

    const draw = () => {
      // Clear
      ctx.clearRect(0, 0, rect.width, rect.height);
      
      // Update data
      let volume = 0;
      if (isActive && analyser) {
        analyser.getByteFrequencyData(dataArray);
        // Calculate average volume for scale
        let sum = 0;
        // Focus on lower frequencies for the "beat"
        const lowerHalf = Math.floor(bufferLength / 2);
        for (let i = 0; i < lowerHalf; i++) {
          sum += dataArray[i];
        }
        volume = sum / lowerHalf;
      }

      // Animation parameters
      phaseRef.current += 0.01; // Rotation speed
      
      // Base radius
      const baseRadius = Math.min(rect.width, rect.height) * 0.25;
      // Pulse scale based on volume (0 to 255)
      const scale = 1 + (volume / 255) * 0.4;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Draw the fluid blob
      ctx.beginPath();
      
      // Number of points for the blob
      const points = 8;
      const angleStep = (Math.PI * 2) / points;

      for (let i = 0; i <= points; i++) {
        // Current angle
        const theta = i * angleStep + phaseRef.current;
        
        // Deform radius based on sine waves + volume
        // We use Math.sin with different frequencies to make it look "organic"
        const deformity = Math.sin(theta * 3 + phaseRef.current * 2) * 
                          Math.cos(theta * 5 - phaseRef.current) * 
                          (isActive ? (volume / 255) * 20 : 5); // reduced movement when idle

        const r = (baseRadius + deformity) * (isActive ? scale : 1);

        const x = centerX + Math.cos(theta) * r;
        const y = centerY + Math.sin(theta) * r;

        // For the first point, move to it. For others, curve to it.
        // To make it perfectly smooth, we should use control points, 
        // but drawing many small lines or a catmull-rom spline is complex.
        // Simple quadratic curves between midpoints is a standard "blob" trick.
        if (i === 0) {
            // Need to track points to do the midpoint curve method
        }
      }

      // Better Blob Algorithm:
      // Generate points
      const nodes: {x: number, y: number}[] = [];
      for (let i = 0; i < points; i++) {
          const theta = i * angleStep + phaseRef.current;
          // Audio reactivity per node if we want, but simple volume scaling is smoother for circles
          // Let's mix in specific frequency bands if possible, or just random noise
          const noise = Math.sin(i * 13.0 + phaseRef.current * 2) * (isActive ? (volume / 10) : 5);
          const r = (baseRadius * (isActive ? scale : 1)) + noise;
          nodes.push({
              x: centerX + Math.cos(theta) * r,
              y: centerY + Math.sin(theta) * r
          });
      }

      // Draw curve through points
      // Close the loop by duplicating start points
      const drawNodes = [...nodes, nodes[0], nodes[1]];
      
      ctx.beginPath();
      ctx.moveTo((nodes[0].x + nodes[nodes.length-1].x)/2, (nodes[0].y + nodes[nodes.length-1].y)/2);

      for (let i = 0; i < nodes.length; i++) {
          const p0 = drawNodes[i];
          const p1 = drawNodes[i+1];
          const midX = (p0.x + p1.x) / 2;
          const midY = (p0.y + p1.y) / 2;
          ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
      }
      
      ctx.closePath();
      
      // Gradient fill
      const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius * 0.2, centerX, centerY, baseRadius * 1.5);
      gradient.addColorStop(0, barColor);
      gradient.addColorStop(1, 'rgba(0,0,0,0)'); // Fade out
      
      ctx.fillStyle = gradient;
      // Add a glow
      ctx.shadowBlur = isActive ? 30 : 10;
      ctx.shadowColor = barColor;
      
      ctx.fill();
      
      // Reset shadow for performance
      ctx.shadowBlur = 0;

      // Draw a subtle border line
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [analyser, isActive, barColor]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
};