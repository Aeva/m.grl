
// vertex data
attribute vec3 position;

// gloabl matrices
uniform mat4 view_matrix;
uniform mat4 particle_matrix;
uniform mat4 projection_matrix;

// misc adjustments
uniform float mgrl_orthographic_scale;
uniform float mgrl_buffer_width;
uniform float mgrl_buffer_height;

// durring picking, we render to a small frame buffer, but pretend
// that we're rendering to a normal one.  Thus, 'frame_offest' is
// needed for proper cropping.
uniform vec2 frame_offset;
//uniform vec2 frame_scale;

binding_context GraphNode {
  uniform mat4 world_matrix;
  uniform float billboard_mode;
}


// interpolated vertex data in various transformations
varying vec3 local_position;


void main(void) {
  // pass along to the fragment shader
  local_position = position * mgrl_orthographic_scale;

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
  gl_Position = projection_matrix * model_view * vec4(local_position, 1.0);
}
