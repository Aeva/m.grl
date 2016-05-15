
include("deferred_renderer/common.glsl");


void shadow_buffers() {
  float depth = linear_depth;
  gl_FragData[0] = vec4(depth, depth, depth, 1.0);
}
