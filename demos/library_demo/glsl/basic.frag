
include("chess.frag");

uniform sampler2D diffuse_texture;
uniform float alpha;
uniform bool is_sprite;
uniform bool is_transparent;
varying vec2 local_tcoords;


swappable vec4 diffuse_function() {
  return texture2D(diffuse_texture, local_tcoords);
}


void main(void) {
  vec4 diffuse = diffuse_function();
  if (is_sprite) {
    float cutoff = is_transparent ? 0.1 : 1.0;
    if (diffuse.a < cutoff) {
      discard;
    }
  }
  diffuse.a *= alpha;
  gl_FragColor = diffuse;
}

