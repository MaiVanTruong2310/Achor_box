import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { SmartBoxModel } from './SmartBoxModel';

export type CameraPresetType = 'hero-grand' | 'perspective' | 'front' | 'top' | 'detail';

export interface SmartBoxCanvasProps {
  mode?: 'hero' | 'exploded' | 'variant' | 'compact';
  cameraPreset?: CameraPresetType;
  isLidOpen?: boolean;
  sizeVariant?: 'S' | 'M' | 'L';
  modelType?: 'base' | 'pro';
  hasPackage?: boolean;
  explodedProgress?: number;
  activeLayerId?: string;
  enableAutoRotate?: boolean;
  enableDrag?: boolean;
  reducedMotion?: boolean;
  cameraFov?: number;
  initialRotation?: [number, number, number];
  style?: React.CSSProperties;
  className?: string;
  onBoxClick?: () => void;
}

export const SmartBoxCanvas: React.FC<SmartBoxCanvasProps> = ({
  mode = 'hero',
  cameraPreset = 'hero-grand',
  isLidOpen = false,
  sizeVariant = 'M',
  modelType = 'pro',
  hasPackage = true,
  explodedProgress = 0,
  activeLayerId,
  enableAutoRotate = true,
  enableDrag = true,
  reducedMotion = false,
  cameraFov = 36,
  initialRotation = [0.12, -Math.PI / 4.2, 0],
  style,
  className,
  onBoxClick
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modelRef = useRef<SmartBoxModel | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Camera animation lerp targets
  const targetCamPosRef = useRef(new THREE.Vector3(3.2, 1.8, 3.8));
  const targetLookAtRef = useRef(new THREE.Vector3(0, 0.05, 0));
  const currentLookAtRef = useRef(new THREE.Vector3(0, 0.05, 0));

  // Interaction tracking refs
  const isDraggingRef = useRef(false);
  const pointerStartPosRef = useRef({ x: 0, y: 0 });
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const rotationVelocityRef = useRef({ x: 0, y: 0 });
  const currentRotationRef = useRef({ x: initialRotation[0], y: initialRotation[1] });
  const hasMovedRef = useRef(false);
  const isVisibleRef = useRef(true);
  const animationFrameIdRef = useRef<number | null>(null);
  const liveProps = useRef({ cameraPreset, enableAutoRotate, reducedMotion });
  liveProps.current = { cameraPreset, enableAutoRotate, reducedMotion };

  const [isInteracting, setIsInteracting] = useState(false);

  // Update target camera position based on preset and mode
  useEffect(() => {
    if (mode === 'exploded') {
      targetCamPosRef.current.set(4.8, 2.2, 5.8);
      targetLookAtRef.current.set(0, 0.2, 0);
    } else if (mode === 'variant') {
      targetCamPosRef.current.set(3.6, 1.9, 4.4);
      targetLookAtRef.current.set(0, -0.05, 0);
    } else if (mode === 'compact') {
      targetCamPosRef.current.set(3.8, 2.2, 4.6);
      targetLookAtRef.current.set(0, 0, 0);
    } else {
      // Hero presets
      switch (cameraPreset) {
        case 'front':
          currentRotationRef.current = { x: 0, y: 0 };
          rotationVelocityRef.current = { x: 0, y: 0 };
          targetCamPosRef.current.set(0.0, 0.2, 4.2);
          targetLookAtRef.current.set(0, 0.1, 0);
          break;
        case 'top':
          currentRotationRef.current = { x: 0, y: 0 };
          rotationVelocityRef.current = { x: 0, y: 0 };
          targetCamPosRef.current.set(0.3, 4.6, 2.2);
          targetLookAtRef.current.set(0, -0.2, 0);
          break;
        case 'detail':
          targetCamPosRef.current.set(1.4, 1.2, 2.5);
          targetLookAtRef.current.set(0, 0.5, 0.7);
          break;
        case 'perspective':
          targetCamPosRef.current.set(3.8, 2.3, 4.6);
          targetLookAtRef.current.set(0, 0.05, 0);
          break;
        case 'hero-grand':
        default:
          targetCamPosRef.current.set(3.1, 1.7, 3.7);
          targetLookAtRef.current.set(0, 0.05, 0);
          break;
      }
    }
  }, [cameraPreset, mode]);

  // =========================================================================
  // INITIALIZE THREE.JS SCENE, LIGHTS & MODEL
  // =========================================================================
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;
    const isMobile = window.innerWidth < 768;

    // 1. Scene
    const scene = new THREE.Scene();

    // 2. Camera with tuned FOV for cinema hero
    const camera = new THREE.PerspectiveCamera(cameraFov, width / height, 0.1, 100);
    camera.position.copy(targetCamPosRef.current);
    camera.lookAt(targetLookAtRef.current);
    cameraRef.current = camera;
    currentLookAtRef.current.copy(targetLookAtRef.current);

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isMobile,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    renderer.shadowMap.enabled = !isMobile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. Apple-Grade Radiant Studio Lighting Rig
    // Ambient fill - significantly brighter so materials are crisp and clear
    const ambientLight = new THREE.AmbientLight(0x283854, 3.6);
    scene.add(ambientLight);

    // Key Light (Warm-white directional from top-right)
    const keyLight = new THREE.DirectionalLight(0xffffff, 4.2);
    keyLight.position.set(4.5, 7.5, 4);
    if (!isMobile) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    // Front Light (Illuminates keypad and front panel directly)
    const frontLight = new THREE.DirectionalLight(0xffffff, 2.6);
    frontLight.position.set(0, 2, 6);
    scene.add(frontLight);

    // Rim Light (Cyan Electric Accent) - Apple signature edge reflection
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 4.5);
    rimLight.position.set(-5, 4.5, -4);
    scene.add(rimLight);

    // Fill Light (Subtle indigo bounce from underneath)
    const fillLight = new THREE.DirectionalLight(0xa5b4fc, 2.2);
    fillLight.position.set(4, -2, -3);
    scene.add(fillLight);

    // Overhead Studio Spotlight (Iconic Apple Keynote Downlight)
    const topSpotlight = new THREE.SpotLight(0xffffff, 4.5, 16, Math.PI / 3.8, 0.45, 1.0);
    topSpotlight.position.set(0, 6.5, 1.5);
    scene.add(topSpotlight);

    // Ground Contact Shadow plane
    const shadowPlaneGeo = new THREE.PlaneGeometry(9, 9);
    shadowPlaneGeo.rotateX(-Math.PI / 2);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.position.y = -1.6;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // 5. SmartBox 3D Model Instance
    const boxModel = new SmartBoxModel({
      initialSize: sizeVariant,
      initialModel: modelType,
      initialLidOpen: isLidOpen,
      hasPackage
    });
    modelRef.current = boxModel;
    scene.add(boxModel.rootGroup);

    // Target spotlight at model center
    topSpotlight.target = boxModel.rootGroup;

    // Set initial model rotation
    boxModel.rootGroup.rotation.x = currentRotationRef.current.x;
    boxModel.rootGroup.rotation.y = currentRotationRef.current.y;

    // 6. Render Loop
    const clock = new THREE.Clock();
    let time = 0;

    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
      if (!isVisibleRef.current) return;

      const delta = Math.min(clock.getDelta(), 0.1);
      time += delta;

      // Update model dynamic state (solenoid, lid hinge, scale)
      boxModel.update(delta);

      // Smooth camera position and lookAt interpolation (Apple smooth transition)
      camera.position.lerp(targetCamPosRef.current, 0.05);
      currentLookAtRef.current.lerp(targetLookAtRef.current, 0.05);
      camera.lookAt(currentLookAtRef.current);

      // Handle drag inertia & auto-rotation
      if (!isDraggingRef.current) {
        // Apply inertia velocity
        currentRotationRef.current.y += rotationVelocityRef.current.x;
        currentRotationRef.current.x += rotationVelocityRef.current.y;

        // Damping
        rotationVelocityRef.current.x *= 0.92;
        rotationVelocityRef.current.y *= 0.92;

        // Gentle auto-rotation when idle (in hero & variant modes)
        const canAutoRotate =
          liveProps.current.enableAutoRotate &&
          !liveProps.current.reducedMotion &&
          liveProps.current.cameraPreset !== 'front' &&
          liveProps.current.cameraPreset !== 'detail' &&
          Math.abs(rotationVelocityRef.current.x) < 0.001;

        if (canAutoRotate) {
          currentRotationRef.current.y += delta * 0.06;
        }
      }

      // Clamp vertical pitch rotation to prevent flipping upside down
      currentRotationRef.current.x = Math.max(-0.45, Math.min(0.65, currentRotationRef.current.x));

      // Apply rotation to model
      boxModel.rootGroup.rotation.y = currentRotationRef.current.y;
      boxModel.rootGroup.rotation.x = currentRotationRef.current.x;

      // Subtle floating levitation in hero & variant modes
      if (!liveProps.current.reducedMotion && (mode === 'hero' || mode === 'variant')) {
        boxModel.rootGroup.position.y = Math.sin(time * 0.65) * 0.035;
      } else {
        boxModel.rootGroup.position.y = 0;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 7. Resize Observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 8. Intersection Observer (pause loop when offscreen)
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.1 }
    );
    intersectionObserver.observe(container);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => {
            Object.values(material).forEach(value => { if (value instanceof THREE.Texture) value.dispose(); });
            material.dispose();
          });
        }
      });
      renderer.dispose();
      scene.clear();
      modelRef.current = null;
    };
  }, [cameraFov, mode]);

  // =========================================================================
  // DYNAMIC PROPS SYNC (LID, SIZE, MODEL, PACKAGE, EXPLODED)
  // =========================================================================
  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.setLidOpen(isLidOpen);
    }
  }, [isLidOpen]);

  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.setScaleVariant(sizeVariant);
    }
  }, [sizeVariant]);

  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.setModelType(modelType);
    }
  }, [modelType]);

  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.setPackagePresent(hasPackage);
    }
  }, [hasPackage]);

  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.setExplodedProgress(explodedProgress, activeLayerId);
    }
  }, [explodedProgress, activeLayerId]);

  // =========================================================================
  // INTERACTIVE POINTER / TOUCH CONTROLS
  // =========================================================================
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!enableDrag) return;
      isDraggingRef.current = true;
      hasMovedRef.current = false;
      setIsInteracting(true);
      pointerStartPosRef.current = { x: e.clientX, y: e.clientY };
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
      rotationVelocityRef.current = { x: 0, y: 0 };
      try {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // Safe ignore
      }
    },
    [enableDrag]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDraggingRef.current || !enableDrag) return;

      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      // Track whether pointer has moved substantially to prevent firing onBoxClick
      const dist = Math.hypot(e.clientX - pointerStartPosRef.current.x, e.clientY - pointerStartPosRef.current.y);
      if (dist > 6) {
        hasMovedRef.current = true;
      }

      const sensitivity = 0.0065;
      rotationVelocityRef.current = {
        x: deltaX * sensitivity,
        y: deltaY * sensitivity
      };

      currentRotationRef.current.y += deltaX * sensitivity;
      currentRotationRef.current.x += deltaY * sensitivity;

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    },
    [enableDrag]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      isDraggingRef.current = false;
      setIsInteracting(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if already released
      }

      // If clicked without substantial dragging, trigger click interaction
      if (!hasMovedRef.current && onBoxClick) {
        onBoxClick();
      }
    },
    [onBoxClick]
  );

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '340px',
        overflow: 'hidden',
        userSelect: 'none',
        touchAction: 'pan-y',
        ...style
      }}
      className={className}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Mô hình SmartBox 3D tương tác. Kéo hoặc dùng phím mũi tên để xoay."
        tabIndex={enableDrag ? 0 : -1}
        onKeyDown={event => {
          if (!enableDrag || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
          event.preventDefault();
          if (event.key === 'ArrowLeft') currentRotationRef.current.y -= .15;
          if (event.key === 'ArrowRight') currentRotationRef.current.y += .15;
          if (event.key === 'ArrowUp') currentRotationRef.current.x -= .1;
          if (event.key === 'ArrowDown') currentRotationRef.current.x += .1;
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: enableDrag ? (isInteracting ? 'grabbing' : 'grab') : 'default'
        }}
      />
    </div>
  );
};
