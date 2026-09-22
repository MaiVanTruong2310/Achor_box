import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export interface SmartBoxModelConfig {
  initialSize?: 'S' | 'M' | 'L';
  initialModel?: 'base' | 'pro';
  initialLidOpen?: boolean;
  hasPackage?: boolean;
}

export class SmartBoxModel {
  public rootGroup: THREE.Group;
  
  // Sub-groups for exploded view & dynamic articulation
  public chassisGroup: THREE.Group;
  public lidPivot: THREE.Group;
  public lidGroup: THREE.Group;
  public lockGroup: THREE.Group;
  public controllerGroup: THREE.Group;
  public loadcellGroup: THREE.Group;
  public hx711Group: THREE.Group;
  public packageGroup: THREE.Group;
  public chamberLight: THREE.PointLight;

  // Materials map for highlighting & dynamic opacity
  private materials: Map<string, THREE.Material> = new Map();
  private meshLayers: Map<string, THREE.Object3D> = new Map();

  // Animation & state tracking
  private currentLidAngle = 0;
  private targetLidAngle = 0;
  private currentScale = 1.0;
  private targetScale = 1.0;
  private explodedProgress = 0;
  private targetExplodedProgress = 0;
  private activeLayerId: string | null = null;
  private isProModel = true;
  private hasPackagePresent = true;
  private time = 0;

  // Solenoid pin for lock animation
  private solenoidPin: THREE.Mesh | null = null;

  constructor(config?: SmartBoxModelConfig) {
    this.rootGroup = new THREE.Group();

    // Create sub-groups
    this.chassisGroup = new THREE.Group();
    this.lidPivot = new THREE.Group();
    this.lidGroup = new THREE.Group();
    this.lockGroup = new THREE.Group();
    this.controllerGroup = new THREE.Group();
    this.loadcellGroup = new THREE.Group();
    this.hx711Group = new THREE.Group();
    this.packageGroup = new THREE.Group();

    // Chamber interior LED light
    this.chamberLight = new THREE.PointLight(0x38bdf8, 0, 4);
    this.chamberLight.position.set(0, 0.8, 0);

    // Assembly hierarchy
    this.rootGroup.add(this.chassisGroup);
    this.rootGroup.add(this.lidPivot);
    this.rootGroup.add(this.lockGroup);
    this.rootGroup.add(this.controllerGroup);
    this.rootGroup.add(this.loadcellGroup);
    this.rootGroup.add(this.hx711Group);
    this.rootGroup.add(this.packageGroup);
    this.chassisGroup.add(this.chamberLight);

    // Build the 3D meshes
    this.buildChassis();
    this.buildLid();
    this.buildLockMechanism();
    this.buildControllerESP32();
    this.buildLoadCellPlatform();
    this.buildHX711Module();
    this.buildPackage();

    // Register mesh layers for exploded highlight
    this.meshLayers.set('outer-shell', this.chassisGroup);
    this.meshLayers.set('electronic-lock', this.lockGroup);
    this.meshLayers.set('controller', this.controllerGroup);
    this.meshLayers.set('loadcell', this.loadcellGroup);
    this.meshLayers.set('hx711', this.hx711Group);
    this.meshLayers.set('connectivity', this.controllerGroup);

    // Apply initial configuration
    if (config?.initialSize) this.setScaleVariant(config.initialSize);
    if (config?.initialModel) this.setModelType(config.initialModel);
    if (config?.initialLidOpen) this.setLidOpen(config.initialLidOpen);
    if (config?.hasPackage !== undefined) this.setPackagePresent(config.hasPackage);
  }

  // =========================================================================
  // 1. BUILD CHASSIS (OUTER SHELL & CHAMBER)
  // =========================================================================

