
include("deferred_renderer/common.glsl");
include("normalize_screen_coord.glsl");

uniform sampler2D diffuse_texture;
uniform sampler2D light_texture;
uniform float exposure;


void finishing_pass() {
  // combine the lighting and diffuse passes and display
  vec2 tcoords = normalize_screen_coord(gl_FragCoord.xy);
  vec4 diffuse = texture2D(diffuse_texture, tcoords);
  if (diffuse.w == -1.0) {
    discard;
  }
  vec3 lightmap = texture2D(light_texture, tcoords).rgb;
  gl_FragData[0] = vec4(lightmap / exposure, 1.0);
}
