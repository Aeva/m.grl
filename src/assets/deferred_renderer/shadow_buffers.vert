
include("deferred_renderer/common.glsl");


binding_context GraphNode {
  // object matrices
  uniform mat4 world_matrix;
  uniform mat4 particle_matrix;

  // billboard sprites enabler
  uniform float billboard_mode;
}


uniform mat4 view_matrix;
uniform mat4 projection_matrix;
uniform float mgrl_orthographic_scale;
uniform float light_size_vert;
varying vec4 scatter_samples;


mat4 model_view_matrix(mat4 view_matrix) {
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
  return model_view;
}


float scatter_depth(int which) {
  mat4 basis = view_matrix;
  mat4 shift = mat4(1.0); // identity matrix
  if (which == 0) {
    shift[3].x += light_size_vert;
  }
  else if (which == 1) {
    shift[3].x -= light_size_vert;
  }
  else if (which == 2) {
    shift[3].z += light_size_vert;
  }
  else if (which == 3) {
    shift[3].z -= light_size_vert;
  }
  mat4 model_view = model_view_matrix(shift * basis);
  return length((model_view * vec4(local_position, 1.0)));
}


vec4 shadow_buffers_main() {
  local_position = position * mgrl_orthographic_scale;
  mat4 model_view = model_view_matrix(view_matrix);
  vec4 final_position = projection_matrix * model_view * vec4(local_position, 1.0);

  scatter_samples = vec4(scatter_depth(0),
                         scatter_depth(1),
                         scatter_depth(2),
                         scatter_depth(3));
  return final_position;
}
