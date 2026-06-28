/* ════════════════════════════════════════════════════════════════
   EARTH IMMUNE SYSTEM AI — app.js
   Single combined JavaScript bundle (all modules)

   Load order:
   1. ThreeBackground  — animated 3-D scene
   2. Charts           — Chart.js configurations
   3. Maps             — Leaflet.js India maps
   4. Dashboard        — command-centre data & live feed
   5. Forest           — forest monitor page
   6. Plantation       — tree planner page
   7. Disaster         — disaster risk page
   8. Farmer           — farmer advisory page
   9. Main (IIFE)      — navigation, GSAP, light-mode, boot
   ════════════════════════════════════════════════════════════════ */


/* ── MODULE: three-background.js ─────────────────────────────────────── */
/**
 * EARTH IMMUNE SYSTEM AI
 * Three.js Environmental Background
 * Floating particles, network nodes, light trails, earth grid
 */

const ThreeBackground = (function () {
  let scene, camera, renderer;
  let particles, networkLines, earthGrid, lightTrails;
  let frameId;
  let clock;
  let nodes = [];
  let trails = [];
  let treeIcons = [];
  let dataStreams = [];

  const CONFIG = {
    particleCount: 800,
    nodeCount: 60,
    trailCount: 20,
    treeCount: 15,
    colors: {
      neon:   0x00E840,   // Raveon primary green
      cyan:   0x00C853,   // secondary green
      gold:   0x7CFF6E,   // light lime
      red:    0xFF4444,   // alert red
      orange: 0xFF7B00,   // alert orange
      dark:   0x000C02,
    }
  };

  function init() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;

    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030B04, 0.048);

    // Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 28);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    clock = new THREE.Clock();

    // Build scene components
    createStarfield();
    createEarthGrid();
    createParticles();
    createNetworkNodes();
    createLightTrails();
    createTreeIcons();
    createDataStreams();
    createAmbientLight();

    // Events
    window.addEventListener('resize', onResize);

    // Start loop
    animate();
  }

  // ── Starfield background dots ──────────────────────────────
  function createStarfield() {
    const geo = new THREE.BufferGeometry();
    const count = 1200;
    const positions = new Float32Array(count * 3);
    const colors    = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 120;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200 - 50;

      const t = Math.random();
      if (t < 0.65) {
        // Primary bold green
        colors[i * 3] = 0.0; colors[i * 3 + 1] = 0.91; colors[i * 3 + 2] = 0.25;
      } else if (t < 0.85) {
        // Medium green
        colors[i * 3] = 0.0; colors[i * 3 + 1] = 0.78; colors[i * 3 + 2] = 0.33;
      } else {
        // Light lime accent
        colors[i * 3] = 0.48; colors[i * 3 + 1] = 1.0; colors[i * 3 + 2] = 0.43;
      }
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
    });

    scene.add(new THREE.Points(geo, mat));
  }

  // ── Earth-style wireframe grid ─────────────────────────────
  function createEarthGrid() {
    const geo = new THREE.SphereGeometry(12, 32, 24);
    const mat = new THREE.MeshBasicMaterial({
      color: CONFIG.colors.neon,
      wireframe: true,
      transparent: true,
      opacity: 0.04,
    });
    earthGrid = new THREE.Mesh(geo, mat);
    earthGrid.position.set(0, -6, -15);
    scene.add(earthGrid);

    // Second larger translucent sphere
    const geo2 = new THREE.SphereGeometry(15, 24, 16);
    const mat2 = new THREE.MeshBasicMaterial({
      color: CONFIG.colors.cyan,
      wireframe: true,
      transparent: true,
      opacity: 0.02,
    });
    const sphere2 = new THREE.Mesh(geo2, mat2);
    sphere2.position.set(0, -6, -15);
    scene.add(sphere2);

    // Equatorial ring
    const ringGeo = new THREE.TorusGeometry(13, 0.04, 8, 120);
    const ringMat = new THREE.MeshBasicMaterial({
      color: CONFIG.colors.neon,
      transparent: true,
      opacity: 0.25,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(0, -6, -15);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);

    // Tilted orbital ring
    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(14, 0.025, 6, 100),
      new THREE.MeshBasicMaterial({ color: CONFIG.colors.cyan, transparent: true, opacity: 0.15 })
    );
    ring2.position.set(0, -6, -15);
    ring2.rotation.x = Math.PI / 4;
    ring2.rotation.y = Math.PI / 6;
    scene.add(ring2);
  }

  // ── Floating environmental particles ──────────────────────
  function createParticles() {
    const geo = new THREE.BufferGeometry();
    const count = CONFIG.particleCount;
    const positions = new Float32Array(count * 3);
    const colors    = new Float32Array(count * 3);
    const sizes     = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;

      const c = Math.random();
      if (c < 0.55)       { colors[i*3]=0;    colors[i*3+1]=0.91; colors[i*3+2]=0.25; } // neon green
      else if (c < 0.80)  { colors[i*3]=0;    colors[i*3+1]=0.78; colors[i*3+2]=0.33; } // mid green
      else if (c < 0.92)  { colors[i*3]=0.48; colors[i*3+1]=1.0;  colors[i*3+2]=0.43; } // lime
      else                { colors[i*3]=1;    colors[i*3+1]=0.27; colors[i*3+2]=0.27; } // alert red

      sizes[i] = Math.random() * 2.5 + 0.5;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    particles = new THREE.Points(geo, mat);
    scene.add(particles);
  }

  // ── Network nodes with connecting lines ───────────────────
  function createNetworkNodes() {
    nodes = [];
    const group = new THREE.Group();

    // Create node positions
    for (let i = 0; i < CONFIG.nodeCount; i++) {
      const x = (Math.random() - 0.5) * 70;
      const y = (Math.random() - 0.5) * 35;
      const z = (Math.random() - 0.5) * 50;
      nodes.push({ x, y, z, speed: Math.random() * 0.3 + 0.1 });
    }

    // Draw connecting lines between nearby nodes
    const linePositions = [];
    const lineColors    = [];

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dz = nodes[i].z - nodes[j].z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

        if (dist < 18) {
          const alpha = 1 - dist / 18;
          linePositions.push(nodes[i].x, nodes[i].y, nodes[i].z);
          linePositions.push(nodes[j].x, nodes[j].y, nodes[j].z);
          lineColors.push(0, alpha * 0.91, alpha * 0.25, 0, alpha * 0.78, alpha * 0.33);
        }
      }
    }

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    lineGeo.setAttribute('color',    new THREE.Float32BufferAttribute(lineColors, 3));

    networkLines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    scene.add(networkLines);

    // Add node spheres
    nodes.forEach(n => {
      const geo = new THREE.SphereGeometry(0.12, 6, 6);
      const mat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? CONFIG.colors.neon : CONFIG.colors.cyan,
        transparent: true,
        opacity: 0.8,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(n.x, n.y, n.z);
      n.mesh = mesh;
      n.baseY = n.y;
      n.phase = Math.random() * Math.PI * 2;
      group.add(mesh);
    });

    scene.add(group);
    networkLines.nodeGroup = group;
  }

  // ── Light trail streaks ────────────────────────────────────
  function createLightTrails() {
    trails = [];

    for (let i = 0; i < CONFIG.trailCount; i++) {
      const length = Math.floor(Math.random() * 20) + 10;
      const positions = new Float32Array(length * 3);
      const colors    = new Float32Array(length * 3);

      const x = (Math.random() - 0.5) * 80;
      const y = (Math.random() - 0.5) * 30;
      const z = (Math.random() - 0.5) * 40;
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.3
      ).normalize();

      const isGreen = Math.random() > 0.4;
      const r = isGreen ? 0 : 0;
      const g = isGreen ? 1 : 0.85;
      const b = isGreen ? 0.53 : 1;

      for (let j = 0; j < length; j++) {
        const t = j / (length - 1);
        positions[j * 3]     = x + dir.x * j * 0.4;
        positions[j * 3 + 1] = y + dir.y * j * 0.4;
        positions[j * 3 + 2] = z + dir.z * j * 0.4;
        colors[j * 3]     = r;
        colors[j * 3 + 1] = g * (1 - t * 0.9);
        colors[j * 3 + 2] = b * (1 - t * 0.9);
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }));

      const trail = {
        mesh: line,
        speed: Math.random() * 0.08 + 0.03,
        dir,
        life: Math.random(),
        maxLife: Math.random() * 3 + 2,
        startX: x, startY: y, startZ: z,
      };

      trails.push(trail);
      scene.add(line);
    }
  }

  // ── Tree-like icon sprites ─────────────────────────────────
  function createTreeIcons() {
    for (let i = 0; i < CONFIG.treeCount; i++) {
      // Trunk
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.08, 0.5, 6),
        new THREE.MeshBasicMaterial({ color: 0x3D6B44, transparent: true, opacity: 0.5 })
      );

      // Canopy layers
      const layer1 = new THREE.Mesh(
        new THREE.ConeGeometry(0.35, 0.6, 7),
        new THREE.MeshBasicMaterial({ color: CONFIG.colors.neon, transparent: true, opacity: 0.3 })
      );
      const layer2 = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.5, 7),
        new THREE.MeshBasicMaterial({ color: CONFIG.colors.neon, transparent: true, opacity: 0.4 })
      );
      const layer3 = new THREE.Mesh(
        new THREE.ConeGeometry(0.2, 0.4, 7),
        new THREE.MeshBasicMaterial({ color: 0xADFF8C, transparent: true, opacity: 0.5 })
      );

      layer1.position.y = 0.55;
      layer2.position.y = 0.85;
      layer3.position.y = 1.08;

      const tree = new THREE.Group();
      tree.add(trunk, layer1, layer2, layer3);
      tree.position.set(
        (Math.random() - 0.5) * 70,
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 45
      );
      tree.scale.setScalar(Math.random() * 0.6 + 0.4);
      tree.userData = { phase: Math.random() * Math.PI * 2, speed: Math.random() * 0.3 + 0.1 };

      treeIcons.push(tree);
      scene.add(tree);
    }
  }

  // ── Data stream ribbons ────────────────────────────────────
  function createDataStreams() {
    dataStreams = [];
    const count = 8;

    for (let i = 0; i < count; i++) {
      const points = [];
      const x = (Math.random() - 0.5) * 80;
      const y = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 40;

      for (let j = 0; j < 6; j++) {
        points.push(new THREE.Vector3(
          x + j * (Math.random() - 0.5) * 3,
          y + Math.sin(j * 0.8) * 2,
          z + j * 0.5
        ));
      }

      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.015, 4, false);
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? CONFIG.colors.neon : CONFIG.colors.cyan,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const tube = new THREE.Mesh(tubeGeo, mat);
      dataStreams.push({ mesh: tube, phase: Math.random() * Math.PI * 2 });
      scene.add(tube);
    }
  }

  // ── Ambient scene light ────────────────────────────────────
  function createAmbientLight() {
    scene.add(new THREE.AmbientLight(0x001808, 2));

    const pLight1 = new THREE.PointLight(CONFIG.colors.neon, 1.5, 50);
    pLight1.position.set(-15, 10, 10);
    scene.add(pLight1);

    const pLight2 = new THREE.PointLight(CONFIG.colors.cyan, 1, 40);
    pLight2.position.set(20, -5, 5);
    scene.add(pLight2);
  }

  // ── Animation loop ─────────────────────────────────────────
  function animate() {
    frameId = requestAnimationFrame(animate);
    const t  = clock.getElapsedTime();
    const dt = clock.getDelta();

    // Rotate earth grid
    if (earthGrid) {
      earthGrid.rotation.y += 0.0008;
      earthGrid.rotation.x += 0.0002;
    }

    // Float particles
    if (particles) {
      particles.rotation.y  = t * 0.012;
      particles.rotation.x  = Math.sin(t * 0.008) * 0.05;

      const pos = particles.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i) + 0.008 * Math.sin(t * 0.5 + i * 0.3);
        pos.setY(i, y);
        if (y > 22) pos.setY(i, -22);
      }
      pos.needsUpdate = true;
    }

    // Animate network nodes (float up/down)
    nodes.forEach(n => {
      if (n.mesh) {
        n.mesh.position.y = n.baseY + Math.sin(t * n.speed + n.phase) * 0.8;
      }
    });

    // Animate network lines (pulse opacity)
    if (networkLines) {
      networkLines.material.opacity = 0.12 + Math.sin(t * 0.8) * 0.08;
    }

    // Move light trails
    trails.forEach(trail => {
      trail.life += dt * trail.speed;
      if (trail.life > trail.maxLife) {
        trail.life = 0;
        // Reset to new position
        trail.startX = (Math.random() - 0.5) * 80;
        trail.startY = (Math.random() - 0.5) * 30;
        trail.startZ = (Math.random() - 0.5) * 40;
        trail.dir = new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.3
        ).normalize();
      }
      const offset = trail.life / trail.maxLife;
      const pos = trail.mesh.geometry.attributes.position;
      const cnt = pos.count;
      for (let j = 0; j < cnt; j++) {
        const jt = j / (cnt - 1);
        pos.setXYZ(
          j,
          trail.startX + trail.dir.x * (offset + jt) * 12,
          trail.startY + trail.dir.y * (offset + jt) * 12 + Math.sin(t + jt) * 0.3,
          trail.startZ + trail.dir.z * (offset + jt) * 12
        );
      }
      pos.needsUpdate = true;
      trail.mesh.material.opacity = 0.3 + Math.sin(t * 1.5 + trail.life) * 0.2;
    });

    // Sway trees
    treeIcons.forEach(tree => {
      const { phase, speed } = tree.userData;
      tree.rotation.z = Math.sin(t * speed + phase) * 0.06;
      tree.position.y += Math.sin(t * speed * 0.5 + phase) * 0.002;
    });

    // Pulse data streams
    dataStreams.forEach(ds => {
      ds.mesh.material.opacity = 0.15 + Math.sin(t * 1.2 + ds.phase) * 0.15;
    });

    // Slow camera drift
    camera.position.x = Math.sin(t * 0.04) * 4;
    camera.position.y = 8 + Math.sin(t * 0.03) * 2;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  // ── Resize handler ─────────────────────────────────────────
  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  // ── Destroy ────────────────────────────────────────────────
  function destroy() {
    cancelAnimationFrame(frameId);
    window.removeEventListener('resize', onResize);
    renderer.dispose();
  }

  function setLightMode(on) {
    if (!particles) return;
    const cols = particles.geometry.attributes.color;
    for (let i = 0; i < cols.count; i++) {
      const r = Math.random();
      if (on) {
        // Dark forest green — visible on white/light background
        if (r < 0.55)      { cols.setXYZ(i, 0.00, 0.48, 0.16); }
        else if (r < 0.80) { cols.setXYZ(i, 0.04, 0.38, 0.12); }
        else if (r < 0.92) { cols.setXYZ(i, 0.08, 0.55, 0.20); }
        else               { cols.setXYZ(i, 0.60, 0.08, 0.08); }
      } else {
        // Bright neon — visible on dark background
        if (r < 0.55)      { cols.setXYZ(i, 0.00, 0.91, 0.25); }
        else if (r < 0.80) { cols.setXYZ(i, 0.00, 0.78, 0.33); }
        else if (r < 0.92) { cols.setXYZ(i, 0.48, 1.00, 0.43); }
        else               { cols.setXYZ(i, 1.00, 0.27, 0.27); }
      }
    }
    cols.needsUpdate = true;
    particles.material.opacity = on ? 0.85 : 0.65;
  }

  return { init, destroy, setLightMode };
})();

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
  ThreeBackground.init();
  if(document.getElementById('earth-canvas')) InteractiveEarth.init();
});

