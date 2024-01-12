import { ResizeSystem } from '../../../common/engine/systems/ResizeSystem.js';
import { UpdateSystem } from '../../../common/engine/systems/UpdateSystem.js';

import { OrbitController } from '../../../common/engine/controllers/OrbitController.js';

import {
    Camera,
    Node,
    Transform,
} from '../../../common/engine/core.js';

import { Renderer } from './Renderer.js';
import {GLTFLoader} from "../../../common/engine/loaders/GLTFLoader.js";
import {Player} from "../../../game/scripts/DEBUG_Player.js";

import {quat} from "../../../lib/gl-matrix-module.js";

const canvas = document.querySelector('canvas');
const gl = canvas.getContext('webgl2');
const renderer = new Renderer(gl);

const loader = new GLTFLoader();
await loader.load('../../../game/assets/models/level.gltf');

const scene = loader.loadScene(loader.defaultScene);


const camera = new Node();
camera.addComponent(new Transform());
camera.addComponent(new Camera());
camera.addComponent(new OrbitController(camera, canvas, {distance: 2}));
scene.addChild(camera);

const cubeRoot = new Node();
scene.addChild(cubeRoot);

// const shadowCameraRoot = new Node();
// shadowCameraRoot.addComponent(new Transform());
// shadowCameraRoot.addComponent({
//     update(t) {
//         const shadowTransform = shadowCameraRoot.getComponentOfType(Transform);
//         quat.setAxisAngle(shadowTransform.rotation, [0, 1, 0], t * 2.5);
//     }
// })
// cubeRoot.addChild(shadowCameraRoot);

const shadowCamera = new Node();
shadowCamera.addComponent(new Transform({
    translation: [1.23, 1.74, -20.17],
}));
shadowCamera.addComponent(new Camera({
    fovy: 0.5,
    near: 15,
    far: 50,
}));
// shadowCameraRoot.addChild(shadowCamera);


const playerNode = loader.loadNode('Player');
playerNode.addComponent(new Player(playerNode.getComponentOfType(Transform), camera, playerNode, [], canvas));
// playerNode.addChild(shadowCamera);
scene.addChild(playerNode);



function update(t, dt) {
    scene.traverse(node => {
        for (const component of node.components) {
            component.update?.(t, dt);
        }
    });
}

function render() {
    renderer.render(scene, camera, shadowCamera);
}

function resize({ displaySize: { width, height }}) {
    camera.getComponentOfType(Camera).aspect = width / height;
    renderer.resize(width, height);
}

new ResizeSystem({ canvas, resize }).start();
new UpdateSystem({ update, render }).start();

document.querySelector('.loader-container').remove();
