precision mediump float;

uniform float mgrl_buffer_width;
uniform float mgrl_buffer_height;

uniform sampler2D input_texture;
uniform float blur_radius;
uniform float samples;

const float max_samples = 32.0;
const float two_pi = 6.28318530718;


include("normalize_screen_coord.glsl");


vec2 screen_clamp(vec2 coord) {
  return clamp(coord, vec2(0.0, 0.0), gl_FragCoord.xy);
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


void main(void) {
  float count = 0.0;
  vec4 color = vec4(0.0, 0.0, 0.0, 0.0);

  float x, y, radius;
  float angle = two_pi * prng(gl_FragCoord.xy).x;
  float angle_step = two_pi / samples;
  
  for (float i=0.0; i<max_samples; i+=1.0) {
    radius = blur_radius * prng(angle);
    x = gl_FragCoord.x + cos(angle)*radius;
    y = gl_FragCoord.y + sin(angle)*radius;
    angle += angle_step;
    if (x < 0.0 || y < 0.0 || x >= mgrl_buffer_width || y >= mgrl_buffer_height) {
      continue;
    }
    color += texture2D(input_texture, normalize_screen_coord(vec2(x, y)));
    count += 1.0;
    if (count >= samples) {
      break;
    }
  }
  
  if (count == 0.0) {
    color = texture2D(input_texture, normalize_screen_coord(gl_FragCoord.xy));
    count = 1.0;
  }
  gl_FragColor = color / count;
}
