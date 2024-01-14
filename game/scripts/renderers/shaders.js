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


const burleyVertex = `#version 300 es
layout (location = 0) in vec3 aPosition;
layout (location = 1) in vec2 aTexCoord;
layout (location = 2) in vec3 aNormal;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

out vec3 vPosition;
out vec3 vNormal;
out vec2 vTexCoord;

void main() {
    vPosition = (uModelMatrix * vec4(aPosition, 1)).xyz;
    vNormal = mat3(uModelMatrix) * aNormal;
    vTexCoord = aTexCoord;

    gl_Position = uProjectionMatrix * (uViewMatrix * vec4(vPosition, 1));
}
`;

const burleyFragment = `#version 300 es
precision mediump float;
precision mediump sampler2D;

uniform sampler2D uBaseTexture;
uniform sampler2D uMetalnessTexture;
uniform sampler2D uRoughnessTexture;

uniform vec3 uBaseFactor;
uniform float uMetalnessFactor;
uniform float uRoughnessFactor;

uniform vec3 uCameraPosition;

struct Light {
    vec3 position;
    vec3 attenuation;
    vec3 color;
    float intensity;
};

#define MAX_LIGHTS 50
uniform int uNumLights;
uniform Light uLights[MAX_LIGHTS];

in vec3 vPosition;
in vec3 vNormal;
in vec2 vTexCoord;

out vec4 oColor;

vec3 F_Schlick(vec3 f0, vec3 f90, float VdotH) {
    return f0 + (f90 - f0) * pow(clamp(1.0 - VdotH, 0.0, 1.0), 5.0);
}

float F_Schlick(float f0, float f90, float VdotH) {
    return f0 + (f90 - f0) * pow(clamp(1.0 - VdotH, 0.0, 1.0), 5.0);
}

float V_GGX(float NdotL, float NdotV, float roughness) {
    float roughnessSq = roughness * roughness;

    float GGXV = NdotV + sqrt(NdotV * NdotV * (1.0 - roughnessSq) + roughnessSq);
    float GGXL = NdotL + sqrt(NdotL * NdotL * (1.0 - roughnessSq) + roughnessSq);

    return 1.0 / (GGXV * GGXL);
}

float D_GGX(float NdotH, float roughness) {
    const float PI = 3.14159265358979;
    float roughnessSq = roughness * roughness;
    float f = (NdotH * NdotH) * (roughnessSq - 1.0) + 1.0;
    return roughnessSq / (PI * f * f);
}

float Fd_Lambert() {
    const float PI = 3.14159265358979;
    return 1.0 / PI;
}

float Fd_Burley(float NdotV, float NdotL, float VdotH, float roughness) {
    const float PI = 3.14159265358979;
    float f90 = 0.5 + 2.0 * roughness * VdotH * VdotH;
    float lightScatter = F_Schlick(1.0, f90, NdotL);
    float viewScatter = F_Schlick(1.0, f90, NdotV);
    return lightScatter * viewScatter * (1.0 / PI);
}

vec3 BRDF_diffuse(vec3 f0, vec3 f90, vec3 diffuseColor, float VdotH) {
    const float PI = 3.14159265358979;
    return (1.0 - F_Schlick(f0, f90, VdotH)) * (diffuseColor / PI);
}

vec3 BRDF_specular(vec3 f0, vec3 f90, float roughness, float VdotH, float NdotL, float NdotV, float NdotH) {
    vec3 F = F_Schlick(f0, f90, VdotH);
    float Vis = V_GGX(NdotL, NdotV, roughness);
    float D = D_GGX(NdotH, roughness);

    return F * Vis * D;
}

vec3 linearTosRGB(vec3 color) {
    const float gamma = 2.2;
    return pow(color, vec3(1.0 / gamma));
}

vec3 sRGBToLinear(vec3 color) {
    const float gamma = 2.2;
    return pow(color, vec3(gamma));
}

vec3 getLightIntensity(Light light, vec3 surfacePosition) {
    float d = distance(light.position, surfacePosition);
    float attenuation = dot(light.attenuation, vec3(1, d, d * d));
    return light.color * light.intensity / attenuation;
}

void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(uCameraPosition - vPosition);
    vec3 H = normalize(V + normalize(uLights[0].position - vPosition));

    vec3 finalColor = vec3(0.0);

    for (int i = 0; i < uNumLights; ++i) {
        vec3 L = normalize(uLights[i].position - vPosition);
        float NdotL = clamp(dot(N, L), 0.0, 1.0);
        float NdotV = clamp(dot(N, V), 0.0, 1.0);
        float NdotH = clamp(dot(N, H), 0.0, 1.0);
        float VdotH = clamp(dot(V, H), 0.0, 1.0);

        vec3 baseColor = texture(uBaseTexture, vTexCoord).rgb * uBaseFactor;
        float metalness = texture(uMetalnessTexture, vTexCoord).r * uMetalnessFactor;
        float perceptualRoughness = texture(uRoughnessTexture, vTexCoord).r * uRoughnessFactor;
        float roughness = perceptualRoughness * perceptualRoughness;

        vec3 f0 = mix(vec3(0.04), baseColor, metalness);
        vec3 f90 = vec3(1);
        vec3 diffuseColor = mix(baseColor, vec3(0), metalness);

        vec3 lightIntensity = getLightIntensity(uLights[i], vPosition);

        vec3 diffuse = lightIntensity * NdotL * BRDF_diffuse(f0, f90, diffuseColor, VdotH);
        vec3 specular = lightIntensity * NdotL * BRDF_specular(f0, f90, roughness, VdotH, NdotL, NdotV, NdotH);

        finalColor += diffuse + specular;
    }

    oColor = vec4(linearTosRGB(finalColor), 1);
}
`;


