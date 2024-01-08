import { quat, vec3 } from '../../lib/gl-matrix-module.js';
import { Transform } from '../../common/engine/core/Transform.js';

export class Player {
    constructor(playerTransform, playerCamera, node, domElement, {
        pointerSensitivity = 0.002,
    } = {}) {
        this.playerTransform = playerTransform;
        this.playerCamera = playerCamera;
        this.node = node;
        this.node.addChild(this.playerCamera);
        this.domElement = domElement;

        this.pointerSensitivity = pointerSensitivity;

        this.keys = {};

        this.pitch = 0;
        this.yaw = 0;
        this.velocity = [0, 0, 0];
        this.acceleration = 1000;  // basically instant max speed
        this.maxSpeed = 2.5;
        this.decay = 1;  // 0.99 before // 1 = no decay
        this.gravity = -9.81 * 1.1;

        this.jumpVelocity = 3.0;
        this.doubleJumpVelocity = 3.5;  // 4.5 before
        this.velocityY = 0;
        this.maxVelocityY = 7;

        this.initHandlers();
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
        // calculate forward and right vectors.
        const cos = Math.cos(this.yaw);
        const sin = Math.sin(this.yaw);
        const forward = [-sin, 0, -cos];
        const right = [cos, 0, -sin];
        const up = [0, 1, 0];

        // map user input to the acceleration vector.
        const acc = vec3.create();
        if (this.keys['KeyW']) {
            vec3.add(acc, acc, forward);
        }
        if (this.keys['KeyS']) {
            vec3.sub(acc, acc, forward);
        }
        if (this.keys['KeyD']) {
            vec3.add(acc, acc, right);
        }
        if (this.keys['KeyA']) {
            vec3.sub(acc, acc, right);
        }
        if (this.keys['Space']) {
            vec3.add(acc, acc, up);
        }
        if (this.keys['KeyJ']) {
            vec3.sub(acc, acc, up);
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
        quat.rotateY(rotation, rotation, this.yaw);
        this.playerTransform.rotation = rotation;
    }

    pointermoveHandler(e) {
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
        if (e.code === 'KeyL') {
            console.log("Current player location:", this.playerTransform.translation)
        }
    }
}
