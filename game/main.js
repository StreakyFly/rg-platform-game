import { ResizeSystem } from '../common/engine/systems/ResizeSystem.js';
import { UpdateSystem } from '../common/engine/systems/UpdateSystem.js';

import { GLTFLoader } from '../common/engine/loaders/GLTFLoader.js';
import { UnlitRenderer } from '../common/engine/renderers/UnlitRenderer.js';

import { Camera } from '../common/engine/core.js';


const canvas = document.querySelector('canvas');
const gl = canvas.getContext('webgl2');

const loader = new GLTFLoader();

await loader.load('../Blender/player.gltf');

const scene = loader.loadScene(loader.defaultScene);
if (!scene) {
    throw new Error('A default scene is required to run this example');
}

const camera = scene.find(node => node.getComponentOfType(Camera));
if (!camera) {
    throw new Error('A camera in the scene is require to run this example');
}

const renderer = new UnlitRenderer(gl);

function render() {
    renderer.render(scene, camera);
}

function resize({ displaySize: { width, height }}) {
    camera.getComponentOfType(Camera).aspect = width / height;
}

new ResizeSystem({ canvas, resize }).start();
new UpdateSystem({ render }).start();

document.querySelector('.loader-container').remove();



import { Pillar } from './src/objects/Pillar.js';
import { vec3 } from "../lib/gl-matrix-module.js";

const p1 = new Pillar(0.5, [1, 0.4, 0], 2)
console.log(p1)

for (let i = 0; i < 15; i++) {
    console.log(p1.position);
    p1.move();
}
