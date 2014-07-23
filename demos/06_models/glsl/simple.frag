
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


float random_seed(vec2 co) {
  // Handy function for producing pseudo-randomness.  Returns a value
  // between 0 and 1
  return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453);
}


float random() {
  // Returns a value between 0 and 1, dependent on fragment position
  // and time.
  return random_seed(vec2(gl_FragCoord.x*gl_FragCoord.y, gl_FragCoord.z*time));
}


void main(void) {
  vec4 color_sample = texture2D(texture_map, local_tcoord);

  //gl_FragColor = color_sample;
  gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
}
