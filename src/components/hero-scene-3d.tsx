'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Gem {
  mesh: THREE.Mesh;
  baseY: number;
  floatSpeed: number;
  floatOffset: number;
  spinSpeed: THREE.Vector3;
}

/**
 * A small constellation of slowly rotating, faceted gem shapes rendered
 * with real three.js (not a CSS trick) - a literal 3D model layer behind
 * the hero copy. Low-poly + metallic to read as "premium ticket/jewel"
 * rather than generic tech-demo geometry, so it fits the Art Deco brand
 * instead of fighting it.
 */
export default function HeroScene3D({ className = '' }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 11);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Lighting tuned for faceted metallic gem highlights
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(5, 6, 8);
    scene.add(keyLight);
    const goldRim = new THREE.PointLight(0xc9a84c, 2.2, 30);
    goldRim.position.set(-6, -2, 4);
    scene.add(goldRim);
    const crimsonRim = new THREE.PointLight(0xc8102e, 1.6, 30);
    crimsonRim.position.set(6, 3, -2);
    scene.add(crimsonRim);

    const palette = [0xc9a84c, 0xc8102e, 0xe6c96a, 0x1a2744, 0xe8294a];
    const gems: Gem[] = [];
    const positions: [number, number, number, number][] = [
      [-3.6, 1.4, -1, 1.15],
      [3.3, -1.1, 0, 1.4],
      [-2.4, -1.9, 1, 0.8],
      [4.1, 1.8, -2, 0.75],
      [0.4, 2.6, -1.5, 0.65],
      [-4.6, -0.3, -2, 0.55],
    ];

    positions.forEach(([x, y, z, scale], i) => {
      const geometry = new THREE.IcosahedronGeometry(scale, 0);
      const material = new THREE.MeshStandardMaterial({
        color: palette[i % palette.length],
        metalness: 0.75,
        roughness: 0.22,
        flatShading: true,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      scene.add(mesh);
      gems.push({
        mesh,
        baseY: y,
        floatSpeed: 0.4 + Math.random() * 0.3,
        floatOffset: Math.random() * Math.PI * 2,
        spinSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.25,
          0.15 + Math.random() * 0.2,
          (Math.random() - 0.5) * 0.15
        ),
      });
    });

    let frameId = 0;
    let disposed = false;
    const pointer = { x: 0, y: 0 };

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = container;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();
    window.addEventListener('pointermove', handlePointerMove);

    const clock = new THREE.Clock();

    const renderStaticFrame = () => {
      renderer.render(scene, camera);
    };

    const animate = () => {
      if (disposed) return;
      const t = clock.getElapsedTime();

      gems.forEach((gem) => {
        gem.mesh.position.y = gem.baseY + Math.sin(t * gem.floatSpeed + gem.floatOffset) * 0.25;
        gem.mesh.rotation.x += gem.spinSpeed.x * 0.01;
        gem.mesh.rotation.y += gem.spinSpeed.y * 0.01;
        gem.mesh.rotation.z += gem.spinSpeed.z * 0.01;
      });

      camera.position.x += (pointer.x * 0.8 - camera.position.x) * 0.04;
      camera.position.y += (-pointer.y * 0.5 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    if (prefersReducedMotion) {
      renderStaticFrame();
    } else {
      animate();
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', handlePointerMove);
      gems.forEach((gem) => {
        gem.mesh.geometry.dispose();
        (gem.mesh.material as THREE.Material).dispose();
      });
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className={className} aria-hidden="true" />;
}
