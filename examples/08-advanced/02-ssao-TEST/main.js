import { GUI } from '../../../lib/dat.gui.module.js';

import { ResizeSystem } from '../../../common/engine/systems/ResizeSystem.js';
import { UpdateSystem } from '../../../common/engine/systems/UpdateSystem.js';

import { OrbitController } from '../../../common/engine/controllers/OrbitController.js';

import {Camera, Node, Transform} from '../../../common/engine/core.js';

import { Renderer } from './Renderer.js';
import {GLTFLoader} from "../../../common/engine/loaders/GLTFLoader.js";
import {Player} from "../../../game/scripts/DEBUG_Player.js";

const canvas = document.querySelector('canvas');
const gl = canvas.getContext('webgl2');

const renderer = new Renderer(gl);

const loader = new GLTFLoader();
await loader.load('../../../game/assets/models/level.gltf');

const scene = loader.loadScene(loader.defaultScene);

const camera = new Node();
camera.addComponent(new Transform());
camera.addComponent(new Camera({
    near: 0.1,
    far: 100,
}));
camera.addComponent(new OrbitController(camera, canvas, {
    distance: 2,
}));
scene.addChild(camera);


const playerNode = loader.loadNode('Player.007');
playerNode.addComponent(new Player(playerNode.getComponentOfType(Transform), camera, playerNode, canvas));
scene.addChild(playerNode);


function update(time, dt) {
    scene.traverse(node => {
        for (const component of node.components) {
            component.update?.(time, dt);
        }
    });
}

function render() {
    renderer.render(scene, camera);
}

function resize({ displaySize: { width, height }}) {
    camera.getComponentOfType(Camera).aspect = width / height;
    renderer.resize(width, height);
}

new ResizeSystem({ canvas, resize }).start();
new UpdateSystem({ update, render }).start();

const gui = new GUI();
gui.add(renderer, 'colorEnabled');
gui.add(renderer, 'occlusionEnabled');
gui.add(renderer, 'occlusionStrength', 0, 10);
gui.add(renderer, 'occlusionScale', 0, 2);
gui.add(renderer, 'occlusionRange', 0, 2);
gui.add(renderer, 'depthBias', 0, 0.5);
gui.add(renderer, 'occlusionSampleCount',
    [1, 2, 4, 8, 16, 32, 64]
).onChange(value => renderer.createSSAOSamples());

document.querySelector('.loader-container').remove();