const renderGeometryBufferVertex = `#version 300 es
layout (location = 0) in vec4 aPosition;
layout (location = 1) in vec2 aTexCoord;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

out vec2 vTexCoord;

void main() {
    vTexCoord = aTexCoord;
    gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aPosition;
}
`;

const renderGeometryBufferFragment = `#version 300 es
precision mediump float;
precision mediump sampler2D;

uniform sampler2D uBaseTexture;
uniform sampler2D uEmissionTexture;

uniform float uEmissionStrength;
uniform float uExposure;

in vec2 vTexCoord;

out vec4 oColor;

void main() {
    vec3 diffuse = pow(texture(uBaseTexture, vTexCoord).rgb, vec3(2.2));
    vec3 emission = pow(texture(uEmissionTexture, vTexCoord).rgb, vec3(2.2));

    vec3 color = diffuse + uEmissionStrength * emission;
    oColor = vec4(color * uExposure, 1);
}
`;

const renderBrightVertex = `#version 300 es

const vec2 vertices[] = vec2[](
    vec2(-1, -1),
    vec2( 3, -1),
    vec2(-1,  3)
);

out vec2 vPosition;

void main() {
    vec2 position = vertices[gl_VertexID];
    vPosition = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0, 1);
}
`;

const renderBrightFragment = `#version 300 es
precision mediump float;
precision mediump sampler2D;

uniform sampler2D uColor;
uniform float uBloomThreshold;
uniform float uBloomKnee;

in vec2 vPosition;

out vec4 oColor;

void main() {
    vec4 color = texture(uColor, vPosition);
    float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));

    const float epsilon = 1e-4;
    float knee = uBloomThreshold * uBloomKnee;
    float source = brightness - uBloomThreshold + knee;
    source = clamp(source, 0.0, 2.0 * knee);
    source = source * source / (4.0 * knee + epsilon);
    float weight = max(brightness - uBloomThreshold, source) / max(brightness, epsilon);

    oColor = vec4(color.rgb * weight, 1);
}
`;

const downsampleAndBlurVertex = `#version 300 es

const vec2 vertices[] = vec2[](
    vec2(-1, -1),
    vec2( 3, -1),
    vec2(-1,  3)
);

out vec2 vPosition;

void main() {
    vec2 position = vertices[gl_VertexID];
    vPosition = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0, 1);
}
`;

const downsampleAndBlurFragment = `#version 300 es
precision mediump float;
precision mediump sampler2D;

uniform sampler2D uColor;

in vec2 vPosition;

out vec4 oColor;

vec4 sampleTexture(sampler2D sampler, vec2 position) {
    vec2 texelSize = vec2(1) / vec2(textureSize(sampler, 0));
    vec4 offset = texelSize.xyxy * vec2(-1, 1).xxyy;
    return 0.25 * (
        texture(sampler, position + offset.xy) +
        texture(sampler, position + offset.zy) +
        texture(sampler, position + offset.xw) +
        texture(sampler, position + offset.zw));
}

void main() {
    oColor = sampleTexture(uColor, vPosition);
}
`;

