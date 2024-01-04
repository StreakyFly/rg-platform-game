import {quat, vec3} from '../../lib/gl-matrix-module.js';
import {Transform} from '../../common/engine/core/Transform.js';
import {Physics} from "./Physics.js";


const cameraView = {
    "3D": "3d",
    "2D": "2d",
};

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

        this.view = cameraView['3D'];

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
        this.attemptJump = false;
        this.isJumping = false;
        this.attemptDoubleJump = false;
        this.isDoubleJumping = false;

        this.physics = new Physics();

        this.spiderManJump = true;

        this.initHandlers();

        // respawn stuff
        this.checkPoints = [[0, 0, 0], [0, 0, 0]];
        this.currCheckPointIndex = 0;
        this.killY = [-5, -0.2];
        this.currKillYIndex = 0;
    }

    changeTo2D(level) {
        // TODO -> find level values to adjust player start position to apply rotation(rotation/check points);
        //this.playerTransform.translation = [0, 0, 0];
        this.yaw = 0;
        this.view = cameraView['2D'];
        this.playerCamera.getComponentOfType(Transform).translation[0] = 5;
        const rotation = quat.create();
        quat.rotateY(rotation, rotation, Math.PI / 2);
        this.playerCamera.getComponentOfType(Transform).rotation = rotation;
    }

    changeTo3D(level) {
        // TODO -> find level values to adjust player start position to apply rotation(rotation/check points);
        // this.playerTransform.translation = [0, 0, 0];
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
        // Calculate forward and right vectors.
        const cos = Math.cos(this.yaw);
        const sin = Math.sin(this.yaw);
        const forward = [-sin, 0, -cos];
        const right = [cos, 0, -sin];

        // Map user input to the acceleration vector.
        const acc = vec3.create();
        if (this.keys['KeyW'] || this.keys['KeyUp']) {
            if (this.view === cameraView['3D']) vec3.add(acc, acc, forward);
        }
        if (this.keys['KeyS']) {
            if (this.view === cameraView['3D']) vec3.sub(acc, acc, forward);
        }
        if (this.keys['KeyD']) {
            if (this.view === cameraView['3D']) {
                vec3.add(acc, acc, right);
            } else {
                vec3.add(acc, acc, forward);
            }
        }
        if (this.keys['KeyA']) {
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

        // Update velocity based on acceleration.
        vec3.scaleAndAdd(this.velocity, this.velocity, acc, dt * this.acceleration);

        // If there is no user input, apply decay.
        if (!this.keys['KeyW'] &&
            !this.keys['KeyS'] &&
            !this.keys['KeyD'] &&
            !this.keys['KeyA'] &&
            !this.keys['Space']) {
            const decay = Math.exp(dt * Math.log(1 - this.decay));
            vec3.scale(this.velocity, this.velocity, decay);
        }

        // Limit speed to prevent accelerating to infinity and beyond.
        const speed = vec3.length(this.velocity);
        if (speed > this.maxSpeed) {
            vec3.scale(this.velocity, this.velocity, this.maxSpeed / speed);
        }
        if (this.velocityY > this.maxVelocityY) {
            this.velocityY = this.maxVelocityY;
        } else if (this.velocityY < -this.maxVelocityY) {
            this.velocityY = -this.maxVelocityY;
        }

        // Update translation based on velocity and jump logic.
        vec3.scaleAndAdd(this.playerTransform.translation, this.playerTransform.translation, this.velocity, dt);

        // Update rotation based on the Euler angles.
        let rotation = quat.create();
        quat.rotateY(rotation, rotation, this.yaw);
        this.playerTransform.rotation = rotation;

        if (this.view !== cameraView['2D']) {
            rotation = quat.create();
            quat.rotateX(rotation, rotation, this.pitch);
            this.playerCamera.getComponentOfType(Transform).rotation = rotation;
        }

        // respawn logic
        if (this.playerTransform.translation[1] < this.killY[this.currKillYIndex]) {
            const checkpoint = this.checkPoints[this.currCheckPointIndex]
            // console.log(checkpoint);
            // this.playerTransform.translation = checkpoint;  // how does checkpoint magically get updated instead of player's translation??
            this.playerTransform.translation = [...checkpoint];
        }

        this.handleJump(dt);
    }

    handleJump(dt) {
        // console.log(this.isOnObject(), this.velocityY, this.playerTransform.translation[1]);
        const onObject = this.isOnObject();
        if (onObject) {
            this.velocityY = 0;
        }

        // if onObject and isJumping, then reset all jump parameters
        if (onObject && this.isJumping) {
            this.velocityY = 0;
            this.isJumping = false;
            this.isDoubleJumping = false;
        }  // else if onObject and attemptJump but not isJumping, then jump
        else if (onObject && this.attemptJump && !this.isJumping) {
            this.isJumping = true;
            this.velocityY = this.jumpVelocity;
        }  // else if not onObject, then apply gravity/change Y according to gravity
        else if (!onObject) {
            // double jump magic
            if (this.isJumping && this.attemptDoubleJump && !this.isDoubleJumping && !this.attemptJump) {
                this.isDoubleJumping = true;
                this.velocityY = this.doubleJumpVelocity;
            }
            this.velocityY += this.gravity * dt;
            this.playerTransform.translation[1] += this.velocityY * dt;
        }
    }

    isOnObject() {
        if (this.velocityY > 0) {
            return false;
        }

        const player = this.node;
        for (const object of this.node.parent.children) {
            if (object.aabb === undefined || object === this.node) continue;

            if (this.checkCollision(player, object)) {
                const distanceBetweenPlayersBottomAndObjectsTop = this.physics.getTransformedAABB(object).max[1] - this.playerTransform.translation[1];
                if (this.spiderManJump || Math.abs(distanceBetweenPlayersBottomAndObjectsTop) < 0.01) {  // Math.abs not necessary afaik (wasn't tested without though)
                    return true;
                }
            }
        }
        return false;
    }

    checkCollision(a, b) {
        // Get global space AABBs.
        const aBox = this.physics.getTransformedAABB(a);
        const bBox = this.physics.getTransformedAABB(b);

        // Check if there is collision.
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
        }
    }
}
