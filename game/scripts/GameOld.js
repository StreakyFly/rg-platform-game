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

import { JSONLoader } from '../../common/engine/loaders/JSONLoader.js';
import { ImageLoader } from '../../common/engine/loaders/ImageLoader.js';
import { GLTFLoader } from '../../common/engine/loaders/GLTFLoader.js';
import { ResizeSystem } from '../../common/engine/systems/ResizeSystem.js';
import { UpdateSystem } from '../../common/engine/systems/UpdateSystem.js';
import { calculateAxisAlignedBoundingBox, mergeAxisAlignedBoundingBoxes } from '../../common/engine/core/MeshUtils.js';

import { Renderer } from './Renderer.js';

import { Physics } from './Physics.js';

// import { Player } from './DEBUG_Player.js';
import { Player } from './Player.js';

import { Entity } from './entities/Entity.js';
import { RespawnPoint } from './RespawnPoint.js';
import { Light } from './Light.js';


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
        this.checkPointMap = new Map();
        this.OnRespawnMovingObjectNodes = [];
        this.player = null;
    }

    async start() {
        const loader = new GLTFLoader();
        await loader.load('../../game/assets/models/level.gltf');

        this.scene = loader.loadScene(loader.defaultScene);

        this.assignObjects(loader);
        this.initCamera(loader);
        this.initPlayer(loader);
        this.initPlayerLight();
        await this.initSky();

        this.createLights(15);


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
        this.scene.traverse(node => {
            const model = node.getComponentOfType(Model);
            if (!model) {
                return;
            }

            node.isStatic = true;

            model.primitives[0].material.emissionTexture = emissionTexture;
            model.primitives[0].material.metalnessTexture = lightTexture  // TODO set this in Blender instead!
            model.primitives[0].material.roughnessTexture = lightTexture  // TODO set this in Blender instead!
        });

        this.player.isStatic = false;
        this.player.isDynamic = true;

        // for (let i = 0; i < loader.gltf.nodes.length; i++) {
        //     const blendObject = loader.gltf.nodes[i];
        //     const blendObjectModel = this.scene.children[i].getComponentOfType(Model);
        //
        //     if (blendObject.name.includes("LavaTrap")) {
        //         blendObjectModel.primitives[0].material.emissionTexture = emissionTextureOrange;
        //     }
        // }

        if (!this.scene || !this.camera) {
            throw new Error('Scene or Camera not present in glTF');
        }

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
                    color: colors[(i * 3 + j) % colors.length],  // Assign a different color to each light
                    intensity: 2,
                    attenuation: [0.001, 0, 0.1]
                });

                light.addComponent(newLight);

                this.lights.push(light);
            }
        }
    }

    initPlayerLight() {
        // test light for the Player
        const light = new Node();
        light.addComponent(new Transform({
            // translation: [0, 2, -5],
            translation: [0, 1, 0],
        }));
        light.addComponent(new Light({
            color: [255, 189, 89],
            intensity: 3,
            attenuation: [0.001, 0, 0.3]
        }));
        // this.scene.addChild(light);
        this.player.addChild(light);
        this.lights.push(light);
    }

    initCamera(loader) {
        this.camera = loader.loadNode('Camera');
        // this.camera.addComponent(new Transform({
        //     translation: [0, 1, 0],
        // }));

        this.camera.getComponentOfType(Camera).fovy = 1;
        this.camera.getComponentOfType(Camera).near = 0.01;
        this.camera.getComponentOfType(Camera).aspect = 0.6;  // 0.3 / 0.5;
    }

    initPlayer(loader) {
        this.player = loader.loadNode('Player');
        const playerTransform = this.player.getComponentOfType(Transform);
        this.player.addComponent(new Player(playerTransform, this.camera, this.player, this.OnRespawnMovingObjectNodes, this.canvas));
        this.player.isDynamic = true;
        this.player.aabb = {
            min: [-0.2, -0.2, -0.2],
            max: [0.2, 0.2, 0.2],
        };

        for (let i = 0; i < this.checkPointMap.size; i++) {
            this.player.getComponentOfType(Player).checkPoints[i] = this.checkPointMap.get(i);
        }

        this.scene.addChild(this.player);
    }

    assignObjects(loader) {
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

                this.checkPointMap.set(blendObjectNode.checkPointIndex, new RespawnPoint(blendObject, yaw, pitch))
            }

            // assign traps
            if (blendObject.name.includes("Trap")) {
                blendObjectNode.isTrap = true;
            }

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
                    this.OnRespawnMovingObjectNodes.push(blendObjectNode);
                }

                // assign platforms
                if (blendObject.name.includes("Platform")) {
                    blendObjectNode.isEntityPlatform = true;
                }

                blendObjectNode.addComponent(new Entity(
                    blendObjectNode.getComponentOfType(Transform), movingObjectTranslation, maxTranslationDistance, moveBothDirections, movingSinceCheckPoint));
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

    async initSky() {
        const [cubeMesh, modelMesh, baseImage, envmapImage] = await Promise.all([
            new JSONLoader().loadMesh('../../../common/models/cube.json'),
            new JSONLoader().loadMesh('../../../common/models/bunny.json'),
            new ImageLoader().load('../../game/assets/images/grayscale.png'),
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