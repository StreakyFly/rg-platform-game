import { Orb } from './Orb.js';
import { showBottomText } from "../controllers/HUDController.js";
import { soundController } from "../../../main.js";
import { Texture } from "../../../common/engine/core/Texture.js";
import { Sampler } from "../../../common/engine/core/Sampler.js";
import {Model} from "../../../common/engine/core/Model.js";


export class OrbHolder {
    orb = null;
    unlockDoor = null;
    constructor(transform, loader) {
        this.transform = transform;
        this.loader = loader;
        this.detectionRadius = 1.5;

        const maxHeightDist = 1.5;
        this.minHeightDetection = this.transform.translation[1] - maxHeightDist / 2;
        this.maxHeightDetection = this.transform.translation[1] + maxHeightDist / 2;

        this.interactionDisabled = false;
        this.node = null;
    }

    isInteractionRangeValid(playerTranslation, cameraQuaternion) {
        // detection not enabled, return
        if (this.interactionDisabled) return false;

        // detect valid height
        const playerYPos = playerTranslation[1];
        if (playerYPos > this.maxHeightDetection || playerYPos < this.minHeightDetection) return false;

        // detection radius (Euclidean distance)
        const deltaX = playerTranslation[0] - this.transform.translation[0];
        const deltaZ = playerTranslation[2] - this.transform.translation[2];
        const distance = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
        if (distance > this.detectionRadius) return false;

        // Convert quaternion to directional vector
        const cameraDirection = this.quaternionToDirection(cameraQuaternion, [0, 0, 1]); // Assuming forward vector is [0, 0, 1]

        // Direction vector from player to orb holder
        const directionToHolder = [deltaX, 0, deltaZ];
        const magnitude = Math.sqrt(directionToHolder[0] * directionToHolder[0] + directionToHolder[2] * directionToHolder[2]);
        const normalizedDirectionToHolder = [directionToHolder[0] / magnitude, 0, directionToHolder[2] / magnitude];

        // Dot product for angle calculation
        const dotProduct = normalizedDirectionToHolder[0] * cameraDirection[0] + normalizedDirectionToHolder[2] * cameraDirection[2];
        const angle = Math.acos(dotProduct) * (180 / Math.PI);

        // Check if player is facing the orb holder within a threshold angle
        return angle <= 20;
    }

    quaternionToDirection(quaternion, forward) {
        // Quaternion is [x, y, z, w]
        const x = quaternion[0], y = quaternion[1], z = quaternion[2], w = quaternion[3];

        // Rotation matrix formula derived from quaternion
        const xx = x * x, yy = y * y, zz = z * z;
        const xy = x * y, xz = x * z, yz = y * z;
        const wx = w * x, wy = w * y, wz = w * z;

        // Apply rotation to forward vector
        const fx = (1 - 2 * (yy + zz)) * forward[0] + 2 * (xy - wz) * forward[1] + 2 * (xz + wy) * forward[2];
        const fy = 2 * (xy + wz) * forward[0] + (1 - 2 * (xx + zz)) * forward[1] + 2 * (yz - wx) * forward[2];
        const fz = 2 * (xz - wy) * forward[0] + 2 * (yz + wx) * forward[1] + (1 - 2 * (xx + yy)) * forward[2];

        // Return the resulting directional vector
        return [fx, fy, fz];
    }


    playerOrbInteraction(collectedOrbArray) {
        // orbHolder logic
        if (this.orbDropEnabled) {
            this.dropAllOrbs(collectedOrbArray);
        }
        else {
            this.collectOrb(collectedOrbArray);
        }
    }

    collectOrb(collectedOrbArray) {
        // collect orb: move away from any visible sight -> positon [0, 0, -40] is out of sight
        this.orb.getComponentOfType(Orb).transform.translation = [0, 0, -40]

        collectedOrbArray.push(this.orb);

        // can only collect orb once
        this.interactionDisabled = true;

        this.updateInventory(collectedOrbArray);

        soundController.playSound('pick-up', { globalSound: true });
        soundController.setVolume('pick-up', 60);
        showBottomText("Energy Orb collected.", 'orange');
    }

    dropAllOrbs(collectedOrbArray) {
        if (collectedOrbArray.length === 0) {
            showBottomText("0 Energy Orbs in inventory.", 'red');
            return;
        }

        // can only unlock orbs once
        this.interactionDisabled = true;

        for (const orbNode of collectedOrbArray) {
            orbNode.getComponentOfType(Orb).transform.translation = this.transform.translation.slice();
            orbNode.getComponentOfType(Orb).transform.translation[1] += 0.5;
        }

        this.applyBloomTexture();

        soundController.playSound('achievement', { globalSound: true });
        soundController.setVolume('achievement', 90);

        showBottomText(collectedOrbArray.length + " Energy Orb" + ((collectedOrbArray.length > 1) ? "s were" : " was") + " placed.", 'orange');

        // clear array
        collectedOrbArray.length = 0;

        setTimeout(() => {
            this.unlockDoor.movingEnabled = true;
            this.unlockDoor.moveUnlocked = true;
            soundController.playSound('stone-sliding', { globalSound: true });
            soundController.setVolume('stone-sliding', 80);
            setTimeout(() => {
                soundController.playSound('stone-sliding', { globalSound: true });
                soundController.setVolume('stone-sliding', 80);
            }, 800);
        }, 800);

        this.updateInventory(collectedOrbArray);
    }

    updateInventory(collectedOrbArray) {
        // update visual inventory
        const inventoryCount = document.querySelector('.inventory-slot.iCount');
        if (inventoryCount) {
            inventoryCount.textContent = "x " + parseInt(collectedOrbArray.length);
        }
    }

    applyBloomTexture() {
        const orange = new ImageData(new Uint8ClampedArray([255, 60, 0, 255]), 1, 1);
        const emissionTextureOrange = new Texture({
            image: orange,
            sampler: new Sampler({
                minFilter: 'nearest',
                magFilter: 'nearest',
            }),
        });

        this.node.getComponentOfType(Model).primitives[0].material.emissionTexture = emissionTextureOrange;
    }
}