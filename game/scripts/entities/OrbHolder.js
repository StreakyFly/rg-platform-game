import { Orb } from './Orb.js';
import { showBottomText, addInventory, removeInventory } from "../../../main.js";
export class OrbHolder {
    orb = null;
    unlockDoor = null;
    constructor(transform) {
        this.transform = transform;
        this.detectionRadius = 1.5;


        const maxHeightDist = 1.5;
        this.minHeightDetection = this.transform.translation[1] - maxHeightDist / 2;
        this.maxHeightDetection = this.transform.translation[1] + maxHeightDist / 2;

        this.interactionDisabled = false;
    }

    isInteractionRangeValid(playerTranslation) {
        // detection not enabled, return
        if (this.interactionDisabled) return;

        // detect valid height
        const playerYPos = playerTranslation[1];
        if (playerYPos > this.maxHeightDetection || playerYPos < this.minHeightDetection) return false;

        // detection radius (euclid distance)
        const deltaX = playerTranslation[0] - this.transform.translation[0];
        const deltaZ = playerTranslation[2] - this.transform.translation[2];
        const distance = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaZ, 2));
        return distance <= this.detectionRadius;
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
        // collect orb: move away from any visible sight -> positon [0, 0, 40] is out of sight
        this.orb.getComponentOfType(Orb).transform.translation = [0, 0, 40]

        collectedOrbArray.push(this.orb);

        // can only collect orb once
        this.interactionDisabled = true;

        this.updateInventory(collectedOrbArray);
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

        showBottomText(collectedOrbArray.length + " Energy Orb" + ((collectedOrbArray.length > 1) ? "s were" : " was") + " placed.", 'orange');

        // clear array
        collectedOrbArray.length = 0;

        this.unlockDoor.movingEnabled = true;
        this.unlockDoor.moveUnlocked = true;

        this.updateInventory(collectedOrbArray);
    }

    updateInventory(collectedOrbArray) {
        // update visual inventory
        const inventoryCount = document.querySelector('.inventory-slot.iCount');
        if (inventoryCount) {
            inventoryCount.textContent = parseInt(collectedOrbArray.length) + "x";
        }
    }
}