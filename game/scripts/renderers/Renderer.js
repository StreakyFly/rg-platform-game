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

import { Light } from "../entities/Light.js";

import { shaders } from './shaders.js';


export class Renderer extends BaseRenderer {

    constructor(gl) {
        super(gl);
        gl.clearColor(0, 0, 0, 1);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);

        gl.getExtension('EXT_color_buffer_float');
        gl.getExtension('OES_texture_float_linear');

        this.programs = WebGL.buildPrograms(gl, shaders);

        this.MAX_LIGHTS = 50;

        this.emissionStrength = 10;
        this.preExposure = 1;
        this.postExposure = 1;
        this.gamma = 1;

        this.bloomThreshold = 1.5;
        this.bloomKnee = 0.9;
        this.bloomIntensity = 0.7;
        this.bloomBuffers = [];

        this.contrast = 1.1;

        this.createGeometryBuffer();
        this.createLightsBuffer();
    }

    resize(width, height) {
        this.createGeometryBuffer();
        this.createBloomBuffers();
        this.createLightsBuffer();
    }

    renderFinal() {
        const gl = this.gl;

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

        const { program, uniforms } = this.programs.combineTextures;
        gl.useProgram(program);

        // bloom texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.bloomBuffers[0].texture);
        gl.uniform1i(uniforms.uColor, 0);
        gl.bindSampler(0, null);

        // lights texture
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.lightsFramebuffer.colorTexture);
        gl.uniform1i(uniforms.uLightsTexture, 1);
        gl.bindSampler(1, null);

        gl.uniform1f(uniforms.uExposure, this.postExposure);
        gl.uniform1f(uniforms.uGamma, this.gamma);
        gl.uniform1f(uniforms.uContrast, this.contrast);

        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    render(scene, camera, skybox, lights) {
        this.renderGeometry(scene, camera);
        this.renderBright();
        // this.renderToCanvas();
        this.renderBloom();
        this.renderSceneWithLights(scene, camera, skybox, lights);
        this.renderFinal();
    }

    renderGeometry(scene, camera) {
        const gl = this.gl;

        const size = {
            width: gl.drawingBufferWidth,
            height: gl.drawingBufferHeight,
        };

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.geometryBuffer.framebuffer);
        gl.viewport(0, 0, size.width, size.height);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const { program, uniforms } = this.programs.renderGeometryBuffer;
        gl.useProgram(program);

        const viewMatrix = getGlobalViewMatrix(camera);
        const projectionMatrix = getProjectionMatrix(camera);

        gl.uniformMatrix4fv(uniforms.uViewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(uniforms.uProjectionMatrix, false, projectionMatrix);

        gl.uniform1f(uniforms.uEmissionStrength, this.emissionStrength);
        gl.uniform1f(uniforms.uExposure, this.preExposure);

        for (const node of scene.children) {
            this.renderNode(node);
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

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

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

        const { uniforms } = this.programs.renderGeometryBuffer;

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

        const { uniforms } = this.programs.renderGeometryBuffer;

        const vao = this.prepareMesh(primitive.mesh);
        gl.bindVertexArray(vao);

        const material = primitive.material;
        gl.uniform4fv(uniforms.uBaseFactor, material.baseFactor);

        const baseTexture = this.prepareImage(material.baseTexture.image);
        const baseSampler = this.prepareSampler(material.baseTexture.sampler);
        const emissionTexture = this.prepareImage(material.emissionTexture.image);
        const emissionSampler = this.prepareSampler(material.emissionTexture.sampler);

        gl.activeTexture(gl.TEXTURE1);
        gl.uniform1i(uniforms.uEmissionTexture, 1);
        gl.bindTexture(gl.TEXTURE_2D, emissionTexture);
        gl.bindSampler(1, emissionSampler);

        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(uniforms.uBaseTexture, 0);
        gl.bindTexture(gl.TEXTURE_2D, baseTexture);
        gl.bindSampler(0, baseSampler);

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

    renderSceneWithLights(scene, camera, skybox, lights) {
        const gl = this.gl;

        // Bind the lights framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightsFramebuffer.framebuffer);

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const { program, uniforms } = this.programs.burley;
        gl.useProgram(program);

        const viewMatrix = getGlobalViewMatrix(camera);
        const projectionMatrix = getProjectionMatrix(camera);

        gl.uniformMatrix4fv(uniforms.uViewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(uniforms.uProjectionMatrix, false, projectionMatrix);

        gl.uniform3fv(uniforms.uCameraPosition, mat4.getTranslation(vec3.create(), getGlobalModelMatrix(camera)));

        this.addLight(lights, this.MAX_LIGHTS);

        this.renderNodeForLight(scene);
        this.renderSkybox(skybox, camera)

        // Unbind the framebuffer to stop rendering to it
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    createLightsBuffer() {
        const gl = this.gl;

        // Define texture size and format
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
        const format = {
            format: gl.RGBA,
            iformat: gl.RGBA16F,
            type: gl.FLOAT,
        };

        // Create and bind the depth buffer
        const depthBuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH24_STENCIL8, size.width, size.height);

        // Create and setup the texture
        const colorTexture = WebGL.createTexture(gl, {
            ...size,
            ...sampling,
            ...format,
        });

        // Create and set up the framebuffer
        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTexture, 0);

        // Store the framebuffer and texture in the renderer
        this.lightsFramebuffer = {
            framebuffer,
            depthBuffer,
            colorTexture,
        };
    }

    renderNodeForLight(node, mvpMatrix = mat4.create()) {
        const gl = this.gl;

        const { uniforms } = this.programs.burley;

        const localMatrix = getLocalModelMatrix(node);
        mvpMatrix = mat4.mul(mat4.create(), mvpMatrix, localMatrix);
        gl.uniformMatrix4fv(uniforms.uModelMatrix, false, mvpMatrix);

        const models = getModels(node);
        for (const model of models) {
            for (const primitive of model.primitives) {
                this.renderPrimitiveForLight(primitive);
            }
        }

        for (const child of node.children) {
            this.renderNodeForLight(child, mvpMatrix);
        }
    }

    renderPrimitiveForLight(primitive) {
        const gl = this.gl;

        const { uniforms } = this.programs.burley;

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

        gl.drawElements(gl.TRIANGLES, primitive.mesh.indices.length, gl.UNSIGNED_INT, 0);
        gl.bindVertexArray(null);
    }

    addLight(lights, MAX_LIGHTS) {
        const gl = this.gl;

        const { uniforms } = this.programs.burley;

        if (lights.length > MAX_LIGHTS) {
            console.warn("There are more lights than the MAX_LIGHTS allowed in shadersOLD.js => burleyFragment.\nChange MAX_LIGHTS to a higher number.");
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
