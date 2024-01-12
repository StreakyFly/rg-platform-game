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

import {Light} from "../../../game/scripts/Light.js";

import { shaders } from './shaders.js';

export class Renderer extends BaseRenderer {

    constructor(gl) {
        super(gl);

        gl.clearColor(0.01, 0, 0.05, 1);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);

        gl.getExtension('EXT_color_buffer_float');
        gl.getExtension('OES_texture_float_linear');

        this.programs = WebGL.buildPrograms(gl, shaders);

        this.MAX_LIGHTS = 50;

        this.emissionStrength = 10;
        this.preExposure = 1;
        this.postExposure = 1;
        this.gamma = 2.2;

        this.bloomThreshold = 1.5;
        this.bloomKnee = 0.9;
        this.bloomIntensity = 0.7;
        this.bloomBuffers = [];

        this.createGeometryBuffer();
    }

    resize(width, height) {
        this.createGeometryBuffer();
        this.createBloomBuffers();
    }

    render(scene, camera, skybox, lights) {
        this.renderGeometry(scene, camera, lights);
        this.renderBright();
        this.renderBloom();
        this.renderToCanvas();
    }

    renderGeometry(scene, camera, lights) {
        const gl = this.gl;

        const size = {
            width: gl.drawingBufferWidth,
            height: gl.drawingBufferHeight,
        };

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.geometryBuffer.framebuffer);
        gl.viewport(0, 0, size.width, size.height);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const { program, uniforms } = this.programs.magic;
        gl.useProgram(program);

        const viewMatrix = getGlobalViewMatrix(camera);
        const projectionMatrix = getProjectionMatrix(camera);

        this.setLightUniforms(lights, uniforms);

        gl.uniformMatrix4fv(uniforms.uViewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(uniforms.uProjectionMatrix, false, projectionMatrix);

        gl.uniform1f(uniforms.uEmissionStrength, this.emissionStrength);
        gl.uniform1f(uniforms.uExposure, this.preExposure);

        for (const node of scene.children) {
            this.renderNode(node);
        }
    }

    setLightUniforms(lights, uniforms) {
        const gl = this.gl;

        // const { program, uniforms } = this.programs.magic;
        // gl.useProgram(program);

        if (lights.length > this.MAX_LIGHTS) {
            console.error("There are more lights than the MAX_LIGHTS allowed in shadersOLD.js => burleyFragment.\nChange MAX_LIGHTS to a higher number.");
        }

        const numLights = Math.min(lights.length, this.MAX_LIGHTS);
        gl.uniform1i(uniforms.uNumLights, numLights);

        for (let i = 0; i < lights.length && i < numLights; ++i) {
            const lightComponent = lights[i].getComponentOfType(Light);

            gl.uniform3fv(uniforms.uLights[i].color, vec3.scale(vec3.create(), lightComponent.color, 1 / 255));
            gl.uniform3fv(uniforms.uLights[i].position, mat4.getTranslation(vec3.create(), getGlobalModelMatrix(lights[i])));
            gl.uniform3fv(uniforms.uLights[i].attenuation, lightComponent.attenuation);
            gl.uniform1f(uniforms.uLights[i].intensity, lightComponent.intensity);
        }
    }

    renderBright() {
        const gl = this.gl;

        const { framebuffer, size } = this.bloomBuffers[0];
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.viewport(0, 0, size.width, size.height);

        const { program, uniforms } = this.programs.renderBright;
        gl.useProgram(program);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.geometryBuffer.colorTexture);
        gl.uniform1i(uniforms.uColor, 0);
        gl.bindSampler(0, null);

        gl.uniform1f(uniforms.uBloomThreshold, this.bloomThreshold);
        gl.uniform1f(uniforms.uBloomKnee, this.bloomKnee);

        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    renderBloom() {
        const gl = this.gl;

        const levels = this.bloomBuffers.length;

        for (let i = 1; i < levels; i++) {
            const { framebuffer, size } = this.bloomBuffers[i];

            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.viewport(0, 0, size.width, size.height);

            const { program, uniforms } = this.programs.downsampleAndBlur;
            gl.useProgram(program);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.bloomBuffers[i - 1].texture);
            gl.uniform1i(uniforms.uColor, 0);
            gl.bindSampler(0, null);

            gl.drawArrays(gl.TRIANGLES, 0, 3);
        }

        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ZERO);

        for (let i = levels - 2; i >= 0; i--) {
            const { framebuffer, size } = this.bloomBuffers[i];

            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.viewport(0, 0, size.width, size.height);

            const { program, uniforms } = this.programs.upsampleAndCombine;
            gl.useProgram(program);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.bloomBuffers[i + 1].texture);
            gl.uniform1i(uniforms.uColor, 0);
            gl.bindSampler(0, null);

            gl.uniform1f(uniforms.uBloomIntensity, this.bloomIntensity);

            gl.drawArrays(gl.TRIANGLES, 0, 3);
        }

        gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.ZERO);

        const { framebuffer, size } = this.bloomBuffers[0];

        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.viewport(0, 0, size.width, size.height);

        const { program, uniforms } = this.programs.upsampleAndCombine;
        gl.useProgram(program);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.geometryBuffer.colorTexture);
        gl.uniform1i(uniforms.uColor, 0);
        gl.bindSampler(0, null);

        gl.uniform1f(uniforms.uBloomIntensity, 1);

        gl.drawArrays(gl.TRIANGLES, 0, 3);

        gl.disable(gl.BLEND);
    }

    renderToCanvas() {
        const gl = this.gl;

        const size = {
            width: gl.drawingBufferWidth,
            height: gl.drawingBufferHeight,
        };

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, size.width, size.height);

        const { program, uniforms } = this.programs.renderToCanvas;
        gl.useProgram(program);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.bloomBuffers[0].texture);
        gl.uniform1i(uniforms.uColor, 0);
        gl.bindSampler(0, null);

        gl.uniform1f(uniforms.uExposure, this.postExposure);
        gl.uniform1f(uniforms.uGamma, this.gamma);

        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    renderNode(node, modelMatrix = mat4.create()) {
        const gl = this.gl;

        const { uniforms } = this.programs.magic;

        const localMatrix = getLocalModelMatrix(node);
        modelMatrix = mat4.mul(mat4.create(), modelMatrix, localMatrix);
        gl.uniformMatrix4fv(uniforms.uModelMatrix, false, modelMatrix);

        const models = getModels(node);
        for (const model of models) {
            for (const primitive of model.primitives) {
                this.renderPrimitive(primitive);
            }
        }

        for (const child of node.children) {
            this.renderNode(child, modelMatrix);
        }
    }

    renderPrimitive(primitive) {
        const gl = this.gl;

        const { uniforms } = this.programs.magic;

        const vao = this.prepareMesh(primitive.mesh);
        gl.bindVertexArray(vao);

        const material = primitive.material;

        const baseTexture = this.prepareImage(material.baseTexture.image);
        const baseSampler = this.prepareSampler(material.baseTexture.sampler);
        const metalnessTexture = this.prepareImage(material.metalnessTexture.image);
        const metalnessSampler = this.prepareSampler(material.metalnessTexture.sampler);
        const roughnessTexture = this.prepareImage(material.roughnessTexture.image);
        const roughnessSampler = this.prepareSampler(material.roughnessTexture.sampler);
        const emissionTexture = this.prepareImage(material.emissionTexture.image);
        const emissionSampler = this.prepareSampler(material.emissionTexture.sampler);

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

        gl.activeTexture(gl.TEXTURE3);
        gl.uniform1i(uniforms.uEmissionTexture, 3);
        gl.bindTexture(gl.TEXTURE_2D, emissionTexture);
        gl.bindSampler(3, emissionSampler);

        gl.uniform3fv(uniforms.uBaseFactor, material.baseFactor.slice(0, 3));
        gl.uniform1f(uniforms.uMetalnessFactor, material.metalnessFactor);
        gl.uniform1f(uniforms.uRoughnessFactor, material.roughnessFactor);

        gl.drawElements(gl.TRIANGLES, primitive.mesh.indices.length, gl.UNSIGNED_INT, 0);
    }


    createGeometryBuffer() {
        const gl = this.gl;

        if (this.geometryBuffer) {
            gl.deleteFramebuffer(this.geometryBuffer.framebuffer);
            gl.deleteRenderbuffer(this.geometryBuffer.depthBuffer);
            gl.deleteTexture(this.geometryBuffer.colorTexture);
        }

        const size = {
            width: gl.drawingBufferWidth,
            height: gl.drawingBufferHeight,
        };

        const sampling = {
            min: gl.LINEAR,
            mag: gl.LINEAR,
            wrapS: gl.CLAMP_TO_EDGE,
            wrapT: gl.CLAMP_TO_EDGE,
        };

        const depthBuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH24_STENCIL8, size.width, size.height);

        const colorTexture = WebGL.createTexture(gl, {
            ...size,
            ...sampling,
            format: gl.RGBA,
            iformat: gl.RGBA16F,
            type: gl.FLOAT,
        });

        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTexture, 0);

        gl.drawBuffers([
            gl.COLOR_ATTACHMENT0,
        ]);

        this.geometryBuffer = {
            framebuffer,
            depthBuffer,
            colorTexture,
        };
    }

    createBloomBuffers() {
        const gl = this.gl;

        for (const buffer of this.bloomBuffers) {
            gl.deleteFramebuffer(buffer.framebuffer);
            gl.deleteTexture(buffer.texture);
        }

        const sampling = {
            min: gl.LINEAR,
            mag: gl.LINEAR,
            wrapS: gl.CLAMP_TO_EDGE,
            wrapT: gl.CLAMP_TO_EDGE,
        };

        const format = {
            format: gl.RGBA,
            iformat: gl.RGBA16F,
            type: gl.FLOAT,
        };

        function numberOfLevels(width, height) {
            return Math.ceil(Math.log2(Math.max(width, height)));
        }

        function sizeAtLevel(level, baseWidth, baseHeight) {
            return {
                width: Math.max(1, Math.floor(baseWidth / (2 ** level))),
                height: Math.max(1, Math.floor(baseHeight / (2 ** level))),
            };
        }

        const levels = numberOfLevels(gl.drawingBufferWidth, gl.drawingBufferHeight);
        this.bloomBuffers = new Array(levels).fill(0).map((_, level) => {
            const size = sizeAtLevel(level, gl.drawingBufferWidth, gl.drawingBufferHeight);

            const texture = WebGL.createTexture(gl, {
                ...size,
                ...sampling,
                ...format,
            });

            const framebuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

            return {
                texture,
                framebuffer,
                size,
            };
        });
    }

}
