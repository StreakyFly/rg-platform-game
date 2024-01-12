import { quat, vec3 } from '../../lib/gl-matrix-module.js';

import { Transform } from '../../common/engine/core/Transform.js';

import { Physics } from "./Physics.js";
import { Entity } from './entities/Entity.js';

import { showBottomText, showTopText, startClock } from "../../main.js";
import { gameFinish } from "../../main.js";

const cameraView = {
    "3D": "3d",
    "2D": "2d",
};


export class Player {
    constructor(playerTransform, playerCamera, node, OnRespawnMovingObjects, domElement, {
        pointerSensitivity = 0.002,
    } = {}) {
        this.playerTransform = playerTransform;
        this.playerCamera = playerCamera;
        this.node = node;
        this.node.addChild(this.playerCamera);
        this.OnRespawnMovingObjects = OnRespawnMovingObjects;
        this.domElement = domElement;

        this.pointerSensitivity = pointerSensitivity;

        this.view = cameraView['3D'];
        this.downSideView = false;

        this.keys = {};

        this.pitch = 0;
        this.yaw = 0;
        this.velocity = [0, 0, 0];
        this.acceleration = 1000;  // basically instant max speed
        this.maxSpeed = 2.5;
        this.decay = 1;  // 0.99 before // 1 = no decay
        this.gravity = -9.81 * 1.1;

        this.isMoving = false;

        this.jumpVelocity = 3.0;
        this.doubleJumpVelocity = 3.5;  // 4.5 before
        this.velocityY = 0;
        this.maxVelocityY = 7;
        this.attemptJump = false;
        this.isJumping = false;
        this.attemptDoubleJump = false;
        this.isDoubleJumping = false;

        this.physics = new Physics();

        this.spiderManJump = false;

        this.checkPoints = [];
        this.orbHolderArray = [];
        this.validOrbHolderInteraction = false;
        this.validOrbHolder = null;
        this.collectedOrbArray = [];

        this.currCheckPointIndex = 0;
        this.killYMin = -5;
        this.killYMax = 21;
        this.currKillYIndex = 0;

        this.lives = 3;
        this.moveWithPlatformTranslation = [0, 0, 0];

        this.initHandlers();
    }

    changeTo2D() {
        this.yaw = 0;
        this.view = cameraView['2D'];
        this.playerCamera.getComponentOfType(Transform).translation[0] = 3.5;
        const rotation = quat.create();
        quat.rotateY(rotation, rotation, Math.PI / 2);
        this.playerCamera.getComponentOfType(Transform).rotation = rotation;
    }

    changeTo3D() {
        this.view = cameraView['3D']
        this.playerCamera.getComponentOfType(Transform).translation[0] = 0;
        this.playerCamera.getComponentOfType(Transform).rotation = quat.create();
    }

    initHandlers() {
        this.pointermoveHandler = this.pointermoveHandler.bind(this);
        this.keydownHandler = this.keydownHandler.bind(this);
        this.keyupHandler = this.keyupHandler.bind(this);

        const element = this.domElement;
        const doc = element.ownerDocument;

        doc.addEventListener('keydown', this.keydownHandler);
        doc.addEventListener('keyup', this.keyupHandler);

        element.addEventListener('click', e => element.requestPointerLock());
        doc.addEventListener('pointerlockchange', e => {
            if (doc.pointerLockElement === element) {
                doc.addEventListener('pointermove', this.pointermoveHandler);
            } else {
                doc.removeEventListener('pointermove', this.pointermoveHandler);
            }
        });
    }