/* ── MODULE: InteractiveEarth ──────────────────────────────────── */
/**
 * EARTH IMMUNE SYSTEM AI
 * 3D Realistic Textured Earth (Landing Page Right Side)
 * Uses NASA Blue Marble textures — drag to rotate, auto-spins
 */
const InteractiveEarth = (function () {
  let scene, camera, renderer, earthGroup, cloudsMesh, atmosphereMesh;
  let frameId;
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };
  let targetRotation  = { x: 0.2, y: 0 };
  let currentRotation = { x: 0.2, y: 0 };
  let autoSpin = true;

  // ── Texture URLs (local files) ───────────────────────────
  const TEX = {
    day:      'earth_day.jpg',
    bump:     'earth_bump.jpg',
    specular: 'earth_specular.jpg',
    clouds:   'earth_clouds.png',
  };

  function init() {
    const canvas = document.getElementById('earth-canvas');
    if (!canvas) return;

    const SIZE = 480;

    // Scene & Camera
    scene  = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.z = 2.8;

    // Renderer — transparent background so page bg shows through
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(SIZE, SIZE);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    // Group to hold earth layers
    earthGroup = new THREE.Group();
    scene.add(earthGroup);

    const loader = new THREE.TextureLoader();

    // ── 1. Earth Surface ──────────────────────────────────────
    loader.load(TEX.day, (dayTex) => {
      loader.load(TEX.bump, (bumpTex) => {
        loader.load(TEX.specular, (specTex) => {

          const geo = new THREE.SphereGeometry(1, 64, 64);
          const mat = new THREE.MeshPhongMaterial({
            map:          dayTex,
            bumpMap:      bumpTex,
            bumpScale:    0.04,
            specularMap:  specTex,
            specular:     new THREE.Color(0x333333),
            shininess:    18,
          });
          const earth = new THREE.Mesh(geo, mat);
          earthGroup.add(earth);

          // ── 2. Cloud Layer ──────────────────────────────────
          loader.load(TEX.clouds, (cloudTex) => {
            const cloudGeo = new THREE.SphereGeometry(1.008, 64, 64);
            const cloudMat = new THREE.MeshPhongMaterial({
              map:         cloudTex,
              transparent: true,
              opacity:     0.55,
              depthWrite:  false,
            });
            cloudsMesh = new THREE.Mesh(cloudGeo, cloudMat);
            earthGroup.add(cloudsMesh);
          });
        });
      });
    });

    // ── 3. Atmosphere Glow (blue halo) ────────────────────────
    const atmGeo = new THREE.SphereGeometry(1.18, 64, 64);
    const atmMat = new THREE.MeshBasicMaterial({
      color: 0x4FC3F7,
      transparent: true,
      opacity: 0.07,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    atmosphereMesh = new THREE.Mesh(atmGeo, atmMat);
    scene.add(atmosphereMesh); // NOT in earthGroup — always faces camera

    // ── 4. Inner bright ring glow ─────────────────────────────
    const innerAtmGeo = new THREE.SphereGeometry(1.04, 64, 64);
    const innerAtmMat = new THREE.MeshBasicMaterial({
      color: 0x80D8FF,
      transparent: true,
      opacity: 0.04,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(innerAtmGeo, innerAtmMat));

    // ── 5. Lighting ───────────────────────────────────────────
    // Sun-like directional light (top-right — matches image)
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.4);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    // Soft fill from the left (space ambient)
    const fillLight = new THREE.DirectionalLight(0x2244AA, 0.3);
    fillLight.position.set(-5, -2, -3);
    scene.add(fillLight);

    // Very dim ambient so dark side isn't pitch black
    scene.add(new THREE.AmbientLight(0x111122, 0.8));

    // ── Events ────────────────────────────────────────────────
    canvas.addEventListener('mousedown',  onMouseDown);
    window.addEventListener('mousemove',  onMouseMove);
    window.addEventListener('mouseup',    onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove',  onTouchMove,  { passive: false });
    window.addEventListener('touchend',   onTouchEnd);
    canvas.addEventListener('mouseenter', hideDragHint);

    // Initial tilt (matches image angle)
    targetRotation  = { x: 0.15, y: 1.2 };
    currentRotation = { x: 0.15, y: 1.2 };
    earthGroup.rotation.x = currentRotation.x;
    earthGroup.rotation.y = currentRotation.y;

    animate();
  }

  // ── Drag hint ─────────────────────────────────────────────
  function hideDragHint() {
    const hint = document.getElementById('earth-drag-hint');
    if (hint) hint.classList.add('hidden');
  }

  // ── Mouse ─────────────────────────────────────────────────
  function onMouseDown(e) {
    isDragging = true;
    autoSpin   = false;
    previousMousePosition = { x: e.clientX, y: e.clientY };
    hideDragHint();
  }
  function onMouseMove(e) {
    if (!isDragging) return;
    const dx = e.clientX - previousMousePosition.x;
    const dy = e.clientY - previousMousePosition.y;
    targetRotation.y += dx * 0.006;
    targetRotation.x += dy * 0.006;
    targetRotation.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, targetRotation.x));
    previousMousePosition = { x: e.clientX, y: e.clientY };
  }
  function onMouseUp() {
    isDragging = false;
    autoSpin   = true;
  }

  // ── Touch ─────────────────────────────────────────────────
  function onTouchStart(e) {
    if (e.touches.length !== 1) return;
    isDragging = true;
    autoSpin   = false;
    previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    hideDragHint();
  }
  function onTouchMove(e) {
    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - previousMousePosition.x;
    const dy = e.touches[0].clientY - previousMousePosition.y;
    targetRotation.y += dx * 0.006;
    targetRotation.x += dy * 0.006;
    targetRotation.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, targetRotation.x));
    previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function onTouchEnd() {
    isDragging = false;
    autoSpin   = true;
  }

  // ── Render loop ───────────────────────────────────────────
  function animate() {
    frameId = requestAnimationFrame(animate);

    if (autoSpin) targetRotation.y += 0.0018;

    // Smooth lerp
    currentRotation.x += (targetRotation.x - currentRotation.x) * 0.08;
    currentRotation.y += (targetRotation.y - currentRotation.y) * 0.08;

    earthGroup.rotation.x = currentRotation.x;
    earthGroup.rotation.y = currentRotation.y;

    // Clouds drift slightly faster than earth
    if (cloudsMesh) cloudsMesh.rotation.y += 0.0003;

    // Atmosphere stays centred (no rotation needed)
    renderer.render(scene, camera);
  }

  function destroy() {
    cancelAnimationFrame(frameId);
    if (renderer) renderer.dispose();
  }

  return { init, destroy };
})();

/* ── MODULE: charts.js ─────────────────────────────────────── */
/**
 * EARTH IMMUNE SYSTEM AI
 * Charts Module — Chart.js configurations
 */

const Charts = (function () {

  // ── Global Chart.js defaults ──────────────────────────────
  Chart.defaults.color = '#8FB89A';
  Chart.defaults.borderColor = 'rgba(0,255,136,0.06)';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size   = 11;

  // ── Shared tooltip style ──────────────────────────────────
  const tooltipPlugin = {
    backgroundColor: 'rgba(7,18,10,0.92)',
    borderColor:     'rgba(0,255,136,0.3)',
    borderWidth:     1,
    titleColor:      '#00FF88',
    bodyColor:       '#E8F5EC',
    cornerRadius:    8,
    padding:         10,
    displayColors:   true,
    boxPadding:      4,
  };

  // ── Gradient helper ───────────────────────────────────────
  function makeGradient(ctx, color1, color2, h = 200) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0,   color1);
    g.addColorStop(1,   color2);
    return g;
  }

  // ── CHART 1: Forest Coverage Trend ───────────────────────
  function initForestTrend() {
    const el = document.getElementById('chart-forest-trend');
    if (!el) return;
    const ctx = el.getContext('2d');
    const gradient = makeGradient(ctx, 'rgba(0,255,136,0.3)', 'rgba(0,255,136,0.0)');
    const grad2    = makeGradient(ctx, 'rgba(255,77,77,0.2)',  'rgba(255,77,77,0.0)');

    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
        datasets: [
          {
            label: 'Forest Area (km²)',
            data: [2410, 2405, 2395, 2380, 2370, 2358, 2348, 2360, 2372, 2385, 2392, 2400],
            borderColor:     '#00FF88',
            backgroundColor: gradient,
            borderWidth:     2,
            pointRadius:     3,
            pointBackgroundColor: '#00FF88',
            tension:         0.4,
            fill:            true,
          },
          {
            label: 'Deforestation Rate',
            data: [12, 18, 22, 28, 32, 35, 30, 18, 14, 10, 8, 9],
            borderColor:     '#FF4D4D',
            backgroundColor: grad2,
            borderWidth:     2,
            pointRadius:     3,
            pointBackgroundColor: '#FF4D4D',
            tension:         0.4,
            fill:            true,
            yAxisID:         'y2',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { tooltip: tooltipPlugin, legend: { display: false } },
        scales: {
          x:  { grid: { color: 'rgba(0,255,136,0.04)' } },
          y:  { grid: { color: 'rgba(0,255,136,0.04)' }, position: 'left' },
          y2: { grid: { display: false }, position: 'right' },
        },
      },
    });
  }

  // ── CHART 2: Deforestation / Temperature ─────────────────
  function initDeforestationChart() {
    const el = document.getElementById('chart-deforestation');
    if (!el) return;
    const ctx = el.getContext('2d');

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Assam','MP','UP','Kerala','Odisha','Bihar','Rajasthan','Gujarat'],
        datasets: [
          {
            label: 'Trees Lost (thousands)',
            data: [48, 36, 29, 22, 31, 18, 12, 8],
            backgroundColor: 'rgba(255,77,77,0.6)',
            borderColor:     '#FF4D4D',
            borderWidth:     1,
            borderRadius:    4,
          },
          {
            label: 'Temp Rise (°C)',
            data: [2.4, 1.8, 1.5, 1.2, 1.6, 0.9, 0.6, 0.4],
            backgroundColor: 'rgba(255,209,102,0.5)',
            borderColor:     '#FFD166',
            borderWidth:     1,
            borderRadius:    4,
            yAxisID:         'y2',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { tooltip: tooltipPlugin, legend: { display: false } },
        scales: {
          x:  { grid: { color: 'rgba(0,255,136,0.04)' } },
          y:  { grid: { color: 'rgba(0,255,136,0.04)' }, position: 'left' },
          y2: { grid: { display: false }, position: 'right' },
        },
      },
    });
  }

  // ── CHART 3: Groundwater Trend ────────────────────────────
  function initGroundwaterChart() {
    const el = document.getElementById('chart-groundwater');
    if (!el) return;
    const ctx = el.getContext('2d');
    const grad = makeGradient(ctx, 'rgba(0,217,255,0.3)', 'rgba(0,217,255,0.0)');

    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['2019','2020','2021','2022','2023','2024','2025'],
        datasets: [
          {
            label: 'Groundwater Level (m)',
            data: [8.2, 7.9, 7.4, 6.8, 7.1, 7.5, 7.8],
            borderColor:     '#00D9FF',
            backgroundColor: grad,
            borderWidth:     2.5,
            pointRadius:     4,
            pointBackgroundColor: '#00D9FF',
            tension:         0.4,
            fill:            true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { tooltip: tooltipPlugin, legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(0,255,136,0.04)' } },
          y: { grid: { color: 'rgba(0,255,136,0.04)' } },
        },
      },
    });
  }

  // ── CHART 4: Forest Impact (Forest Monitor page) ──────────
  function initForestImpactChart() {
    const el = document.getElementById('chart-forest-impact');
    if (!el) return;
    const ctx = el.getContext('2d');

    return new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['Temperature', 'Flood Risk', 'Groundwater', 'Air Quality', 'Biodiversity', 'Carbon'],
        datasets: [
          {
            label: 'Current Impact',
            data: [72, 58, 45, 63, 80, 55],
            borderColor:     '#FF4D4D',
            backgroundColor: 'rgba(255,77,77,0.12)',
            pointBackgroundColor: '#FF4D4D',
            borderWidth: 2,
          },
          {
            label: 'Projected (90 days)',
            data: [85, 70, 60, 75, 90, 68],
            borderColor:     '#FF9F1C',
            backgroundColor: 'rgba(255,159,28,0.1)',
            pointBackgroundColor: '#FF9F1C',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { tooltip: tooltipPlugin, legend: { display: false } },
        scales: {
          r: {
            grid:       { color: 'rgba(0,255,136,0.08)' },
            angleLines: { color: 'rgba(0,255,136,0.08)' },
            ticks:      { display: false },
            pointLabels: { font: { size: 10 }, color: '#8FB89A' },
          },
        },
      },
    });
  }

  // ── CHART 5: Plantation simulation ───────────────────────
  function initPlantationChart() {
    const el = document.getElementById('chart-plantation');
    if (!el) return;
    const ctx = el.getContext('2d');

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Yr 1','Yr 2','Yr 3','Yr 5','Yr 10'],
        datasets: [
          {
            label: 'Temp Reduction (°C)',
            data: [0.5, 1.2, 1.8, 2.6, 3.8],
            backgroundColor: 'rgba(0,255,136,0.6)',
            borderColor: '#00FF88',
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: 'Groundwater +%',
            data: [5, 12, 18, 28, 35],
            backgroundColor: 'rgba(0,217,255,0.5)',
            borderColor: '#00D9FF',
            borderWidth: 1,
            borderRadius: 4,
            yAxisID: 'y2',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { tooltip: tooltipPlugin, legend: { display: false } },
        scales: {
          x:  { grid: { color: 'rgba(0,255,136,0.04)' } },
          y:  { grid: { color: 'rgba(0,255,136,0.04)' } },
          y2: { grid: { display: false }, position: 'right' },
        },
      },
    });
  }

  // ── CHART 6: Disaster Trend ───────────────────────────────
  function initDisasterTrend() {
    const el = document.getElementById('chart-disaster-trend');
    if (!el) return;
    const ctx = el.getContext('2d');

    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Past 2','Past 1','Wk 1','Wk 2','Wk 3','Month','Month+'],
        datasets: [
          {
            label: 'Risk Score',
            data: [40, 55, 72, 88, 92, 80, 65],
            borderColor:     '#00FF88',
            backgroundColor: 'rgba(0,255,136,0.08)',
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: '#00FF88',
            tension: 0.4,
            fill: true,
          },
          {
            label: 'Moderate Threshold',
            data: [45, 45, 45, 45, 45, 45, 45],
            borderColor:     '#FF9F1C',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointRadius: 0,
            tension: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { tooltip: tooltipPlugin, legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(0,255,136,0.04)' } },
          y: { min: 0, max: 100, grid: { color: 'rgba(0,255,136,0.04)' } },
        },
      },
    });
  }

  // ── CHART 7: Farmer Historical Trend ─────────────────────
  function initFarmerTrend() {
    const el = document.getElementById('chart-farmer-trend');
    if (!el) return;
    const ctx = el.getContext('2d');

    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Past 1','Past 1','Flood Peak','Wk 3','Wk 3t','Month'],
        datasets: [
          {
            label: 'Risk Score',
            data: [30, 55, 82, 90, 70, 45],
            borderColor:     '#00FF88',
            backgroundColor: 'rgba(0,255,136,0.06)',
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: '#00FF88',
            tension: 0.4,
            fill: true,
          },
          {
            label: 'Moderate',
            data: [40, 50, 80, 85, 65, 40],
            borderColor:     '#FF9F1C',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            pointRadius: 3,
            pointBackgroundColor: '#FF9F1C',
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { tooltip: tooltipPlugin, legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(0,255,136,0.04)' } },
          y: { min: 0, max: 100, grid: { color: 'rgba(0,255,136,0.04)' } },
        },
      },
    });
  }

  // ── Public: init all charts ───────────────────────────────
  function initAll() {
    initForestTrend();
    initDeforestationChart();
    initGroundwaterChart();
    initForestImpactChart();
    initPlantationChart();
  }

  return { initAll };
})();


