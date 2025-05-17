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
    FileLoader
} from "three";

import CH from "compressionhelper";
import { hash } from "common-helpers";

const VPP_METAL_ROUGHNESS = 0.65;
const VPP_METAL_METALNESS = 0.75;
const LIGHTMAP_INTENSITY = 6;

const MODEL_NEW_LIGHTING_CUTOFF = 1696771084976;

const decompressedGeometries = {};
const remoteModels = {};

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

        this.vppMaterial = null;
        this.lightOnlyMaterial = null;
        this.metalOnlyMaterial = null;
        this.noExtrasMaterial = null;

        this.heatmapTexture = null;

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
}

class VPPMesh extends Mesh {
    constructor(buildData) {
        super(buildData.geometry, buildData.material);

        this.lights = buildData.lights;
        this.emitters = buildData.emitters;
    }

    setOpacity(opacity) {
        if(opacity == this.material.opacity) {
            return;
        }

        this.material = this.material.clone();
        this.material.opacity = opacity;

        if(opacity == 1) {
            this.material.transparent = false;
        } else {
            this.material.transparent = true;
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

    const refName = hash(JSON.stringify(obj) + JSON.stringify(options));

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
        geometry: geo.geometry.clone(),
        material: mat,
        lights: geo.lights,
        emitters: geo.emitters
    };
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

async function getCompiledGeometryData(vppObj) {
    const geoHash = hash(JSON.stringify(vppObj));

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
    scope.vppGeometries = {};

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

export { VPPLoader, generateVPPGeometryData, VPPMesh };