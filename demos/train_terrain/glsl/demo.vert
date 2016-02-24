
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

// instancing stuff
uniform bool instanced_drawing;
attribute vec4 world_matrix_a;
attribute vec4 world_matrix_b;
attribute vec4 world_matrix_c;
attribute vec4 world_matrix_d;

void main(void) {
  mat4 goom;
  if (instanced_drawing) {
    goom[0] = world_matrix_a;
    goom[1] = world_matrix_b;
    goom[2] = world_matrix_c;
    goom[3] = world_matrix_d;
  }
  else {
    goom = world_matrix;
  }
  
  // pass along to the fragment shader
  local_position = position * mgrl_orthographic_scale;
  local_normal = normal;
  local_tcoords = tcoords;

  // calculate modelview matrix
  mat4 model_view = view_matrix * goom;
  if (billboard_mode > 0.0) {
    // clear out rotation information
    model_view[0].xyz = goom[0].xyz;
    model_view[2].xyz = goom[2].xyz;
    if (billboard_mode == 2.0) {
      model_view[1].xyz = goom[1].xyz;
    }
  }

  // various coordinate transforms
  vec4 final_position = projection_matrix * model_view * vec4(local_position, 1.0);
  world_position = (goom * vec4(local_position, 1.0)).xyz;
  world_normal = normalize(mat3(goom) * normal).xyz;
  screen_normal = normalize(mat3(projection_matrix * model_view) * normal).xyz;
  linear_depth = length(model_view * vec4(local_position, 1.0));


  // pdq lighting
  vec3 k_ambient = vec3(0.3, 0.3, 0.3);
  vec3 k_diffuse = vec3(1.0, 1.0, 1.0);
  directional_weight = max(dot(world_normal, normalize(light_direction)), 0.0);
  light_weight = k_ambient + k_diffuse * directional_weight;
  
  gl_Position = final_position;
}
