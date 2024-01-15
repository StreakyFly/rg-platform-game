import { vec3 } from '../../../lib/gl-matrix-module.js';
export class Entity {
    constructor(transform, translation, maxDistance, moveBothDirections, velocity, movingSinceCheckPoint, canMovePlayer) {
        this.transform = transform;
        this.startPos = this.transform.translation.slice();
        this.translation = translation;
        this.moveBothDirections = moveBothDirections;
        this.movingSinceCheckPoint = movingSinceCheckPoint;
        this.movingEnabled = movingSinceCheckPoint == 0;
        this.minX = this.startPos[0] - maxDistance;
        this.maxX = this.startPos[0] + maxDistance;
        this.minY = this.startPos[1] - maxDistance;
        this.maxY = this.startPos[1] + maxDistance;
        this.minZ = this.startPos[2] - maxDistance;
        this.maxZ = this.startPos[2] + maxDistance;

        this.velocity = velocity;

        this.moveUnlocked = false;
        this.moveUnlockedEnded = false;

        this.player = null;
        this.movePlayer = false;
        this.canMovePlayer = canMovePlayer;
    }

    reasignMaxDistance(maxDistance) {
        this.minX = this.startPos[0] - maxDistance;
        this.maxX = this.startPos[0] + maxDistance;
        this.minY = this.startPos[1] - maxDistance;
        this.maxY = this.startPos[1] + maxDistance;
        this.minZ = this.startPos[2] - maxDistance;
        this.maxZ = this.startPos[2] + maxDistance;
    }

    update(t, dt) {
        if (this.movingEnabled) this.move(dt);
    }

    move(dt) {
        dt = 0.01;  // TODO delete
        // update translation direction
        let posX = this.transform.translation[0];
        let posY = this.transform.translation[1];
        let posZ = this.transform.translation[2];


        if (posX >= this.maxX || posX <= this.minX) {
            this.updateTranslation(0);
        }

        if (posY >= this.maxY || posY <= this.minY) {
            this.updateTranslation(1);
        }

        if (posZ >= this.maxZ || posZ <= this.minZ) {
            this.updateTranslation(2);
        }
        // move

        vec3.scaleAndAdd(this.transform.translation, this.transform.translation, this.translation, this.velocity * dt);

        if (this.movePlayer && this.canMovePlayer) {
            vec3.scaleAndAdd(this.player.playerTransform.translation, this.player.playerTransform.translation, this.translation, this.velocity * dt);
        }
    }

    updateTranslation(axisIndex) {
        // moveUnlocked -> "fake animation" finished, therefore disable movement
        if (this.moveUnlocked) {
            this.movingEnabled = false;
            return;
        }

        // can move in both directions, therefore reverse direction
        if (this.moveBothDirections) {
            this.translation[axisIndex] = -this.translation[axisIndex];
            return;
        }

        // can move in only 1 direction, therefore reset position
        this.resetPos();
    }

    resetPos() {
        this.transform.translation = this.startPos.slice();
    }
}