precision mediump float;

uniform float mgrl_buffer_width;
uniform float mgrl_buffer_height;

uniform float progress;
uniform sampler2D texture_a;
uniform sampler2D texture_b;

uniform float blur_radius;
uniform bool flip_axis;
uniform bool flip_direction;


#include "normalize_screen_coord.glsl"


void main(void) {
  vec2 tcoords = normalize_screen_coord(gl_FragCoord.xy);
  float slope = mgrl_buffer_height / mgrl_buffer_width;
  if (flip_axis) {
    slope *= -1.0;
  }
  float half_height = mgrl_buffer_height * 0.5;
  float high_point = mgrl_buffer_height + half_height + blur_radius + 1.0;
  float low_point = (half_height * -1.0) - blur_radius - 1.0;
  float midpoint = mix(high_point, low_point, flip_direction ? 1.0 - progress : progress);
  float test = ((gl_FragCoord.x - mgrl_buffer_width/2.0) * slope) + midpoint;

  vec4 color;
  float dist = gl_FragCoord.y - test;
  if (dist <= blur_radius && dist >= (blur_radius*-1.0)) {
    vec4 color_a = texture2D(texture_a, tcoords);
    vec4 color_b = texture2D(texture_b, tcoords);
    float blend = (dist + blur_radius) / (blur_radius*2.0);
    color = mix(color_a, color_b, flip_direction ? 1.0 - blend : blend);
  }
  else {
    if ((gl_FragCoord.y < test && !flip_direction) || (gl_FragCoord.y > test && flip_direction)) {
      color = texture2D(texture_a, tcoords);
    }
    else {
      color = texture2D(texture_b, tcoords);
    }
  }
  gl_FragColor = color;
}
