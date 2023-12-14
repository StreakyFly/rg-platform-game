import {
    Camera,
    Material,
    Model,
    Node,
    Primitive,
    Sampler,
    Texture,
    Transform,
} from './common/engine/core.js';

import { Application } from './game/Application.js';
import { GLTFLoader } from './common/engine/loaders/GLTFLoader.js';
import { UnlitRenderer } from './common/engine/renderers/UnlitRenderer.js';
import { ResizeSystem } from './common/engine/systems/ResizeSystem.js';
import { UpdateSystem } from './common/engine/systems/UpdateSystem.js';

// import { idle_animation_LR, idle_animation_DR } from './game/assets/animations/idleAnimation.js';
// import { Dnoga_movement, Droka_movement, Lnoga_movement, Lroka_movement, abilityAinm } from './game/assets/animations/playerAnimations.js'
// import { Physics } from './Physics.js';
// import { Krog_rotation, Platform_movement, Ability_movement } from './game/assets/animations/levelAnimations.js';

import { PlayerController } from './game/scripts/PlayerController.js';
import { vec3 } from './lib/gl-matrix-module.js';



let scene, renderer, camera;

async function start() {
    const loader = new GLTFLoader();

    const player = await loader.load('./game/assets/models/player.gltf');

    await loader.load('./game/assets/models/level01.gltf');
    scene = await loader.loadScene(loader.defaultScene);
    camera = await loader.loadNode('Camera');

    scene.addChild(camera);

    const stairs = loader.loadNode('Stairs');

    if (!scene || !camera) {
        throw new Error('Scene or Camera not present in glTF');
    }

    const startTime = performance.now();
    const playerController = new PlayerController();

    renderer = new UnlitRenderer(gl);

    renderer.render(scene, camera);

    new ResizeSystem({ canvas, resize }).start();
    new UpdateSystem({ update, render }).start();
}

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
}


const canvas = document.querySelector('canvas');
const gl = canvas.getContext('webgl2');

await start()
document.querySelector('.loader-container').remove();
