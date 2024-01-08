export class RespawnPoint {
    constructor(checkPointTransform, yaw, pitch) {
        this.translation = checkPointTransform.translation;
        this.rotation = checkPointTransform.rotation;
        this.yaw = yaw;
        this.pitch = pitch;
    }
}
