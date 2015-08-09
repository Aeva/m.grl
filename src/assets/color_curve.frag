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

#include "normalize_screen_cord.glsl"


float lightness(vec3 color) {
  vec3 scaled = vec3(0.257, 0.504, 0.098) * (color * 255.0);
  float y = scaled.r + scaled.g + scaled.b + 16.0;
  return y/255.0;
}


void main(void) {
  vec2 tcoords = normalize_screen_cord(gl_FragCoord.xy);
  vec3 color = texture2D(input_texture, tcoords).rgb;
  //color *= linear_curve(value_curve, lightness(color.rgb));
  color.r = linear_curve(red_curve, color.r);
  color.g = linear_curve(green_curve, color.g);
  color.b = linear_curve(blue_curve, color.b);
  gl_FragColor = vec4(color, 1.0);
}
