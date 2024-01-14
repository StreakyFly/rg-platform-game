import { GUI } from '../../../lib/dat.gui.module.js';
import { vec3, mat4, quat } from '../../../lib/gl-matrix-module.js';

import { ResizeSystem } from '../../../common/engine/systems/ResizeSystem.js';
import { UpdateSystem } from '../../../common/engine/systems/UpdateSystem.js';

import { ImageLoader } from '../../../common/engine/loaders/ImageLoader.js';
import { JSONLoader } from '../../../common/engine/loaders/JSONLoader.js';

import { OrbitController } from '../../../common/engine/controllers/OrbitController.js';

import {
    Camera,
    Material,
    Model,
    Node,
    Primitive,
    Sampler,
    Texture,
    Transform,
} from '../../../common/engine/core.js';

import { Renderer } from './Renderer.js';
import { GLTFLoader } from "../../../common/engine/loaders/GLTFLoader.js";
import { Player } from "../../../game/scripts/DEBUG_Player.js";
import { Light } from "../../../game/scripts/entities/Light.js";

let frameCount = 0;
let lastTime = window.performance.now();
let fps = 0;

function updateFPS() {
    frameCount++;
    const now = window.performance.now();
    const deltaTime = now - lastTime;

    if (deltaTime >= 1000) { // Update every second
        fps = frameCount / (deltaTime / 1000);
        frameCount = 0;
        lastTime = now;
        console.log(`FPS: ${fps.toFixed(2)}`);
    }
}

const canvas = document.querySelector('canvas');
const gl = canvas.getContext('webgl2');
const renderer = new Renderer(gl);

// const scene = new Node();
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

const cubeRoot = new Node();
scene.addChild(cubeRoot);

const black = new ImageData(new Uint8ClampedArray([0, 0, 0, 255]), 1, 1);
const orange = new ImageData(new Uint8ClampedArray([255, 60, 0, 255]), 1, 1);

const emissionTexture = new Texture({
    image: black,
    sampler: new Sampler({
        minFilter: 'nearest',
        magFilter: 'nearest',
        }),
    });

const emissionTextureOrange = new Texture({
    image: orange,
    sampler: new Sampler({
        minFilter: 'nearest',
        magFilter: 'nearest',
    }),
});

const white = new ImageData(new Uint8ClampedArray([255, 255, 255, 255]), 1, 1);
const lightTexture = new Texture({
    image: white,
    sampler: new Sampler({
        minFilter: 'nearest',
        magFilter: 'nearest',
    }),
});

scene.traverse(node => {
    const model = node.getComponentOfType(Model);
    if (!model) return;

    model.primitives[0].material.emissionTexture = emissionTexture;
    model.primitives[0].material.metalnessTexture = lightTexture  // TODO set this in Blender instead!
    model.primitives[0].material.roughnessTexture = lightTexture  // TODO set this in Blender instead!
});

for (let i = 0; i < loader.gltf.nodes.length; i++) {
    const blendObject = loader.gltf.nodes[i];
    const blendObjectModel = scene.children[i].getComponentOfType(Model);

    if (blendObject.name.includes("LavaTrap")) {
        blendObjectModel.primitives[0].material.emissionTexture = emissionTextureOrange;
    }
}

const [cubeMesh, modelMesh, baseImage, envmapImage] = await Promise.all([
    new JSONLoader().loadMesh('../../../../common/models/cube.json'),
    new JSONLoader().loadMesh('../../../../common/models/bunny.json'),
    new ImageLoader().load('../../../game/assets/images/grayscale.png'),
    new ImageLoader().load('../../../game/assets/images/sky.png'),
]);

const skybox = new Node();
skybox.addComponent(new Model({
    primitives: [
        new Primitive({
            mesh: cubeMesh,
            material: new Material({
                baseTexture: new Texture({
                    image: envmapImage,
                    sampler: new Sampler({
                        minFilter: 'linear',
                        magFilter: 'linear',
                    }),
                }),
            }),
        }),
    ],
}));

const playerNode = loader.loadNode('Player');
playerNode.addComponent(new Player(playerNode.getComponentOfType(Transform), camera, playerNode, [], canvas));
scene.addChild(playerNode);

const lights = [];

const light = new Node();
light.addComponent(new Transform({
    translation: [0, 1, 0],
}));
light.addComponent(new Light({
    color: [255, 189, 89],
    intensity: 5,
    attenuation: [0.001, 0, 0.3]
}));
playerNode.addChild(light);
lights.push(light);

function createLights(n) {
    const colors = [
        [255, 0, 0],
        [0, 255, 0],
        [0, 0, 255],
        [255, 255, 0],  // Yellow
        [255, 0, 255],  // Magenta
        [0, 255, 255],  // Cyan
    ];

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < 3; j++) {
            const light = new Node();

            const translation = [j * 3 - 3, 2, -2 * i];
            light.addComponent(new Transform({
                translation: translation,
            }));

            const newLight = new Light({
                color: colors[(i * 3 + j) % colors.length],  // Assign a different color for each light
                intensity: 2,
                attenuation: [0.001, 0, 0.1]
            });

            light.addComponent(newLight);

            lights.push(light);
        }
    }
}

createLights(15);
console.log(lights);


function update(time, dt) {
    scene.traverse(node => {
        for (const component of node.components) {
            component.update?.(time, dt);
        }
    });
}

function render() {
    renderer.render(scene, camera, skybox, lights);
    updateFPS();
}

function resize({ displaySize: { width, height }}) {
    camera.getComponentOfType(Camera).aspect = width / height;
    renderer.resize(width, height);
}

new ResizeSystem({ canvas, resize }).start();
new UpdateSystem({ update, render }).start();

const gui = new GUI();
gui.add(renderer, 'emissionStrength', 0, 15);
gui.add(renderer, 'bloomIntensity', 0, 2);
gui.add(renderer, 'bloomThreshold', 0, 10);
gui.add(renderer, 'bloomKnee', 0, 1);
gui.add(renderer, 'preExposure', 0, 5);
gui.add(renderer, 'postExposure', 0, 5);
gui.add(renderer, 'gamma', 0.5, 3);
gui.add(renderer, 'contrast', 0, 2);
gui.add(renderer, 'doRenderBloom', 0, 1);
gui.add(renderer, 'renderLightsOrBloom', 0, 1);

document.querySelector('.loader-container').remove();
