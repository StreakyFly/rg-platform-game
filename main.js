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

import { Physics } from './game/scripts/Physics.js';
import { calculateAxisAlignedBoundingBox, mergeAxisAlignedBoundingBoxes } from "./common/engine/core/MeshUtils.js";

import { JSONLoader } from "./common/engine/loaders/JSONLoader.js";
import { ImageLoader } from "./common/engine/loaders/ImageLoader.js";
import { Player } from "./game/scripts/Player.js";
import { quat, mat4, vec3 } from './lib/gl-matrix-module.js';


async function startGame() {
    let scene, renderer, mainCamera;

    async function start() {
        const loader = new GLTFLoader();
        await loader.load('./game/assets/models/platform.gltf');

        scene = loader.loadScene(loader.defaultScene);

        // initialize camera
        mainCamera = loader.loadNode('Camera');
        // mainCamera.addComponent(new Transform({
        //     translation: [0, 1, 0],
        // }));

        mainCamera.getComponentOfType(Camera).fovy = 1;
        mainCamera.getComponentOfType(Camera).near = 0.1;
        mainCamera.getComponentOfType(Camera).aspect = 0.3 / 0.5;


        // initialize player
        const playerNode = loader.loadNode('Player.007');

        const playerTransform = playerNode.getComponentOfType(Transform);
        playerNode.addComponent(new Player(playerTransform, mainCamera, playerNode, canvas));
        playerNode.isDynamic = true;
        playerNode.aabb = {
            min: [-0.2, -0.2, -0.2],
            max: [0.2, 0.2, 0.2],
        };

        scene.addChild(playerNode);


        // mainCamera = loader.loadNode('Camera');
        // mainCamera.addComponent(new FirstPersonController(mainCamera, canvas));
        // mainCamera.isDynamic = true;
        // mainCamera.aabb = {
        //     min: [-0.2, -0.2, -0.2],
        //     max: [0.2, 0.2, 0.2],
        // };

        scene.traverse(node => {
            if (node.getComponentOfType(Model) !== undefined) {
                node.isStatic = true;
            }
        });
        playerNode.isStatic = false;
        playerNode.isDynamic = true;

        if (!scene || !mainCamera) {
            throw new Error('Scene or Camera not present in glTF');
        }

        renderer = new UnlitRenderer(gl);
        render();

        new ResizeSystem({ canvas, resize }).start();
        new UpdateSystem({ update, render }).start();
    }

    // async function start() {
    //     const loader = new GLTFLoader();
    //     await loader.load('./examples/04-collision/01-aabb-aabb/scene/scene.gltf');
    //
    //     scene = loader.loadScene(loader.defaultScene);
    //     mainCamera = loader.loadNode('Camera');
    //     mainCamera.addComponent(new FirstPersonController(mainCamera, canvas));
    //     mainCamera.isDynamic = true;
    //     mainCamera.aabb = {
    //         min: [-0.2, -0.2, -0.2],
    //         max: [0.2, 0.2, 0.2],
    //     };
    //
    //     loader.loadNode('Box.000').isStatic = true;
    //     loader.loadNode('Box.001').isStatic = true;
    //     loader.loadNode('Box.002').isStatic = true;
    //     loader.loadNode('Box.003').isStatic = true;
    //     loader.loadNode('Box.004').isStatic = true;
    //     loader.loadNode('Box.005').isStatic = true;
    //     loader.loadNode('Wall.000').isStatic = true;
    //     loader.loadNode('Wall.001').isStatic = true;
    //     loader.loadNode('Wall.002').isStatic = true;
    //     loader.loadNode('Wall.003').isStatic = true;
    //
    //     renderer = new UnlitRenderer(gl);
    //     render();
    //
    //     new ResizeSystem({ canvas, resize }).start();
    //     new UpdateSystem({ update, render }).start();
    // }


    function update(time, dt) {
        scene.traverse(node => {
            for (const component of node.components) {
                component.update?.(time, dt);
            }
        });
        physics.update(time, dt);
    }

    function render() {
        renderer.render(scene, mainCamera);
    }


    function resize({ displaySize: { width, height } }) {
        mainCamera.getComponentOfType(Camera).aspect = width / height;
    }

    const canvas = document.querySelector('canvas');
    const gl = canvas.getContext('webgl2');

    await start()

    const physics = new Physics(scene);

    scene.traverse(node => {
        const model = node.getComponentOfType(Model);
        if (!model) {
            return;
        }

        const boxes = model.primitives.map(primitive => calculateAxisAlignedBoundingBox(primitive.mesh));
        node.aabb = mergeAxisAlignedBoundingBoxes(boxes);
    });

    document.querySelector('.main-menu').remove();

}

document.querySelector('.loader-container').remove();

window.startGame = startGame;
