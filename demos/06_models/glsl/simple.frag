
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float time;
uniform sampler2D texture_map;

varying vec3 local_position;
varying vec3 local_normal;
varying vec2 local_tcoord;


float random_seed(vec3 co) {
  // Handy function for producing pseudo-randomness.  Returns a value
  // between 0 and 1
  return fract(sin(dot(co, vec3(12.9898,78.233,56.123))) * 43758.5453);
}


float random() {
  // Returns a value!
  return random_seed(vec3(gl_FragCoord.x, gl_FragCoord.y, mod(time, 60.0)));
}


float invert(float val) {
  return (val-1.0)*-1.0;
}



void main(void) {
  vec4 color_sample = texture2D(texture_map, local_tcoord);
  float rand = random();

  vec4 weird = vec4(mix(rand, 1.0, local_normal.x),
                    mix(rand, 1.0, local_normal.y),
                    mix(rand, 1.0, local_normal.z),
                    1.0);

  float factor = (clamp(
                        local_position.x+sin(local_position.x*2.0)*0.5, 
                        -5.0, 5.0) + 5.0)/10.0;
  //gl_FragColor = mix(color_sample, weird, factor);
  gl_FragColor = color_sample;
}
