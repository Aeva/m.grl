
include("deferred_renderer/common.glsl");


binding_context GraphNode {
  // object matrices
  in/uniform mat4 world_matrix;
  uniform mat4 particle_matrix;

  // billboard sprites enabler
  uniform float billboard_mode;
}


uniform mat4 view_matrix;
uniform mat4 projection_matrix;
uniform float mgrl_orthographic_scale;


vec4 gbuffers_main() {
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
  screen_position = final_position.xyz;
  linear_depth = length((model_view * vec4(local_position, 1.0)));
  return final_position;
}
