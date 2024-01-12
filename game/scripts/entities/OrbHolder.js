import { Orb } from './Orb.js';
import { showBottomText } from "../../../main.js";
export class OrbHolder {
    orb = null;
    unlockDoor = null;
    constructor(transform) {
        this.transform = transform;
        this.detectionRadius = 1.5;
        this.minHeightDetection = this.transform.translation[1] - 0.75;
        this.maxHeightDetection = this.transform.translation[1] + 0.75;

        // aproximation from blender ( player diameter around 0.25)
        this.playerSizeRadius = 0.2;
        this.interactionDisabled = false;
    }

    isInteractionRangeValid(playerTranslation) {
        // detection not enabled, return
        if (this.interactionDisabled) return;

        // detect valid height
        const playerYPos = playerTranslation[1];
        if (playerYPos > this.maxHeightDetection || playerYPos < this.minHeightDetection) return false;

        // detection logic (euclid distance)
        const deltaX = playerTranslation[0] - this.transform.translation[0];
        const deltaZ = playerTranslation[2] - this.transform.translation[2];
        const distance = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaZ, 2));
        if (distance > this.detectionRadius) return false;
    
        return true;
    }

    playerOrbInteraction(collectedOrbArray) {
        // detection not enabled, return
        if (this.interactionDisabled) return;

        this.interactionDisabled = true;

        // orbHolder logic
        if (this.orbDropEnabled) {
            this.dropAllOrbs(collectedOrbArray);
        }
        else {
            this.collectOrb(collectedOrbArray);
        }
    }

    collectOrb(collectedOrbArray) {
        // collect orb: move away from any visible sight
        this.orb.getComponentOfType(Orb).transform.translation = [0, 0, 40]

        collectedOrbArray.push(this.orb);

        showBottomText("Energy Orb collected.", 'yellow');
    }

    dropAllOrbs(collectedOrbArray) {
        if (collectedOrbArray.length == 0) {
            showBottomText("0 Energy Orbs in inventory.", 'red');
            return;
        }

        for (const orbNode of collectedOrbArray)
        {
            orbNode.getComponentOfType(Orb).transform.translation = this.transform.translation.slice();
            orbNode.getComponentOfType(Orb).transform.translation[1] += 0.5;
        }     
        showBottomText(collectedOrbArray.length + " Energy Orb" + ((collectedOrbArray.length > 1) ? "s were" : " was" ) + " placed.", 'yellow');

        // clear array
        collectedOrbArray.length = 0;

        this.unlockDoor.moveUnlocked();
    }
}
