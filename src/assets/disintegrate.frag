precision mediump float;

uniform float mgrl_buffer_width;
uniform float mgrl_buffer_height;

uniform float progress;
uniform sampler2D texture_a;
uniform sampler2D texture_b;

uniform float px_size;


#include "normalize_screen_cord.glsl"


// https://stackoverflow.com/questions/12964279/whats-the-origin-of-this-glsl-rand-one-liner
float random_seed(vec2 co) {
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}


void main(void) {
  vec2 grid = gl_FragCoord.xy / px_size;
  vec2 offset = fract(grid)*0.5;
  float random = (random_seed(floor(grid + offset))*0.9) + 0.1;
  random *= (1.0 - progress);
  vec2 tcoords = normalize_screen_cord(gl_FragCoord.xy);
  vec4 color;
  if (random < 0.1) {
    color = texture2D(texture_b, tcoords);
  }
  else {
    color = texture2D(texture_a, tcoords);
  }
  gl_FragColor = color;
}
