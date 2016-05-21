
include("deferred_renderer/common.glsl");

uniform sampler2D diffuse_texture;


vec3 brdf_function(brdf_input params) {
  vec2 tcoords = normalize_screen_coord(gl_FragCoord.xy);
  vec3 diffuse = texture2D(diffuse_texture, tcoords).rgb;

  float irradiance = params.occlusion * params.incidence_angle * params.intensity * params.falloff;
  return diffuse * params.color * irradiance;
}
