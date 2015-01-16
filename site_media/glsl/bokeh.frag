
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


uniform bool horizontal;
const float blur_factor = 75.0;
const float blur_samples = 10.0;
const vec4 clear_color_hack = vec4(.93, .93, .93, 1.0);


vec2 pick(vec2 coord) {
  return vec2(coord.x/mgrl_buffer_width, coord.y/mgrl_buffer_height);
}


vec2 screen_clamp(vec2 coord) {
  return clamp(coord, vec2(0.0, 0.0), gl_FragCoord.xy);
}


vec4 blur_sample(vec4 depth_info) {
  vec2 point;
  vec4 check;
  vec4 accumulate = vec4(0.0, 0.0, 0.0, 0.0);
  float samples = 0.0;
  float x = gl_FragCoord.x;
  float y = gl_FragCoord.y;
  
  for (float i=0.0; i<blur_factor; i+=blur_factor/blur_samples) {
    // if (horizontal) {
    //   x = (i-blur_factor*.5)*depth_info.b;
    //   if (x < 0.0 || x >= mgrl_buffer_width) {
    //     continue;
    //   }
    // }
    // else {
    if (!horizontal) {
      y = (i-blur_factor*.5)*depth_info.b;
      if (y < 0.0 || y >= mgrl_buffer_height) {
        continue;
      }
    }
    point = pick(vec2(x, y));
    
    check = texture2D(depth_pass, point);
    // if (check.r > depth_info.r || check.g < depth_info.g) {
    //   continue;
    // }

    accumulate += texture2D(color_pass, point);
    samples += 1.0;
  }

  return accumulate / samples;
}


void main(void) {
  vec2 frag_point = pick(gl_FragCoord.xy);
  vec4 depth_data = texture2D(depth_pass, frag_point);
  vec4 color;

  if (depth_data == vec4(0.0, 0.0, 0.0, 0.0)) {
    depth_data = vec4(0.0, 1.0, 1.0, 1.0);
  }

  if (depth_data.b >= 0.05) {
    color = blur_sample(depth_data);
  }
  else {
    color = texture2D(color_pass, frag_point);
  }
    
  gl_FragColor = color;
}
