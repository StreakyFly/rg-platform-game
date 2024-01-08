import { vec3, mat4 } from '../../lib/gl-matrix-module.js';

import * as WebGL from '../../common/engine/WebGL.js';

import { BaseRenderer } from '../../common/engine/renderers/BaseRenderer.js';

import {
    getLocalModelMatrix,
    getGlobalModelMatrix,
    getGlobalViewMatrix,
    getProjectionMatrix,
    getModels,
} from '../../common/engine/core/SceneUtils.js';

import { Light } from './Light.js';

import { shaders } from './shaders.js';


export class Renderer extends BaseRenderer {

    constructor(gl) {
        super(gl);

        gl.clearColor(1, 1, 1, 1);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);

        this.programs = WebGL.buildPrograms(gl, shaders);
    }

    render(scene, camera, skybox, lights) {
        const gl = this.gl;

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const { program, uniforms } = this.programs.burley;
        gl.useProgram(program);

        const viewMatrix = getGlobalViewMatrix(camera);
        const projectionMatrix = getProjectionMatrix(camera);

        gl.uniformMatrix4fv(uniforms.uViewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(uniforms.uProjectionMatrix, false, projectionMatrix);

        gl.uniform3fv(uniforms.uCameraPosition, mat4.getTranslation(vec3.create(), getGlobalModelMatrix(camera)));

        const MAX_LIGHTS = 50;
        this.addLight(lights, MAX_LIGHTS);

        this.renderNode(scene);
        this.renderSkybox(skybox, camera);
    }

    renderNode(node, mvpMatrix = mat4.create()) {
        const gl = this.gl;

        const { uniforms } = this.programs.burley;
        // const { uniforms } = this.programs.envmap;

        const localMatrix = getLocalModelMatrix(node);
        mvpMatrix = mat4.mul(mat4.create(), mvpMatrix, localMatrix);
        gl.uniformMatrix4fv(uniforms.uModelMatrix, false, mvpMatrix);
        // gl.uniformMatrix4fv(uniforms.uModelViewProjection, false, mvpMatrix);

        const models = getModels(node);
        for (const model of models) {
            for (const primitive of model.primitives) {
                this.renderPrimitive(primitive);
            }
        }

        for (const child of node.children) {
            this.renderNode(child, mvpMatrix);
        }
    }

    renderPrimitive(primitive) {
        const gl = this.gl;

        const { uniforms } = this.programs.burley;
        // const { program, uniforms } = this.programs.envmap;

        const vao = this.prepareMesh(primitive.mesh);
        gl.bindVertexArray(vao);

        const material = primitive.material;

        const baseTexture = this.prepareImage(material.baseTexture.image);
        const baseSampler = this.prepareSampler(material.baseTexture.sampler);
        const metalnessTexture = this.prepareImage(material.metalnessTexture.image);
        const metalnessSampler = this.prepareSampler(material.metalnessTexture.sampler);
        const roughnessTexture = this.prepareImage(material.roughnessTexture.image);
        const roughnessSampler = this.prepareSampler(material.roughnessTexture.sampler);

        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(uniforms.uBaseTexture, 0);
        gl.bindTexture(gl.TEXTURE_2D, baseTexture);
        gl.bindSampler(0, baseSampler);

        gl.activeTexture(gl.TEXTURE1);
        gl.uniform1i(uniforms.uMetalnessTexture, 1);
        gl.bindTexture(gl.TEXTURE_2D, metalnessTexture);
        gl.bindSampler(1, metalnessSampler);

        gl.activeTexture(gl.TEXTURE2);
        gl.uniform1i(uniforms.uRoughnessTexture, 2);
        gl.bindTexture(gl.TEXTURE_2D, roughnessTexture);
        gl.bindSampler(2, roughnessSampler);

        gl.uniform3fv(uniforms.uBaseFactor, material.baseFactor.slice(0, 3));
        gl.uniform1f(uniforms.uMetalnessFactor, material.metalnessFactor);
        gl.uniform1f(uniforms.uRoughnessFactor, material.roughnessFactor);

        // gl.uniform4fv(uniforms.uBaseFactor, material.baseFactor);

        gl.drawElements(gl.TRIANGLES, primitive.mesh.indices.length, gl.UNSIGNED_INT, 0);
        // gl.bindVertexArray(null);
    }

    addLight(lights, MAX_LIGHTS) {
        const gl = this.gl;

        const { uniforms } = this.programs.burley;

        if (lights.length > MAX_LIGHTS) {
            console.error("There are more lights than the MAX_LIGHTS allowed in shadersOLD.js => burleyFragment.\nChange MAX_LIGHTS to a higher number.");
        }

        const numLights = Math.min(lights.length, MAX_LIGHTS);
        gl.uniform1i(uniforms.uNumLights, numLights);

        for (let i = 0; i < lights.length && i < numLights; ++i) {
            const lightComponent = lights[i].getComponentOfType(Light);

            gl.uniform3fv(uniforms.uLights[i].color, vec3.scale(vec3.create(), lightComponent.color, 1 / 255));
            gl.uniform3fv(uniforms.uLights[i].position, mat4.getTranslation(vec3.create(), getGlobalModelMatrix(lights[i])));
            gl.uniform3fv(uniforms.uLights[i].attenuation, lightComponent.attenuation);
            gl.uniform1f(uniforms.uLights[i].intensity, lightComponent.intensity);
        }
    }


    getSkyboxPrimitive(skybox) {
        const models = getModels(skybox);
        return models[0].primitives[0];
    }

    renderSkybox(skybox, camera) {
        const gl = this.gl;

        const { program, uniforms } = this.programs.skybox;
        gl.useProgram(program);

        const viewMatrix = getGlobalViewMatrix(camera);
        const projectionMatrix = getProjectionMatrix(camera);

        gl.uniformMatrix4fv(uniforms.uViewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(uniforms.uProjectionMatrix, false, projectionMatrix);

        const skyboxPrimitive = this.getSkyboxPrimitive(skybox);
        const skyboxMaterial = skyboxPrimitive.material;
        const skyboxTexture = this.prepareImage(skyboxMaterial.baseTexture.image);
        const skyboxSampler = this.prepareSampler(skyboxMaterial.baseTexture.sampler);

        const vao = this.prepareMesh(skyboxPrimitive.mesh);
        gl.bindVertexArray(vao);

        gl.activeTexture(gl.TEXTURE1);
        gl.uniform1i(uniforms.uEnvmap, 1);
        gl.bindTexture(gl.TEXTURE_2D, skyboxTexture);
        gl.bindSampler(1, skyboxSampler);

        gl.depthFunc(gl.LEQUAL);
        gl.disable(gl.CULL_FACE);
        gl.drawElements(gl.TRIANGLES, skyboxPrimitive.mesh.indices.length, gl.UNSIGNED_INT, 0);
        gl.enable(gl.CULL_FACE);
        gl.depthFunc(gl.LESS);
    }

}
