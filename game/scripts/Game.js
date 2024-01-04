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

import { Physics } from './Physics.js';
import { Player } from "./Player.js";
import { Entity } from "./entities/Entity.js";

import { Renderer } from "./Renderer.js";


export class Game {
    constructor() {
        this.canvas = document.querySelector('canvas');
        this.gl = this.canvas.getContext('webgl2');
        this.renderer = new Renderer(this.gl);
        this.scene = null;
        this.camera = null;
        this.physics = null;
        this.skybox = null;
    }

    async start() {
        const loader = new GLTFLoader();
        // await loader.load('../../game/assets/models/platform.gltf');
        await loader.load('../../game/assets/models/level.gltf');

        this.scene = loader.loadScene(loader.defaultScene);

        const traps = loader.gltf.nodes.filter(element => element.name.includes("Trap"));
        for (const trap of traps){
            this.scene.children[trap.mesh].isTrap = true;
        }

        // testing
        const movingTraps = loader.gltf.nodes.filter(element => element.name.includes("Moving"));
        for (const trap of movingTraps){
            const movingTrapNode = this.scene.children[trap.mesh];
            const movingTrapTransform = movingTrapNode.getComponentOfType(Transform);
            let movingTrapTranslation = [0, 0.005, 0];
            const maxTranslationDistance = 1;
            movingTrapNode.addComponent(new Entity(movingTrapTransform, movingTrapTranslation, maxTranslationDistance));
        }

        // testing
        const movingPlatforms = loader.gltf.nodes.filter(element => element.name.includes("MovablePlatform"));
        for (const trap of movingPlatforms){
            const movingTrapNode = this.scene.children[trap.mesh];
            const movingTrapTransform = movingTrapNode.getComponentOfType(Transform);
            let movingTrapTranslation = [0.002, 0, 0];
            const maxTranslationDistance = 1;
            movingTrapNode.addComponent(new Entity(movingTrapTransform, movingTrapTranslation, maxTranslationDistance));
        }

        // initialize camera
        this.camera = loader.loadNode('Camera');
        // camera.addComponent(new Transform({
        //     translation: [0, 1, 0],
        // }));

        this.camera.getComponentOfType(Camera).fovy = 1;
        this.camera.getComponentOfType(Camera).near = 0.01;
        this.camera.getComponentOfType(Camera).aspect = 0.3 / 0.5;

        // initialize player
        const playerNode = loader.loadNode('Player.007');
        const playerTransform = playerNode.getComponentOfType(Transform);
        playerNode.addComponent(new Player(playerTransform, this.camera, playerNode, this.canvas));
        playerNode.isDynamic = true;
        playerNode.aabb = {
            min: [-0.2, -0.2, -0.2],
            max: [0.2, 0.2, 0.2],
        };
        this.scene.addChild(playerNode);

        this.scene.traverse(node => {
            const model = node.getComponentOfType(Model);
            if (!model) {
                return;
            }

            node.isStatic = true;
            /*
            console.log(node.nodeIndex)
            console.log(node.name)
            console.log(node.getComponentOfType(Model).nodeIndex)
            console.log(node.getComponentOfType(Model).name)*/
            // build trapList
        });
/*
        let l = this.scene.find(element => element.name.includes("Trap"));
        l.find(element => element.name === nameOrIndex);
        console.log(l)*/
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
        this.renderer.render(this.scene, this.camera, this.skybox);
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
}
