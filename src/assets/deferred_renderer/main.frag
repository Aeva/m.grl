#extension GL_EXT_draw_buffers : require

include("deferred_renderer/geometry_buffers.frag");
include("deferred_renderer/shadow_buffers.frag");
include("deferred_renderer/lighting_passes.frag");
include("deferred_renderer/finishing_pass.frag");

uniform int shader_pass;


void main(void) {
  if (shader_pass == 0) {
    // The gbuffers pass is called once from the camera's perspective
    // to populate the geometry buffers.
    gbuffers_main();
  }
  else if (shader_pass == 1) {
    // The shadow buffers pass is called many times, at least once per
    // each light that casts a shadow.  The results will be used in
    // the lighting passe.
    shadow_buffers();
  }
  else if (shader_pass == 2) {
    // The lighting pass is called at least once per light.  The
    // lighting passes are screenspace passes, and utilize information
    // in some of the gbuffers to accumulate a lightmap.
    lighting_pass();
  }
  else if (shader_pass == 3) {
    // The finishing pass is called once per frame, and the result from
    // the lighting passes is composited with the diffuse gbuffer.
    finishing_pass();
  }
}