const upsampleAndCombineVertex = `#version 300 es

const vec2 vertices[] = vec2[](
    vec2(-1, -1),
    vec2( 3, -1),
    vec2(-1,  3)
);

out vec2 vPosition;

void main() {
    vec2 position = vertices[gl_VertexID];
    vPosition = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0, 1);
}
`;

const upsampleAndCombineFragment = `#version 300 es
precision mediump float;
precision mediump sampler2D;

uniform sampler2D uColor;
uniform float uBloomIntensity;

in vec2 vPosition;

out vec4 oColor;

void main() {
    oColor = vec4(texture(uColor, vPosition).rgb, uBloomIntensity);
}
`;

const renderToCanvasVertex = `#version 300 es
const vec2 vertices[] = vec2[](
    vec2(-1, -1),
    vec2( 3, -1),
    vec2(-1,  3)
);

out vec2 vPosition;

void main() {
    vec2 position = vertices[gl_VertexID];
    vPosition = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0, 1);
}
`;

const renderToCanvasFragment = `#version 300 es
precision mediump float;
precision mediump sampler2D;

uniform sampler2D uColor;
uniform float uExposure;
uniform float uGamma;

in vec2 vPosition;

out vec4 oColor;

void main() {
    vec4 color = texture(uColor, vPosition) * uExposure;
    oColor = vec4(pow(color.rgb, vec3(1.0 / uGamma)), 1);
}
`;


const combineTexturesVertex = `#version 300 es
const vec2 vertices[] = vec2[](
    vec2(-1, -1),
    vec2( 3, -1),
    vec2(-1,  3)
);

out vec2 vPosition;

void main() {
    vec2 position = vertices[gl_VertexID];
    vPosition = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0, 1);
}
`;

const combineTexturesFragment = `#version 300 es
precision mediump float;
precision mediump sampler2D;

uniform sampler2D uBloomTexture;
uniform sampler2D uLightsTexture;
uniform float uExposure;
uniform float uGamma;
uniform float uContrast;

in vec2 vPosition;

out vec4 oColor;

void main() {
    vec4 bloomColor = texture(uBloomTexture, vPosition);
    vec4 lightsColor = texture(uLightsTexture, vPosition);

    // vec4 combinedColor = abs(bloomColor - lightsColor);  // looks interestingly cool
    // vec4 combinedColor = (bloomColor * 0.5 + lightsColor * 0.5) + 0.1;
    vec4 combinedColor = mix(bloomColor, lightsColor, 0.5);
    
    combinedColor.rgb = pow(combinedColor.rgb * uExposure, vec3(1.0 / uGamma));
    combinedColor.rgb = ((combinedColor.rgb - 0.5) * uContrast) + 0.5;  // change contrast

    oColor = vec4(combinedColor.rgb, 1.0);
}
`;


export const shaders = {
    skybox: {
        vertex: skyboxVertex,
        fragment: skyboxFragment,
    },
    envmap: {
        vertex: envmapVertex,
        fragment: envmapFragment,
    },

    // light shader
    burley: {
        vertex: burleyVertex,
        fragment: burleyFragment
    },

    // bloom shaders
    renderGeometryBuffer: {
        vertex: renderGeometryBufferVertex,
        fragment: renderGeometryBufferFragment,
    },
    renderBright: {
        vertex: renderBrightVertex,
        fragment: renderBrightFragment,
    },
    downsampleAndBlur: {
        vertex: downsampleAndBlurVertex,
        fragment: downsampleAndBlurFragment,
    },
    upsampleAndCombine: {
        vertex: upsampleAndCombineVertex,
        fragment: upsampleAndCombineFragment,
    },
    renderToCanvas: {
        vertex: renderToCanvasVertex,
        fragment: renderToCanvasFragment,
    },

    // combine bloom and light textures
    combineTextures: {
        vertex: combineTexturesVertex,
        fragment: combineTexturesFragment,
    }
};
