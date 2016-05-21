
include("deferred_renderer/common.glsl");

uniform sampler2D diffuse_texture;
uniform vec3 ambient_color;
uniform float ambient_intensity;

vec3 brdf_function(brdf_input params) {
  vec2 tcoords = normalize_screen_coord(gl_FragCoord.xy);
  vec3 base_color = texture2D(diffuse_texture, tcoords).rgb;

  float incidence = dot(params.normal_vector, params.light_vector);
  vec3 reflection = 2.0 * params.normal_vector * incidence - params.light_vector;

  float intensity = params.intensity * params.falloff;

  vec3 ambient = ambient_color * base_color * ambient_intensity;
  vec3 diffuse = params.color * incidence * base_color * intensity * params.occlusion;
  vec3 specular = params.color * pow(max(dot(reflection, params.view_vector), 0.0), intensity) * params.occlusion;

  return ambient + diffuse + specular;
}
