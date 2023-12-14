// import { vec3 } from 'lib/gl-matrix-module'

export class Entity {
    constructor(isInteractive, position = [0, 0, 0]) {
        this.isInteractive = isInteractive;  // bool
        this.position = position;  // x: float, y: float, z: float
    }

    // TODO method for loading/initializing the object?
}