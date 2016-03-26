
precision mediump float;

// samplers
binding_context GraphNode {
  uniform sampler2D diffuse_texture;
  uniform float alpha;
  uniform bool is_sprite;
  uniform bool is_transparent;

  mode_switch diffuse_color_function;
  mode_switch texture_coordinate_function;
}


varying vec3 local_position;
varying vec3 local_normal;
varying vec2 local_tcoords;
varying vec3 world_position;


swappable vec2 texture_coordinate_function() {
  return local_tcoords;
}


swappable vec4 diffuse_color_function() {
  vec2 tcoords = texture_coordinate_function();
  return texture2D(diffuse_texture, tcoords);
}


void main(void) {
  vec4 diffuse = diffuse_color_function();
  if (is_sprite) {
    float cutoff = is_transparent ? 0.1 : 1.0;
    if (diffuse.a < cutoff) {
      discard;
    }
  }
  diffuse.a *= alpha;
  gl_FragColor = diffuse;
}
