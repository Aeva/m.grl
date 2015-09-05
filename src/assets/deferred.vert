
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
varying vec3 screen_position;
varying float linear_depth;

// uniform
uniform bool geometry_pass;


void main(void) {
  if (geometry_pass) {
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
    screen_position = final_position.xyz;
    linear_depth = length((model_view * vec4(local_position, 1.0)));
    gl_Position = final_position;
  }
  else {
    gl_Position = projection_matrix * view_matrix * world_matrix * vec4(position, 1.0);
  }
}
