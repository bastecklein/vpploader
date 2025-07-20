# VPP Loader Performance Optimization Guide

This guide covers the performance optimizations available in VPP Loader for handling many voxel models efficiently.

## Quick Performance Setup

```javascript
import { VPPLoader, VPPBatcher, VPPInstanceManager } from "vpploader";

// Create loader with performance optimizations
const loader = new VPPLoader();
loader.optimizeForPerformance({
    enableInstancing: true,
    enableLOD: true,
    lodDistances: [50, 100, 200], // Distance thresholds for LOD levels
    disableEmissive: false, // Keep lighting
    disableMetallic: true,  // Disable PBR if not needed
    disableEmitters: true   // Disable particles if not needed
});
```

## Major Performance Improvements

### 1. Geometry Sharing (Eliminates Cloning)
**Problem**: Old behavior cloned geometry for every mesh instance
**Solution**: Share geometry between identical models when instancing is enabled

```javascript
// Before: Each model gets cloned geometry (expensive)
const mesh1 = await loader.loadAsync("model.vpp"); // Geometry A (copy)
const mesh2 = await loader.loadAsync("model.vpp"); // Geometry A (copy)

// After: Geometry is shared when instancing enabled
loader.setEnableInstancing(true);
const mesh1 = await loader.loadAsync("model.vpp"); // Geometry A (shared)
const mesh2 = await loader.loadAsync("model.vpp"); // Geometry A (shared)
```

### 2. Material Caching (Eliminates Material Cloning)
**Problem**: `setOpacity()` cloned materials every time
**Solution**: Cache materials by opacity to reuse them

```javascript
// Before: Creates new material each time
mesh.setOpacity(0.5); // Material clone created
mesh.setOpacity(0.5); // Another material clone created

// After: Reuses cached materials
mesh.setOpacity(0.5); // Material cached
mesh.setOpacity(0.5); // Cached material reused
```

### 3. Instanced Rendering (Massive Draw Call Reduction)
Use `VPPInstanceManager` for rendering many identical models:

```javascript
const instanceManager = new VPPInstanceManager(loader);

// Add 1000 identical models with different positions
for (let i = 0; i < 1000; i++) {
    instanceManager.addInstance(modelData, {
        x: Math.random() * 100,
        y: 0,
        z: Math.random() * 100,
        rotation: { y: Math.random() * Math.PI * 2 },
        scale: { x: 1, y: 1, z: 1 }
    });
}

// Generate instanced meshes (1 draw call instead of 1000)
const instancedMeshes = await instanceManager.generateInstancedMeshes();
instancedMeshes.forEach(mesh => scene.add(mesh));
```

### 4. Geometry Batching (Merges Multiple Models)
Use `VPPBatcher` to merge different models into fewer draw calls:

```javascript
const batcher = new VPPBatcher(loader);

// Add different models to be batched by material type
batcher.addModel(houseModel, { x: 0, y: 0, z: 0 });
batcher.addModel(treeModel, { x: 10, y: 0, z: 0 });
batcher.addModel(rockModel, { x: 20, y: 0, z: 0 });

// Generate batched geometries (fewer draw calls)
const batches = await batcher.generateBatches();
batches.forEach(batch => {
    const mesh = new Mesh(batch.geometry, batch.material);
    scene.add(mesh);
});
```

### 5. Level of Detail (LOD) Support
Automatically reduce geometry detail based on distance:

```javascript
import { generateLODGeometry } from "vpploader";

// Enable LOD in loader
loader.setEnableLOD(true, [25, 50, 100]); // LOD distances

// Or manually create LOD geometries
const fullDetail = await loader.loadAsync("model.vpp");
const mediumDetail = generateLODGeometry(fullDetail.geometry, 1);
const lowDetail = generateLODGeometry(fullDetail.geometry, 2);

// Use Three.js LOD object
const lod = new LOD();
lod.addLevel(new Mesh(fullDetail.geometry, fullDetail.material), 0);
lod.addLevel(new Mesh(mediumDetail, fullDetail.material), 25);
lod.addLevel(new Mesh(lowDetail, fullDetail.material), 50);
```

## Performance Monitoring

```javascript
// Monitor memory usage
const stats = loader.getMemoryStats();
console.log(`Loaded ${stats.geometryCount} geometries`);
console.log(`Using ${stats.materialCount} cached materials`);
console.log(`Total vertices: ${stats.totalVertices}`);
console.log(`Total triangles: ${stats.totalTriangles}`);
```

## Best Practices for Scenes with Many Models

### 1. Group Similar Models
```javascript
// Group by model type for better batching
const buildings = [];
const vegetation = [];
const props = [];

// Load each group separately
const buildingBatcher = new VPPBatcher(loader);
buildings.forEach(building => buildingBatcher.addModel(building.model, building.transform));
```

### 2. Use Frustum Culling
```javascript
// Only load models that are visible
function loadVisibleModels(camera, models) {
    const frustum = new Frustum();
    frustum.setFromProjectionMatrix(camera.projectionMatrix);
    
    return models.filter(model => {
        const bounds = new Box3().setFromObject(model);
        return frustum.intersectsBox(bounds);
    });
}
```

### 3. Progressive Loading
```javascript
// Load models progressively based on priority
async function loadScene(models, camera) {
    // Sort by distance to camera
    models.sort((a, b) => {
        const distA = camera.position.distanceTo(a.position);
        const distB = camera.position.distanceTo(b.position);
        return distA - distB;
    });
    
    // Load in batches
    for (let i = 0; i < models.length; i += 10) {
        const batch = models.slice(i, i + 10);
        await Promise.all(batch.map(model => loader.loadAsync(model.url)));
        
        // Allow frame to render
        await new Promise(resolve => setTimeout(resolve, 16));
    }
}
```

## Expected Performance Gains

- **Geometry Sharing**: 50-80% memory reduction for identical models
- **Material Caching**: 60-90% reduction in material creation overhead
- **Instanced Rendering**: 80-95% reduction in draw calls for identical models
- **Geometry Batching**: 50-80% reduction in draw calls for different models
- **LOD**: 30-70% reduction in GPU load based on distance

## Hardware-Specific Optimizations

### Mobile/Low-End Devices
```javascript
loader.optimizeForPerformance({
    enableInstancing: true,
    enableLOD: true,
    lodDistances: [15, 30, 60], // Closer LOD switching
    disableMetallic: true,      // Disable PBR
    disableEmitters: true       // Disable particles
});
```

### High-End Desktop
```javascript
loader.optimizeForPerformance({
    enableInstancing: true,
    enableLOD: true,
    lodDistances: [100, 200, 400], // Farther LOD switching
    disableMetallic: false,         // Keep PBR
    disableEmitters: false          // Keep particles
});
```

These optimizations should significantly improve performance for scenes with many voxel models, especially on lower-end hardware.
