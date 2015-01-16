
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float mgrl_buffer_width;
uniform float mgrl_buffer_height;
uniform sampler2D color_pass;

vec2 pick(vec2 coord) {
  return vec2(coord.x/mgrl_buffer_width, coord.y/mgrl_buffer_height);
}

void main(void) {
  gl_FragColor = texture2D(color_pass, pick(gl_FragCoord.xy));
}