    update(t, dt) {
        if (!gameFinish) startClock();
        // calculate forward and right vectors.
        const cos = Math.cos(this.yaw);
        const sin = Math.sin(this.yaw);
        const forward = [-sin, 0, -cos];
        const right = [cos, 0, -sin];

        // map user input to the acceleration vector.
        this.isMoving = false;
        this.moveWithPlatformTranslation = [0, 0, 0];
        const acc = vec3.create();
        if (this.keys['KeyW'] || this.keys['KeyUp']) {
            this.isMoving = true;
            if (this.view === cameraView['3D']) vec3.add(acc, acc, forward);
        }
        if (this.keys['KeyS']) {
            this.isMoving = true;
            if (this.view === cameraView['3D']) vec3.sub(acc, acc, forward);
        }
        if (this.keys['KeyD']) {
            this.isMoving = true;
            if (this.view === cameraView['3D']) {
                vec3.add(acc, acc, right);
            } else {
                vec3.add(acc, acc, forward);
            }
        }
        if (this.keys['KeyA']) {
            this.isMoving = true;
            if (this.view === cameraView['3D']) {
                vec3.sub(acc, acc, right);
            } else {
                vec3.sub(acc, acc, forward);
            }
        }
        if (this.keys['Space']) {
            if (!this.attemptJump && !this.attemptDoubleJump && !this.isJumping) {
                this.attemptJump = true;
            } else if (!this.attemptDoubleJump && !this.isDoubleJumping) {
                this.attemptDoubleJump = true;
            }
        }
        if (this.keys['KeyN']) {
            this.changeTo2D();
            return;
        }

        if (this.keys['KeyM']) {
            this.changeTo3D();
            return;
        }

        if (this.keys['KeyG']) {
            this.changeToDownside3D();
            return;
        }

        if (this.keys['KeyF'] && this.validOrbHolderInteraction && this.validOrbHolder) {
            this.validOrbHolder.playerOrbInteraction(this.collectedOrbArray);
        }

        // update velocity based on acceleration.
        vec3.scaleAndAdd(this.velocity, this.velocity, acc, dt * this.acceleration);

        // if there is no user input, apply decay.
        if (!this.keys['KeyW'] &&
            !this.keys['KeyS'] &&
            !this.keys['KeyD'] &&
            !this.keys['KeyA'] &&
            !this.keys['Space']) {
            const decay = Math.exp(dt * Math.log(1 - this.decay));
            vec3.scale(this.velocity, this.velocity, decay);
        }

        // limit speed to prevent accelerating to infinity and beyond.
        const speed = vec3.length(this.velocity);
        if (speed > this.maxSpeed) {
            vec3.scale(this.velocity, this.velocity, this.maxSpeed / speed);
        }
        if (this.velocityY > this.maxVelocityY) {
            this.velocityY = this.maxVelocityY;
        } else if (this.velocityY < -this.maxVelocityY) {
            this.velocityY = -this.maxVelocityY;
        }

        // update translation based on velocity and jump logic.
        vec3.scaleAndAdd(this.playerTransform.translation, this.playerTransform.translation, this.velocity, dt);

        // update rotation based on the Euler angles.
        let rotation = quat.create();
        if (!this.downSideView) {
            quat.rotateY(rotation, rotation, this.yaw);
            this.playerTransform.rotation = rotation;
        }

        if (this.view !== cameraView['2D']) {
            rotation = quat.create();
            quat.rotateX(rotation, rotation, this.pitch);
            this.playerCamera.getComponentOfType(Transform).rotation = rotation;
        }

        const isOnObject = this.isOnObject();

        this.handleJump(dt, isOnObject);

        if (this.isOnObject()) {
            vec3.scaleAndAdd(this.playerTransform.translation, this.playerTransform.translation, this.moveWithPlatformTranslation, dt);
        }

        if (this.playerTransform.translation[1] < this.killYMin || this.playerTransform.translation[1] > this.killYMax) {
            this.showDeathScreen();
            this.respawn();
        }

        this.handleOrbHolderDetection();
    }

    showDeathScreen() 
    {
        showTopText("You died...", 'red', 'black', 1);
    }

    respawn() {
        const checkpoint = this.checkPoints[this.currCheckPointIndex]
        this.playerTransform.translation = [...checkpoint.translation];
        //this.playerTransform.rotation = [-1, 0, 0, 0];
        this.yaw = checkpoint.yaw;
        this.pitch = checkpoint.pitch;

        // enable movement of onRespawn objects
        for (const node of this.OnRespawnMovingObjects) {
            node.getComponentOfType(Entity).resetPos();
            node.getComponentOfType(Entity).movingEnabled = node.getComponentOfType(Entity).movingSinceCheckPoint <= this.currCheckPointIndex;
        }

        // change view
        // change view
        if (this.currCheckPointIndex == 2 || this.currCheckPointIndex == 4) {
            this.changeTo2D();
        }
        else {
            this.changeTo3D();
        }


        // remove lives
        this.lives--;
        if (this.lives == 0) {
            showBottomText("Game over!"); //TODO nared da je konc
        }

        const hearts = document.querySelectorAll('.hearts');
        if (hearts.length > 0) {
            // Removing hearts in html
            const lastHeart = hearts[hearts.length - 1];
            lastHeart.parentNode.removeChild(lastHeart);
        }
    }

