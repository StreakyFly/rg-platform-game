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

import { mouseSensitivity, pause, soundController } from '../../main.js';

import { JSONLoader } from '../../common/engine/loaders/JSONLoader.js';
import { ImageLoader } from '../../common/engine/loaders/ImageLoader.js';
import { GLTFLoader } from '../../common/engine/loaders/GLTFLoader.js';
import { ResizeSystem } from '../../common/engine/systems/ResizeSystem.js';
import { UpdateSystem } from '../../common/engine/systems/UpdateSystem.js';
import { calculateAxisAlignedBoundingBox, mergeAxisAlignedBoundingBoxes } from '../../common/engine/core/MeshUtils.js';

import { UnlitRenderer } from './renderers/UnlitRenderer.js';
import { Renderer } from './renderers/Renderer.js';

// import { Player } from './DEBUG_Player.js';
import { Player } from './Player.js';
import { Physics } from './Physics.js';
import { Entity } from './entities/Entity.js';
import { OrbHolder } from './entities/OrbHolder.js';
import { Orb } from './entities/Orb.js';
import { RespawnPoint } from './entities/RespawnPoint.js';
import { Light } from './entities/Light.js';


export class Game {
    constructor(improvedRenderer = true) {
        this.canvas = document.querySelector('canvas');
        this.gl = this.canvas.getContext('webgl2');
        this.renderer = improvedRenderer ? new Renderer(this.gl) : new UnlitRenderer(this.gl);
        this.scene = null;
        this.camera = null;
        this.physics = null;
        this.skybox = null;
        this.lights = [];
        this.checkPointMap = new Map();
        this.OnRespawnMovingObjectNodes = [];
        this.player = null;
        this.loader = new GLTFLoader();
        this.orbHolderMap = new Map();
        this.orbArray = [];
        this.unlockableDoorArray = [];
        this.playerModelObjects = [];

        this.frameCount = 0;
        this.lastTime = window.performance.now();
        this.fps = 0;
    }

    async start() {
        await this.loader.load('../../game/assets/models/level.gltf');

        this.scene = this.loader.loadScene(this.loader.defaultScene);

        this.assignObjects();
        this.initCamera();
        this.initPlayer();
        this.initPlayerLight();
        // this.initLights();
        await this.initTextures();
        await this.initSky();

        this.createLights(17);

        // assign checkPoints into array based on their proper index order
        for (let i = 0; i < this.checkPointMap.size; i++) {
            this.player.getComponentOfType(Player).checkPoints[i] = this.checkPointMap.get(i);
        }

        // assign orbs and unlock doors to each orbHolder
        let orbHolderArray = [];

        for (const orbNode of this.orbArray) {
            const orbHolder = this.orbHolderMap.get(orbNode.getComponentOfType(Orb).orbNum).getComponentOfType(OrbHolder);
            orbHolder.orb = orbNode;
        }

        for (const unlockDoorNode of this.unlockableDoorArray) {
            const orbHolder = this.orbHolderMap.get(unlockDoorNode.dropOrbHolderUnlockIndex).getComponentOfType(OrbHolder);
            orbHolder.unlockDoor = unlockDoorNode.getComponentOfType(Entity);
        }

        for (const orbHolderNode of this.orbHolderMap.values()) {
            const orbHolder = orbHolderNode.getComponentOfType(OrbHolder);
            orbHolderArray.push(orbHolder);
        }

        this.player.getComponentOfType(Player).orbHolderArray = orbHolderArray;

        for (const node of this.playerModelObjects) {
            this.player.addChild(node);
            node.isStatic = false;
        }

        if (!this.scene || !this.camera) {
            throw new Error('Scene or Camera not present in glTF');
        }

        new ResizeSystem({ canvas: this.canvas, resize: this.resize.bind(this) }).start();
        new UpdateSystem({ update: this.update.bind(this), render: this.render.bind(this) }).start();
    }

