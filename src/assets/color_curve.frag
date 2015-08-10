precision mediump float;

uniform float mgrl_buffer_width;
uniform float mgrl_buffer_height;

uniform sampler2D input_texture;
uniform float value_curve[16];
uniform float red_curve[16];
uniform float green_curve[16];
uniform float blue_curve[16];

#curve(value_curve)
#curve(red_curve)
#curve(green_curve)
#curve(blue_curve)

#include "normalize_screen_coord.glsl"


float value(vec3 color) {
  return max(color.r, max(color.g, color.b));
}


void main(void) {
  vec2 tcoords = normalize_screen_coord(gl_FragCoord.xy);
  vec3 color = texture2D(input_texture, tcoords).rgb;

  float v1 = value(color);
  float v2 = linear_curve(value_curve, v1);
  float scale = 1.0 / v1;
  color = color * scale * v2;
  
  color.r = linear_curve(red_curve, color.r);
  color.g = linear_curve(green_curve, color.g);
  color.b = linear_curve(blue_curve, color.b);
  gl_FragColor = vec4(color, 1.0);
}
