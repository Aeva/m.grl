
uniform sampler2D diffuse_texture;

uniform float alpha;
uniform bool is_sprite;
uniform bool is_transparent;

uniform vec3 tint;

varying vec3 local_position;
varying vec3 local_normal;
varying vec2 local_tcoords;
varying vec3 world_position;


void main(void) {
  vec4 diffuse = texture2D(diffuse_texture, local_tcoords);
  if (is_sprite) {
    float cutoff = is_transparent ? 0.1 : 1.0;
    if (diffuse.a < cutoff) {
      discard;
    }
  }
  diffuse.a *= alpha;
  diffuse.rgb *= tint;

  gl_FragColor = diffuse;
}
