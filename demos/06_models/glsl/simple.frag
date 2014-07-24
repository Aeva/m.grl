
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


void main(void) {
  //vec4 color_sample = texture2D(texture_map, local_tcoord);
  float scale = 4.5;
  float r = random();
  float x = fract(local_position.x/scale);
  float y = fract(local_position.y/scale);
  float z = fract(local_position.z/scale);

  //gl_FragColor = vec4(local_normal.x, y, local_normal.z, 1.0);
  gl_FragColor = vec4(x, y, z, 1.0);
}
