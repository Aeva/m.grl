
precision mediump float;


uniform float time;
uniform float mode;
uniform sampler2D texture_map;

varying vec3 local_position;
varying vec3 local_normal;
varying vec2 local_tcoord;
varying vec3 world_position;
varying vec3 screen_position;


void main(void) {
  float gray = screen_position.y/15.0;
  gl_FragColor = vec4(gray, gray, gray, 1.0);
}
