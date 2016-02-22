
// matrices
uniform mat4 view_matrix;
uniform mat4 world_matrix;
uniform mat4 particle_matrix;
uniform mat4 projection_matrix;

// vertex data
attribute vec3 position;
attribute vec3 normal;
attribute vec2 tcoords;

// misc adjustments
uniform float mgrl_orthographic_scale;

// billboard sprites enabler
uniform float billboard_mode;

// interpolated vertex data in various transformations
varying vec3 local_position;
varying vec3 local_normal;
varying vec2 local_tcoords;
varying vec3 world_position;
varying vec3 world_normal;
varying vec3 screen_normal;
varying float linear_depth;

// handy dandy light stuff
uniform vec3 light_direction;
varying vec3 light_weight;
varying float directional_weight;


void main(void) {
  // pass along to the fragment shader
  local_position = position * mgrl_orthographic_scale;
  local_normal = normal;
  local_tcoords = tcoords;

  // calculate modelview matrix
  mat4 model_view = view_matrix * world_matrix;
  if (billboard_mode > 0.0) {
    // clear out rotation information
    model_view[0].xyz = world_matrix[0].xyz;
    model_view[2].xyz = world_matrix[2].xyz;
    if (billboard_mode == 2.0) {
      model_view[1].xyz = world_matrix[1].xyz;
    }
  }

  // various coordinate transforms
  vec4 final_position = projection_matrix * model_view * vec4(local_position, 1.0);
  world_position = (world_matrix * vec4(local_position, 1.0)).xyz;
  world_normal = normalize(mat3(world_matrix) * normal).xyz;
  screen_normal = normalize(mat3(projection_matrix * model_view) * normal).xyz;
  linear_depth = length(model_view * vec4(local_position, 1.0));


  // pdq lighting
  vec3 k_ambient = vec3(0.3, 0.3, 0.3);
  vec3 k_diffuse = vec3(1.0, 1.0, 1.0);
  directional_weight = max(dot(world_normal, normalize(light_direction)), 0.0);
  light_weight = k_ambient + k_diffuse * directional_weight;
  
  gl_Position = final_position;
}
