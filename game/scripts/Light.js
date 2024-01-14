export class Light {

    /*
    attenuation: [double1, double2, double3]
     - double1 -> Constant: Well... a constant? It works in magical ways.
     - double2 -> Linear: A linear factor causing the light intensity to decrease linearly with distance.
     - double3 -> Quadratic: A quadratic factor causing the light intensity to decrease quadratically with distance,
                             resulting in a faster falloff compared to linear attenuation.

    Formula:
    attenuation = 1 / (constant + linear * distance + quadratic * distance^2)
     */

    constructor({
        color = [255, 255, 255],
        intensity = 1,
        attenuation = [0.001, 0, 0.1],
    } = {}) {
        this.color = color;
        this.intensity = intensity;
        this.attenuation = attenuation;
    }

}