/* ── MODULE: maps.js ─────────────────────────────────────── */
/**
 * EARTH IMMUNE SYSTEM AI
 * Maps Module — Leaflet.js India Maps
 */

const Maps = (function () {
  // ── Stored map instances ──────────────────────────────────
  const instances = {};

  // ── Tile layer options ────────────────────────────────────
  const TILES = {
    dark:    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    darkNoLabels: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
    attrib:  '&copy; <a href="https://carto.com/">CARTO</a> | Earth Immune AI',
  };

  // ── India center ──────────────────────────────────────────
  const INDIA = { lat: 20.5937, lng: 78.9629, zoom: 4.5 };

  // ── City markers ─────────────────────────────────────────
  const CITIES = [
    { name: 'Delhi',     lat: 28.6139, lng: 77.2090, type: 'city' },
    { name: 'Mumbai',    lat: 19.0760, lng: 72.8777, type: 'city' },
    { name: 'Kolkata',   lat: 22.5726, lng: 88.3639, type: 'city' },
    { name: 'Chennai',   lat: 13.0827, lng: 80.2707, type: 'city' },
    { name: 'Bengaluru', lat: 12.9716, lng: 77.5946, type: 'city' },
    { name: 'Hyderabad', lat: 17.3850, lng: 78.4867, type: 'city' },
    { name: 'Jaipur',    lat: 26.9124, lng: 75.7873, type: 'city' },
    { name: 'Lucknow',   lat: 26.8467, lng: 80.9462, type: 'city' },
  ];

  // ── Environmental data points ─────────────────────────────
  const ENV_DATA = {
    deforestation: [
      { lat: 26.2006, lng: 92.9376, label: 'Assam Sector 7B',   type: 'critical', desc: '1,248 trees removed' },
      { lat: 24.8607, lng: 80.3318, label: 'MP Zone 12',         type: 'high',     desc: '880 trees removed' },
      { lat: 30.0668, lng: 79.0193, label: 'Uttarakhand Block 4',type: 'warning',  desc: '320 trees removed' },
      { lat: 11.1271, lng: 76.7960, label: 'Kerala Wayand',      type: 'high',     desc: '500 trees removed' },
      { lat: 22.9734, lng: 78.6569, label: 'MP Central Zone',    type: 'medium',   desc: '240 trees removed' },
      { lat: 23.6102, lng: 85.2799, label: 'Jharkhand East',     type: 'warning',  desc: '180 trees removed' },
      { lat: 20.9517, lng: 85.0985, label: 'Odisha Forest',      type: 'medium',   desc: '310 trees removed' },
    ],
    flood: [
      { lat: 25.0961, lng: 85.3131, label: 'Bihar — Patna Belt',     risk: 92, type: 'flood' },
      { lat: 26.7271, lng: 88.4354, label: 'West Bengal — North',    risk: 78, type: 'flood' },
      { lat: 20.4625, lng: 85.8830, label: 'Odisha Coastal Belt',    risk: 65, type: 'flood' },
      { lat: 22.3511, lng: 78.6677, label: 'Madhya Pradesh — River', risk: 52, type: 'flood' },
      { lat: 14.5204, lng: 75.7224, label: 'Karnataka Coastal',      risk: 48, type: 'flood' },
    ],
    heatwave: [
      { lat: 27.0238, lng: 74.2179, label: 'Rajasthan Desert Zone', temp: 48, type: 'heat' },
      { lat: 25.5941, lng: 85.1376, label: 'Bihar Heatwave Zone',   temp: 45, type: 'heat' },
      { lat: 23.2599, lng: 77.4126, label: 'MP Central Heat',       temp: 43, type: 'heat' },
      { lat: 17.1232, lng: 79.2088, label: 'Telangana Hot Zone',    temp: 44, type: 'heat' },
    ],
    protectedForest: [
      { lat: 18.0735, lng: 76.7000, label: 'Pench National Park',       cover: '92%' },
      { lat: 22.5726, lng: 80.4000, label: 'Kanha Tiger Reserve',       cover: '88%' },
      { lat: 11.4000, lng: 76.6800, label: 'Mudumalai Reserve',         cover: '95%' },
      { lat: 24.0000, lng: 93.0000, label: 'Manipur Green Corridor',    cover: '78%' },
      { lat: 29.5300, lng: 80.2100, label: 'Jim Corbett Buffer Zone',   cover: '85%' },
    ],
  };

  // ── Custom icon factory ───────────────────────────────────
  function makeIcon(color, emoji, size = 28) {
    return L.divIcon({
      className: '',
      iconSize:  [size, size],
      iconAnchor:[size/2, size/2],
      html: `<div style="
        width:${size}px;height:${size}px;
        border-radius:50%;
        background:${color}22;
        border:2px solid ${color};
        display:flex;align-items:center;justify-content:center;
        font-size:${size * 0.45}px;
        box-shadow:0 0 12px ${color}66;
        animation:mapPulse 2s ease-in-out infinite;
      ">${emoji}</div>`,
    });
  }

  // Inject keyframe once
  if (!document.getElementById('map-keyframes')) {
    const s = document.createElement('style');
    s.id = 'map-keyframes';
    s.textContent = `
      @keyframes mapPulse {
        0%,100% { transform:scale(1); opacity:1; }
        50%      { transform:scale(1.15); opacity:0.7; }
      }
    `;
    document.head.appendChild(s);
  }

  // ── Popup template ────────────────────────────────────────
  function popupHtml(title, rows) {
    const rowsHtml = rows.map(([k, v, c]) =>
      `<tr>
        <td style="color:#8FB89A;padding:2px 8px 2px 0;">${k}</td>
        <td style="color:${c || '#E8F5EC'};font-weight:600;">${v}</td>
       </tr>`
    ).join('');
    return `
      <div style="font-family:'Inter',sans-serif;min-width:180px;">
        <div style="font-weight:700;color:#00FF88;margin-bottom:6px;font-size:13px;">${title}</div>
        <table style="border-collapse:collapse;font-size:12px;">${rowsHtml}</table>
      </div>`;
  }

  // ── Shared heatmap config — gradient matching reference images ─
  // GREEN (no issue) → YELLOW (low) → ORANGE (medium) → RED (critical)
  const HEAT_OPTS_FOREST = {
    radius: 30, blur: 18, max: 1.0, minOpacity: 0.55,
    gradient: { 0.0:'#00C844', 0.30:'#FFEE00', 0.55:'#FF9F1C', 0.78:'#FF4D4D', 1.0:'#CC0000' }
  };
  const HEAT_OPTS_RISK = {
    radius: 35, blur: 22, max: 1.0, minOpacity: 0.50,
    gradient: { 0.0:'#00C844', 0.30:'#FFEE00', 0.55:'#FF9F1C', 0.78:'#FF4D4D', 1.0:'#CC0000' }
  };
  const HEAT_OPTS_PLANTATION = {
    radius: 38, blur: 24, max: 1.0, minOpacity: 0.52,
    gradient: { 0.0:'#00CC44', 0.30:'#AAEE00', 0.55:'#FF9F1C', 0.80:'#FF4D4D', 1.0:'#CC0000' }
  };
  const DEFORESTATION_HEAT = [
    [26.2006, 92.9376, 1.0],  // Assam - critical
    [24.8607, 80.3318, 0.85], // MP
    [30.0668, 79.0193, 0.5],  // Uttarakhand
    [11.1271, 76.7960, 0.75], // Kerala
    [22.9734, 78.6569, 0.6],  // MP Central
    [23.6102, 85.2799, 0.45], // Jharkhand
    [20.9517, 85.0985, 0.55], // Odisha
    [27.0238, 74.2179, 0.8],  // Rajasthan
    [25.5941, 85.1376, 0.7],  // Bihar
    [23.2599, 77.4126, 0.65], // MP Heat
    [17.1232, 79.2088, 0.7],  // Telangana
    [21.7679, 78.8718, 0.5],  // Central India
    [18.9220, 72.8347, 0.4],  // Maharashtra coast
    [15.3173, 75.7139, 0.45], // Karnataka
    [28.6139, 77.2090, 0.6],  // Delhi region
    [22.3511, 78.6677, 0.5],  // MP River
    [20.4625, 85.8830, 0.7],  // Odisha coastal
    [25.0961, 85.3131, 0.85], // Bihar
    [26.7271, 88.4354, 0.75], // WB North
    [29.5300, 80.2100, 0.3],  // Corbett
    [18.0735, 76.7000, 0.2],  // Pench (protected)
    [22.5726, 80.4000, 0.2],  // Kanha (protected)
  ];

  const PLANTATION_HEAT = [
    [27.0238, 74.2179, 1.0],  // Rajasthan - highest priority
    [26.9124, 75.7873, 0.95], // Jaipur
    [28.6139, 77.2090, 0.8],  // Delhi NCR
    [30.7333, 76.7794, 0.7],  // Punjab
    [25.5941, 85.1376, 0.75], // Bihar
    [23.2599, 77.4126, 0.65], // MP
    [17.1232, 79.2088, 0.7],  // Telangana
    [18.9220, 72.8347, 0.6],  // Maharashtra
    [22.3511, 78.6677, 0.55], // MP River
    [25.0961, 85.3131, 0.7],  // Bihar Patna
    [24.8607, 80.3318, 0.6],  // MP Jabalpur
    [14.5204, 75.7224, 0.45], // Karnataka
    [13.0827, 80.2707, 0.5],  // Chennai region
    [19.0760, 72.8777, 0.55], // Mumbai
    [16.5062, 80.6480, 0.5],  // AP
    [11.1271, 76.7960, 0.35], // Kerala (greener)
    [26.2006, 92.9376, 0.3],  // Assam (has forest)
    [22.5726, 88.3639, 0.55], // West Bengal
    [20.4625, 85.8830, 0.6],  // Odisha
    [21.7679, 78.8718, 0.5],  // Central India
  ];

  const FLOOD_RISK_HEAT = [
    [25.0961, 85.3131, 1.0],  // Bihar
    [26.7271, 88.4354, 0.9],  // WB North
    [20.4625, 85.8830, 0.8],  // Odisha coastal
    [26.2006, 92.9376, 0.85], // Assam
    [22.3511, 78.6677, 0.6],  // MP River
    [14.5204, 75.7224, 0.65], // Karnataka coastal
    [11.1271, 76.7960, 0.7],  // Kerala
    [22.5726, 88.3639, 0.75], // WB
    [23.6102, 85.2799, 0.65], // Jharkhand
    [17.9784, 83.2014, 0.7],  // AP coast
    [13.0827, 80.2707, 0.6],  // Chennai flood
    [19.0760, 72.8777, 0.55], // Mumbai coastal
    [28.6139, 77.2090, 0.45], // Delhi Yamuna
    [27.5530, 76.6346, 0.5],  // Haryana
  ];

  const DISASTER_HEAT = [
    ...FLOOD_RISK_HEAT,
    [27.0238, 74.2179, 0.9],  // Rajasthan heatwave
    [25.5941, 85.1376, 0.8],  // Bihar heatwave
    [23.2599, 77.4126, 0.75], // MP heatwave
    [17.1232, 79.2088, 0.8],  // Telangana heat
    [14.9091, 74.1240, 0.7],  // Goa/Karnataka cyclone risk
    [13.9299, 79.1006, 0.65], // AP cyclone coast
    [19.7515, 75.7139, 0.6],  // Maharashtra
  ];

  // ── RISK COLORED REGIONS (overlay polygons) ───────────────
  function addRiskRegions(map) {
    // Approximate bounding boxes for key risk states
    const regions = [
      { bounds: [[22, 83], [27.5, 88.5]], color: '#FF4D4D', opacity: 0.12, name: 'Bihar+WB Flood' },
      { bounds: [[18, 83], [22, 87]],     color: '#FF9F1C', opacity: 0.10, name: 'Odisha Risk' },
      { bounds: [[23, 73], [31, 77]],     color: '#FF9F1C', opacity: 0.10, name: 'Rajasthan Heat' },
      { bounds: [[20, 75], [24, 80]],     color: '#FFD166', opacity: 0.08, name: 'MP Medium' },
      { bounds: [[8.5, 77], [11, 80]],    color: '#00FF88', opacity: 0.08, name: 'Kerala Forest' },
      { bounds: [[24, 90], [28, 96]],     color: '#FF4D4D', opacity: 0.10, name: 'NE Deforestation' },
    ];

    regions.forEach(r => {
      L.rectangle(r.bounds, {
        color:    r.color,
        weight:   1,
        opacity:  0.4,
        fillColor: r.color,
        fillOpacity: r.opacity,
      }).bindTooltip(r.name, { className: 'leaflet-popup-content-wrapper' }).addTo(map);
    });
  }

  // ── Build base map ────────────────────────────────────────
  function createBase(id, options = {}) {
    const defaults = { center: [INDIA.lat, INDIA.lng], zoom: INDIA.zoom };
    const opts = { ...defaults, ...options };

    const map = L.map(id, {
      center:           [opts.center[0], opts.center[1]],
      zoom:             opts.zoom,
      zoomControl:      true,
      scrollWheelZoom:  true,
      minZoom:          3,
      maxZoom:          12,
    });

    L.tileLayer(TILES.dark, {
      attribution: TILES.attrib,
      subdomains:  'abcd',
      maxZoom:     19,
    }).addTo(map);

    return map;
  }

  // ── DASHBOARD MAP ─────────────────────────────────────────
  function initDashboard() {
    const map = createBase('dashboard-map');
    instances.dashboard = map;

    // City markers
    CITIES.forEach(c => {
      L.marker([c.lat, c.lng], { icon: makeIcon('#00FF88', '🏙') })
       .bindPopup(popupHtml(c.name, [
          ['Status', 'Monitoring Active', '#00FF88'],
          ['Alerts', Math.floor(Math.random() * 20 + 2), '#FF9F1C'],
          ['Air Quality', 'Moderate', '#FFD166'],
       ]))
       .addTo(map);

      L.circle([c.lat, c.lng], { radius: 80000, color: '#00FF88', weight: 1, fillOpacity: 0.04, opacity: 0.2 }).addTo(map);
    });

    // Deforestation markers
    ENV_DATA.deforestation.forEach(d => {
      const color = d.type === 'critical' ? '#FF4D4D' : d.type === 'high' ? '#FF9F1C' : '#FFD166';
      L.marker([d.lat, d.lng], { icon: makeIcon(color, '🌲') })
       .bindPopup(popupHtml(d.label, [
          ['Type', 'Deforestation', '#FF4D4D'],
          ['Severity', d.type.toUpperCase(), color],
          ['Detail', d.desc, '#E8F5EC'],
          ['Detected', 'Satellite · AI Model', '#8FB89A'],
       ]))
       .addTo(map);
    });

    // Flood risk markers
    ENV_DATA.flood.forEach(f => {
      L.marker([f.lat, f.lng], { icon: makeIcon('#00D9FF', '🌊') })
       .bindPopup(popupHtml(f.label, [
          ['Risk Score', `${f.risk}/100`, '#FF4D4D'],
          ['Type', 'Flood Risk', '#00D9FF'],
          ['Status', f.risk > 70 ? 'HIGH ALERT' : 'MODERATE', f.risk > 70 ? '#FF4D4D' : '#FF9F1C'],
       ]))
       .addTo(map);
    });

    // Protected forest markers
    ENV_DATA.protectedForest.forEach(p => {
      L.marker([p.lat, p.lng], { icon: makeIcon('#00FF88', '🌿') })
       .bindPopup(popupHtml(p.label, [
          ['Status', 'Protected', '#00FF88'],
          ['Coverage', p.cover, '#00FF88'],
          ['Monitoring', 'Active 24/7', '#00D9FF'],
       ]))
       .addTo(map);
    });

    // Heatmap overlay — forest/deforestation layer
    if (L.heatLayer) {
      L.heatLayer(DEFORESTATION_HEAT, HEAT_OPTS_FOREST).addTo(map);
    }

    addRiskRegions(map);

    return map;
  }

  // ── FOREST MONITOR MAP ────────────────────────────────────
  function initForest() {
    const map = createBase('forest-map', { zoom: 4.5 });
    instances.forest = map;

    // Coverage heatmap — dense green → sparse yellow → degraded orange → deforested red
    if (L.heatLayer) {
      const coverageLayer = L.heatLayer(DEFORESTATION_HEAT, HEAT_OPTS_FOREST);
      coverageLayer.addTo(map);
    }

    // Deforestation alert markers
    ENV_DATA.deforestation.forEach(d => {
      const color = d.type === 'critical' ? '#FF4D4D' : d.type === 'high' ? '#FF9F1C' : '#FFD166';
      const emoji = d.type === 'critical' ? '🚨' : d.type === 'high' ? '⚠️' : '🔔';
      L.marker([d.lat, d.lng], { icon: makeIcon(color, emoji, 32) })
       .bindPopup(popupHtml(d.label, [
          ['Severity', d.type.toUpperCase(), color],
          ['Trees', d.desc, '#E8F5EC'],
          ['Alert', 'AI Detection', '#00FF88'],
          ['Action', 'Notify Authorities', '#FF9F1C'],
       ]))
       .addTo(map);

      // Pulsing circle
      L.circle([d.lat, d.lng], {
        radius: d.type === 'critical' ? 180000 : 100000,
        color: color, weight: 1.5,
        fillColor: color, fillOpacity: 0.06, opacity: 0.5
      }).addTo(map);
    });

    // Protected zones
    ENV_DATA.protectedForest.forEach(p => {
      L.circle([p.lat, p.lng], {
        radius: 150000, color: '#00FF88', weight: 1,
        fillColor: '#00FF88', fillOpacity: 0.08, opacity: 0.3
      })
       .bindPopup(popupHtml(p.label, [['Status','Protected','#00FF88'], ['Cover',p.cover,'#00FF88']]))
       .addTo(map);
    });

    return map;
  }

  // ── PLANTATION MAP ────────────────────────────────────────
  function initPlantation() {
    const map = createBase('plantation-map', { zoom: 4.5 });
    instances.plantation = map;

    // Priority heatmap — green (low need) → yellow → orange → red (critical need)
    if (L.heatLayer) {
      L.heatLayer(PLANTATION_HEAT, HEAT_OPTS_PLANTATION).addTo(map);
    }

    // State labels / priority markers
    const priorities = [
      { lat: 27.0238, lng: 74.2179, label: 'Rajasthan', priority: 'CRITICAL', trees: '2.8M needed' },
      { lat: 25.5941, lng: 85.1376, label: 'Bihar',     priority: 'HIGH',     trees: '1.2M needed' },
      { lat: 23.2599, lng: 77.4126, label: 'MP',        priority: 'HIGH',     trees: '890K needed' },
      { lat: 17.1232, lng: 79.2088, label: 'Telangana', priority: 'MEDIUM',   trees: '640K needed' },
      { lat: 28.6139, lng: 77.2090, label: 'Delhi NCR', priority: 'HIGH',     trees: '430K needed' },
      { lat: 11.1271, lng: 76.7960, label: 'Kerala',    priority: 'LOW',      trees: '120K needed' },
    ];

    priorities.forEach(p => {
      const color = p.priority === 'CRITICAL' ? '#FF4D4D' : p.priority === 'HIGH' ? '#FF9F1C' : p.priority === 'MEDIUM' ? '#FFD166' : '#00FF88';
      L.marker([p.lat, p.lng], { icon: makeIcon(color, '🌱', 26) })
       .bindPopup(popupHtml(p.label, [
          ['Priority', p.priority, color],
          ['Trees Needed', p.trees, '#E8F5EC'],
          ['Action', 'Plantation Required', '#00FF88'],
       ]))
       .addTo(map);
    });

    // Click to select location
    map.on('click', function (e) {
      const { lat, lng } = e.latlng;
      L.popup()
       .setLatLng([lat, lng])
       .setContent(popupHtml('Selected Location', [
          ['Latitude',  lat.toFixed(4), '#00D9FF'],
          ['Longitude', lng.toFixed(4), '#00D9FF'],
          ['Action', 'Click "Generate Plantation Report" →', '#00FF88'],
       ]))
       .openOn(map);

      // Update simulation panel
      const el = document.getElementById('sim-location');
      if (el) {
        el.querySelector('.sim-loc-name').textContent = `Lat ${lat.toFixed(2)}, Lng ${lng.toFixed(2)}`;
        el.querySelector('.sim-loc-sub').textContent  = `AI analyzing optimal plantation for this location`;
      }
    });

    return map;
  }

  // ── DISASTER MAP ──────────────────────────────────────────
  function initDisaster() {
    const map = createBase('disaster-map', { zoom: 4.5 });
    instances.disaster = map;

    // Disaster heatmap — green (safe) → yellow → orange → red (critical risk)
    if (L.heatLayer) {
      L.heatLayer(DISASTER_HEAT, HEAT_OPTS_RISK).addTo(map);
    }

    // Flood risk markers
    ENV_DATA.flood.forEach(f => {
      const color = f.risk > 80 ? '#FF4D4D' : f.risk > 60 ? '#FF9F1C' : '#FFD166';
      L.marker([f.lat, f.lng], { icon: makeIcon(color, '🌊', 30) })
       .bindPopup(popupHtml(f.label, [
          ['Risk Score', `${f.risk}/100`, color],
          ['Type', 'Flood Risk', '#00D9FF'],
          ['Alert', f.risk > 80 ? 'CRITICAL' : 'HIGH', color],
       ]))
       .addTo(map);

      L.circle([f.lat, f.lng], { radius: 200000, color, weight: 1.5, fillColor: color, fillOpacity: 0.08, opacity: 0.4 }).addTo(map);
    });

    // Heatwave markers
    ENV_DATA.heatwave.forEach(h => {
      L.marker([h.lat, h.lng], { icon: makeIcon('#FF9F1C', '🔥', 28) })
       .bindPopup(popupHtml(h.label, [
          ['Temperature', `${h.temp}°C`, '#FF4D4D'],
          ['Type', 'Extreme Heatwave', '#FF9F1C'],
          ['Risk', 'HIGH', '#FF9F1C'],
       ]))
       .addTo(map);
    });

    // State-level risk polygons
    const riskZones = [
      { bounds: [[22,83],[27.5,89]], color:'#FF4D4D', label:'Bihar + WB: FLOOD CRITICAL' },
      { bounds: [[18,83],[22,87]],   color:'#FF9F1C', label:'Odisha: FLOOD HIGH' },
      { bounds: [[24,69],[31,77]],   color:'#FF9F1C', label:'Rajasthan: HEATWAVE HIGH' },
      { bounds: [[22,88],[27,96]],   color:'#FF4D4D', label:'Northeast: CRITICAL' },
      { bounds: [[8,76],[12,80]],    color:'#FFD166', label:'Kerala: MODERATE' },
      { bounds: [[20,75],[24,80]],   color:'#FFD166', label:'MP: MODERATE' },
    ];

    riskZones.forEach(z => {
      L.rectangle(z.bounds, {
        color: z.color, weight: 1.5, opacity: 0.6,
        fillColor: z.color, fillOpacity: 0.1
      }).bindTooltip(z.label).addTo(map);
    });

    return map;
  }

  // ── FARMER MAP ────────────────────────────────────────────
  function initFarmer() {
    const map = createBase('farmer-map', { zoom: 4.5 });
    instances.farmer = map;

    // Flood risk heatmap — green (safe) → yellow → orange → red (high risk)
    if (L.heatLayer) {
      L.heatLayer(FLOOD_RISK_HEAT, HEAT_OPTS_RISK).addTo(map);
    }

    // Flood warning zones (filled)
    const warningZones = [
      { bounds: [[23,77],[30,84]], color:'#FF9F1C', opacity:0.12, label:'Punjab + UP: WARNING' },
      { bounds: [[16,75],[21,82]], color:'#FFD166', opacity:0.10, label:'Maharashtra: WATCH' },
      { bounds: [[8,76],[12,80]], color:'#FF9F1C', opacity:0.11,  label:'Kerala: WATCH' },
    ];

    warningZones.forEach(z => {
      L.rectangle(z.bounds, {
        color: z.color, weight: 1.5, opacity: 0.5,
        fillColor: z.color, fillOpacity: z.opacity
      }).bindTooltip(z.label).addTo(map);
    });

    // Farm advisory markers
    const farmPoints = [
      { lat: 30.7333, lng: 76.7794, region: 'Punjab',     risk: 'Flood Warning', action: 'Move livestock to higher ground' },
      { lat: 26.8467, lng: 80.9462, region: 'Lucknow',    risk: 'Heavy Rain',    action: 'Drain rice paddy fields' },
      { lat: 19.7515, lng: 75.7139, region: 'Maharashtra', risk: 'Moderate Flood', action: 'Secure cotton crop stores' },
      { lat: 28.6139, lng: 77.2090, region: 'Delhi NCR',  risk: 'Heatwave',      action: 'Irrigate at dawn/dusk only' },
      { lat: 17.9784, lng: 83.2014, region: 'AP Coast',   risk: 'Cyclone Watch', action: 'Harvest early where possible' },
    ];

    farmPoints.forEach(f => {
      const color = f.risk.includes('Flood') ? '#FF9F1C' : f.risk.includes('Cyclone') ? '#FF4D4D' : '#FFD166';
      L.marker([f.lat, f.lng], { icon: makeIcon(color, '🌾', 28) })
       .bindPopup(popupHtml(f.region, [
          ['Risk', f.risk, color],
          ['Advisory', f.action, '#E8F5EC'],
          ['Alert', 'SMS Sent', '#00FF88'],
       ]))
       .addTo(map);
    });

    return map;
  }

  // ── Public: init all maps ─────────────────────────────────
  function initAll() {
    // Slight delay ensures containers are visible in DOM
    setTimeout(() => {
      try { initDashboard();  } catch(e) { console.warn('Dashboard map:', e); }
      try { initForest();     } catch(e) { console.warn('Forest map:', e); }
      try { initPlantation(); } catch(e) { console.warn('Plantation map:', e); }
      try { initDisaster();   } catch(e) { console.warn('Disaster map:', e); }
      // farmer map removed — advisory panel used instead
      }, 200);
  }

  // ── Invalidate size on page switch ───────────────────────
  function invalidateAll() {
    Object.values(instances).forEach(m => {
      try { m.invalidateSize(); } catch(e) {}
    });
  }

  function invalidate(name) {
    if (instances[name]) {
      setTimeout(() => {
        try { instances[name].invalidateSize(); } catch(e) {}
      }, 100);
    }
  }

  return { initAll, invalidateAll, invalidate, instances };
})();


