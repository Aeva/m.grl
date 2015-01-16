
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float mgrl_frame_start;
uniform float mgrl_buffer_width;
uniform float mgrl_buffer_height;
uniform sampler2D depth_pass;
uniform sampler2D color_pass;


const vec4 clear_color_hack = vec4(.93, .93, .93, 1.0);

const float two_pi = 6.28318530718;
const float samples = 16.0;
const float angle_step = two_pi / samples;


vec2 screen_clamp(vec2 coord) {
  return clamp(coord, vec2(0.0, 0.0), gl_FragCoord.xy);
}

vec2 pick(vec2 coord) {
  return vec2(coord.x/mgrl_buffer_width, coord.y/mgrl_buffer_height);
}


vec2 prng(vec2 co) {
  vec2 a = fract(co.yx * vec2(5.3983, 5.4427));
  vec2 b = a.xy + vec2(21.5351, 14.3137);
  vec2 c = a + dot(a.yx, b);
  //return fract(c.x * c.y * 95.4337);
  return fract(vec2(c.x*c.y*95.4337, c.x*c.y*97.597));
}


float prng(float n){
  vec2 a = fract(n * vec2(5.3983, 5.4427));
  vec2 b = a.xy + vec2(21.5351, 14.3137);
  vec2 c = a + dot(a.yx, b);
  return fract(c.x * c.y * 95.4337);
}


vec4 blur(vec4 depth_info) {
  float max_radius = max(mgrl_buffer_width, mgrl_buffer_height) / 32.0;
  max_radius *= depth_info.b;
  vec2 rand = prng(gl_FragCoord.xy + depth_info.xy);

  // float count = 1.0;
  // vec4 color = texture2D(color_pass, pick(gl_FragCoord.xy));
  float count = 0.0;
  vec4 color = vec4(0.0, 0.0, 0.0, 0.0);
  vec4 test;
  vec2 select;
  
  float x, y, radius;
  float angle = two_pi * rand.x;
  for (float i=0.0; i<samples; i+=1.0) {
    radius = max_radius * prng(angle * depth_info.b);
    x = gl_FragCoord.x + cos(angle)*radius;
    y = gl_FragCoord.y + sin(angle)*radius;
    angle += angle_step;

    if (x < 0.0 || y < 0.0 || x >= mgrl_buffer_width || y >= mgrl_buffer_height) {
      continue;
    }
    select = pick(vec2(x, y));
    test = texture2D(depth_pass, select);

    if (test.b < 0.01 && depth_info.r == 0.0 && depth_info.g > 0.0) {
      continue;
    }
    else {
      color += texture2D(color_pass, select);
      count += 1.0;
    }
  }
  if (count == 0.0) {
    color = texture2D(color_pass, pick(gl_FragCoord.xy));
    count = 1.0;
  }
  return color/count;
}


void main(void) {
  vec2 frag_point = pick(gl_FragCoord.xy);
  vec4 depth_data = texture2D(depth_pass, frag_point);
  vec4 color;

  if (depth_data == vec4(0.0, 0.0, 0.0, 0.0)) {
    depth_data = vec4(0.0, 1.0, 1.0, 1.0);
  }

  if (depth_data.b >= 0.0) {
    color = blur(depth_data);
  }
  else {
    color = texture2D(color_pass, frag_point);
  }
    
  gl_FragColor = color;
}
