
precision mediump float;

uniform float mgrl_frame_start;
uniform float mgrl_buffer_width;
uniform float mgrl_buffer_height;
uniform float factor;
uniform sampler2D lhs_texture;
uniform sampler2D rhs_texture;


vec2 pick(vec2 coord) {
  return vec2(coord.x/mgrl_buffer_width, coord.y/mgrl_buffer_height);
}


void main(void) {
  vec2 tcoords = pick(gl_FragCoord.xy);
  float fuzzy = 100.0;
  float slope = mgrl_buffer_height / mgrl_buffer_width;
  float endpoint = mgrl_buffer_height + fuzzy + 10.0;
  float midpoint = mix(endpoint * -1.0, endpoint, factor);
  float test = (gl_FragCoord.x * slope) + midpoint;

  vec4 color;
  float dist = gl_FragCoord.y - test;
  if (dist <= fuzzy && dist >= (fuzzy*-1.0)) {
    float blend = (dist + fuzzy) / (fuzzy*2.0);
    vec4 lhs_color = texture2D(lhs_texture, tcoords);
    vec4 rhs_color = texture2D(rhs_texture, tcoords);
    color = mix(lhs_color, rhs_color, blend);
  }
  else {
    if (gl_FragCoord.y < test) {
      color = texture2D(lhs_texture, tcoords);
    }
    else {
      color = texture2D(rhs_texture, tcoords);
    }
  }
  gl_FragColor = color;
}
