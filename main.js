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

import { GLTFLoader } from './common/engine/loaders/GLTFLoader.js';
import { UnlitRenderer } from './common/engine/renderers/UnlitRenderer.js';
import { ResizeSystem } from './common/engine/systems/ResizeSystem.js';
import { UpdateSystem } from './common/engine/systems/UpdateSystem.js';

// import { idle_animation_LR, idle_animation_DR } from './game/assets/animations/idleAnimation.js';
// import { Dnoga_movement, Droka_movement, Lnoga_movement, Lroka_movement, abilityAinm } from './game/assets/animations/playerAnimations.js'
// import { Physics } from './Physics.js';
// import { Krog_rotation, Platform_movement, Ability_movement } from './game/assets/animations/levelAnimations.js';


import { FirstPersonController } from "./common/engine/controllers/FirstPersonController.js";
import { PlayerController } from './game/scripts/PlayerController.js';
import { vec3 } from './lib/gl-matrix-module.js';




let scene, renderer, camera;

async function start() {
    const loader = new GLTFLoader();

    // await loader.load('./game/assets/models/player.gltf');

    await loader.load('./game/assets/models/level01.gltf');
    scene = await loader.loadScene(loader.defaultScene);
    // camera = await loader.loadNode('Camera');

    camera = new Node();
    camera.addComponent(new Transform({
        translation: [12, 0, 10],
    }));
    camera.addComponent(new Camera({
        near: 0.05,
        far: 100,
    }));


    // // const playerController = new PlayerController();
    // camera.addComponent(new FirstPersonController(camera, canvas));
    // scene.addChild(camera);
    // // scene.addChild(player);

    const stairs = loader.loadNode('Stairs');
    stairs.addComponent(new FirstPersonController(stairs, canvas));


    // const transform = cube.getComponentOfType(Transform);
    // vec3.lerp(transform.translation, startPosition, endPosition, EasingFunctions.bounceEaseOut(time));




    if (!scene || !camera) {
        throw new Error('Scene or Camera not present in glTF');
    }

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