    checkForNewCheckpoint(object) {
        if (!object.checkPointIndex) return;

        if (object.checkPointIndex > this.currCheckPointIndex) {
            // new check point reached
            this.currCheckPointIndex = object.checkPointIndex;
            showBottomText("Checkpoint reached!");
        }
    }

    handleJump(dt, onObject) {
        // console.log(this.isOnObject(), this.velocityY, this.playerTransform.translation[1]);
        if (onObject) {
            this.velocityY = 0;
            // if onObject and isJumping, then reset all jump parameters
            if (this.isJumping) {
                this.isJumping = false;
                this.isDoubleJumping = false;
            }  // else if onObject and attemptJump but not isJumping, then jump
            else if (this.attemptJump && !this.isJumping) {
                this.isJumping = true;
                this.velocityY = this.jumpVelocity;
            }
        }  // else if not onObject, then apply gravity/change Y according to gravity
        else {
            // double jump magic
            if (this.isJumping && this.attemptDoubleJump && !this.isDoubleJumping && !this.attemptJump) {
                this.isDoubleJumping = true;
                this.velocityY = this.doubleJumpVelocity;
            }

            this.velocityY += this.gravity * dt;

            this.playerTransform.translation[1] += this.velocityY * dt;
        }
    }

    handleOrbHolderDetection() {
        this.validOrbHolderInteraction = false;
        this.validOrbHolder = null;

        // detect if in interaction range
        for (const orbHolder of this.orbHolderArray) {
            this.validOrbHolderInteraction = orbHolder.isInteractionRangeValid(this.playerTransform.translation);
            if (this.validOrbHolderInteraction) {
                this.validOrbHolder = orbHolder;
                return;
            }
        }
    }

    isOnObject() {
        const player = this.node;
        for (const object of this.node.parent.children) {
            if (object.aabb === undefined || object === this.node) continue;

            if (this.checkCollision(player, object)) {
                if (object.isTrap) {
                    this.showDeathScreen();
                    this.respawn();
                    return true;
                }
                
                if (object.isEntityPlatform) {
                    this.moveWithPlatformTranslation = object.getComponentOfType(Entity).translation;
                }

                if (object.isTeleport) {
                    this.currCheckPointIndex = object.teleportToCheckpointIndex;
                    this.respawn();
                    return true;
                }
                this.checkForNewCheckpoint(object);

                if (object.isStairs && this.isMoving) {
                    // move up stairs
                    const stairsMovementVelocityY = 0.012;
                    this.playerTransform.translation[1] += stairsMovementVelocityY;
                }

                if (this.velocityY > 0) {
                    return false;
                }

                const distanceBetweenPlayersBottomAndObjectsTop = this.physics.getTransformedAABB(object).max[1] - this.playerTransform.translation[1];
                if (this.spiderManJump || Math.abs(distanceBetweenPlayersBottomAndObjectsTop) < 0.015) {  // Math.abs not necessary afaik (wasn't tested without though)
                    return true;
                }
            }
        }
        return false;
    }

    checkCollision(a, b) {
        // get global space AABBs.
        const aBox = this.physics.getTransformedAABB(a);
        const bBox = this.physics.getTransformedAABB(b);

        // check if there is collision.
        return this.physics.aabbIntersection(aBox, bBox);
    }

    pointermoveHandler(e) {
        if (this.view === cameraView['2D']) return;

        const dy = e.movementY;
        const dx = e.movementX;
        this.pitch -= dy * this.pointerSensitivity;
        this.yaw -= dx * this.pointerSensitivity;

        const twopi = Math.PI * 2;
        const verticalRotationView = Math.PI / 3;  // up down rotation limit

        this.pitch = Math.min(Math.max(this.pitch, -verticalRotationView), verticalRotationView);

        this.yaw = ((this.yaw % twopi) + twopi) % twopi;
    }

    keydownHandler(e) {
        this.keys[e.code] = true;
    }

    keyupHandler(e) {
        this.keys[e.code] = false;
        if (e.code === 'Space') {
            this.attemptJump = false;
            this.attemptDoubleJump = false;
        } else if (e.code === 'KeyL') {
            console.log("Current player location:", this.playerTransform.translation)
        }
    }
}
