
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float mgrl_buffer_width;
uniform float mgrl_buffer_height;
uniform sampler2D depth_pass;
uniform sampler2D color_pass;


// (produces awesomly bad results)
float prng_wacky(vec2 co) {
  vec2 a = fract(co.yx * vec2(5.3983, 5.4427));
  vec2 b = fract(co.xy + vec2(21.5351, 14.3137));
  vec2 rand = co + dot(a,b);
  return fract(rand.x + rand.y * 95.4337);
}

// alternative, basically the same as the example
float prng_better(vec2 co) {
  vec2 a = fract(co.yx * vec2(5.3983, 5.4427));
  vec2 b = a.xy + vec2(21.5351, 14.3137);
  vec2 c = a + dot(a.yx, b);
  return fract(c.x * c.y * 95.4337);
}


vec2 pick(vec2 coord) {
  return vec2(coord.x/mgrl_buffer_width, coord.y/mgrl_buffer_width);
}


vec2 clamp_to_screen(vec2 coord) {
  return clamp(coord, vec2(0.0, 0.0), gl_FragCoord.xy);
}


vec2 random_pick(vec2 coord, float scatter, float scale) {
  float rand1 = prng_better(coord + scatter);
  float rand2 = prng_better(coord - scatter);
  float x_part = gl_FragCoord.x + (rand1*scale*2.0-scale);
  float y_part = gl_FragCoord.y + (rand2*scale*2.0-scale);
  return pick(clamp_to_screen(vec2(x_part, y_part)));
}


vec4 blur_sample(float blur) {
  vec4 color = vec4(0.0, 0.0, 0.0, 1.0);
  vec2 point;
  float count = 0.0;
  for (float i=0.0; i<=8.0; i+=1.0) {
    point = random_pick(gl_FragCoord.xy, i, blur);
    color += texture2D(color_pass, point);
    count += 1.0;
  }
  return color / count;
}


void main(void) {
  vec2 frag_point = pick(gl_FragCoord.xy);
  float blur = texture2D(depth_pass, frag_point).r * 20.0;
  vec4 color;

  if (blur >= 0.9) {
    color = blur_sample(blur);
  }
  else if (blur >= 0.7) {
    color = blur_sample(blur);
  }
  else if (blur >= 0.5) {
    color = blur_sample(blur);
  }
  else if (blur >= 0.3) {
    color = blur_sample(blur);
  }
  else if (blur >= 0.1) {
    color = blur_sample(blur);
  }
  else {
    color = texture2D(color_pass, frag_point);
  }
    
  gl_FragColor = color;
}
