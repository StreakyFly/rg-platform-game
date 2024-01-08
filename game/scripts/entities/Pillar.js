import { vec3 } from '../../../lib/gl-matrix-module.js';
import { Entity } from './Entity.js'

export class Pillar extends Entity {
    distanceTraveled = 0;
    constructor(
        velocity,  // float
        translation,  // [float, float, float]
        travelDistance  // float
    ) {
        super(false);
        this.velocity = velocity;
        this.translation = translation;
        this.travelDistance = travelDistance;
    }

    move() {  // can only move on one axis
        let movement = vec3.create();
        vec3.scale(movement, this.translation, this.velocity);
        vec3.add(this.position, this.position, movement);

        for(let i = 0; i < movement.length; i++) {
            if (movement[i] !== 0) {
                this.distanceTraveled += Math.abs(movement[i]);
                break;
            }
        }

        if (this.distanceTraveled >= this.travelDistance) {
            this.velocity = -this.velocity;
            this.distanceTraveled = 0;
        }
    }

    knockOver() {
        // TBD
        // this.rotate()
    }

    rotate() {
        // TBD
    }
}
