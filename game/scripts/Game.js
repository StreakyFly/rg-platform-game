import {
    Camera,
    Material,
    Model,
    Node,
    Primitive,
    Sampler,
    Texture,
    Transform,
} from '../../common/engine/core.js';

import { pause } from '../../main.js';

import { JSONLoader } from "../../common/engine/loaders/JSONLoader.js";
import { ImageLoader } from "../../common/engine/loaders/ImageLoader.js";
import { GLTFLoader } from '../../common/engine/loaders/GLTFLoader.js';
import { ResizeSystem } from '../../common/engine/systems/ResizeSystem.js';
import { UpdateSystem } from '../../common/engine/systems/UpdateSystem.js';
import { calculateAxisAlignedBoundingBox, mergeAxisAlignedBoundingBoxes } from "../../common/engine/core/MeshUtils.js";

import { Renderer } from "./Renderer.js";

import { Physics } from './Physics.js';

// import { Player } from "./DEBUG_Player.js";
import { Player } from "./Player.js";

import { Entity } from "./entities/Entity.js";
import { Light } from "./Light.js";

class RespawnPoint {
    constructor(checkPointTransform, yaw, pitch) {
        this.translation = checkPointTransform.translation;
        this.rotation = checkPointTransform.rotation;
        this.yaw = yaw;
        this.pitch = pitch;
    }
}

export class Game {
    constructor() {
        this.canvas = document.querySelector('canvas');
        this.gl = this.canvas.getContext('webgl2');
        this.renderer = new Renderer(this.gl);
        this.scene = null;
        this.camera = null;
        this.physics = null;
        this.skybox = null;
        this.lights = [];
    }

    async start() {
        const loader = new GLTFLoader();
        // await loader.load('../../game/assets/models/platform.gltf');
        await loader.load('../../game/assets/models/level.gltf');

        this.scene = loader.loadScene(loader.defaultScene);

        let checkPointMap = new Map();
        let OnRespawnMovingObjectNodes = [];
        // assign gameObject roles
        for (let i = 0; i < loader.gltf.nodes.length; i++) {
            const blendObject = loader.gltf.nodes[i];
            const blendObjectNode = this.scene.children[i]

            // assign checkPoints
            if (blendObject.name.includes("CheckPoint")) {
                const valueArray = blendObject.name.split("_");
                blendObjectNode.checkPointIndex = parseInt(valueArray[0].split("")[valueArray[0].length - 1]);
                /*
                const yaw = valueArray[1].split("")[valueArray[1].length - 1] * Math.PI;
                const pitch = valueArray[2].split("")[valueArray[2].length - 1] * Math.PI;*/
                const yaw = Math.PI;
                const pitch = 0;

                checkPointMap.set(blendObjectNode.checkPointIndex, new RespawnPoint(blendObject, yaw, pitch))
            }

            // assign  traps
            if (blendObject.name.includes("Trap")) blendObjectNode.isTrap = true;

            // assign moving objects
            if (blendObject.name.includes("Moving")) {
                let maxTranslationDistance = 1;
                let movingObjectTranslation = [0, 0, 0];
                let moveBothDirections = !blendObject.name.includes("OneDir");
                let movingSinceCheckPoint = 0;

                if (blendObject.name.includes("UP")) {
                    movingObjectTranslation = [0, 0.005, 0];
                }
                else if (blendObject.name.includes("DOWN")) {
                    movingObjectTranslation = [0, -0.005, 0];
                }
                else if (blendObject.name.includes("LEFT")) {
                    movingObjectTranslation = [-0.002, 0, 0];
                }
                else if (blendObject.name.includes("RIGHT")) {
                    movingObjectTranslation = [0.002, 0, 0];
                }
                else if (blendObject.name.includes("FORWARD")) {
                    movingObjectTranslation = [0, 0, 0.002];
                }
                else if (blendObject.name.includes("BACKWARDS")) {
                    movingObjectTranslation = [0, 0, -0.002];
                }
                else if (blendObject.name.includes("CHASETRAP")) {
                    maxTranslationDistance = 20.63;
                    movingObjectTranslation = [0, 0, -0.008];
                }

                if (blendObject.name.includes("MovingOnSpawn")) {
                    movingSinceCheckPoint = parseInt(blendObject.name.split("MovingOnSpawn")[1].split("")[0]);
                    OnRespawnMovingObjectNodes.push(blendObjectNode);
                }

                if (blendObject.name.includes("Platform")) blendObjectNode.isEntityPlatform = true;

                blendObjectNode.addComponent(new Entity(blendObjectNode.getComponentOfType(Transform), movingObjectTranslation, maxTranslationDistance, moveBothDirections, movingSinceCheckPoint));
            }
        }

        // initialize camera
        this.camera = loader.loadNode('Camera');
        // this.camera.addComponent(new Transform({
        //     translation: [0, 1, 0],
        // }));

        this.camera.getComponentOfType(Camera).fovy = 1;
        this.camera.getComponentOfType(Camera).near = 0.01;
        this.camera.getComponentOfType(Camera).aspect = 0.6;  // 0.3 / 0.5;

        // initialize player
        const playerNode = loader.loadNode('Player');
        const playerTransform = playerNode.getComponentOfType(Transform);
        playerNode.addComponent(new Player(playerTransform, this.camera, playerNode, OnRespawnMovingObjectNodes, this.canvas));
        playerNode.isDynamic = true;
        playerNode.aabb = {
            min: [-0.2, -0.2, -0.2],
            max: [0.2, 0.2, 0.2],
        };

        for (let i = 0; i < checkPointMap.size; i++) {
            playerNode.getComponentOfType(Player).checkPoints[i] = checkPointMap.get(i);
        }

        this.scene.addChild(playerNode);


        // Player test light
        const light = new Node();
        light.addComponent(new Transform({
            // translation: [0, 2, -5],
            translation: [0, 1, 0],
        }));
        const newLight = new Light({
            color: [255, 189, 89],
            intensity: 3,
            attenuation: [0.001, 0, 0.3]
        });

        light.addComponent(newLight);
        // this.scene.addChild(light);
        playerNode.addChild(light);
        this.lights.push(light);

        this.createLights(15);
        console.log(this.lights);

        const white = new ImageData(new Uint8ClampedArray([255, 255, 255, 255]), 1, 1);
        const texture = new Texture({
            image: white,
            sampler: new Sampler({
                minFilter: 'nearest',
                magFilter: 'nearest',
            }),
        });


        this.scene.traverse(node => {
            const model = node.getComponentOfType(Model);
            if (!model) {
                return;
            }

            node.isStatic = true;

            model.primitives[0].material.metalnessTexture = texture  // TODO set this in Blender instead!
            model.primitives[0].material.roughnessTexture = texture  // TODO set this in Blender instead!
        });

        playerNode.isStatic = false;
        playerNode.isDynamic = true;

        if (!this.scene || !this.camera) {
            throw new Error('Scene or Camera not present in glTF');
        }

        await this.init_sky();

        this.render();

        new ResizeSystem({ canvas: this.canvas, resize: this.resize.bind(this) }).start();
        new UpdateSystem({ update: this.update.bind(this), render: this.render.bind(this) }).start();
    }