/* ── MODULE: dashboard.js ─────────────────────────────────────── */
/**
 * EARTH IMMUNE SYSTEM AI
 * Dashboard Module — command center data & animations
 */

const Dashboard = (function () {

  // ── Mock API data ─────────────────────────────────────────
  const DATA = {
    alerts: [
      { type: 'critical', tag: 'CRITICAL', msg: 'Deforestation detected — Assam Sector 7B',    time: '2 min ago' },
      { type: 'warning',  tag: 'WETLAND',  msg: 'Flood risk rising — Odisha coastal belt',     time: '6 min ago' },
      { type: 'info',     tag: 'INFO',     msg: 'Plantation completed — MP Zone 3',             time: '13 min ago' },
      { type: 'critical', tag: 'CRITICAL', msg: 'Illegal cutting detected — Bihar Forest Zone', time: '18 min ago' },
      { type: 'warning',  tag: 'HIGH',     msg: 'Heatwave alert — Rajasthan desert region',    time: '24 min ago' },
      { type: 'info',     tag: 'INFO',     msg: 'Tree count milestone — 8.2M trees saved',     time: '31 min ago' },
      { type: 'warning',  tag: 'MEDIUM',   msg: 'Water table drop — Gujarat North Zone',       time: '44 min ago' },
      { type: 'critical', tag: 'CRITICAL', msg: 'Cyclone warning — Tamil Nadu coast',          time: '52 min ago' },
    ],
    activity: [
      { msg: 'Satellite scan completed — India North Sector',         time: '30s ago' },
      { msg: 'AI model updated deforestation risk scores',            time: '2 min ago' },
      { msg: 'SMS alert dispatched to 4,200 farmers — Bihar',        time: '5 min ago' },
      { msg: 'New protected zone registered — Pench Buffer',          time: '9 min ago' },
      { msg: 'Plantation drone deployment authorized — MP Zone 8',    time: '14 min ago' },
      { msg: 'Government alert forwarded — NDRF control room',        time: '22 min ago' },
      { msg: 'Groundwater sensor sync — 3,400 stations online',       time: '35 min ago' },
      { msg: 'Model retrain completed — 98.7% accuracy retained',     time: '1 hr ago' },
    ],
  };

  // ── Animated counter ──────────────────────────────────────
  function animateCounter(el, target, suffix = '', duration = 2000) {
    const start     = 0;
    const startTime = performance.now();

    function formatNum(n) {
      if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
      if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K';
      return n.toString();
    }

    function tick(now) {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease     = 1 - Math.pow(1 - progress, 4); // ease-out-quart
      const current  = Math.floor(ease * target);
      el.textContent = formatNum(current) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = formatNum(target) + suffix;
    }

    requestAnimationFrame(tick);
  }

  // ── Render stat counters (dashboard page) ─────────────────
  function renderStats() {
    document.querySelectorAll('[data-count]').forEach(el => {
      const target = parseInt(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      animateCounter(el, target, suffix, 2200);
    });
  }

  // ── Render hero landing counters ──────────────────────────
  function renderHeroStats() {
    document.querySelectorAll('[data-target]').forEach(el => {
      const target = parseInt(el.dataset.target);
      const suffix = el.dataset.suffix || '';
      animateCounter(el, target, suffix, 2500);
    });
  }

  // ── Render alerts list ────────────────────────────────────
  function renderAlerts() {
    const container = document.getElementById('dashboard-alerts');
    if (!container) return;

    DATA.alerts.forEach(a => {
      const div = document.createElement('div');
      div.className = `alert-item ${a.type}`;
      div.innerHTML = `
        <span class="alert-tag ${a.type === 'critical' ? 'critical' : a.type === 'warning' ? 'warning' : 'info'}">
          ${a.tag}
        </span>
        <span class="alert-msg">${a.msg}</span>
        <span class="alert-time">${a.time}</span>
      `;
      container.appendChild(div);
    });
  }

  // ── Render activity feed ──────────────────────────────────
  function renderActivity() {
    const container = document.getElementById('activity-feed');
    if (!container) return;

    DATA.activity.forEach(a => {
      const div = document.createElement('div');
      div.className = 'activity-item';
      div.innerHTML = `
        <div class="activity-dot"></div>
        <div>
          <span style="color:var(--text-primary)">${a.msg}</span><br/>
          <span style="font-size:0.68rem;font-family:var(--font-mono);color:var(--text-muted)">${a.time}</span>
        </div>
      `;
      container.appendChild(div);
    });
  }

  // ── Live ticker: add new alerts periodically ──────────────
  function startLiveTicker() {
    const newAlerts = [
      { type: 'critical', tag: 'CRITICAL', msg: 'Smoke detected — Nagaland forest boundary',     time: 'just now' },
      { type: 'warning',  tag: 'WETLAND',  msg: 'Wetland encroachment — Assam Zone B',           time: 'just now' },
      { type: 'info',     tag: 'SUCCESS',  msg: 'Farmer advisory sent — 1,240 farmers notified', time: 'just now' },
      { type: 'warning',  tag: 'HIGH',     msg: 'Unusual temperature spike — Vidarbha region',   time: 'just now' },
    ];

    let idx = 0;
    setInterval(() => {
      const container = document.getElementById('dashboard-alerts');
      if (!container) return;

      const a   = newAlerts[idx % newAlerts.length];
      const div = document.createElement('div');
      div.className = `alert-item ${a.type}`;
      div.style.opacity = '0';
      div.style.transform = 'translateX(-10px)';
      div.innerHTML = `
        <span class="alert-tag ${a.type === 'critical' ? 'critical' : a.type === 'warning' ? 'warning' : 'success'}">
          ${a.tag}
        </span>
        <span class="alert-msg">${a.msg}</span>
        <span class="alert-time">${a.time}</span>
      `;

      container.insertBefore(div, container.firstChild);

      // Animate in
      requestAnimationFrame(() => {
        div.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        div.style.opacity    = '1';
        div.style.transform  = 'translateX(0)';
      });

      // Remove last item
      if (container.children.length > 10) {
        container.removeChild(container.lastChild);
      }

      // Update badge
      const badge = document.querySelector('.alert-count-badge');
      if (badge) {
        const current = parseInt(badge.textContent) || 147;
        badge.textContent = current + 1;
      }

      idx++;
    }, 8000);
  }

  // ── Layer control on dashboard map ────────────────────────
  function setupMapControls() {
    document.querySelectorAll('.ctrl-btn[data-layer]').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.ctrl-btn[data-layer]').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        showToast(`📡 Map layer: ${this.textContent} — data refreshed`);
      });
    });
  }

  // ── Public init ───────────────────────────────────────────
  function init() {
    renderAlerts();
    renderActivity();
    setupMapControls();
    // Stats animate when page becomes visible
  }

  return { init, renderStats, renderHeroStats, startLiveTicker };
})();


