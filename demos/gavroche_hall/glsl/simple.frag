
precision mediump float;


uniform float time;
uniform float mode;
uniform sampler2D diffuse_texture;

varying vec3 local_position;
varying vec2 local_tcoord;
varying vec3 world_position;
varying vec3 screen_position;


void main(void) {
  vec4 diffuse = texture2D(diffuse_texture, local_tcoord);
  gl_FragColor = diffuse;
}