  private acrylicPanel(width: number, height: number, depth: number) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshPhysicalMaterial({ color: 0xa7d8f5, transparent: true, opacity: .022, roughness: .13, metalness: .12, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
    const panel = new THREE.Mesh(geometry, material);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color: 0xa5dfff, transparent: true, opacity: .8 }));
    panel.add(edges);
    return panel;
  }

  private buildChassis() {
    const panels = [
      { size: [2.4, 2.8, .025], pos: [0, 0, -.9] },
      { size: [2.4, 2.8, .025], pos: [0, 0, .9] },
      { size: [.025, 2.8, 1.8], pos: [-1.2, 0, 0] },
      { size: [.025, 2.8, 1.8], pos: [1.2, 0, 0] },
      { size: [2.4, .035, 1.8], pos: [0, -1.4, 0] },
    ];
    for (const {size, pos} of panels) {
      const panel = this.acrylicPanel(size[0], size[1], size[2]);
      panel.position.set(pos[0], pos[1], pos[2]);
      this.chassisGroup.add(panel);
    }
    const railMaterial = new THREE.MeshStandardMaterial({ color: 0xb4d9ef, metalness: .65, roughness: .2, emissive: 0x2771a1, emissiveIntensity: .25 });
    for (const x of [-1.2, 1.2]) for (const z of [-.9, .9]) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, 2.8, 8), railMaterial);
      rail.position.set(x, 0, z);
      this.chassisGroup.add(rail);
    }
    // Visible cable loops, routed inside the acrylic enclosure.
    [0x537deb, 0xd33481, 0xd8d8ec, 0x813fec].forEach((color, index) => {
      const offset = index * .075;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-.65 + offset, -1.17, .35),
        new THREE.Vector3(-.92 + offset, -.3, .12),
        new THREE.Vector3(-.65 + offset, .4, .1),
        new THREE.Vector3(-.18 + offset, -.05, .65),
      ]);
      const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 36, .012, 6, false), new THREE.MeshStandardMaterial({color, roughness:.45}));
      this.chassisGroup.add(wire);
    });
    for (let i = 0; i < 4; i++) {
      const led = new THREE.Mesh(new THREE.SphereGeometry(.035, 10, 8), new THREE.MeshBasicMaterial({color:i % 2 ? 0x7b43ff : 0x4bbfff}));
      led.position.set(-.65 + i * .13, -1.13, .5);
      this.chassisGroup.add(led);
    }
    for (const y of [-.72, .35]) {
      const hinge = this.acrylicPanel(.16, .24, .08);
      hinge.position.set(.57, y, .96);
      this.chassisGroup.add(hinge);
    }
    this.buildKeypad();
  }

  private buildKeypad() {
    // Canvas labels are native 3D textures, so the keypad rotates with the box.
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 640;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#101822'; ctx.fillRect(0, 0, 512, 640);
    ctx.strokeStyle = '#a0b2bd'; ctx.lineWidth = 5; ctx.strokeRect(10, 10, 492, 620);
    const keys = ['1','2','3','A','4','5','6','B','7','8','9','C','*','0','#','D'];
    keys.forEach((label, i) => {
      const x = 35 + i % 4 * 115, y = 39 + Math.floor(i / 4) * 143;
      ctx.fillStyle = i % 4 === 3 || i === 12 || i === 14 ? '#b82f3b' : '#227cac';
      ctx.beginPath(); ctx.roundRect(x, y, 95, 118, 9); ctx.fill();
      ctx.strokeStyle = '#d2e9f4'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#f2faff'; ctx.font = '55px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + 47, y + 59);
    });
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const bezel = new THREE.Mesh(new RoundedBoxGeometry(.91, 1.15, .055, 2, .02), new THREE.MeshStandardMaterial({color:0x101822, roughness:.4}));
    bezel.position.set(-.06, -.52, .945); this.chassisGroup.add(bezel);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(.86, 1.08), new THREE.MeshBasicMaterial({map:texture}));
    face.position.set(-.06, -.52, .978); this.chassisGroup.add(face);
    const pcb = new THREE.Mesh(new THREE.BoxGeometry(1.13,.49,.045),new THREE.MeshStandardMaterial({color:0x12693d, roughness:.5}));
    pcb.position.set(-.06,.37,.94); this.chassisGroup.add(pcb);
    const lcdFrame = new THREE.Mesh(new THREE.BoxGeometry(.98,.34,.05),new THREE.MeshStandardMaterial({color:0x131c0e, metalness:.35, roughness:.4}));
    lcdFrame.position.set(-.06,.37,.975); this.chassisGroup.add(lcdFrame);
    const lcdCanvas=document.createElement('canvas'); lcdCanvas.width=512; lcdCanvas.height=160;
    const lcd= lcdCanvas.getContext('2d')!;
    lcd.fillStyle='#d9ed59';lcd.fillRect(0,0,512,160);lcd.fillStyle='#35562a';lcd.font='28px monospace';lcd.fillText('SMARTBOX',24,62);lcd.font='22px monospace';lcd.fillText('READY TO RECEIVE',24,112);
    const lcdTexture=new THREE.CanvasTexture(lcdCanvas);lcdTexture.colorSpace=THREE.SRGBColorSpace;
    const display=new THREE.Mesh(new THREE.PlaneGeometry(.88,.26),new THREE.MeshBasicMaterial({map:lcdTexture}));display.position.set(-.06,.37,1.006);this.chassisGroup.add(display);
    const boltMaterial=new THREE.MeshStandardMaterial({color:0xb3c3cf,metalness:.8,roughness:.2});
    for(const x of [-.56,.44]) for(const y of [.18,.56]) {
      const bolt=new THREE.Mesh(new THREE.SphereGeometry(.023,10,8),boltMaterial);bolt.position.set(x,y,.97);this.chassisGroup.add(bolt);
    }
  }

  private buildLid() {
    this.lidPivot.position.set(0, 1.42, -.9);
    this.lidPivot.add(this.lidGroup);
    const lid=this.acrylicPanel(2.44,.035,1.84);
    lid.position.set(0,.02,.9);this.lidGroup.add(lid);
  }

  // =========================================================================
  // 4. BUILD ELECTRONIC LOCK MECHANISM (SOLENOID 12V 150KG)
  // =========================================================================
  private buildLockMechanism() {
    this.lockGroup.position.set(0, 1.15, 0.72);

    // Solenoid Coil Cylinder (Copper/Brass PBR)
    const coilGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.45, 16);
    coilGeo.rotateZ(Math.PI / 2);
    const coilMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.9,
      roughness: 0.25
    });
    const coilMesh = new THREE.Mesh(coilGeo, coilMat);
    this.lockGroup.add(coilMesh);

    // Steel Mounting Bracket
    const bracketGeo = new THREE.BoxGeometry(0.65, 0.32, 0.35);
    const bracketMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.3
    });
    const bracketMesh = new THREE.Mesh(bracketGeo, bracketMat);
    this.lockGroup.add(bracketMesh);

    // Solenoid Latch Pin (Animates in/out on lock/unlock)
    const pinGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.28, 16);
    const pinMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.15
    });
    this.solenoidPin = new THREE.Mesh(pinGeo, pinMat);
    this.solenoidPin.position.set(0, 0.2, 0.1);
    this.lockGroup.add(this.solenoidPin);

    // Emergency Keyway Slot
    const keywayGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.08, 12);
    keywayGeo.rotateX(Math.PI / 2);
    const keywayMat = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.9 });
    const keywayMesh = new THREE.Mesh(keywayGeo, keywayMat);
    keywayMesh.position.set(0, -0.05, 0.18);
    this.lockGroup.add(keywayMesh);
  }

  // =========================================================================
  // 5. BUILD CONTROLLER (ESP32 DUAL-CORE & WI-FI/BLE ANTENNA)
  // =========================================================================
  private buildControllerESP32() {
    this.controllerGroup.position.set(0.65, 0.2, 0.65);

    // PCB Substrate (Matte Emerald / Dark Green)
    const pcbGeo = new THREE.BoxGeometry(0.7, 0.95, 0.04);
    const pcbMat = new THREE.MeshStandardMaterial({
      color: 0x064e3b,
      roughness: 0.45,
      metalness: 0.15
    });
    const pcbMesh = new THREE.Mesh(pcbGeo, pcbMat);
    this.controllerGroup.add(pcbMesh);

    // ESP32 Metal RF Shield Canopy
    const shieldGeo = new THREE.BoxGeometry(0.42, 0.48, 0.06);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.95,
      roughness: 0.2
    });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    shieldMesh.position.set(0, 0.08, 0.04);
    this.controllerGroup.add(shieldMesh);

    // Wi-Fi / BLE Meandering Antenna Trace (Copper)
    const antGeo = new THREE.BoxGeometry(0.48, 0.15, 0.02);
    const antMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.3
    });
    const antMesh = new THREE.Mesh(antGeo, antMat);
    antMesh.position.set(0, 0.38, 0.03);
    this.controllerGroup.add(antMesh);

    // Pulsing Wi-Fi Status LED
    const netLedGeo = new THREE.SphereGeometry(0.025, 12, 12);
    const netLedMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 1.0
    });
    const netLed = new THREE.Mesh(netLedGeo, netLedMat);
    netLed.position.set(-0.25, -0.32, 0.04);
    this.controllerGroup.add(netLed);
  }

  // =========================================================================
  // 6. BUILD LOADCELL 4-POINT STRAIN GAUGE PLATFORM (SMARTBOX PRO)
  // =========================================================================
  private buildLoadCellPlatform() {
    this.loadcellGroup.position.set(0, -1.05, 0);

    // 4 Corner Aluminum Alloy Strain Gauge Beam Bars
    const beamGeo = new THREE.BoxGeometry(0.18, 0.08, 0.35);
    const beamMat = new THREE.MeshStandardMaterial({
      color: 0xc0c8d4,
      metalness: 0.85,
      roughness: 0.25
    });

    const beamOffsets = [
      [-0.85, 0, -0.55],
      [0.85, 0, -0.55],
      [-0.85, 0, 0.55],
      [0.85, 0, 0.55]
    ];

    beamOffsets.forEach(([x, y, z]) => {
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(x, y, z);
      this.loadcellGroup.add(beam);

      // Strain Gauge Foil Patch Accent
      const foilGeo = new THREE.BoxGeometry(0.12, 0.01, 0.15);
      const foilMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.6
      });
      const foil = new THREE.Mesh(foilGeo, foilMat);
      foil.position.set(x, y + 0.045, z);
      this.loadcellGroup.add(foil);
    });

    // Elevated Weighing Platform Base Plate
    const plateGeo = new THREE.BoxGeometry(1.95, 0.05, 1.35);
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.7,
      roughness: 0.3
    });
    const plateMesh = new THREE.Mesh(plateGeo, plateMat);
    plateMesh.position.set(0, 0.08, 0);
    plateMesh.receiveShadow = true;
    this.loadcellGroup.add(plateMesh);

    // Cyan Measurement Ring Overlay (Pulsing Glow)
    const ringGeo = new THREE.RingGeometry(0.25, 0.32, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(0, 0.11, 0);
    ringMesh.visible = false;
    this.loadcellGroup.add(ringMesh);
  }

  // =========================================================================
  // 7. BUILD HX711 24-BIT ADC MODULE (DISTINCTIVE RED PCB)
  // =========================================================================
  private buildHX711Module() {
    this.hx711Group.position.set(-0.7, -0.9, 0.55);

    // Crimson Red PCB Substrate
    const hxPcbGeo = new THREE.BoxGeometry(0.4, 0.28, 0.03);
    const hxPcbMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.4,
      metalness: 0.2
    });
    const hxPcb = new THREE.Mesh(hxPcbGeo, hxPcbMat);
    this.hx711Group.add(hxPcb);

    // HX711 16-pin SOIC Integrated Circuit
    const chipGeo = new THREE.BoxGeometry(0.2, 0.12, 0.04);
    const chipMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
    const chipMesh = new THREE.Mesh(chipGeo, chipMat);
    chipMesh.position.set(0, 0, 0.03);
    this.hx711Group.add(chipMesh);

    // 4 Colored Wires (E+, E-, A+, A-) running to loadcell
    const wireColors = [0xef4444, 0x020617, 0xf8fafc, 0x10b981];
    wireColors.forEach((col, i) => {
      const wireGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.35, 8);
      wireGeo.rotateZ(Math.PI / 3);
      const wireMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 });
      const wire = new THREE.Mesh(wireGeo, wireMat);
      wire.position.set(0.1 + i * 0.04, -0.08, -0.1);
      this.hx711Group.add(wire);
    });
  }

  // =========================================================================
  // 8. BUILD SAMPLE PARCEL (PACKAGE)
  // =========================================================================
  private buildPackage() {
    this.packageGroup.position.set(0, -0.5, 0);

    // Cardboard Box
    const boxGeo = new THREE.BoxGeometry(1.1, 0.75, 0.85);
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0xc29b62,
      roughness: 0.8,
      metalness: 0.05
    });
    const boxMesh = new THREE.Mesh(boxGeo, boxMat);
    boxMesh.castShadow = true;
    this.packageGroup.add(boxMesh);

    // White Shipping Airway Bill Label
    const labelGeo = new THREE.PlaneGeometry(0.45, 0.3);
    labelGeo.rotateX(-Math.PI / 2);
    const labelMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.4
    });
    const labelMesh = new THREE.Mesh(labelGeo, labelMat);
    labelMesh.position.set(0.15, 0.38, 0.05);
    this.packageGroup.add(labelMesh);

    // Packing Tape Strip
    const tapeGeo = new THREE.BoxGeometry(1.12, 0.01, 0.12);
    const tapeMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.5 });
    const tape = new THREE.Mesh(tapeGeo, tapeMat);
    tape.position.set(0, 0.38, 0);
    this.packageGroup.add(tape);
  }

  // =========================================================================
  // 9. DYNAMIC CONTROL METHODS
  // =========================================================================

  /**
   * Set Exploded View Progress (0 = Fully Assembled, 1 = Fully Exploded)
   */
  public setExplodedProgress(progress: number, activeLayerId?: string) {
    this.targetExplodedProgress = Math.max(0, Math.min(1, progress));
    this.activeLayerId = activeLayerId || null;
  }

  /**
   * Toggle Door Lid Open / Close State
   */
  public setLidOpen(isOpen: boolean) {
    this.targetLidAngle = isOpen ? -Math.PI * 0.38 : 0;
  }

  /**
   * Set Scale for Variant (S = 0.82, M = 1.0, L = 1.25)
   */
  public setScaleVariant(size: 'S' | 'M' | 'L') {
    if (size === 'S') this.targetScale = 0.82;
    else if (size === 'M') this.targetScale = 1.0;
    else if (size === 'L') this.targetScale = 1.25;
  }

  /**
   * Switch Between SmartBox Base and SmartBox Pro
   */
  public setModelType(model: 'base' | 'pro') {
    this.isProModel = model === 'pro';
  }

  /**
   * Toggle presence of parcel inside
   */
  public setPackagePresent(hasPackage: boolean) {
    this.hasPackagePresent = hasPackage;
  }

  // =========================================================================
  // 10. FRAME RENDER UPDATE (LERPING & FLOATING)
  // =========================================================================
  public update(delta: number) {
    this.time += delta;

    // 1. Smooth Lid Rotation Lerp
    this.currentLidAngle += (this.targetLidAngle - this.currentLidAngle) * 0.12;
    this.lidPivot.rotation.x = this.currentLidAngle;

    // Solenoid pin retracts when lid opens
    if (this.solenoidPin) {
      const pinTargetY = this.targetLidAngle < -0.1 ? 0.05 : 0.2;
      this.solenoidPin.position.y += (pinTargetY - this.solenoidPin.position.y) * 0.2;
    }

    // Chamber light turns on when lid opens
    const isLidAjar = Math.abs(this.currentLidAngle) > 0.15;
    const targetLightIntensity = isLidAjar ? 2.5 : 0.0;
    this.chamberLight.intensity += (targetLightIntensity - this.chamberLight.intensity) * 0.1;

    // 2. Smooth Scale Lerp
    this.currentScale += (this.targetScale - this.currentScale) * 0.1;
    this.rootGroup.scale.set(this.currentScale, this.currentScale, this.currentScale);

    // 3. Pro Model Hardware Visibility & Pulse
    const targetLoadcellScale = this.isProModel ? 1.0 : 0.001;
    this.loadcellGroup.scale.lerp(new THREE.Vector3(targetLoadcellScale, targetLoadcellScale, targetLoadcellScale), 0.12);
    this.hx711Group.scale.lerp(new THREE.Vector3(targetLoadcellScale, targetLoadcellScale, targetLoadcellScale), 0.12);

    // Package visibility
    const targetPackageScale = this.hasPackagePresent ? 1.0 : 0.001;
    this.packageGroup.scale.lerp(new THREE.Vector3(targetPackageScale, targetPackageScale, targetPackageScale), 0.15);

    // 4. Smooth Exploded View Layer Offsets
    this.explodedProgress += (this.targetExplodedProgress - this.explodedProgress) * 0.08;
    const ep = this.explodedProgress;

    // Lid offsets upwards along +Y
    this.lidPivot.position.y = 1.45 + ep * 1.8;
    this.lidPivot.position.z = -0.9 - ep * 0.5;

    // Lock mechanism slides diagonally (+Y, +Z)
    this.lockGroup.position.set(0, 1.15 + ep * 1.0, 0.72 + ep * 0.9);

    // Controller ESP32 slides forward along +Z and slightly +X
    this.controllerGroup.position.set(-.55 + ep * 1.1, -1.18 + ep * 1.8, .05 + ep * 1.3);
    this.controllerGroup.rotation.x = -Math.PI / 2 * (1 - ep);

    // Loadcell strain gauge descends along -Y
    this.loadcellGroup.position.set(0, -1.05 - ep * 0.8, 0);

    // HX711 module offsets diagonally (-X, +Z)
    this.hx711Group.position.set(-0.7 - ep * 0.9, -0.9 + ep * 0.2, 0.55 + ep * 0.9);

    // Outer chassis drops slightly along -Y to reveal interior
    this.chassisGroup.position.set(0, -ep * 0.4, 0);

    // 5. Highlight active exploded layer with accent glow
    if (this.activeLayerId && ep > 0.1) {
      this.meshLayers.forEach((obj, key) => {
        const isTarget = key === this.activeLayerId;
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            if (isTarget) {
              child.material.emissive.setHex(0x38bdf8);
              child.material.emissiveIntensity = 0.4 + Math.sin(this.time * 4) * 0.2;
            } else {
              child.material.emissiveIntensity = 0.0;
            }
          }
        });
      });
    } else {
      // Clear emissive highlights when not specifically focused
      this.meshLayers.forEach((obj) => {
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            if (child.material.name !== 'led') {
              child.material.emissiveIntensity = 0.0;
            }
          }
        });
      });
    }
  }
}
