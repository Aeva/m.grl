
include("chess.frag");

uniform sampler2D diffuse_texture;
uniform float uv_offset;
uniform float alpha;
uniform float mode;
uniform bool is_sprite;
uniform bool is_transparent;
varying vec2 local_tcoords;


vec4 diffuse_function() {
  float x = mode < 3.0 ? local_tcoords.x + (uv_offset/16.0) : local_tcoords.x;
  vec2 tcoords = vec2(x, local_tcoords.y);
  return texture2D(diffuse_texture, tcoords);
}


void main(void) {
  vec4 diffuse = mode != 1.0 ? diffuse_function() : chess_pattern();
  if (is_sprite) {
    float cutoff = is_transparent ? 0.1 : 1.0;
    if (diffuse.a < cutoff) {
      discard;
    }
  }
  diffuse.a *= alpha;
  gl_FragColor = diffuse;
}

