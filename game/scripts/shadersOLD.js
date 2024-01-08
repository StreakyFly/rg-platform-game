const skyboxVertex = `#version 300 es
layout (location = 0) in vec3 aPosition;

uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

out vec3 vPosition;

void main() {
    vPosition = aPosition;
    vec3 rotated = mat3(uViewMatrix) * aPosition;
    vec4 projected = uProjectionMatrix * vec4(rotated, 1);
    gl_Position = projected.xyww;
}
`;

const skyboxFragment = `#version 300 es
precision mediump float;

uniform mediump sampler2D uEnvmap;

in vec3 vPosition;

out vec4 oColor;

vec2 directionToTexcoord(vec3 v) {
    const float PI = 3.14159265358979;
    return vec2((atan(v.z, v.x) / PI) * 0.5 + 0.5, acos(v.y) / PI);
}

void main() {
    oColor = textureLod(uEnvmap, directionToTexcoord(normalize(vPosition)), 0.0);
}
`;

const envmapVertex = `#version 300 es

layout (location = 0) in vec4 aPosition;
layout (location = 1) in vec2 aTexCoord;

uniform mat4 uModelViewProjection;

out vec2 vTexCoord;

void main() {
    vTexCoord = aTexCoord;
    gl_Position = uModelViewProjection * aPosition;
}
`;

const envmapFragment = `#version 300 es
precision mediump float;
precision mediump sampler2D;

uniform sampler2D uBaseTexture;
uniform vec4 uBaseFactor;

in vec2 vTexCoord;

out vec4 oColor;

void main() {
    vec4 baseColor = texture(uBaseTexture, vTexCoord);
    oColor = uBaseFactor * baseColor;
}
`;

export const shadersOLD = {
    skybox: {
        vertex: skyboxVertex,
        fragment: skyboxFragment,
    },
    envmap: {
        vertex: envmapVertex,
        fragment: envmapFragment,
    },
};