    createLights(n) {
        const colors = [
            [255, 0, 0],
            [0, 255, 0],
            [0, 0, 255],
            [255, 255, 0],  // Yellow
            [200, 0, 200],  // Magenta
            [0, 200, 200],  // Cyan
        ];

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < 3; j++) {
                const light = new Node();

                let intensity = 4;
                const translation = [j * 3 - 3, 2, -2 * i];
                if (translation[2] >= -16) {
                    translation[1] = 1.8;
                    if (translation[2] < -8) {
                        intensity = 0.8;
                    } else {
                        intensity = 2;
                    }
                    if (translation[0] !== 0 && translation[2] < -8) {
                        continue;
                    }
                    if (translation[2] === -16) {
                        translation[2] = -15.5;
                    }
                }
                light.addComponent(new Transform({
                    translation: translation,
                }));

                const newLight = new Light({
                    color: colors[(i * 3 + j) % colors.length],  // assign a different color to each light
                    intensity: intensity,
                    attenuation: [0.001, 0, 0.1]
                });

                light.addComponent(newLight);

                this.lights.push(light);
            }
        }
    }

    initLights() {
        const orange = [255, 60, 0];

        for (let i = 0; i < this.loader.gltf.nodes.length; i++) {
            if (this.scene.children[i] !== undefined) {
                const blendObject = this.loader.gltf.nodes[i];

                if (blendObject.name.includes("Torch")) {
                    console.log(blendObject.name, blendObject.translation);
                    const light = new Node();

                    const translation = blendObject.translation;
                    light.addComponent(new Transform({
                        translation: translation,
                    }));

                    const newLight = new Light({
                        color: orange,
                        intensity: 0.5,
                        attenuation: [0.001, 0, 0.1]
                    });

                    light.addComponent(newLight);

                    this.lights.push(light);
                }
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
            intensity: 5,
            attenuation: [0.001, 0, 0.3]
        }));
        // this.scene.addChild(light);
        this.player.addChild(light);
        this.lights.push(light);
    }

    initCamera() {
        this.camera = this.loader.loadNode('Camera');
        // this.camera.addComponent(new Transform({
        //     translation: [0, 1, 0],
        // }));

        this.camera.getComponentOfType(Camera).fovy = 1;
        this.camera.getComponentOfType(Camera).near = 0.01;
        this.camera.getComponentOfType(Camera).aspect = 0.6;  // 0.3 / 0.5;
    }

    initPlayer() {
        this.player = this.loader.loadNode('PlayerCollisionBody');
        const playerTransform = this.player.getComponentOfType(Transform);
        this.player.addComponent(new Player(playerTransform, this.camera, this.player, this.OnRespawnMovingObjectNodes, this.canvas, Math.min(mouseSensitivity/100, 1.0)));
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

    assignObjects() {
        // assign gameObject roles
        for (let i = 0; i < this.loader.gltf.nodes.length; i++) {
            const blendObject = this.loader.gltf.nodes[i];
            const blendObjectNode = this.scene.children[i]

            // assign playerModelObjects
            if (blendObject.name.includes("PlayerObject")) {
                this.playerModelObjects.push(blendObjectNode);
            }

            // assign checkPoints
            if (blendObject.name.includes("CheckPoint")) {
                const valueArray = blendObject.name.split("_");
                blendObjectNode.checkPointIndex = parseInt(valueArray[0].split("")[valueArray[0].length - 1]);

                const yaw = valueArray[1].split("")[valueArray[1].length - 1] * Math.PI;
                //const yaw = Math.PI;
                //const pitch = 0;

                this.checkPointMap.set(blendObjectNode.checkPointIndex, new RespawnPoint(blendObject, yaw))
                continue;
            }

            // assign stairs
            if (blendObject.name.includes("Stairs")) {
                blendObjectNode.isStairs = true;
                continue;
            }

            // assign teleports
            if (blendObject.name.includes("Teleport")) {
                blendObjectNode.isTeleport = true;
                blendObjectNode.teleportToCheckpointIndex = blendObject.name.split("")[blendObject.name.length - 1];
                continue;
            }

            // assign orbHolders
            if (blendObject.name.includes("OrbHolder")) {
                const orbHolderNum = blendObject.name.split("")[blendObject.name.length - 1];
                const orbHolder = new OrbHolder(blendObjectNode.getComponentOfType(Transform), this.loader);
                orbHolder.node = blendObjectNode;
                orbHolder.orbDropEnabled = blendObject.name.includes("Drop");
                blendObjectNode.addComponent(orbHolder);
                this.orbHolderMap.set(orbHolderNum, blendObjectNode)
                continue;
            }

            // assign orbs
            if (blendObject.name.includes("Orb_")) {
                const orbNum = blendObject.name.split("")[blendObject.name.length - 1];
                const orb = new Orb(blendObjectNode.getComponentOfType(Transform), orbNum);
                blendObjectNode.addComponent(orb);
                this.orbArray.push(blendObjectNode);
                continue;
            }

            // assign traps
            if (blendObject.name.includes("Trap")) blendObjectNode.isTrap = true;

            // assign moving objects
            if (blendObject.name.includes("Moving")) {
                let maxTranslationDistance = 1;
                let movingObjectTranslation = [0, 0, 0];
                let moveBothDirections = !blendObject.name.includes("OneDir");
                let movingSinceCheckPoint = 0;
                let velocity = 0;
                let canMovePlayer = false;

                if (blendObject.name.includes("UP")) {
                    movingObjectTranslation = [0, 1, 0];
                    velocity = 0.6;
                }
                else if (blendObject.name.includes("DOWN")) {
                    movingObjectTranslation = [0, -1, 0];
                    velocity = 0.6;
                }
                else if (blendObject.name.includes("LEFT")) {
                    movingObjectTranslation = [-1, 0, 0];
                    velocity = 0.4;
                }
                else if (blendObject.name.includes("RIGHT")) {
                    movingObjectTranslation = [1, 0, 0];
                    velocity = 0.4;
                }
                else if (blendObject.name.includes("FORWARD")) {
                    movingObjectTranslation = [0, 0, 1];
                    velocity = 0.4;
                }
                else if (blendObject.name.includes("BACKWARDS")) {
                    movingObjectTranslation = [0, 0, -1];
                    velocity = 0.4;
                }
                else if (blendObject.name.includes("CHASETRAP")) {
                    maxTranslationDistance = 30;
                    movingObjectTranslation = [0, 0, -1];
                    velocity = 1.4;
                }

                if (blendObject.name.includes("MovingOnSpawn")) {
                    movingSinceCheckPoint = parseInt(blendObject.name.split("MovingOnSpawn")[1].split("")[0]);
                    this.OnRespawnMovingObjectNodes.push(blendObjectNode);
                }

                if (blendObject.name.includes("Platform")) {
                    canMovePlayer = true;
                    blendObjectNode.isEntityPlatform = true;
                }

                blendObjectNode.addComponent(new Entity(blendObjectNode.getComponentOfType(Transform), movingObjectTranslation, maxTranslationDistance, moveBothDirections, velocity, movingSinceCheckPoint, canMovePlayer));
            }

            // assign unlockable doors
            if (blendObject.name.includes("UnlockDoor")) {
                blendObjectNode.dropOrbHolderUnlockIndex = blendObject.name.split("")[blendObject.name.length - 1];

                // this object will not move until unlocked, therefore disable movement
                const entity = blendObjectNode.getComponentOfType(Entity);
                entity.movingEnabled = false;
                entity.velocity = 1.5;
                entity.reasignMaxDistance(2.8);
                this.unlockableDoorArray.push(blendObjectNode);
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
        this.physics.update(time, dt);  // handle collisions
        this.updateSoundParameters();
    }

    render() {
        this.renderer.render(this.scene, this.camera, this.skybox, this.lights);
        this.updateFPS();
    }

    resize({ displaySize: { width, height } }) {
        this.camera.getComponentOfType(Camera).aspect = width / height;
        if (this.renderer instanceof Renderer) {
            this.renderer.resize(width, height);
        }
    }

    updateSoundParameters() {
        const playerTransform = this.player.getComponentOfType(Transform);
        soundController.updateListenerPosition(...playerTransform.translation)
        soundController.updateListenerOrientation(playerTransform.rotation);
    }

    async initialize() {
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

        this.initSounds();
    }

    initSounds() {
        if (!soundController.loaded) {
            setTimeout(() => this.initSounds(), 100);
            return;
        }

        let torchInstance = 0;
        for (let i = 0; i < this.loader.gltf.nodes.length; i++) {
            if (this.scene.children[i] !== undefined) {
                const blendObject = this.loader.gltf.nodes[i];
                if (blendObject.name.includes("Torch")) {
                    const delay = Math.random() * 3000  // delay for up to 3 seconds
                    setTimeout(() => {
                        soundController.playSound('fire', { loop: true });
                        soundController.updateSoundPosition('fire', torchInstance, ...blendObject.translation);
                        soundController.setVolume('fire', 75);
                        torchInstance++;
                    }, delay);
                }
            }
        }
    }

    async initTextures() {
        const black = new ImageData(new Uint8ClampedArray([0, 0, 0, 255]), 1, 1);
        const white = new ImageData(new Uint8ClampedArray([255, 255, 255, 255]), 1, 1);
        const orange = new ImageData(new Uint8ClampedArray([255, 60, 0, 255]), 1, 1);
        const blue = new ImageData(new Uint8ClampedArray([0, 0, 255, 255]), 1, 1);
        const sampler = new Sampler({
            minFilter: 'nearest',
            magFilter: 'nearest',
        })

        const emissionTexture = new Texture({ image: black, sampler: sampler });
        const emissionTextureOrange = new Texture({ image: orange, sampler: sampler });
        const emissionTextureBlue = new Texture({ image: blue, sampler: sampler });
        const lightTexture = new Texture({ image: white, sampler: sampler });

        this.scene.traverse(node => {
            const model = node.getComponentOfType(Model);
            if (!model) {
                return;
            }

            const entity = node.getComponentOfType(Entity);
            if (entity) {
                entity.player = this.player.getComponentOfType(Player);
            }

            node.isStatic = true;

            model.primitives[0].material.emissionTexture = emissionTexture;
            model.primitives[0].material.metalnessTexture = lightTexture
            model.primitives[0].material.roughnessTexture = lightTexture
            model.primitives[0].material.metalnessFactor = 1;
            model.primitives[0].material.roughnessFactor = 0.6;
        });

        this.player.isStatic = false;
        this.player.isDynamic = true;

        const emissionTexturePortal = new Texture({
            image: await new ImageLoader().load('../../game/assets/models/portal.png'),
            sampler: new Sampler({
                minFilter: 'nearest',
                magFilter: 'nearest',
            }),
        });

        const lavaMat = this.loader.loadMaterial("LavaMat");
        const portalMat = this.loader.loadMaterial("PortalMat");
        const trapDarkMat = this.loader.loadMaterial("DarkStoneTrapMat");
        const magmaMat = this.loader.loadMaterial("MagmaMat");
        for (let i = 0; i < this.loader.gltf.nodes.length; i++) {
            if (this.scene.children[i] !== undefined) {
                // const blendObject = this.loader.gltf.nodes[i];
                // const blendObjectModel = this.scene.children[i].getComponentOfType(Model);
                const material = this.scene.children[i].getComponentOfType(Model).primitives[0].material;

                switch (material) {
                    case trapDarkMat:
                        material.metalnessFactor = 0.7;
                        material.roughnessFactor = 0.2;
                        break;
                    case lavaMat:
                        material.emissionTexture = emissionTextureOrange;
                        break;
                    case magmaMat:
                        material.emissionTexture = emissionTextureBlue;
                        break;
                    case portalMat:
                        material.emissionTexture = emissionTexturePortal;
                        break;
                }

                // if (blendObject.name.includes("Orb_")) {
                //     console.log(blendObject.name);
                //     blendObjectModel.primitives[0].material.emissionTexture = emissionTextureBlue;
                // }
            }
        }
    }

    async initSky() {
        const [cubeMesh, envmapImage] = await Promise.all([
            new JSONLoader().loadMesh('../../../common/models/cube.json'),
            new ImageLoader().load('../../game/assets/images/sky.jpg'),
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

    updateFPS() {
        this.frameCount++;
        const now = window.performance.now();
        const deltaTime = now - this.lastTime;

        if (deltaTime >= 1000) { // update every second
            this.fps = this.frameCount / (deltaTime / 1000);
            this.frameCount = 0;
            this.lastTime = now;
            console.log(`FPS: ${this.fps.toFixed(2)}`);
        }
    }
}