/* ── MODULE: forest.js ─────────────────────────────────────── */
/**
 * EARTH IMMUNE SYSTEM AI
 * Forest Monitor Module
 */

const Forest = (function () {

  // ── Mock detection events ─────────────────────────────────
  const DETECTIONS = [
    {
      severity: 'critical',
      tag:      'CRITICAL',
      location: 'Assam Sector 18',
      detail:   '1,240 trees removed',
      time:     '2 min ago',
      coords:   '26.20°N, 92.93°E',
      area:     '4.2 km²',
    },
    {
      severity: 'medium',
      tag:      'HIGH',
      location: 'Kerala Wayanad',
      detail:   '500 trees removed',
      time:     '19 min ago',
      coords:   '11.12°N, 76.79°E',
      area:     '1.8 km²',
    },
    {
      severity: 'medium',
      tag:      'MEDIUM',
      location: 'MP Zone 12',
      detail:   '380 trees removed',
      time:     '1 hr ago',
      coords:   '24.86°N, 80.33°E',
      area:     '1.2 km²',
    },
    {
      severity: 'low',
      tag:      'WARNING',
      location: 'Uttarakhand Block 4',
      detail:   '98 trees removed',
      time:     '24 min ago',
      coords:   '30.06°N, 79.01°E',
      area:     '0.4 km²',
    },
    {
      severity: 'critical',
      tag:      'CRITICAL',
      location: 'Jharkhand East Sector',
      detail:   '620 trees removed',
      time:     '38 min ago',
      coords:   '23.61°N, 85.27°E',
      area:     '2.1 km²',
    },
    {
      severity: 'low',
      tag:      'INFO',
      location: 'Nagaland Border Zone',
      detail:   '45 trees removed',
      time:     '2 hr ago',
      coords:   '25.67°N, 94.11°E',
      area:     '0.15 km²',
    },
  ];

  // ── Impact scenarios based on detection ───────────────────
  const SCENARIOS = [
    {
      title:  'Scenario: 1,248 trees removed from Assam 7B',
      sub:    'Predicted environmental threat level: 59 months',
      impacts: [
        { icon:'🌡', label:'Temperature Increase',  value:'+2.4°C', badge:'HIGH',     badgeClass:'high', barClass:'red',    barW:'72%' },
        { icon:'🌊', label:'Flood Risk Increase',   value:'+2.9%',  badge:'10BN',     badgeClass:'critical', barClass:'orange', barW:'58%' },
        { icon:'💧', label:'Groundwater Reduction', value:'−18%',   badge:'CRITICAL', badgeClass:'cyan', barClass:'cyan',   barW:'45%' },
        { icon:'💨', label:'Air Quality Impact',    value:'−2,594', badge:'POOR',     badgeClass:'high', barClass:'red',    barW:'63%' },
        { icon:'🦋', label:'Biodiversity Loss',     value:'−24 sp', badge:'MGN',      badgeClass:'gold', barClass:'gold',   barW:'80%' },
      ],
    },
    {
      title:  'Scenario: 500 trees removed from Kerala Wayanad',
      sub:    'Predicted environmental threat level: 22 months',
      impacts: [
        { icon:'🌡', label:'Temperature Increase',  value:'+0.9°C', badge:'MEDIUM',   badgeClass:'gold', barClass:'gold',   barW:'32%' },
        { icon:'🌊', label:'Flood Risk Increase',   value:'+1.2%',  badge:'MEDIUM',   badgeClass:'gold', barClass:'orange', barW:'28%' },
        { icon:'💧', label:'Groundwater Reduction', value:'−7%',    badge:'LOW',      badgeClass:'cyan', barClass:'cyan',   barW:'22%' },
        { icon:'💨', label:'Air Quality Impact',    value:'−890',   badge:'FAIR',     badgeClass:'gold', barClass:'gold',   barW:'30%' },
        { icon:'🦋', label:'Biodiversity Loss',     value:'−9 sp',  badge:'LOW',      badgeClass:'cyan', barClass:'cyan',   barW:'35%' },
      ],
    },
  ];

  // ── Render detection feed ─────────────────────────────────
  function renderFeed() {
    const container = document.getElementById('detection-feed');
    if (!container) return;
    container.innerHTML = '';

    DETECTIONS.forEach((d, i) => {
      const div = document.createElement('div');
      div.className = `detection-item ${d.severity}`;
      div.style.opacity = '0';
      div.style.transform = 'translateY(8px)';
      div.innerHTML = `
        <span class="alert-tag ${d.severity === 'critical' ? 'critical' : d.severity === 'medium' ? 'warning' : 'info'}">
          ${d.tag}
        </span>
        <span class="alert-msg" style="font-size:0.88rem;font-weight:600;">${d.location}</span>
        <span class="alert-msg" style="font-size:0.78rem;color:var(--text-secondary);">${d.detail}</span>
        <div style="display:flex;justify-content:space-between;margin-top:0.3rem;">
          <span style="font-size:0.68rem;font-family:var(--font-mono);color:var(--text-muted);">${d.coords}</span>
          <span style="font-size:0.68rem;font-family:var(--font-mono);color:var(--text-muted);">${d.area}</span>
        </div>
        <span class="alert-time">${d.time}</span>
      `;

      // Make clickable to update scenario
      div.style.cursor = 'pointer';
      div.addEventListener('click', () => {
        document.querySelectorAll('.detection-item').forEach(el => el.style.outline = 'none');
        div.style.outline = '1px solid rgba(0,255,136,0.4)';
        updateScenario(i % SCENARIOS.length);
      });

      container.appendChild(div);

      // Staggered animation
      setTimeout(() => {
        div.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        div.style.opacity    = '1';
        div.style.transform  = 'translateY(0)';
      }, i * 120);
    });
  }

  // ── Update AI impact panel ────────────────────────────────
  function updateScenario(idx) {
    const s = SCENARIOS[idx];
    const titleEl = document.getElementById('scenario-title');
    if (titleEl) titleEl.textContent = s.title;

    const container = document.getElementById('impact-metrics');
    if (!container) return;
    container.innerHTML = '';

    s.impacts.forEach(im => {
      const div = document.createElement('div');
      div.className = 'impact-metric';
      div.innerHTML = `
        <div class="im-header">
          <span class="im-icon">${im.icon}</span>
          <span class="im-label">${im.label}</span>
          <span class="im-badge ${im.badgeClass}">${im.badge}</span>
        </div>
        <div class="im-value ${im.barClass}">${im.value}</div>
        <div class="im-bar"><div class="im-bar-fill ${im.barClass}" style="width:0%"></div></div>
      `;
      container.appendChild(div);

      // Animate bar
      requestAnimationFrame(() => {
        setTimeout(() => {
          const fill = div.querySelector('.im-bar-fill');
          if (fill) fill.style.width = im.barW;
        }, 100);
      });
    });
  }

  // ── Layer switcher ────────────────────────────────────────
  function setupLayerControls() {
    document.querySelectorAll('.layer-btn[data-flayer]').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.layer-btn[data-flayer]').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        showToast(`🌲 Forest layer: ${this.textContent} — map updated`);
      });
    });
  }

  // ── Alert Authorities button ──────────────────────────────
  function setupAlertButton() {
    const btn = document.querySelector('.btn-alert-auth');
    if (!btn) return;
    btn.addEventListener('click', () => {
      showToast('🚨 Authorities alerted! NDRF, Forest Dept & State Police notified.');
      btn.style.background = 'linear-gradient(135deg, #00FF88, #00CC6E)';
      btn.style.color = '#07120A';
      btn.textContent = '✅ Authorities Alerted';
      setTimeout(() => {
        btn.style.background = '';
        btn.style.color = '';
        btn.textContent = '🚨 Alert Authorities Now';
      }, 3000);
    });
  }

  // ── Live feed ticker ──────────────────────────────────────
  function startLiveFeed() {
    const newEvents = [
      { severity:'critical', tag:'CRITICAL', location:'Manipur Eastern Sector', detail:'289 trees removed', time:'just now', coords:'24.65°N, 93.90°E', area:'0.9 km²' },
      { severity:'medium',   tag:'HIGH',     location:'Chhattisgarh Zone 5',    detail:'415 trees removed', time:'just now', coords:'21.27°N, 81.86°E', area:'1.4 km²' },
      { severity:'low',      tag:'INFO',     location:'Himachal Reforestation', detail:'+800 trees planted', time:'just now', coords:'31.10°N, 77.17°E', area:'2.2 km²' },
    ];

    let idx = 0;
    setInterval(() => {
      const container = document.getElementById('detection-feed');
      if (!container) return;

      const d   = newEvents[idx % newEvents.length];
      const div = document.createElement('div');
      div.className = `detection-item ${d.severity}`;
      div.style.opacity = '0';
      div.style.transform = 'translateY(-8px)';
      div.innerHTML = `
        <span class="alert-tag ${d.severity === 'critical' ? 'critical' : d.severity === 'medium' ? 'warning' : 'info'}">${d.tag}</span>
        <span class="alert-msg" style="font-size:0.88rem;font-weight:600;">${d.location}</span>
        <span class="alert-msg" style="font-size:0.78rem;color:var(--text-secondary);">${d.detail}</span>
        <span class="alert-time">${d.time}</span>
      `;

      container.insertBefore(div, container.firstChild);
      requestAnimationFrame(() => {
        div.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        div.style.opacity    = '1';
        div.style.transform  = 'translateY(0)';
      });

      if (container.children.length > 8) container.removeChild(container.lastChild);
      idx++;
    }, 12000);
  }

  // ── Public init ───────────────────────────────────────────
  function init() {
    renderFeed();
    updateScenario(0);
    setupLayerControls();
    setupAlertButton();
    startLiveFeed();
  }

  return { init };
})();


/* ── MODULE: plantation.js ─────────────────────────────────────── */
/**
 * EARTH IMMUNE SYSTEM AI
 * Tree Plantation Planner Module
 */

