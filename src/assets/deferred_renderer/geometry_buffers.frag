
include("deferred_renderer/common.glsl");


// samplers
binding_context GraphNode {
  uniform sampler2D diffuse_texture;
  uniform sampler2D normal_texture;
  mode_switch diffuse_color_function;
  mode_switch texture_coordinate_function;

  uniform bool has_normal_map;
}


swappable vec2 texture_coordinate_function() {
  return local_tcoords;
}


swappable vec4 diffuse_color_function() {
  vec2 tcoords = texture_coordinate_function();
  return texture2D(diffuse_texture, tcoords);
}


void gbuffers_main() {
  // g-buffer pass
  vec4 diffuse = diffuse_color_function();
  if (diffuse.a < 0.5) {
    discard;
  }
  gl_FragData[0] = diffuse;
  gl_FragData[1] = vec4(world_position, linear_depth);
  gl_FragData[2] = vec4(world_normal, 0.0);
}
