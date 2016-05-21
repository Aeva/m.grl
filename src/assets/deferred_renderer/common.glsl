varying vec3 local_position;
varying vec3 local_normal;
varying vec2 local_tcoords;
varying vec3 world_position;
varying vec3 world_normal;
varying vec3 screen_position;
varying float linear_depth;


struct brdf_input {
  vec3 view_vector;
  vec3 light_vector;
  vec3 normal_vector;
  vec3 color;
  float falloff;
  float intensity;
  float occlusion;
};


struct brdf_output {
  vec3 color;
  float intensity;
};
