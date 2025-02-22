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
loader.load("models/character.vpp", function(mesh) {
    scene.add(mesh);
});
```