const Plantation = (function () {

  // ── Dummy data ────────────────────────────────────────────
  const PRIORITY_ZONES = [
    {
      tag: 'CRITICAL', tagClass: 'critical',
      title: 'Rajasthan — Jaisalmer',
      sub:   '+6.3°C above avg · No green cover',
      borderClass: 'high',
    },
    {
      tag: 'HIGH', tagClass: 'high',
      title: 'MP — Vindhyachal Central — West',
      sub:   '+1.8°C above avg · 18% green cover',
      borderClass: 'medium',
    },
    {
      tag: 'MEDIUM', tagClass: 'medium',
      title: 'Telangana & South-Central India',
      sub:   '+1.8°C above avg avg · 39% green cover',
      borderClass: 'medium',
    },
    {
      tag: 'LOW', tagClass: 'low',
      title: 'Maharashtra — Vidarbha — Marathwada',
      sub:   '+1°C above avg · 55% green cover',
      borderClass: 'low',
    },
  ];

  const SPECIES = [
    {
      icon: '🌿', name: 'Neem', sci: 'Azadirachta indica',
      benefit: 'Drought-resistant · Air purifier · Antibacterial properties',
    },
    {
      icon: '🪴', name: 'Peepal', sci: 'Ficus religiosa',
      benefit: 'Highest O₂ output · Long-lived · Sacred canopy tree',
    },
    {
      icon: '🌳', name: 'Banyan', sci: 'Ficus benghalensis',
      benefit: 'Massive canopy · Root binding · Carbon sequestration',
    },
    {
      icon: '🌲', name: 'Arjun', sci: 'Terminalia arjuna',
      benefit: 'Riverbank stabilizer · Medicinal · Fast-growing',
    },
    {
      icon: '🌵', name: 'Khejri', sci: 'Prosopis cineraria',
      benefit: 'Desert survivor · Nitrogen fixer · Fodder source',
    },
  ];

  const STATE_DATA = {
    rajasthan: {
      location: 'Rajasthan — Jaisalmer',
      trees:    '59,923 Neem trees recommended',
      tempBefore: '48°C', tempAfter: '41.2°C', tempDelta: '−3.8°C', tempBar: '75%',
      floodBefore:'76%',  floodAfter: '52%',   floodDelta: '−28%',  floodBar: '55%',
      gwBefore: 'Low',    gwAfter: 'Moderate',  gwDelta: '+35%',     gwBar: '60%',
      ehBefore: '32/100', ehAfter: '61/100',    ehDelta: '+20 pts',  ehBar: '61%',
    },
    mp: {
      location: 'Madhya Pradesh — Bhopal District',
      trees:    '28,400 Banyan trees recommended',
      tempBefore: '44°C', tempAfter: '40.5°C', tempDelta: '−3.5°C', tempBar: '68%',
      floodBefore:'62%',  floodAfter: '46%',   floodDelta: '−26%',  floodBar: '48%',
      gwBefore: 'Low',    gwAfter: 'Moderate',  gwDelta: '+28%',     gwBar: '52%',
      ehBefore: '38/100', ehAfter: '64/100',    ehDelta: '+26 pts',  ehBar: '64%',
    },
    up: {
      location: 'Uttar Pradesh — Allahabad Region',
      trees:    '34,500 Peepal trees recommended',
      tempBefore: '42°C', tempAfter: '39.2°C', tempDelta: '−2.8°C', tempBar: '60%',
      floodBefore:'58%',  floodAfter: '42%',   floodDelta: '−16%',  floodBar: '40%',
      gwBefore: 'Medium', gwAfter: 'Good',      gwDelta: '+22%',     gwBar: '48%',
      ehBefore: '44/100', ehAfter: '66/100',    ehDelta: '+22 pts',  ehBar: '66%',
    },
    maharashtra: {
      location: 'Maharashtra — Vidarbha',
      trees:    '19,800 Arjun trees recommended',
      tempBefore: '41°C', tempAfter: '38.8°C', tempDelta: '−2.2°C', tempBar: '52%',
      floodBefore:'55%',  floodAfter: '44%',   floodDelta: '−11%',  floodBar: '36%',
      gwBefore: 'Medium', gwAfter: 'Good',      gwDelta: '+18%',     gwBar: '42%',
      ehBefore: '48/100', ehAfter: '67/100',    ehDelta: '+19 pts',  ehBar: '67%',
    },
    gujarat: {
      location: 'Gujarat — Kutch Region',
      trees:    '45,200 Khejri trees recommended',
      tempBefore: '46°C', tempAfter: '42.1°C', tempDelta: '−3.9°C', tempBar: '78%',
      floodBefore:'30%',  floodAfter: '22%',   floodDelta: '−8%',   floodBar: '25%',
      gwBefore: 'Critical', gwAfter: 'Low',     gwDelta: '+40%',     gwBar: '55%',
      ehBefore: '28/100', ehAfter: '54/100',    ehDelta: '+26 pts',  ehBar: '54%',
    },
    assam: {
      location: 'Assam — Guwahati District',
      trees:    '22,180 Teak trees recommended',
      tempBefore: '36°C', tempAfter: '33.8°C', tempDelta: '−2.2°C', tempBar: '58%',
      floodBefore:'68%',  floodAfter: '51%',   floodDelta: '−25%',  floodBar: '54%',
      gwBefore: 'Medium', gwAfter: 'Good',      gwDelta: '+26%',     gwBar: '58%',
      ehBefore: '42/100', ehAfter: '65/100',    ehDelta: '+23 pts',  ehBar: '63%',
    },
    kerala: {
      location: 'Kerala — Kochi District',
      trees:    '16,700 Teak trees recommended',
      tempBefore: '33°C', tempAfter: '30.8°C', tempDelta: '−2.2°C', tempBar: '52%',
      floodBefore:'48%',  floodAfter: '31%',   floodDelta: '−17%',  floodBar: '40%',
      gwBefore: 'Medium', gwAfter: 'Good',      gwDelta: '+25%',     gwBar: '55%',
      ehBefore: '50/100', ehAfter: '70/100',    ehDelta: '+20 pts',  ehBar: '64%',
    },
    punjab: {
      location: 'Punjab — Amritsar District',
      trees:    '24,300 Shisham trees recommended',
      tempBefore: '35°C', tempAfter: '31.9°C', tempDelta: '−3.1°C', tempBar: '66%',
      floodBefore:'52%',  floodAfter: '38%',   floodDelta: '−14%',  floodBar: '45%',
      gwBefore: 'Medium', gwAfter: 'Good',      gwDelta: '+24%',     gwBar: '53%',
      ehBefore: '46/100', ehAfter: '69/100',    ehDelta: '+23 pts',  ehBar: '66%',
    },
    bihar: {
      location: 'Bihar — Patna District',
      trees:    '21,100 Banyan trees recommended',
      tempBefore: '37°C', tempAfter: '34.4°C', tempDelta: '−2.6°C', tempBar: '61%',
      floodBefore:'72%',  floodAfter: '55%',   floodDelta: '−23%',  floodBar: '57%',
      gwBefore: 'Low',    gwAfter: 'Moderate',  gwDelta: '+30%',     gwBar: '51%',
      ehBefore: '39/100', ehAfter: '62/100',    ehDelta: '+23 pts',  ehBar: '60%',
    },
    karnataka: {
      location: 'Karnataka — Bengaluru District',
      trees:    '27,600 Neem trees recommended',
      tempBefore: '34°C', tempAfter: '31.0°C', tempDelta: '−3.0°C', tempBar: '64%',
      floodBefore:'38%',  floodAfter: '26%',   floodDelta: '−12%',  floodBar: '32%',
      gwBefore: 'Medium', gwAfter: 'Good',      gwDelta: '+30%',     gwBar: '57%',
      ehBefore: '53/100', ehAfter: '72/100',    ehDelta: '+19 pts',  ehBar: '65%',
    },
  };

  const STATE_DISTRICTS = {
    rajasthan: ['Jaisalmer', 'Barmer', 'Jodhpur', 'Bikaner', 'Jaipur'],
    mp: ['Bhopal', 'Indore', 'Ujjain', 'Gwalior', 'Jabalpur'],
    up: ['Allahabad', 'Lucknow', 'Kanpur', 'Varanasi', 'Agra'],
    maharashtra: ['Nagpur', 'Mumbai', 'Pune', 'Nashik', 'Aurangabad'],
    gujarat: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Kutch'],
    assam: ['Guwahati', 'Dibrugarh', 'Jorhat', 'Silchar', 'Tezpur'],
    kerala: ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam'],
    punjab: ['Amritsar', 'Ludhiana', 'Jalandhar', 'Patiala', 'Chandigarh'],
    bihar: ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga'],
    karnataka: ['Bengaluru', 'Mysore', 'Hubballi', 'Mangalore', 'Belgaum'],
  };

  // ── Render priority zones ─────────────────────────────────
  function renderPriorityZones() {
    const container = document.getElementById('priority-zones');
    if (!container) return;

    PRIORITY_ZONES.forEach(z => {
      const div = document.createElement('div');
      div.className = `pz-item ${z.borderClass}`;
      div.innerHTML = `
        <span class="pz-tag ${z.tagClass}">${z.tag}</span>
        <div class="pz-title">${z.title}</div>
        <div class="pz-sub">${z.sub}</div>
      `;
      div.addEventListener('click', () => showToast(`📍 Selected: ${z.title}`));
      container.appendChild(div);
    });
  }

  // ── Render species list ───────────────────────────────────
  function renderSpecies() {
    const container = document.getElementById('species-list');
    if (!container) return;

    SPECIES.forEach(s => {
      const div = document.createElement('div');
      div.className = 'species-item';
      div.innerHTML = `
        <span class="species-icon">${s.icon}</span>
        <span class="species-name">${s.name}</span>
        <span class="species-sci">${s.sci}</span>
        <span class="species-benefit">${s.benefit}</span>
      `;
      container.appendChild(div);
    });
  }

  // ── Update simulation result ──────────────────────────────
  function populateDistricts(stateKey = 'rajasthan') {
    const districtSelect = document.getElementById('plant-district');
    if (!districtSelect) return;

    const districts = STATE_DISTRICTS[stateKey] || STATE_DISTRICTS.rajasthan;
    districtSelect.innerHTML = '<option value="">Select District</option>';

    districts.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.toLowerCase().replace(/[^a-z0-9]+/gi, '-');
      opt.textContent = d;
      districtSelect.appendChild(opt);
    });
  }

  const WATER_SCORE = {
    Critical: 15,
    Low: 30,
    Medium: 55,
    Moderate: 60,
    Good: 80,
  };

  function formatSigned(value) {
    return `${value > 0 ? '+' : ''}${value}`;
  }

  function formatMetricDelta(beforeValue, afterValue, suffix = '') {
    const delta = parseFloat((afterValue - beforeValue).toFixed(1));
    return `${formatSigned(delta)}${suffix}`;
  }

  function updateSimulation(stateKey, districtText) {
    const d = STATE_DATA[stateKey] || STATE_DATA.rajasthan;
    const districtSelect = document.getElementById('plant-district');
    const district = districtText
      || districtSelect?.selectedOptions?.[0]?.text
      || '';
    const location = district && district !== 'Select District'
      ? `${d.location.split(' — ')[0]} — ${district}`
      : d.location;

    const loc = document.getElementById('sim-location');
    if (loc) {
      loc.querySelector('.sim-loc-name').textContent = location;
      loc.querySelector('.sim-loc-sub').textContent  = `Plant ${d.trees}`;
    }
    const tempBefore = parseFloat(d.tempBefore);
    const tempAfter = parseFloat(d.tempAfter);
    const floodBefore = parseFloat(d.floodBefore);
    const floodAfter = parseFloat(d.floodAfter);
    const ehBefore = parseInt(d.ehBefore, 10);
    const ehAfter = parseInt(d.ehAfter, 10);
    const gwBeforeLabel = d.gwBefore;
    const gwAfterLabel = d.gwAfter;
    const gwBeforeValue = WATER_SCORE[gwBeforeLabel] ?? 0;
    const gwAfterValue = WATER_SCORE[gwAfterLabel] ?? gwBeforeValue;

    const simMetrics = [
      {
        before: `${tempBefore.toFixed(1)}°C`,
        after: `${tempAfter.toFixed(1)}°C`,
        delta: formatMetricDelta(tempBefore, tempAfter, '°C'),
        bar: d.tempBar,
        class: 'neon',
      },
      {
        before: `${floodBefore}%`,
        after: `${floodAfter}%`,
        delta: formatMetricDelta(floodBefore, floodAfter, '%'),
        bar: d.floodBar,
        class: 'cyan',
      },
      {
        before: gwBeforeLabel,
        after: gwAfterLabel,
        delta: `${formatSigned(gwAfterValue - gwBeforeValue)}%`,
        bar: d.gwBar,
        class: 'neon',
      },
      {
        before: `${ehBefore}/100`,
        after: `${ehAfter}/100`,
        delta: `${formatMetricDelta(ehBefore, ehAfter, ' pts')}`,
        bar: d.ehBar,
        class: 'gold',
      },
    ];

    const rows = document.querySelectorAll('.sim-metric');
    // Debug logs to help trace values during development
    console.log('Simulation values for', stateKey, {
      tempBefore, tempAfter, floodBefore, floodAfter, ehBefore, ehAfter,
      gwBeforeLabel, gwAfterLabel, gwBeforeValue, gwAfterValue
    });
    if (rows.length >= simMetrics.length) {
      const update = (row, metric) => {
        row.querySelector('.sm-before').textContent = metric.before;
        row.querySelector('.sm-after').textContent = metric.after;
        row.querySelector('.sm-delta').textContent = metric.delta;
        const fill = row.querySelector('.im-bar-fill');
        if (fill) {
          fill.style.width = '0%';
          fill.className = `im-bar-fill ${metric.class}`;
          setTimeout(() => { fill.style.width = metric.bar; }, 100);
        }
      };
      rows.forEach((row, index) => update(row, simMetrics[index]));
    }
  }

  // ── State selector ────────────────────────────────────────
  function setupSelectors() {
    const stateSelect = document.getElementById('plant-state');
    const districtSelect = document.getElementById('plant-district');

    populateDistricts('rajasthan');

    if (stateSelect) {
      stateSelect.addEventListener('change', function () {
        const stateKey = this.value || 'rajasthan';
        populateDistricts(stateKey);
        updateSimulation(stateKey);
        showToast(`📍 Analyzing ${this.options[this.selectedIndex].text} — loading AI data...`);
      });
    }

    if (districtSelect) {
      districtSelect.addEventListener('change', function () {
        const stateKey = stateSelect?.value || 'rajasthan';
        updateSimulation(stateKey);
        if (this.value) {
          showToast(`📍 District selected: ${this.options[this.selectedIndex].text}`);
        }
      });
    }
  }

  // ── Public init ───────────────────────────────────────────
  function init() {
    renderPriorityZones();
    renderSpecies();
    setupSelectors();
  }

  return { init };
})();


