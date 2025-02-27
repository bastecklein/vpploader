# vpploader

threejs loader for Voxel Paint (.vpp) files

https://voxelpaint.online/

## package.json

```json
"dependencies": {
    "vpploader": "git+ssh://git@github.com:bastecklein/vpploader.git#main"
}
```

## usage

```javascript
import { VPPLoader } from "vpploader";

const loader = new VPPLoader();

// basic load
loader.load("models/character.vpp", function(mesh) {
    scene.add(mesh);

    // returns an instance of VPPMesh which also contains a
    // lights and emitters property for light and emitter
    // objects that were added to the model in voxel paint.

    console.log(mesh.lights);
    console.log(mesh.emitters);
});

// with options
loader.load({
    url: "models/character.vpp" //or
    obj: { ... }, // json vpp object if not loading from data and not URL
    scale: 1,
    colorReplacements: [
        { from: "#ff00ff", to: "#ff0000" },
        { from: "#00ffff", to: "#ffcc00" }
    ] // you can replace colors in the .vpp model with other colors, good for templating models
}, function(mesh) {
    scene.add(mesh);
});

// you can also load async
const mesh = await loader.loadAsync("models/character.vpp");
scene.add(mesh);

// some optional settings for the loader, all default to true
loader.setAllowEmissive(true/false); // render emissive (lit/glowing) voxels
loader.setAllowMetallic(true/false); // render metallic voxels
loader.setAllowEmitters(true/false); // currently ignored
```