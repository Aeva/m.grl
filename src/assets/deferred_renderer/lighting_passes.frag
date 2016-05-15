
include("deferred_renderer/common.glsl");
// test

include("normalize_screen_coord.glsl");

uniform sampler2D spatial_texture;
uniform sampler2D normal_texture;

uniform int light_type;

uniform mat4 light_projection_matrix;
uniform mat4 light_view_matrix;
uniform vec3 light_world_position;
uniform bool cast_shadows;


float spotlight_shadows(vec3 world_position) {
  // This method determines if the current fragment is occluded by the
  // current light's shadow.  A return value between 0.0 and 1.0 is
  // given.  Calculations are done in the light's view space.

  // the position of the fragment in view space
  vec3 view_position = (light_view_matrix * vec4(world_position, 1.0)).xyz;

  // apply the light's projection matrix
  vec4 light_projected = light_projection_matrix * vec4(view_position, 1.0);
  
  // determine the vector from the light source to the fragment
  vec2 light_normal = light_projected.xy/light_projected.w;
  vec2 light_uv = light_normal*0.5+0.5;

  if (light_uv.x < 0.0 || light_uv.y < 0.0 || light_uv.x > 1.0 || light_uv.y > 1.0) {
    return 0.0;
  }
  if (length(light_normal) <=1.0) {
    if (cast_shadows) {
      float bias = 0.0;
      float light_depth_1 = texture2D(light_texture, light_uv).r;
      float light_depth_2 = length(view_position);
      float illuminated = step(light_depth_2, light_depth_1 + bias);
      return illuminated;
    }
    else {
      return 1.0;
    }
  }
  else {
    return 0.0;
  }
}


float spotlight_illumination(vec3 world_position, vec3 world_normal) {
  // illuminated tells us if the pixel would be in the current light's
  // shadow or not.
  float illuminated = spotlight_shadows(world_position);

  // the light weight is calculated in world space
  vec3 light_vector = normalize(light_world_position - world_position);
  float light_weight = max(dot(world_normal, light_vector), 0.0);

  // constant for fudging
  float intensity = 0.8;
  float falloff = 1.0/pow(distance(world_normal, light_vector), 2.0);
  return illuminated * light_weight * intensity * falloff;
}


float pointlight_illumination(vec3 world_position, vec3 world_normal) {
  // illuminated tells us if the pixel would be in the current light's
  // shadow or not.
  float illuminated = 1.0;

  // the light weight is calculated in world space
  vec3 light_vector = normalize(light_world_position - world_position);
  float light_weight = max(dot(world_normal, light_vector), 0.0);

  // constant for fudging
  float intensity = 0.8;
  float falloff = 1.0/pow(distance(world_normal, light_vector), 2.0);
  return illuminated * light_weight * intensity * falloff;
}


void lighting_pass() {
  // light perspective pass
  vec2 tcoords = normalize_screen_coord(gl_FragCoord.xy);
  vec4 space = texture2D(spatial_texture, tcoords);
  vec3 normal = texture2D(normal_texture, tcoords).rgb;
  if (space.w == -1.0) {
    discard;
  }
  else {
    float light;
    if (light_type == 0) {
      light = spotlight_illumination(space.xyz, normal);
    }
    else if (light_type == 1) {
      light = pointlight_illumination(space.xyz, normal);
    }
    gl_FragData[0] = vec4(light, light, light, 1.0);
  }
}
