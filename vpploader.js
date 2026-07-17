import {
    Mesh,
    BufferGeometry,
    BufferAttribute,
    Color,
    TextureLoader,
    NearestFilter,
    SRGBColorSpace,
    MeshLambertMaterial,
    ShaderChunk,
    MeshStandardMaterial,
    Loader,
    FileLoader,
    InstancedMesh,
    Matrix4
} from "three";

import CH from "compressionhelper";
import { hash } from "common-helpers";

const VPP_METAL_ROUGHNESS = 0.65;
const VPP_METAL_METALNESS = 0.75;
const LIGHTMAP_INTENSITY = 6;

const MODEL_NEW_LIGHTING_CUTOFF = 1696771084976;

const decompressedGeometries = {};
const remoteModels = {};
const modelHashCache = new WeakMap();

const UV_TEXT_MIN = 0.02;
const UV_TEXT_MAX = 0.98;
const SMALL_DEPRESS_AMT = 0.98;

const TEXTURE_FACES = [
    { // left
        uvRow: 0,
        dir: [ -1,  0,  0, ],
        corners: [
            { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
            { pos: [ 0, 0, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
            { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ], },
            { pos: [ 0, 0, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] }
        ],
        altcorners: [
            { pos: [ 0, 0.9, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
            { pos: [ 0, 0, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
            { pos: [ 0, 0.9, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ], },
            { pos: [ 0, 0, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] }
        ],
        smdepress: [
            { pos: [ 0, SMALL_DEPRESS_AMT, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
            { pos: [ 0, 0, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
            { pos: [ 0, SMALL_DEPRESS_AMT, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ], },
            { pos: [ 0, 0, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] }
        ],
        slopes: {
            N: [
                { pos: [ 0, 2, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ], },
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ], }
            ],
            E: [
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ], },
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] }
            ],
            W: [
                { pos: [ 0, 2, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
                { pos: [ 0, 2, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ], },
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] }
            ],
            S: [
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
                { pos: [ 0, 2, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ], },
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] }
            ]
        }
    },
    { // right
        uvRow: 0,
        dir: [  1,  0,  0, ],
        corners: [
            { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
            { pos: [ 1, 0, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
            { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ], },
            { pos: [ 1, 0, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] }
        ],
        altcorners: [
            { pos: [ 1, 0.9, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
            { pos: [ 1, 0, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
            { pos: [ 1, 0.9, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ], },
            { pos: [ 1, 0, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] }
        ],
        smdepress: [
            { pos: [ 1, SMALL_DEPRESS_AMT, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
            { pos: [ 1, 0, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
            { pos: [ 1, SMALL_DEPRESS_AMT, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ], },
            { pos: [ 1, 0, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] }
        ],
        slopes: {
            N: [
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
                { pos: [ 1, 2, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ], },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] }
            ],
            E: [
                { pos: [ 1, 2, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
                { pos: [ 1, 2, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ], },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] }
            ],
            W: [
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ], },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] }
            ],
            S: [
                { pos: [ 1, 2, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ], },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] }
            ]
        }
    },
    { // bottom
        uvRow: 1,
        dir: [  0, -1,  0, ],
        corners: [
            { pos: [ 1, 0, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
            { pos: [ 0, 0, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] },
            { pos: [ 1, 0, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
            { pos: [ 0, 0, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] }
        ],
        altcorners: [
            { pos: [ 1, 0, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
            { pos: [ 0, 0, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] },
            { pos: [ 1, 0, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
            { pos: [ 0, 0, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] }
        ],
        smdepress: [
            { pos: [ 1, 0, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
            { pos: [ 0, 0, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] },
            { pos: [ 1, 0, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
            { pos: [ 0, 0, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] }
        ],
        slopes: {
            N: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            E: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            W: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            S: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            NE: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            NW: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            SW: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            SE: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            NWI: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            NEI: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            SEI: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            SWI: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ]
        }
    },
    { // top
        uvRow: 2,
        dir: [  0,  1,  0, ],
        corners: [
            { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
            { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
            { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
            { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
        ],
        altcorners: [
            { pos: [ 0, 0.9, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
            { pos: [ 1, 0.9, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
            { pos: [ 0, 0.9, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
            { pos: [ 1, 0.9, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
        ],
        smdepress: [
            { pos: [ 0, SMALL_DEPRESS_AMT, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
            { pos: [ 1, SMALL_DEPRESS_AMT, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
            { pos: [ 0, SMALL_DEPRESS_AMT, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
            { pos: [ 1, SMALL_DEPRESS_AMT, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
        ],
        slopes: {
            N: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 2, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 2, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            E: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 2, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 2, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            NW: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 2, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            W: [
                { pos: [ 0, 2, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 2, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            S: [
                { pos: [ 0, 2, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 2, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            NE: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 2, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            SW: [
                { pos: [ 0, 2, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            SE: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 2, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            NWI: [
                { pos: [ 0, 2, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 2, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 2, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            NEI: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 2, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 2, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 2, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            SEI: [
                { pos: [ 0, 2, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 2, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 2, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            SWI: [
                { pos: [ 0, 2, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 2, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 2, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ]
        }
    },
    { // back
        uvRow: 0,
        dir: [  0,  0, -1, ],
        corners: [
            { pos: [ 1, 0, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] },
            { pos: [ 0, 0, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
            { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
            { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] }
        ],
        altcorners: [
            { pos: [ 1, 0, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] },
            { pos: [ 0, 0, 0 ], uv: [ 1, UV_TEXT_MIN ] },
            { pos: [ 1, 0.9, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
            { pos: [ 0, 0.9, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] }
        ],
        smdepress: [
            { pos: [ 1, 0, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] },
            { pos: [ 0, 0, 0 ], uv: [ 1, UV_TEXT_MIN ] },
            { pos: [ 1, SMALL_DEPRESS_AMT, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
            { pos: [ 0, SMALL_DEPRESS_AMT, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] }
        ],
        slopes: {
            N: [
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 2, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 2, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] }
            ],
            E: [
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 2, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 1, 2, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] }
            ],
            W: [
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] }, // might remove/alter this
                { pos: [ 0, 2, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] }
            ],
            S: [
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] }
            ]
        }
    },
    { // front
        uvRow: 0,
        dir: [  0,  0,  1, ],
        corners: [
            { pos: [ 0, 0, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
            { pos: [ 1, 0, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ], },
            { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
            { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] }
        ],
        altcorners: [
            { pos: [ 0, 0, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
            { pos: [ 1, 0, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ], },
            { pos: [ 0, 0.9, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
            { pos: [ 1, 0.9, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] }
        ],
        smdepress: [
            { pos: [ 0, 0, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
            { pos: [ 1, 0, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ], },
            { pos: [ 0, SMALL_DEPRESS_AMT, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
            { pos: [ 1, SMALL_DEPRESS_AMT, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] }
        ],
        slopes: {
            N: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ], },
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] }
            ],
            E: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ], },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
                { pos: [ 1, 2, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] }
            ],
            W: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ], },
                { pos: [ 0, 2, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] } // might remove/alter this
            ],
            S: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ], },
                { pos: [ 0, 2, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
                { pos: [ 1, 2, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] }
            ]
        }
    },
];

class VPPLoader extends Loader {

    constructor(manager) {
        super(manager);

        this.allowEmissive = true;
        this.allowMetalic = true;
        this.allowEmitters = true;

        this.vppGeometries = {};
        this.materialCache = new Map(); // Cache materials by opacity/transparency

        this.vppMaterial = null;
        this.lightOnlyMaterial = null;
        this.metalOnlyMaterial = null;
        this.noExtrasMaterial = null;

        this.heatmapTexture = null;
        this.enableInstancing = true; // New: Enable instanced rendering
        this.enableLOD = false; // New: Enable LOD support
        this.lodDistances = [50, 100, 200]; // New: LOD distances

        buildHeatmapTexture(this);
    }

    load(url, onLoad, onProgress, onError) {
        const scope = this;

        let options = {};

        if(typeof url === "object" && (url.url || url.obj || url.path)) {
            options = url;
            url = options.url || options.path;
        }

        if(options.obj) {
            getMesh(scope, options.obj, options).then(function(buildData) {
                onLoad(scope.parse(buildData));
            });

            return;
        }

        if(remoteModels[url]) {
            getMesh(scope, remoteModels[url], options).then(function(buildData) {
                onLoad(scope.parse(buildData));
            });

            return;
        }

        const loader = new FileLoader(scope.manager);
        loader.setResponseType("json");
        loader.setPath(this.path);
        loader.load(url, function (data) {

            remoteModels[url] = data;

            getMesh(scope, data, options).then(function(buildData) {
                onLoad(scope.parse(buildData));
            });

            
        }, onProgress, onError);
    }

    parse(buildData) {
        return new VPPMesh(buildData);
    }

    setAllowEmissive(allow) {
        this.allowEmissive = allow;
        buildHeatmapTexture(this);
    }

    setAllowMetallic(allow) {
        this.allowMetalic = allow;
        buildHeatmapTexture(this);
    }

    setAllowEmitters(allow) {
        this.allowEmitters = allow;
    }

    setEnableInstancing(enable) {
        this.enableInstancing = enable;
    }

    setEnableLOD(enable, distances = [50, 100, 200]) {
        this.enableLOD = enable;
        this.lodDistances = distances;
    }

    // Get cached material with specific opacity to avoid cloning
    getCachedMaterial(baseMaterial, opacity = 1) {
        const cacheKey = `${baseMaterial.uuid}_${opacity}`;
        
        if (this.materialCache.has(cacheKey)) {
            return this.materialCache.get(cacheKey);
        }

        let material;
        if (opacity === 1) {
            material = baseMaterial;
        } else {
            material = baseMaterial.clone();
            material.opacity = opacity;
            material.transparent = true;
        }

        this.materialCache.set(cacheKey, material);
        return material;
    }

    // Clear material cache when materials change
    clearMaterialCache() {
        this.materialCache.clear();
    }

    // Performance optimization methods
    optimizeForPerformance(options = {}) {
        // Enable aggressive optimizations for better performance
        this.enableInstancing = options.enableInstancing !== false;
        this.enableLOD = options.enableLOD || false;
        
        if (options.lodDistances) {
            this.lodDistances = options.lodDistances;
        }
        
        // Disable features that may not be needed for performance
        if (options.disableEmissive) {
            this.setAllowEmissive(false);
        }
        if (options.disableMetallic) {
            this.setAllowMetallic(false);
        }
        if (options.disableEmitters) {
            this.setAllowEmitters(false);
        }
    }

    // Get memory usage statistics
    getMemoryStats() {
        let geometryCount = 0;
        let materialCount = this.materialCache.size;
        let totalVertices = 0;
        let totalTriangles = 0;
        
        for (const geo of Object.values(this.vppGeometries)) {
            if (geo.geometry) {
                geometryCount++;
                if (geo.geometry.attributes.position) {
                    totalVertices += geo.geometry.attributes.position.count;
                }
                if (geo.geometry.index) {
                    totalTriangles += geo.geometry.index.count / 3;
                }
            }
        }
        
        return {
            geometryCount,
            materialCount,
            totalVertices,
            totalTriangles,
            cacheSize: Object.keys(this.vppGeometries).length
        };
    }
}

class VPPMesh extends Mesh {
    constructor(buildData) {
        super(buildData.geometry, buildData.material);

        this.lights = buildData.lights;
        this.emitters = buildData.emitters;
        this.vppLoader = buildData.loader; // Store reference to loader for material caching
        this.baseMaterial = buildData.material; // Store base material reference
    }

    setOpacity(opacity) {
        if(opacity == this.material.opacity) {
            return;
        }

        // Use cached material instead of cloning every time
        if (this.vppLoader) {
            this.material = this.vppLoader.getCachedMaterial(this.baseMaterial, opacity);
        } else {
            // Fallback to old behavior if no loader reference
            this.material = this.material.clone();
            this.material.opacity = opacity;

            if(opacity == 1) {
                this.material.transparent = false;
            } else {
                this.material.transparent = true;
            }
        }
    }
}

class PrecompileData {
    constructor() {
        this.positions = [];
        this.normals = [];
        this.colors = [];
        this.indices = [];
        this.emUvs = [];
        this.rmUvs = [];
        this.meUvs = [];

        this.hasEm = false;
        this.hasMe = false;

        this.emissive = false;
    }
}

async function getMesh(scope, obj, options) {
    // color and color2 are for legacy implementations,
    // use colorReplacements instead
    let color = options.color || "default";
    let color2 = options.color2 || null;

    let scale = options.scale || 1;
    let colorReplacements = options.colorReplacements || [];

    if(colorReplacements.length == 0) {
        if(color && color != "default" && color.length == 7) {
            colorReplacements.push({ from: "#ff00ff", to: color });
        }

        if(color2 && color2 != "default" && color2.length == 7) {
            colorReplacements.push({ from: "#00ffff", to: color2 });
        }
    }

    const refName = getMeshRefName(obj, options, colorReplacements, scale);

    let geo = null;
    let needsLoad = false;

    if(scope.vppGeometries[refName]) {
        geo = scope.vppGeometries[refName];
    }

    if(!geo) {
        geo = {
            loading: true,
            geometry: null,
            lights: null,
            emitters: null
        };

        needsLoad = true;

        scope.vppGeometries[refName] = geo;
    }

    if(needsLoad) {
        geo.loading = true;

        const buildData = await buildGeometry(scope, obj, colorReplacements, scale);

        if(buildData) {
            geo.geometry = buildData.geometry;
            geo.lights = buildData.lights;
            geo.emitters = buildData.emitters;

            geo.loading = false;
        } else {
            return null;
        }
    }

    while(geo.loading) {
        await asyncWait(50);
    }

    if(!geo.geometry) {
        return null;
    }

    let mat = scope.vppMaterial;

    if(geo.geometry.userData) {
        const ud = geo.geometry.userData;

        if(ud.hasEm && !ud.hasMe) {
            mat = scope.lightOnlyMaterial;
        }

        if(!ud.hasEm && ud.hasMe) {
            mat = scope.metalOnlyMaterial;
        }

        if(!ud.hasEm && !ud.hasMe) {
            mat = scope.noExtrasMaterial;
        }
    }

    return {
        geometry: scope.enableInstancing ? geo.geometry : geo.geometry.clone(),
        material: mat,
        lights: geo.lights,
        emitters: geo.emitters,
        loader: scope // Pass loader reference for material caching
    };
}

function getMeshRefName(obj, options, colorReplacements, scale) {
    if(options && options.cacheKey) {
        return options.cacheKey;
    }

    const objHash = getVPPObjectHash(obj);
    const optionKey = getMeshOptionKey(options, colorReplacements, scale);

    return hash(objHash + "|" + optionKey);
}

function getVPPObjectHash(vppObj) {
    if(vppObj && typeof vppObj === "object") {
        if(modelHashCache.has(vppObj)) {
            return modelHashCache.get(vppObj);
        }

        const cachedHash = hash(JSON.stringify(vppObj));
        modelHashCache.set(vppObj, cachedHash);

        return cachedHash;
    }

    return hash(JSON.stringify(vppObj));
}

function getMeshOptionKey(options, colorReplacements, scale) {
    const replacements = [];

    if(colorReplacements && colorReplacements.length > 0) {
        for(let i = 0; i < colorReplacements.length; i++) {
            const replacement = colorReplacements[i];

            replacements.push((replacement.from || "") + ">" + (replacement.to || ""));
        }
    }

    const useBasic = options && options.useBasic ? "1" : "0";
    const useLights = options && options.useLights ? "1" : "0";
    const opacity = options && options.opacity != null ? options.opacity : 1;

    return scale + "|" + useBasic + "|" + useLights + "|" + opacity + "|" + replacements.join(",");
}

function asyncWait(timeout) {
    return new Promise((resolve) => {
        setTimeout(resolve, timeout);
    });
}

async function buildGeometry(scope, vppObj, colorReplacements, scale) {
    const precompile = await getCompiledGeometryData(vppObj);

    if(!precompile) {
        return null;
    }

    const newLights = JSON.parse(JSON.stringify(precompile.lights));
    const newReg = JSON.parse(JSON.stringify(precompile.reg));

    for(let i = 0; i < colorReplacements.length; i++) {
        const cr = colorReplacements[i];
        doPrecompileColorSwap(cr.to, newReg.colors, cr.from);
    }

    for(let i = 0; i < newLights.length; i++) {
        const light = newLights[i];
        
        for(let j = 0; j < colorReplacements.length; j++) {
            const cr = colorReplacements[j];

            if(light.c == cr.from) {
                light.c = cr.to;
            }
        }
    }

    const finalData = getGeometryFromPrecompileData(scope, newReg, scale);

    return {
        geometry: finalData,
        lights: newLights,
        emitters: precompile.particleEmitters
    };
}

function getGeometryFromPrecompileData(scope, pc, scale) {
    const geometry = new BufferGeometry();

    const positionNumComponents = 3;
    const normalNumComponents = 3;

    geometry.userData.hasEm = pc.hasEm;
    geometry.userData.hasMe = pc.hasMe;

    geometry.setAttribute(
        "position",
        new BufferAttribute(new Float32Array(pc.positions), positionNumComponents));

    geometry.setAttribute(
        "normal",
        new BufferAttribute(new Float32Array(pc.normals), normalNumComponents));

    geometry.setAttribute(
        "color",
        new BufferAttribute(new Float32Array(pc.colors), 3));

    if(pc.hasEm && scope.allowEmissive) {
        geometry.setAttribute(
            "uvlm",
            new BufferAttribute(new Float32Array(pc.emUvs), 2));
    }

    if(pc.hasMe && scope.allowMetalic) {
        geometry.setAttribute(
            "uvru",
            new BufferAttribute(new Float32Array(pc.rmUvs), 2));

        geometry.setAttribute(
            "uvme",
            new BufferAttribute(new Float32Array(pc.meUvs), 2));
    }
    
    geometry.setIndex(pc.indices);

    geometry.scale(scale, scale, scale);

    geometry.normalsNeedUpdate = true;
    geometry.computeVertexNormals();

    return geometry;
}

// Generate simplified geometry for LOD levels
function generateLODGeometry(originalGeometry, lodLevel) {
    if (lodLevel === 0) return originalGeometry;
    
    // Simple decimation - skip every nth vertex for higher LOD levels
    const skipFactor = Math.pow(2, lodLevel);
    const positions = originalGeometry.attributes.position.array;
    const normals = originalGeometry.attributes.normal.array;
    const colors = originalGeometry.attributes.color.array;
    const indices = originalGeometry.index.array;
    
    // For simple LOD, we'll reduce triangle count by skipping indices
    const newIndices = [];
    for (let i = 0; i < indices.length; i += skipFactor * 3) {
        if (i + 2 < indices.length) {
            newIndices.push(indices[i], indices[i + 1], indices[i + 2]);
        }
    }
    
    const lodGeometry = new BufferGeometry();
    lodGeometry.setAttribute('position', new BufferAttribute(positions, 3));
    lodGeometry.setAttribute('normal', new BufferAttribute(normals, 3));
    lodGeometry.setAttribute('color', new BufferAttribute(colors, 3));
    
    // Copy other attributes if they exist
    if (originalGeometry.attributes.uvlm) {
        lodGeometry.setAttribute('uvlm', originalGeometry.attributes.uvlm.clone());
    }
    if (originalGeometry.attributes.uvru) {
        lodGeometry.setAttribute('uvru', originalGeometry.attributes.uvru.clone());
    }
    if (originalGeometry.attributes.uvme) {
        lodGeometry.setAttribute('uvme', originalGeometry.attributes.uvme.clone());
    }
    
    lodGeometry.setIndex(new Uint32Array(newIndices));
    lodGeometry.userData = { ...originalGeometry.userData };
    
    return lodGeometry;
}

// Optimize geometry for better GPU performance
function optimizeGeometry(geometry) {
    // Merge vertices that are very close to each other
    const positions = geometry.attributes.position.array;
    const threshold = 0.001; // Very small threshold for voxel models
    
    // Simple vertex welding - in production you might want a more sophisticated algorithm
    const newPositions = [];
    const newColors = [];
    const newNormals = [];
    const vertexMap = new Map();
    const indexMap = [];
    
    const colors = geometry.attributes.color.array;
    const normals = geometry.attributes.normal.array;
    
    for (let i = 0; i < positions.length; i += 3) {
        const x = Math.round(positions[i] / threshold) * threshold;
        const y = Math.round(positions[i + 1] / threshold) * threshold;
        const z = Math.round(positions[i + 2] / threshold) * threshold;
        
        const key = `${x},${y},${z}`;
        
        if (!vertexMap.has(key)) {
            const newIndex = newPositions.length / 3;
            vertexMap.set(key, newIndex);
            
            newPositions.push(x, y, z);
            newColors.push(colors[i], colors[i + 1], colors[i + 2]);
            newNormals.push(normals[i], normals[i + 1], normals[i + 2]);
        }
        
        indexMap.push(vertexMap.get(key));
    }
    
    // Update geometry with optimized data
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(newPositions), 3));
    geometry.setAttribute('color', new BufferAttribute(new Float32Array(newColors), 3));
    geometry.setAttribute('normal', new BufferAttribute(new Float32Array(newNormals), 3));
    
    // Remap indices
    const indices = geometry.index.array;
    const newIndices = new Uint32Array(indices.length);
    for (let i = 0; i < indices.length; i++) {
        newIndices[i] = indexMap[indices[i]];
    }
    geometry.setIndex(newIndices);
    
    return geometry;
}

async function getCompiledGeometryData(vppObj) {
    const geoHash = getVPPObjectHash(vppObj);

    if(decompressedGeometries[geoHash]) {
        return decompressedGeometries[geoHash];
    }

    if(vppObj.precnew) {
        const precompile = await CH.decompress(vppObj.precnew);
        const decOb = JSON.parse(precompile);

        decompressedGeometries[geoHash] = decOb;

        return decOb;
    }

    const precompile = generateVPPGeometryData(vppObj);

    decompressedGeometries[geoHash] = precompile;

    return precompile;
}

function generateVPPGeometryData(vppObj) {

    if(isOdd(vppObj.size)) {
        vppObj.size++;
    }

    let oldLighting = true;

    if(vppObj.vars && vppObj.vars.created_timestamp && vppObj.vars.created_timestamp > MODEL_NEW_LIGHTING_CUTOFF) {
        oldLighting = false;
    }

    const cellSize = vppObj.size;
    let maxY = cellSize;

    const ret = {
        reg: new PrecompileData(),
        lights: [],
        particleEmitters: [],
        hasEm: false
    };

    for(let i = 0; i < vppObj.voxels.length; i++) {
        const voxel = vppObj.voxels[i];

        if(Math.round(voxel.z) > maxY) {
            maxY = Math.round(voxel.z);
        }
    }

    maxY++;

    const startY = 0;
    const startX = 0 - (cellSize / 2);
    const startZ = 0 - (cellSize / 2);

    for (let y = 0; y < maxY; ++y) {
        const voxelY = startY + y;

        for (let z = 0; z < cellSize; ++z) {
            const voxelZ = startZ + z;

            for (let x = 0; x < cellSize; ++x) {
                const voxelX = startX + x;

                const voxel = getVoxel(vppObj, voxelX, voxelY, voxelZ);

                if(voxel) {

                    let useObj = ret.reg;


                    if(voxel.gi || voxel.gr) {

                        if(voxel.gr > 0) {
                            ret.lights.push({
                                x: x,
                                y: y,
                                z: z,
                                i: voxel.gi,
                                r: voxel.gr,
                                c: voxel.c
                            });
                        }
                    }

                    

                    let useC = voxel.c;

                    const threeColor = new Color(useC);

                    let face = 0;

                    // eslint-disable-next-line no-unused-vars
                    for (const {dir, corners, uvRow} of TEXTURE_FACES) {
                        
                        const neighbor = getVoxel(
                            vppObj,
                            voxelX + dir[0],
                            voxelY + dir[1],
                            voxelZ + dir[2]
                        );

                        if (!neighbor) {

                            let finalColor = threeColor;

                            const ndx = useObj.positions.length / 3;

                            for (const {pos, uv} of corners) {
                                useObj.positions.push(pos[0] + x, pos[1] + y, pos[2] + z);
                                useObj.normals.push(...dir);
                                useObj.colors.push(finalColor.r, finalColor.g, finalColor.b);

                                const uvy = 1 - (0 + 1 - uv[1]);

                                let lightVal = 0;

                                if(voxel.gi || voxel.gr) {

                                    const lightPer = parseFloat(voxel.gi) / 5;

                                    lightVal = 255 * lightPer;

                                    if(isNaN(lightVal) || lightVal > 255) {
                                        lightVal = 255;
                                    }

                                    if(oldLighting) {
                                        lightVal = 255;
                                    }

                                    useObj.hasEm = true;
                                    ret.hasEm = true;
                                }

                                const uvx = (lightVal + uv[0]) * 1 / 256;

                                useObj.emUvs.push(uvx, uvy);

                                let roughVal = 255;
                                let metalVal = 0;

                                if(voxel.me) {
                                    useObj.hasMe = true;

                                    roughVal = Math.floor(VPP_METAL_ROUGHNESS * 255);
                                    metalVal = Math.floor(VPP_METAL_METALNESS * 255);
                                }

                                const ruvx = (roughVal + uv[0]) * 1 / 256;
                                useObj.rmUvs.push(ruvx, uvy);

                                const muvx = (metalVal + uv[0]) * 1 / 256;
                                useObj.meUvs.push(muvx, uvy);
                            }

                            useObj.indices.push(
                                ndx, ndx + 1, ndx + 2,
                                ndx + 2, ndx + 1, ndx + 3
                            );
                        }

                        // eslint-disable-next-line no-unused-vars
                        face++;
                    }
                }
            }
        }
    }


    return ret;
}

function getVoxel(vppObj, x, y, z) {

    for(let i = 0; i < vppObj.voxels.length; i++) {
        const voxel = vppObj.voxels[i];

        // in vpp files, z and y are reversed from what threejs expects
        if(Math.round(voxel.x) == x && Math.round(voxel.y) == z && Math.round(voxel.z) == y) {
            return voxel;
        }
    }

    return null;
}

function isOdd(num) { return num % 2;}

function buildHeatmapTexture(scope) {
    // Clear geometry cache when materials change to ensure consistency
    scope.vppGeometries = {};
    scope.clearMaterialCache();

    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 1;

    const context = canvas.getContext("2d");

    for(let x = 0; x < 256; x++) {
        context.fillStyle = "rgb(" + x + ", " + x + ", " + x + ")";
        context.fillRect(x, 0, 1, 1);
    }

    const imgData = canvas.toDataURL("image/png", 1);

    const loader = new TextureLoader();
    scope.heatmapTexture = loader.load(imgData);

    scope.heatmapTexture.magFilter = NearestFilter;
    scope.heatmapTexture.minFilter = NearestFilter;
    scope.heatmapTexture.colorSpace = SRGBColorSpace;

    const opts = {
        vertexColors: true, 
        color: 0xffffff
    };

    const noExOpts = {
        vertexColors: true, 
        color: 0xffffff
    };

    const lightOnlyOpts = {
        vertexColors: true, 
        color: 0xffffff
    };

    const metalOnlyOpts = {
        vertexColors: true, 
        color: 0xffffff
    };

    let mat = MeshLambertMaterial;

    let chunkUvVertexReplace = ShaderChunk.uv_vertex;
    let lmOnlyReplace = ShaderChunk.uv_vertex;
    let metOnlyReplace = ShaderChunk.uv_vertex;

    if(scope.allowEmissive) {
        opts.lightMap = scope.heatmapTexture;
        opts.lightMapIntensity = LIGHTMAP_INTENSITY;

        lightOnlyOpts.lightMap = scope.heatmapTexture;
        lightOnlyOpts.lightMapIntensity = LIGHTMAP_INTENSITY;

        chunkUvVertexReplace = chunkUvVertexReplace.replace(
            "vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;",
            "vLightMapUv = ( lightMapTransform * vec3( uvlm, 1 ) ).xy;"
        );

        lmOnlyReplace = lmOnlyReplace.replace(
            "vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;",
            "vLightMapUv = ( lightMapTransform * vec3( uvlm, 1 ) ).xy;"
        );
    }

    if(scope.allowMetalic) {
        mat = MeshStandardMaterial;

        opts.roughnessMap = scope.heatmapTexture;
        opts.metalnessMap = scope.heatmapTexture;

        metalOnlyOpts.roughnessMap = scope.heatmapTexture;
        metalOnlyOpts.metalnessMap = scope.heatmapTexture;

        chunkUvVertexReplace = chunkUvVertexReplace.replace(
            "vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;",
            "vMetalnessMapUv = ( metalnessMapTransform * vec3( uvme, 1 ) ).xy;"
        ).replace(
            "vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;",
            "vRoughnessMapUv = ( roughnessMapTransform * vec3( uvru, 1 ) ).xy;"
        );

        metOnlyReplace = metOnlyReplace.replace(
            "vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;",
            "vMetalnessMapUv = ( metalnessMapTransform * vec3( uvme, 1 ) ).xy;"
        ).replace(
            "vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;",
            "vRoughnessMapUv = ( roughnessMapTransform * vec3( uvru, 1 ) ).xy;"
        );
    }

    scope.vppMaterial = new mat(opts);

    scope.lightOnlyMaterial = new MeshLambertMaterial(lightOnlyOpts);
    scope.metalOnlyMaterial = new MeshStandardMaterial(metalOnlyOpts);
    scope.noExtrasMaterial = new MeshLambertMaterial(noExOpts);

    if(scope.allowEmissive || scope.allowMetalic) {
        scope.vppMaterial.onBeforeCompile = function(shader) {
            shader.vertexShader = shader.vertexShader.replace(
                "#include <uv_pars_vertex>",
                "\n\nattribute vec2 uvlm;\nattribute vec2 uvru;\nattribute vec2 uvme;\n\n#include <uv_pars_vertex>"
            );

            shader.vertexShader = shader.vertexShader.replace(
                "#include <uv_vertex>",
                "\n" + chunkUvVertexReplace + "\n\n"
            );
        };

        if(scope.allowEmissive) {
            scope.lightOnlyMaterial.onBeforeCompile = function(shader) {
                shader.vertexShader = shader.vertexShader.replace(
                    "#include <uv_pars_vertex>",
                    "\n\nattribute vec2 uvlm;\nattribute vec2 uvru;\nattribute vec2 uvme;\n\n#include <uv_pars_vertex>"
                );
    
                shader.vertexShader = shader.vertexShader.replace(
                    "#include <uv_vertex>",
                    "\n" + lmOnlyReplace + "\n\n"
                );
            };
        }

        if(scope.allowMetalic) {
            scope.metalOnlyMaterial.onBeforeCompile = function(shader) {
                shader.vertexShader = shader.vertexShader.replace(
                    "#include <uv_pars_vertex>",
                    "\n\nattribute vec2 uvlm;\nattribute vec2 uvru;\nattribute vec2 uvme;\n\n#include <uv_pars_vertex>"
                );
    
                shader.vertexShader = shader.vertexShader.replace(
                    "#include <uv_vertex>",
                    "\n" + metOnlyReplace + "\n\n"
                );
            };
        }
    }
}

function doPrecompileColorSwap(color, arr, sourceColor = "#ff00ff") {
    const check = new Color(sourceColor);
    const sw = new Color(color);

    const cR = check.r;
    const cG = check.g;
    const cB = check.b;

    const sR = sw.r;
    const sG = sw.g;
    const sB = sw.b;

    for(let i = 0; i < arr.length; i+= 3) {
        const aR = arr[i];
        const aG = arr[i + 1];
        const aB = arr[i + 2];

        if(aR == cR && aG == cG && aB == cB) {
            arr[i] = sR;
            arr[i + 1] = sG;
            arr[i + 2] = sB;
        }
    }
}

export { VPPLoader, generateVPPGeometryData, VPPMesh, generateLODGeometry, optimizeGeometry };

// Utility class for batching multiple VPP models into single geometries
class VPPBatcher {
    constructor(loader) {
        this.loader = loader;
        this.batches = new Map(); // Group by material type
    }
    
    // Add a VPP model to the batch
    addModel(vppObj, transform, options = {}) {
        const materialKey = this.getMaterialKey(vppObj, options);
        
        if (!this.batches.has(materialKey)) {
            this.batches.set(materialKey, {
                models: [],
                material: null
            });
        }
        
        this.batches.get(materialKey).models.push({
            vppObj,
            transform,
            options
        });
    }
    
    // Generate batched geometries
    async generateBatches() {
        const results = [];
        
        for (const [, batch] of this.batches) {
            const mergedGeometry = await this.mergeModels(batch.models);
            if (mergedGeometry) {
                results.push({
                    geometry: mergedGeometry.geometry,
                    material: mergedGeometry.material,
                    lights: mergedGeometry.lights,
                    emitters: mergedGeometry.emitters
                });
            }
        }
        
        return results;
    }
    
    getMaterialKey(vppObj, options) {
        // Create a key based on material properties that affect rendering
        const hasEm = this.hasEmissiveVoxels(vppObj);
        const hasMe = this.hasMetallicVoxels(vppObj);
        return `${hasEm}_${hasMe}_${JSON.stringify(options.colorReplacements || [])}`;
    }
    
    hasEmissiveVoxels(vppObj) {
        return vppObj.voxels.some(v => v.gi || v.gr);
    }
    
    hasMetallicVoxels(vppObj) {
        return vppObj.voxels.some(v => v.me);
    }
    
    async mergeModels(models) {
        if (models.length === 0) return null;
        
        const mergedData = {
            positions: [],
            normals: [],
            colors: [],
            indices: [],
            emUvs: [],
            rmUvs: [],
            meUvs: [],
            hasEm: false,
            hasMe: false,
            lights: [],
            emitters: []
        };
        
        let vertexOffset = 0;
        
        for (const model of models) {
            const buildData = await buildGeometry(this.loader, model.vppObj, model.options.colorReplacements || [], model.options.scale || 1);
            if (!buildData) continue;
            
            const geometry = buildData.geometry;
            const positions = geometry.attributes.position.array;
            const normals = geometry.attributes.normal.array;
            const colors = geometry.attributes.color.array;
            const indices = geometry.index.array;
            
            // Apply transform matrix if provided
            const transformedPositions = this.applyTransform(positions, model.transform);
            const transformedNormals = this.applyNormalTransform(normals, model.transform);
            
            // Merge data
            mergedData.positions.push(...transformedPositions);
            mergedData.normals.push(...transformedNormals);
            mergedData.colors.push(...colors);
            
            // Offset indices
            const offsetIndices = indices.map(i => i + vertexOffset);
            mergedData.indices.push(...offsetIndices);
            
            vertexOffset += positions.length / 3;
            
            // Merge UVs and other attributes
            if (geometry.attributes.uvlm) {
                mergedData.emUvs.push(...geometry.attributes.uvlm.array);
                mergedData.hasEm = true;
            }
            if (geometry.attributes.uvru) {
                mergedData.rmUvs.push(...geometry.attributes.uvru.array);
            }
            if (geometry.attributes.uvme) {
                mergedData.meUvs.push(...geometry.attributes.uvme.array);
                mergedData.hasMe = true;
            }
            
            // Transform and merge lights/emitters
            mergedData.lights.push(...this.transformLights(buildData.lights, model.transform));
            mergedData.emitters.push(...this.transformEmitters(buildData.emitters, model.transform));
        }
        
        // Create final geometry
        const finalGeometry = this.createGeometryFromData(mergedData);
        const material = this.getMaterialForBatch(mergedData);
        
        return {
            geometry: finalGeometry,
            material,
            lights: mergedData.lights,
            emitters: mergedData.emitters
        };
    }
    
    applyTransform(positions, transform) {
        if (!transform) return positions;
        
        const result = new Float32Array(positions.length);
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const y = positions[i + 1];
            const z = positions[i + 2];
            
            // Apply translation (simple case - extend for full matrix transforms)
            result[i] = x + (transform.x || 0);
            result[i + 1] = y + (transform.y || 0);
            result[i + 2] = z + (transform.z || 0);
        }
        return result;
    }
    
    applyNormalTransform(normals /*, transform */) {
        // For simple translation, normals don't change
        // For rotation/scale, you'd need proper normal matrix transformation
        return normals;
    }
    
    transformLights(lights, transform) {
        if (!transform || !lights) return lights || [];
        
        return lights.map(light => ({
            ...light,
            x: light.x + (transform.x || 0),
            y: light.y + (transform.y || 0),
            z: light.z + (transform.z || 0)
        }));
    }
    
    transformEmitters(emitters, transform) {
        if (!transform || !emitters) return emitters || [];
        
        return emitters.map(emitter => ({
            ...emitter,
            x: emitter.x + (transform.x || 0),
            y: emitter.y + (transform.y || 0),
            z: emitter.z + (transform.z || 0)
        }));
    }
    
    createGeometryFromData(data) {
        const geometry = new BufferGeometry();
        
        geometry.setAttribute('position', new BufferAttribute(new Float32Array(data.positions), 3));
        geometry.setAttribute('normal', new BufferAttribute(new Float32Array(data.normals), 3));
        geometry.setAttribute('color', new BufferAttribute(new Float32Array(data.colors), 3));
        
        if (data.hasEm && data.emUvs.length > 0) {
            geometry.setAttribute('uvlm', new BufferAttribute(new Float32Array(data.emUvs), 2));
        }
        if (data.hasMe && data.rmUvs.length > 0) {
            geometry.setAttribute('uvru', new BufferAttribute(new Float32Array(data.rmUvs), 2));
            geometry.setAttribute('uvme', new BufferAttribute(new Float32Array(data.meUvs), 2));
        }
        
        geometry.setIndex(new Uint32Array(data.indices));
        geometry.userData.hasEm = data.hasEm;
        geometry.userData.hasMe = data.hasMe;
        
        geometry.computeBoundingSphere();
        geometry.computeBoundingBox();
        
        return geometry;
    }
    
    getMaterialForBatch(data) {
        // Return appropriate material based on batch properties
        if (data.hasEm && data.hasMe) {
            return this.loader.vppMaterial;
        } else if (data.hasEm && !data.hasMe) {
            return this.loader.lightOnlyMaterial;
        } else if (!data.hasEm && data.hasMe) {
            return this.loader.metalOnlyMaterial;
        } else {
            return this.loader.noExtrasMaterial;
        }
    }
}

export { VPPBatcher };

// Utility class for creating instanced meshes from identical VPP models
class VPPInstanceManager {
    constructor(loader) {
        this.loader = loader;
        this.instances = new Map(); // Group identical models for instancing
    }
    
    // Register a model instance with its transform
    addInstance(vppObj, transform, options = {}) {
        const modelKey = this.getModelKey(vppObj, options);
        
        if (!this.instances.has(modelKey)) {
            this.instances.set(modelKey, {
                vppObj,
                options,
                transforms: []
            });
        }
        
        this.instances.get(modelKey).transforms.push(transform);
    }
    
    // Generate instanced meshes for all registered models
    async generateInstancedMeshes() {
        const results = [];
        
        for (const [, instanceData] of this.instances) {
            if (instanceData.transforms.length === 1) {
                // Single instance - use regular mesh
                const buildData = await getMesh(this.loader, instanceData.vppObj, instanceData.options);
                if (buildData) {
                    const mesh = new VPPMesh(buildData);
                    const transform = instanceData.transforms[0];
                    if (transform) {
                        mesh.position.set(transform.x || 0, transform.y || 0, transform.z || 0);
                        if (transform.rotation) {
                            mesh.rotation.set(transform.rotation.x || 0, transform.rotation.y || 0, transform.rotation.z || 0);
                        }
                        if (transform.scale) {
                            mesh.scale.set(transform.scale.x || 1, transform.scale.y || 1, transform.scale.z || 1);
                        }
                    }
                    results.push(mesh);
                }
            } else {
                // Multiple instances - use InstancedMesh
                const buildData = await getMesh(this.loader, instanceData.vppObj, instanceData.options);
                if (buildData) {
                    const instancedMesh = new InstancedMesh(
                        buildData.geometry,
                        buildData.material,
                        instanceData.transforms.length
                    );
                    
                    // Set up instance matrices
                    const matrix = new Matrix4();
                    for (let i = 0; i < instanceData.transforms.length; i++) {
                        const transform = instanceData.transforms[i];
                        matrix.makeTranslation(
                            transform.x || 0,
                            transform.y || 0,
                            transform.z || 0
                        );
                        
                        if (transform.rotation) {
                            const rotMatrix = new Matrix4().makeRotationFromEuler({
                                x: transform.rotation.x || 0,
                                y: transform.rotation.y || 0,
                                z: transform.rotation.z || 0
                            });
                            matrix.multiply(rotMatrix);
                        }
                        
                        if (transform.scale) {
                            const scaleMatrix = new Matrix4().makeScale(
                                transform.scale.x || 1,
                                transform.scale.y || 1,
                                transform.scale.z || 1
                            );
                            matrix.multiply(scaleMatrix);
                        }
                        
                        instancedMesh.setMatrixAt(i, matrix);
                    }
                    
                    instancedMesh.instanceMatrix.needsUpdate = true;
                    
                    // Store lights and emitters (you may need to transform these per instance)
                    instancedMesh.lights = buildData.lights;
                    instancedMesh.emitters = buildData.emitters;
                    
                    results.push(instancedMesh);
                }
            }
        }
        
        return results;
    }
    
    getModelKey(vppObj, options) {
        // Create a unique key for identical models
        return hash(JSON.stringify({
            model: vppObj,
            colorReplacements: options.colorReplacements || [],
            scale: options.scale || 1
        }));
    }
    
    clear() {
        this.instances.clear();
    }
}

export { VPPInstanceManager };