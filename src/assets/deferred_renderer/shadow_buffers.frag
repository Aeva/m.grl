
include("deferred_renderer/common.glsl");
varying vec4 scatter_samples;

void shadow_buffers() {
  gl_FragData[0] = scatter_samples;
}
