
precision mediump float;

uniform float mgrl_buffer_width;
uniform float mgrl_buffer_height;

uniform vec2 pip_size;
uniform vec2 pip_coord;
uniform float pip_alpha;
uniform sampler2D main_texture;
uniform sampler2D pip_texture;


#include "normalize_screen_coord.glsl"


void main(void) {
  vec2 screen_coord = normalize_screen_coord(gl_FragCoord.xy);
  vec4 color = texture2D(main_texture, screen_coord);

  // scale the screen_coord to represent a percent
  screen_coord *= 100.0;
  vec2 pip_test = screen_coord - pip_coord;
  if (pip_test.x >= 0.0 && pip_test.y >= 0.0 && pip_test.x <= pip_size.x && pip_test.y <= pip_size.y) {
    vec4 pip_color = texture2D(pip_texture, pip_test / pip_size);
    color = mix(color, pip_color, pip_color.a / pip_alpha);
  }
  gl_FragColor = color;
}
