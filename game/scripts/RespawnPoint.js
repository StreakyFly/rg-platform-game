export class RespawnPoint {
    constructor(checkPointTransform, yaw) {
        this.translation = checkPointTransform.translation;
        this.rotation = checkPointTransform.rotation;
        this.yaw = yaw;
        this.pitch = 0;
    }
}