/* ── MODULE: disaster.js ─────────────────────────────────────── */
/**
 * EARTH IMMUNE SYSTEM AI
 * Disaster Risk Detection Module
 */

const Disaster = (function () {

  const RISK_REGIONS = [
    { name: 'Bihar',        score: 92, level: 'High',     levelClass: 'high',     fillW: '92%' },
    { name: 'Uttarakhand',  score: 92, level: 'High',     levelClass: 'high',     fillW: '92%' },
    { name: 'Assam',        score: 88, level: 'High',     levelClass: 'high',     fillW: '88%' },
    { name: 'Odisha',       score: 75, level: 'Moderate', levelClass: 'moderate', fillW: '75%' },
    { name: 'West Bengal',  score: 70, level: 'Moderate', levelClass: 'moderate', fillW: '70%' },
    { name: 'Kerala',       score: 65, level: 'Moderate', levelClass: 'moderate', fillW: '65%' },
    { name: 'Rajasthan',    score: 60, level: 'Moderate', levelClass: 'moderate', fillW: '60%' },
    { name: 'Tamil Nadu',   score: 55, level: 'Moderate', levelClass: 'moderate', fillW: '55%' },
  ];

  const SMS_ALERTS = {
    bihar:       'EMERGENCY: Extreme Flood Warning for Bihar. Immediate evacuation in low-lying areas. Contact NDRF helpline: 011-24363260. — NDRF.',
    uttarakhand: 'ALERT: Flash flood risk in Uttarakhand. Avoid river zones. Evacuate Chamoli & Pithoragarh low-lying areas. — SDRF Uttarakhand.',
    assam:       'WARNING: Brahmaputra level critical. Evacuate flood plains immediately. Disaster teams deployed. — Assam SDMA.',
    odisha:      'ADVISORY: Cyclone watch Odisha coast. Secure belongings. Evacuation shelters open. — IMD/NDMA.',
    default:     'HIGH RISK ALERT: Severe Weather Warning issued. Activate emergency protocols. Check official channels. — NDRF.',
  };

  // ── Render risk regions list ──────────────────────────────
  function renderRiskRegions() {
    const container = document.getElementById('risk-regions');
    if (!container) return;

    RISK_REGIONS.forEach(r => {
      const div = document.createElement('div');
      div.className = 'risk-item';
      div.innerHTML = `
        <div class="risk-item-top">
          <span class="ri-name">${r.name}</span>
          <span class="ri-score">Risk Score: ${r.score}/100</span>
        </div>
        <div class="ri-progress">
          <div class="ri-progress-fill ${r.levelClass}" style="width:0%"></div>
        </div>
        <span class="ri-alert ${r.levelClass}">Alert Level: ${r.level}</span>
      `;

      // Click to update SMS
      div.addEventListener('click', () => {
        document.querySelectorAll('.risk-item').forEach(el => el.style.outline = 'none');
        div.style.outline = '1px solid rgba(255,77,77,0.4)';
        updateSMS(r.name.toLowerCase());
        showToast(`⚠️ ${r.name} selected — risk data loaded`);
      });

      container.appendChild(div);

      // Animate fill bar
      setTimeout(() => {
        const fill = div.querySelector('.ri-progress-fill');
        if (fill) fill.style.width = r.fillW;
      }, 300);
    });
  }

  // ── Update SMS preview ────────────────────────────────────
  function updateSMS(state) {
    const el = document.getElementById('sms-text');
    if (el) el.textContent = SMS_ALERTS[state] || SMS_ALERTS.default;
  }

  // ── Risk layer controls ───────────────────────────────────
  function setupLayerControls() {
    document.querySelectorAll('.layer-btn[data-risk]').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.layer-btn[data-risk]').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        showToast(`🗺 Risk layer: ${this.textContent} — map updated`);
      });
    });
  }

  // ── Disaster search ───────────────────────────────────────
  function setupSearch() {
    const input = document.getElementById('disaster-search');
    if (!input) return;

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        const val = this.value.trim();
        if (val) {
          showToast(`🔍 Searching risk data for: "${val}"`);
          updateSMS(val.toLowerCase().split(' ')[0]);
        }
      }
    });
  }

  // ── Generate report button ────────────────────────────────
  function setupReportBtn() {
    const btn = document.getElementById('btn-disaster-report');
    if (!btn) return;

    btn.addEventListener('click', () => {
      btn.textContent = '⏳ Generating Status Report...';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = '✅ Status Report Ready';
        btn.style.background = 'linear-gradient(135deg, #00D9FF, #0099CC)';
        showToast('📊 Status report generated with all risk zones. PDF ready.');
        setTimeout(() => {
          btn.textContent = '📊 Generate Status Report';
          btn.style.background = '';
          btn.disabled = false;
        }, 3000);
      }, 2000);
    });
  }

  // ── Animate timeline ──────────────────────────────────────
  function animateTimeline() {
    const progress = document.querySelector('#page-disaster .tl-progress');
    if (progress) {
      setTimeout(() => {
        progress.style.transition = 'width 2s ease';
        progress.style.width = '65%';
      }, 500);
    }
  }

  // ── Public init ───────────────────────────────────────────
  function init() {
    renderRiskRegions();
    setupLayerControls();
    setupSearch();
    setupReportBtn();
    animateTimeline();
  }

  return { init };
})();


/* ── MODULE: farmer.js ─────────────────────────────────────── */
/**
 * EARTH IMMUNE SYSTEM AI
 * Farmer Advisory Module
 */

const Farmer = (function () {

  // ── Crop-specific advisory data ───────────────────────────
  const CROP_DATA = {
    rice: {
      warnings: [
        { type: 'flood',   typeLabel: 'FLOOD',   msg: 'Flood risk within 48 hrs. Drain paddy fields. Check embankments.' },
        { type: 'weather', typeLabel: 'WEATHER', msg: 'Heavy rain predicted. Delay urea application by 72 hours.' },
      ],
      sms:      '[AGRI ALERT]: Flood risk in your area within 48 hrs. Drain rice paddy fields immediately. Move machinery. From ICAR.',
      checklist:['Drain waterlogged paddy fields', 'Stop fertiliser application during rain', 'Secure farm machinery on high ground', 'Check for disease post-rain', 'Contact block agriculture officer'],
    },
    wheat: {
      warnings: [
        { type: 'weather', typeLabel: 'WEATHER', msg: 'Sudden temperature drop expected. Cover young wheat saplings where possible.' },
        { type: 'pest',    typeLabel: 'PEST',    msg: 'Yellow rust risk elevated due to recent moisture. Monitor fields closely.' },
      ],
      sms:      '[AGRI ALERT]: Temperature drop + moisture risk for wheat. Monitor for yellow rust. Fungicide spray advised. From ICAR.',
      checklist:['Monitor for rust and blight', 'Delay irrigation 24 hours', 'Prepare fungicide spray', 'Check soil moisture levels', 'Report disease signs to KVK'],
    },
    cotton: {
      warnings: [
        { type: 'pest',    typeLabel: 'PEST',    msg: 'Bollworm activity elevated. Inspect crop and deploy pheromone traps.' },
        { type: 'weather', typeLabel: 'WEATHER', msg: 'Excess moisture risks root rot in cotton. Improve field drainage.' },
      ],
      sms:      '[AGRI ALERT]: Bollworm risk HIGH. Deploy pheromone traps. Spray Bt formulation. Avoid water stagnation. From ICAR.',
      checklist:['Deploy pheromone traps in field', 'Inspect bolls for pest damage', 'Improve drainage channels', 'Apply bio-control agents', 'Report pest emergence to district officer'],
    },
    vegetables: {
      warnings: [
        { type: 'flood',   typeLabel: 'FLOOD',   msg: 'Flash flood risk. Move potted seedlings. Clear drainage channels urgently.' },
        { type: 'weather', typeLabel: 'WEATHER', msg: 'Hailstorm risk in evening. Use shade nets to protect tender crops.' },
      ],
      sms:      '[AGRI ALERT]: Hailstorm risk this evening. Protect vegetable beds with shade nets. Secure polyhouse structures. From ICAR.',
      checklist:['Install shade nets on beds', 'Clear drainage around plots', 'Harvest ripe produce early', 'Secure polyhouse anchors', 'Reschedule irrigation to morning'],
    },
    millets: {
      warnings: [
        { type: 'weather', typeLabel: 'DROUGHT', msg: 'Below-normal rainfall predicted next 15 days. Conserve soil moisture.' },
        { type: 'pest',    typeLabel: 'PEST',    msg: 'Stem borer risk after dry spell. Monitor millet stems closely.' },
      ],
      sms:      '[AGRI ALERT]: Drought risk. Use mulch to retain soil moisture for millet. Stem borer alert — inspect weekly. From ICAR.',
      checklist:['Apply mulch to conserve moisture', 'Reduce irrigation frequency', 'Check stems for borer damage', 'Use drip irrigation if available', 'Report to PM-Kisan helpline if loss >30%'],
    },
  };

  const STATE_WARNINGS = {
    punjab:      { banner: 'CURRENT FLOOD WARNING: MODERATE RISK', bannerSub: 'Heavy rainfall predicted, check field drainage.', bannerClass: 'moderate' },
    andhra:      { banner: 'CYCLONE WATCH: HIGH ALERT',            bannerSub: 'Coastal farmers: evacuate low-lying areas immediately.', bannerClass: 'high' },
    maharashtra: { banner: 'HEAVY RAIN ADVISORY: WATCH',           bannerSub: 'Prepare drainage, postpone fertiliser application.', bannerClass: 'moderate' },
    up:          { banner: 'FLOOD ADVISORY: MODERATE RISK',        bannerSub: 'Yamuna & Ganga banks on watch. Evacuate flood zones.', bannerClass: 'moderate' },
    mp:          { banner: 'HEATWAVE ADVISORY: HIGH RISK',         bannerSub: 'Irrigate crops at dawn/dusk. Avoid daytime field work.', bannerClass: 'high' },
    bihar:       { banner: 'FLOOD WARNING: CRITICAL RISK',         bannerSub: 'Evacuate crops immediately. NDRF teams deployed.', bannerClass: 'critical' },
    rajasthan:   { banner: 'HEATWAVE ALERT: CRITICAL',             bannerSub: 'Temperature may reach 48°C. Postpone all outdoor work.', bannerClass: 'critical' },
    karnataka:   { banner: 'HEAVY RAIN WATCH: LOW RISK',           bannerSub: 'Monitor soil moisture levels. Maintain drainage.', bannerClass: 'low' },
  };

  let activeCrop  = 'rice';
  let activeState = 'punjab';

  // ── Render warnings ───────────────────────────────────────
  function renderWarnings(crop) {
    const container = document.getElementById('farmer-warnings');
    if (!container) return;
    container.innerHTML = '';

    const data = CROP_DATA[crop] || CROP_DATA.rice;
    data.warnings.forEach(w => {
      const div = document.createElement('div');
      div.className = `warn-item ${w.type}`;
      div.innerHTML = `
        <div class="warn-type ${w.type}">${w.typeLabel}</div>
        <div class="warn-msg">${w.msg}</div>
      `;
      container.appendChild(div);
    });
  }

  // ── Update SMS ────────────────────────────────────────────
  function updateSMS(crop) {
    const el = document.getElementById('farmer-sms');
    if (el) el.textContent = CROP_DATA[crop]?.sms || CROP_DATA.rice.sms;
  }

  // ── Update checklist ──────────────────────────────────────
  function updateChecklist(crop) {
    const container = document.getElementById('farmer-checklist');
    if (!container) return;
    container.innerHTML = '';

    const items = CROP_DATA[crop]?.checklist || CROP_DATA.rice.checklist;
    items.forEach((item, i) => {
      const label = document.createElement('label');
      label.className = 'check-item';
      label.innerHTML = `<input type="checkbox" ${i === 2 ? 'checked' : ''} /> ${item}`;
      container.appendChild(label);
    });
  }

  // ── Update warning banner ─────────────────────────────────
  function updateBanner(state) {
    const data    = STATE_WARNINGS[state] || STATE_WARNINGS.punjab;
    const banner  = document.getElementById('warning-banner');
    if (!banner) return;

    const colors = {
      critical: { bg: 'rgba(255,77,77,0.12)',   border: 'rgba(255,77,77,0.35)',   accent: 'var(--red)',    btn: 'var(--red)' },
      high:     { bg: 'rgba(255,159,28,0.12)',  border: 'rgba(255,159,28,0.35)', accent: 'var(--orange)', btn: 'var(--orange)' },
      moderate: { bg: 'rgba(255,159,28,0.12)',  border: 'rgba(255,159,28,0.35)', accent: 'var(--orange)', btn: 'var(--orange)' },
      low:      { bg: 'rgba(255,209,102,0.10)', border: 'rgba(255,209,102,0.3)', accent: 'var(--gold)',   btn: 'var(--gold)' },
    };
    const c = colors[data.bannerClass] || colors.moderate;

    banner.style.background = c.bg;
    banner.style.borderColor = c.border;
    banner.querySelector('.wb-title').innerHTML = `CURRENT WARNING: <span class="wb-level-text" style="color:${c.accent}">${data.banner}</span>`;
    banner.querySelector('.wb-sub').textContent = data.bannerSub;
    banner.querySelector('.wb-level').style.background = c.btn;
  }

  // ── Crop selector ─────────────────────────────────────────
  function setupCropSelector() {
    const items = document.querySelectorAll('.crop-item');
    items.forEach(item => {
      item.addEventListener('click', function () {
        items.forEach(el => el.classList.remove('active'));
        this.classList.add('active');
        activeCrop = this.dataset.crop;
        renderWarnings(activeCrop);
        updateSMS(activeCrop);
        updateChecklist(activeCrop);
        showToast(`🌾 Advisory updated for: ${this.querySelector('span:last-child').textContent}`);
      });
    });
  }

  const FARMER_DISTRICTS = {
    punjab: ['Amritsar', 'Ludhiana', 'Jalandhar', 'Patiala', 'Chandigarh'],
    andhra: ['Vijayawada', 'Visakhapatnam', 'Kadapa', 'Tirupati', 'Guntur'],
    maharashtra: ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad'],
    up: ['Lucknow', 'Kanpur', 'Varanasi', 'Agra', 'Allahabad'],
    mp: ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain'],
    bihar: ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga'],
    rajasthan: ['Jaipur', 'Jodhpur', 'Udaipur', 'Bikaner', 'Jaisalmer'],
    karnataka: ['Bengaluru', 'Mysore', 'Mangalore', 'Hubballi', 'Belgaum'],
  };

  function populateFarmerDistricts(stateKey = 'punjab') {
    const districtSelect = document.getElementById('farmer-district');
    if (!districtSelect) return;

    const districts = FARMER_DISTRICTS[stateKey] || FARMER_DISTRICTS.punjab;
    districtSelect.innerHTML = '<option value="">Select District</option>';

    districts.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.toLowerCase().replace(/[^a-z0-9]+/gi, '-');
      opt.textContent = d;
      districtSelect.appendChild(opt);
    });
  }

  // ── State selector ────────────────────────────────────────
  function setupStateSelector() {
    const stateSelect = document.getElementById('farmer-state');
    const districtSelect = document.getElementById('farmer-district');

    populateFarmerDistricts(activeState);

    if (stateSelect) {
      stateSelect.addEventListener('change', function () {
        activeState = this.value || 'punjab';
        populateFarmerDistricts(activeState);
        updateBanner(activeState);
        showToast(`📍 Advisory loaded for ${this.options[this.selectedIndex].text}`);
      });
    }

    if (districtSelect) {
      districtSelect.addEventListener('change', function () {
        if (this.value) {
          showToast(`📍 District selected: ${this.options[this.selectedIndex].text}`);
        }
      });
    }
  }

  // ── Crop advisory button ──────────────────────────────────
  function setupAdvisoryBtn() {
    const btn = document.getElementById('btn-crop-advisory');
    if (!btn) return;

    btn.addEventListener('click', () => {
      btn.textContent = '⏳ Generating Advisory...';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = '✅ Advisory Sent via SMS!';
        btn.style.background = 'linear-gradient(135deg, #00D9FF, #0099CC)';
        showToast(`📱 Crop advisory SMS dispatched to 1,240 farmers in ${activeState || 'Punjab'}`);
        setTimeout(() => {
          btn.textContent = '🌾 Request Crop Advisory';
          btn.style.background = '';
          btn.disabled = false;
        }, 3000);
      }, 1600);
    });
  }

  // ── Public init ───────────────────────────────────────────
  function init() {
    renderWarnings('rice');
    updateSMS('rice');
    updateChecklist('rice');
    updateBanner('punjab');
    setupCropSelector();
    setupStateSelector();
    setupAdvisoryBtn();
  }

  return { init };
})();


