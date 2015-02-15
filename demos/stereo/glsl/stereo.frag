
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float mgrl_frame_start;
uniform float mgrl_buffer_width;
uniform float mgrl_buffer_height;
uniform sampler2D left_eye;
uniform sampler2D right_eye;
uniform bool split_screen;
uniform vec3 left_color;
uniform vec3 right_color;

const vec4 clear_color_hack = vec4(.93, .93, .93, 1.0);


vec4 sample_or_clear(sampler2D sampler, vec2 coord) {
  vec4 color = texture2D(sampler, coord);
  if (color.a == 0.0) {
    color = clear_color_hack;
  }
  return color;
}


/*
// rgb->hsv function from here:
// https://stackoverflow.com/questions/15095909/from-rgb-to-hsv-in-opengl-glsl
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}


// hsv->rgb function from here:
// https://stackoverflow.com/questions/15095909/from-rgb-to-hsv-in-opengl-glsl
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
*/

void main(void) {
  vec2 coord = gl_FragCoord.xy / vec2(mgrl_buffer_width, mgrl_buffer_height);
  vec4 color;

  if (split_screen) {
    if (coord.x < 0.5) {
      color = texture2D(left_eye, vec2(coord.x*2.0, coord.y));
    }
    else {
      color = texture2D(right_eye, vec2((coord.x - 0.5)*2.0, coord.y));
    }
  }

  else {
    vec3 left = sample_or_clear(left_eye, coord).rgb * left_color;
    vec3 right = sample_or_clear(right_eye, coord).rgb * right_color;
    color = vec4((left+right), 1.0);
    /*
    if (coord.x < 0.5) {
      color = vec4(left_color, 1.0);
    }
    else {
      color = vec4(right_color, 1.0);
    }
    */
  }
  
  gl_FragColor = color;
}
