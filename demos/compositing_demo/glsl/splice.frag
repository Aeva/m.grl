
precision mediump float;

uniform float mgrl_frame_start;
uniform float mgrl_buffer_width;
uniform float mgrl_buffer_height;
uniform float factor;
uniform float blur_factor;
uniform sampler2D texture_a;
uniform sampler2D texture_b;
uniform bool invert;


vec2 pick(vec2 coord) {
  return vec2(coord.x/mgrl_buffer_width, coord.y/mgrl_buffer_height);
}


void main(void) {
  vec2 tcoords = pick(gl_FragCoord.xy);
  float fuzzy = blur_factor * 0.5;
  float slope = mgrl_buffer_height / mgrl_buffer_width;
  if (invert) {
    slope *= -1.0;
  }
  float half_height = mgrl_buffer_height * 0.5;
  float high_point = mgrl_buffer_height + half_height + fuzzy + 1.0;
  float low_point = (half_height * -1.0) - fuzzy - 1.0;
  float midpoint = mix(high_point, low_point, factor);
  float test = ((gl_FragCoord.x - mgrl_buffer_width/2.0) * slope) + midpoint;

  vec4 color;
  float dist = gl_FragCoord.y - test;
  if (dist <= fuzzy && dist >= (fuzzy*-1.0)) {
    float blend = (dist + fuzzy) / (fuzzy*2.0);
    vec4 lhs_color = texture2D(texture_a, tcoords);
    vec4 rhs_color = texture2D(texture_b, tcoords);
    color = mix(lhs_color, rhs_color, blend);
  }
  else {
    if (gl_FragCoord.y < test) {
      color = texture2D(texture_a, tcoords);
    }
    else {
      color = texture2D(texture_b, tcoords);
    }
  }
  gl_FragColor = color;
}