/* ── MODULE: main.js ─────────────────────────────────────── */
/**
 * EARTH IMMUNE SYSTEM AI
 * Main Module — navigation, GSAP, page transitions, app boot
 */

(function () {
  'use strict';

  // ── Global toast helper (used by all modules) ─────────────
  window.showToast = function (msg, duration = 3500) {
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      toast.style.opacity    = '0';
      toast.style.transform  = 'translateX(120%)';
      setTimeout(() => toast.remove(), 400);
    }, duration);
  };

  // ── State ─────────────────────────────────────────────────
  let currentPage    = 'dashboard';
  let appLaunched    = false;
  let chartsInited   = false;
  let mapsInited     = false;
  let modulesInited  = {};

  const PAGE_NAMES = {
    dashboard:  'Dashboard',
    forest:     'Forest Monitor',
    plantation: 'Tree Planner',
    disaster:   'Disaster Risk',
    farmer:     'Farmer Advisory',
  };

  // ── DOM refs ──────────────────────────────────────────────
  const landing       = document.getElementById('landing');
  const app           = document.getElementById('app');
  const btnLaunch     = document.getElementById('btn-launch');
  const btnLaunchTop  = document.getElementById('btn-launch-top');
  const btnExplore    = document.getElementById('btn-explore');
  const btnBack       = document.getElementById('btn-back');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar       = document.getElementById('sidebar');
  const breadcrumb    = document.getElementById('breadcrumb');

  // ── GSAP landing animations ───────────────────────────────
  function initLandingAnimations() {
    if (typeof gsap === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.from('.landing-topbar',    { y: -30, opacity: 0, duration: 0.6 })
      .from('.hero-badge',        { y: 20, opacity: 0, duration: 0.5 }, '-=0.2')
      .from('.hero-title',        { y: 40, opacity: 0, duration: 0.7 }, '-=0.3')
      .from('.hero-subtitle',     { y: 25, opacity: 0, duration: 0.6 }, '-=0.4')
      .from('.hero-stats',        { y: 20, opacity: 0, duration: 0.5 }, '-=0.3')
      .from('.hero-cta',          { y: 20, opacity: 0, duration: 0.5 }, '-=0.2')
      .from('.earth-hero-wrap',   { x: 80, opacity: 0, duration: 1.0, ease: 'power2.out' }, '-=0.7');

        // Feature cards scroll reveal
    gsap.from('.fp-card', {
      scrollTrigger: { trigger: '.features-preview', start: 'top 85%' },
      y: 30, opacity: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out',
    });

    // Scroll cue
    gsap.to('.scroll-cue', {
      opacity: 0.4, duration: 1.5, repeat: -1, yoyo: true, ease: 'sine.inOut',
    });
  }

  // ── Launch app ────────────────────────────────────────────
  function launchApp() {
    if (appLaunched) return;
    appLaunched = true;

    if (typeof gsap !== 'undefined') {
      gsap.to(landing, {
        opacity: 0, scale: 0.96, duration: 0.6, ease: 'power2.inOut',
        onComplete: () => {
          landing.style.display = 'none';
          showAppContainer();
        },
      });
    } else {
      landing.style.display = 'none';
      showAppContainer();
    }
  }

  function showAppContainer() {
    app.classList.remove('app-hidden');
    app.classList.add('app-visible');

    if (!mapsInited) {
      Maps.initAll();
      mapsInited = true;
    }
    if (!chartsInited) {
      setTimeout(() => {
        Charts.initAll();
        chartsInited = true;
      }, 300);
    }

    // Init modules
    initModuleOnce('dashboard', () => {
      Dashboard.init();
      Dashboard.startLiveTicker();
    });

    switchPage('dashboard', false);

    // Animate app in
    if (typeof gsap !== 'undefined') {
      gsap.from('#sidebar',  { x: -30, opacity: 0, duration: 0.5, ease: 'power2.out' });
      gsap.from('#top-nav',  { y: -20, opacity: 0, duration: 0.4, ease: 'power2.out', delay: 0.1 });
      gsap.from('.stat-card',{ y: 20, opacity: 0, stagger: 0.06, duration: 0.4, ease: 'power2.out', delay: 0.2 });
    }

    // Trigger stat counters after delay
    setTimeout(() => Dashboard.renderStats(), 600);
  }

  // ── Back to landing ───────────────────────────────────────
  function backToLanding() {
    if (typeof gsap !== 'undefined') {
      gsap.to(app, {
        opacity: 0, duration: 0.4, ease: 'power2.in',
        onComplete: () => {
          app.classList.add('app-hidden');
          app.classList.remove('app-visible');
          app.style.opacity = '';
          landing.style.display = '';
          gsap.to(landing, { opacity: 1, duration: 0.4, ease: 'power2.out' });
          appLaunched = false;
        },
      });
    } else {
      app.classList.add('app-hidden');
      app.classList.remove('app-visible');
      landing.style.display = '';
    }
  }

  // ── Switch page ───────────────────────────────────────────
  function switchPage(pageId, animate = true) {
    const allPages = document.querySelectorAll('.page');
    const target   = document.getElementById(`page-${pageId}`);
    if (!target) return;

    // Hide all
    allPages.forEach(p => {
      p.classList.remove('active', 'page-in');
      p.style.display = 'none';
    });

    // Show target
    target.style.display = 'block';
    void target.offsetWidth; // force reflow
    target.classList.add('active');

    if (animate && typeof gsap !== 'undefined') {
      gsap.fromTo(target,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out',
          onComplete: () => target.classList.add('page-in') }
      );
    } else {
      target.style.opacity = '1';
      target.classList.add('page-in');
    }

    currentPage = pageId;

    // Update nav states
    updateNavState(pageId);

    // Update breadcrumb
    if (breadcrumb) breadcrumb.textContent = PAGE_NAMES[pageId] || pageId;

    // Invalidate map if it exists
    Maps.invalidate(pageId);

    // Init page modules on first visit
    initModuleOnce(pageId, () => initPageModule(pageId));

    // Trigger stat animations on dashboard
    if (pageId === 'dashboard') {
      setTimeout(() => Dashboard.renderStats(), 300);
    }
  }

  // ── Init page module once ─────────────────────────────────
  function initModuleOnce(id, fn) {
    if (!modulesInited[id]) {
      modulesInited[id] = true;
      try { fn(); } catch (e) { console.warn(`Module ${id}:`, e); }
    }
  }

  function initPageModule(pageId) {
    switch (pageId) {
      case 'forest':     Forest.init();     break;
      case 'plantation': Plantation.init(); break;
      case 'disaster':   Disaster.init();   break;
      case 'farmer':     Farmer.init();     break;
    }
  }

  // ── Update sidebar & tab pills nav state ──────────────────
  function updateNavState(pageId) {
    // Sidebar
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.classList.toggle('active', item.dataset.page === pageId);
    });
    // Tab pills
    document.querySelectorAll('.tab-pill[data-page]').forEach(pill => {
      pill.classList.toggle('active', pill.dataset.page === pageId);
    });
  }

  // ── Navigation event listeners ────────────────────────────
  function setupNavigation() {
    // Sidebar items
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        switchPage(this.dataset.page);
        // Close sidebar on mobile
        if (window.innerWidth < 900) sidebar.classList.remove('mobile-open');
      });
    });

    // Tab pills
    document.querySelectorAll('.tab-pill[data-page]').forEach(pill => {
      pill.addEventListener('click', function () {
        switchPage(this.dataset.page);
      });
    });

    // Sidebar toggle (mobile)
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
      });
    }
  }

  // ── Launch buttons ────────────────────────────────────────
  function setupLaunchButtons() {
    [btnLaunch, btnLaunchTop].forEach(btn => {
      if (btn) btn.addEventListener('click', launchApp);
    });

    if (btnExplore) {
      btnExplore.addEventListener('click', () => {
        const featSection = document.getElementById('features-section');
        if (featSection) {
          // Use window.scrollTo for reliability (fixed canvas can interfere with scrollIntoView)
          const rect = featSection.getBoundingClientRect();
          window.scrollTo({ top: window.scrollY + rect.top - 20, behavior: 'smooth' });

          // If still not visible, force via scrollTop after brief delay
          if (rect.top > window.innerHeight) {
            setTimeout(() => {
              document.documentElement.scrollTop = window.scrollY + rect.top - 20;
            }, 50);
          }

          // Animate feature cards in
          if (typeof gsap !== 'undefined') {
            gsap.from('.fp-card', { y: 30, opacity: 0, stagger: 0.08, duration: 0.45, ease: 'power2.out', delay: 0.3 });
          }
        }
      });
    }

    if (btnBack) btnBack.addEventListener('click', backToLanding);
  }

  // ── Keyboard shortcuts ────────────────────────────────────
  function setupKeyboard() {
    document.addEventListener('keydown', e => {
      if (!appLaunched) return;
      const keys = { '1':'dashboard', '2':'forest', '3':'plantation', '4':'disaster', '5':'farmer' };
      if (keys[e.key]) switchPage(keys[e.key]);
      if (e.key === 'Escape' && window.innerWidth < 900) {
        sidebar.classList.remove('mobile-open');
      }
    });
  }

  // ── Hero stats counter (landing page) ────────────────────
  function initHeroCounters() {
    Dashboard.renderHeroStats();
  }

  // ── Animated progress bars (initial render) ───────────────
  function initProgressBars() {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const fills = entry.target.querySelectorAll('.im-bar-fill[style]');
          fills.forEach(fill => {
            const w = fill.style.width;
            fill.style.width = '0%';
            requestAnimationFrame(() => {
              setTimeout(() => { fill.style.width = w; }, 100);
            });
          });
        }
      });
    }, { threshold: 0.3 });

    document.querySelectorAll('.impact-card, .sim-metrics').forEach(el => observer.observe(el));
  }

  // ── Live clock in sidebar ─────────────────────────────────
  function startClock() {
    const timeEl = document.querySelector('.status-time');
    if (!timeEl) return;

    setInterval(() => {
      const now = new Date();
      const h   = String(now.getHours()).padStart(2, '0');
      const m   = String(now.getMinutes()).padStart(2, '0');
      const s   = String(now.getSeconds()).padStart(2, '0');
      timeEl.textContent = `⏱ ${h}:${m}:${s} IST`;
    }, 1000);
  }

  // ── Feature card hover + click ────────────────────────────
  function initFeatureCards() {
    const pageMap = {
      'Forest Monitor':   'forest',
      'Tree Planner':     'plantation',
      'Disaster Risk':    'disaster',
      'Farmer Advisory':  'farmer',
    };
    document.querySelectorAll('.fp-card').forEach(card => {
      const title  = card.querySelector('.fp-title')?.textContent?.trim();
      const target = pageMap[title];
      if (target) {
        card.addEventListener('click', () => {
          launchApp();
          // Navigate to page after app opens
          setTimeout(() => switchPage(target), 700);
        });
      }
    });
  }

  // ── GSAP button hover effects ────────────────────────────
  function initButtonEffects() {
    if (typeof gsap === 'undefined') return;

    document.querySelectorAll('.btn-primary, .btn-generate, .btn-alert-auth').forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        gsap.to(btn, { scale: 1.03, duration: 0.2, ease: 'power2.out' });
      });
      btn.addEventListener('mouseleave', () => {
        gsap.to(btn, { scale: 1, duration: 0.2, ease: 'power2.out' });
      });
    });
  }

  // ── Light Mode Toggle ─────────────────────────────────────
  let lightMode = false;

  function toggleLightMode() {
    lightMode = !lightMode;
    document.body.classList.toggle('light-mode', lightMode);

    const icon = lightMode ? '🌙' : '☀️';
    document.querySelectorAll('.light-mode-btn').forEach(btn => {
      btn.textContent = icon;
      btn.title = lightMode ? 'Switch to dark mode' : 'Switch to light mode';
    });

    // Persist preference
    try { localStorage.setItem('eis-light-mode', lightMode ? '1' : '0'); } catch(e) {}

    ThreeBackground.setLightMode(lightMode);
    showToast(lightMode ? '☀️ Light mode enabled' : '🌙 Dark mode enabled');
  }

  function setupLightMode() {
    // Restore saved preference
    try {
      if (localStorage.getItem('eis-light-mode') === '1') toggleLightMode();
    } catch(e) {}

    document.querySelectorAll('.light-mode-btn').forEach(btn => {
      btn.addEventListener('click', toggleLightMode);
    });
  }

  // ── Window resize handler ─────────────────────────────────
  function onResize() {
    if (window.innerWidth >= 900) sidebar.classList.remove('mobile-open');
    Maps.invalidateAll();
  }

  // ── BOOT ─────────────────────────────────────────────────
  function boot() {
    initLandingAnimations();
    initHeroCounters();
    setupLaunchButtons();
    setupNavigation();
    setupKeyboard();
    initFeatureCards();
    initButtonEffects();
    startClock();

    window.addEventListener('resize', debounce(onResize, 200));
    setupLightMode();

    // Allow deep-link via URL hash
    const hash = window.location.hash.replace('#', '');
    if (PAGE_NAMES[hash]) {
      setTimeout(() => { launchApp(); setTimeout(() => switchPage(hash), 800); }, 100);
    }
  }

  // ── Debounce utility ──────────────────────────────────────
  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // ── Init on DOM ready ─────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
