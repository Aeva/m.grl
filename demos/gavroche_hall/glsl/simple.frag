
precision mediump float;


uniform float time;
uniform float mode;
uniform sampler2D diffuse_texture;

uniform float is_sprite;
uniform float is_transparent;

varying vec3 local_position;
varying vec3 local_normal;
varying vec2 local_tcoords;
varying vec3 world_position;
varying vec3 screen_position;


void main(void) {
  vec4 diffuse = texture2D(diffuse_texture, local_tcoords);
  if (is_sprite == 1.0) {
    float cutoff = is_transparent==1.0 ? 0.5 : 1.0;
    if (diffuse.a < cutoff) {
      discard;
    }
  }
  gl_FragColor = diffuse;
}
