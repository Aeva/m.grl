
// matrices
uniform mat4 world_matrix;
uniform mat4 view_matrix;
uniform mat4 projection_matrix;

// handy dandy light stuff
uniform vec3 light_direction;
varying vec3 light_weight;
varying float directional_weight;

// vertex data
attribute vec3 position;
attribute vec3 normal;
attribute vec2 tcoords;

// interpolated vertex data in various transformations
varying vec3 local_position;
varying vec3 local_normal;
varying vec2 local_tcoords;
varying vec3 world_position;
varying vec3 world_normal;
varying vec3 view_position;


void main(void) {
  // pass along to the fragment shader
  local_position = position;
  local_normal = normal;
  local_tcoords = tcoords;

  // various coordinate transforms
  world_normal = normalize(mat3(world_matrix) * normal).xyz;
  world_position = (world_matrix * vec4(local_position, 1.0)).xyz;
  vec4 tmp = projection_matrix * view_matrix * world_matrix * vec4(local_position, 1.0);
  view_position = tmp.xyz;

  // pdq lighting
  vec3 k_ambient = vec3(0.3, 0.3, 0.3);
  vec3 k_diffuse = vec3(1.0, 1.0, 1.0);
  directional_weight = max(dot(world_normal, light_direction), 0.0);
  light_weight = k_ambient + k_diffuse * directional_weight;

  gl_Position = tmp;
}
