
include("normalize_screen_coord.glsl");
include("deferred_renderer/common.glsl");
include("deferred_renderer/simple_brdf.glsl");

uniform sampler2D spatial_texture;
uniform sampler2D normal_texture;

uniform int light_type;

uniform float light_intensity;
uniform mat4 light_projection_matrix;
uniform mat4 light_view_matrix;
uniform vec3 light_world_position;
uniform vec3 light_color;
uniform vec3 camera_position;
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


vec3 spotlight_illumination(vec3 world_position, vec3 world_normal) {
  // illuminated tells us if the pixel would be in the current light's
  // shadow or not.
  float illuminated = spotlight_shadows(world_position);
  brdf_input params;

  params.view_vector = normalize(camera_position - world_position);
  params.light_vector = normalize(light_world_position - world_position);
  params.normal_vector = normalize(world_normal);
  params.color = light_color;
  params.intensity = light_intensity;
  params.falloff = 1.0/pow(distance(world_normal, params.light_vector), 2.0);
  params.occlusion = illuminated;

  return brdf_function(params);
}


vec3 pointlight_illumination(vec3 world_position, vec3 world_normal) {
  // illuminated tells us if the pixel would be in the current light's
  // shadow or not.
  float illuminated = 1.0;
  brdf_input params;

  params.view_vector = normalize(camera_position - world_position);
  params.light_vector = normalize(light_world_position - world_position);
  params.normal_vector = normalize(world_normal);
  params.color = light_color;
  params.intensity = light_intensity;
  params.falloff = 1.0/pow(distance(world_normal, params.light_vector), 2.0);
  params.occlusion = illuminated;

  return brdf_function(params);
}


vec3 sunlight_illumination(vec3 world_normal) {
  // illuminated tells us if the pixel would be in the current light's
  // shadow or not.
  float illuminated = 1.0;
  brdf_input params;

  params.view_vector = normalize(camera_position - world_position);
  params.light_vector = normalize(light_world_position);
  params.normal_vector = normalize(world_normal);
  params.color = light_color;
  params.intensity = light_intensity;
  params.falloff = 1.0;
  params.occlusion = illuminated;

  return brdf_function(params);
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
    vec3 irradiance;
    if (light_type == 0) {
      irradiance = spotlight_illumination(space.xyz, normal);
    }
    else if (light_type == 1) {
      irradiance = pointlight_illumination(space.xyz, normal);
    }
    else if (light_type == 2) {
      irradiance = sunlight_illumination(normal);
    }
    gl_FragData[0] = vec4(irradiance, 1.0);
  }
}