    createLights(n) {
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

                this.lights.push(light);
            }
        }
    }


    update(time, dt) {
        if (pause) return;
        this.scene.traverse(node => {
            for (const component of node.components) {
                component.update?.(time, dt);
            }
        });
        this.physics.update(time, dt);
    }

    render() {
        this.renderer.render(this.scene, this.camera, this.skybox, this.lights);
    }

    resize({ displaySize: { width, height } }) {
        this.camera.getComponentOfType(Camera).aspect = width / height;
    }

    async initialize() {
        // document.querySelector('.main-menu').remove();
        const mainMenu = document.querySelector('.main-menu');
        const parent = mainMenu.parentNode;
        parent.removeChild(mainMenu);

        await this.start();

        this.physics = new Physics(this.scene);

        this.scene.traverse(node => {
            const model = node.getComponentOfType(Model);
            if (!model) {
                return;
            }

            const boxes = model.primitives.map(primitive => calculateAxisAlignedBoundingBox(primitive.mesh));
            node.aabb = mergeAxisAlignedBoundingBoxes(boxes);
        });
    }

    async init_sky() {
        const [cubeMesh, modelMesh, baseImage, envmapImage] = await Promise.all([
            new JSONLoader().loadMesh('../../../common/models/cube.json'),
            new JSONLoader().loadMesh('../../../common/models/bunny.json'),
            new ImageLoader().load('../../game/assets/images/grayscale.png'),
            // new ImageLoader().load('../../game/assets/images/cambridge.webp'),
            new ImageLoader().load('../../game/assets/images/sky.png'),
        ]);

        this.skybox = new Node();
        this.skybox.addComponent(new Model({
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
    }
}
