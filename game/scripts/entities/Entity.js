import { vec3 } from '../../../lib/gl-matrix-module.js';
export class Entity {        
    constructor(transform, translation, maxDistance) {
        this.transform = transform;
        this.startPos = this.transform.translation.slice();
        this.translation = translation;
        this.minX = this.startPos[0] - maxDistance;
        this.maxX = this.startPos[0] + maxDistance;
        this.minY = this.startPos[1] - maxDistance;
        this.maxY = this.startPos[1] + maxDistance;
        this.minZ = this.startPos[2] - maxDistance;
        this.maxZ = this.startPos[2] + maxDistance;
    }

    move(){
        // update translation direction
        let posX = this.transform.translation[0];
        let posY = this.transform.translation[1];
        let posZ = this.transform.translation[2];

        if(posX >= this.maxX || posX <= this.minX ){
            this.translation[0] = -this.translation[0]; 
        }

        if(posY >= this.maxY || posY <= this.minY ){
            this.translation[1] = -this.translation[1]; 
        }

        if(posZ >= this.maxZ || posZ <= this.minZ ){
            this.translation[2] = -this.translation[2]; 
        }
        // move
        vec3.add(this.transform.translation, this.transform.translation, this.translation);
    }

    update(t, dt){
        this.move();
    }

    // TODO method for loading/initializing the object?
}