import { vec3, mat4 } from '../../../lib/gl-matrix-module.js';

import * as WebGL from '../../../common/engine/WebGL.js';

import { BaseRenderer } from '../../../common/engine/renderers/BaseRenderer.js';

import {
    getLocalModelMatrix,
    getGlobalModelMatrix,
    getGlobalViewMatrix,
    getProjectionMatrix,
    getModels,
} from '../../../common/engine/core/SceneUtils.js';

import { shaders } from './shaders.js';


export class UnlitRenderer extends BaseRenderer {

    constructor(gl) {
        super(gl);

        gl.clearColor(1, 1, 1, 1);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);

        this.programs = WebGL.buildPrograms(gl, shaders);
    }

    render(scene, camera, skybox) {
        const gl = this.gl;

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const { program, uniforms } = this.programs.envmap;
        gl.useProgram(program);

        const viewMatrix = getGlobalViewMatrix(camera);
        const projectionMatrix = getProjectionMatrix(camera);

        gl.uniformMatrix4fv(uniforms.uViewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(uniforms.uProjectionMatrix, false, projectionMatrix);
        const mvpMatrix = mat4.multiply(mat4.create(), projectionMatrix, viewMatrix);

        gl.uniform3fv(uniforms.uCameraPosition, mat4.getTranslation(vec3.create(), getGlobalModelMatrix(camera)));

        const skyboxPrimitive = this.getSkyboxPrimitive(skybox);
        const skyboxMaterial = skyboxPrimitive.material;
        const skyboxTexture = this.prepareImage(skyboxMaterial.baseTexture.image);
        const skyboxSampler = this.prepareSampler(skyboxMaterial.baseTexture.sampler);

        gl.activeTexture(gl.TEXTURE1);
        gl.uniform1i(uniforms.uEnvmap, 1);
        gl.bindTexture(gl.TEXTURE_2D, skyboxTexture);
        gl.bindSampler(1, skyboxSampler);

        this.renderNode(scene, mvpMatrix);
        this.renderSkybox(skybox, camera);
    }

    renderNode(node, mvpMatrix = mat4.create()) {
        const gl = this.gl;

        const { program, uniforms } = this.programs.envmap;

        const localMatrix = getLocalModelMatrix(node);
        mvpMatrix = mat4.mul(mat4.create(), mvpMatrix, localMatrix);
        gl.uniformMatrix4fv(uniforms.uModelViewProjection, false, mvpMatrix);

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

        const { program, uniforms } = this.programs.envmap;

        const vao = this.prepareMesh(primitive.mesh);
        gl.bindVertexArray(vao);

        const material = primitive.material;
        gl.uniform4fv(uniforms.uBaseFactor, material.baseFactor);

        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(uniforms.uBaseTexture, 0);

        const glTexture = this.prepareImage(material.baseTexture.image);
        const glSampler = this.prepareSampler(material.baseTexture.sampler);

        gl.bindTexture(gl.TEXTURE_2D, glTexture);
        gl.bindSampler(0, glSampler);

        gl.drawElements(gl.TRIANGLES, primitive.mesh.indices.length, gl.UNSIGNED_INT, 0);

        gl.bindVertexArray(null);
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
