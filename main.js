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


// import { FirstPersonController } from "./common/engine/controllers/FirstPersonController.js";
// import {quat, vec3} from './lib/gl-matrix-module.js';
import {JSONLoader} from "./common/engine/loaders/JSONLoader.js";
import {ImageLoader} from "./common/engine/loaders/ImageLoader.js";
import {Player} from "./game/scripts/entities/Player.js";




let scene, renderer, camera;

async function start() {
    const loader = new GLTFLoader();

    await loader.load('./game/assets/models/player.gltf');

    // await loader.load('./game/assets/models/level01.gltf');
    scene = await loader.loadScene(loader.defaultScene);

    camera = new Node();
    camera.addComponent(new Transform({
        translation: [0, 3, 15]
    }));
    camera.addComponent(new Transform({
        rotation: [-0.2, 0, 0, 0.7071]
}));
    camera.addComponent(new Camera({
        near: 0.05,
        far: 100,
    }));


// //     // far from good, but it works (for now)
// //     const player = loader.loadNode('Player');
// //     // stairs.addComponent(new FirstPersonController(stairs, canvas));
// //     player.addComponent(new FirstPersonController(player, canvas));
// //     camera.addComponent(new FirstPersonController(camera, canvas));
// //     scene.addChild(camera);



    const playerModel = loader.loadNode('Player');
    playerModel.addComponent(new Player(playerModel, canvas));







    const floor = new Node();
    floor.addComponent(new Transform({
        scale: [10, 1, 10],
        translation: [0, -1, 0],
        rotation: [0, 0, 0, 1]
    }));
    floor.addComponent(new Model({
        primitives: [
            new Primitive({
                mesh: await new JSONLoader().loadMesh('./common/models/floor.json'),
                material: new Material({
                    baseTexture: new Texture({
                        image: await new ImageLoader().load('./common/images/grass.png'),
                        sampler: new Sampler({
                            minFilter: 'nearest',
                            magFilter: 'nearest',
                        }),
                    }),
                }),
            }),
        ],
    }));
    scene.addChild(floor);



    if (!scene || !camera) {
        throw new Error('Scene or Camera not present in glTF');
    }

    const stairs = loader.loadNode('Stairs');

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
