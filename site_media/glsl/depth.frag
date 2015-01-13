
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec4 coord;

void main(void) {
  //float depth = gl_FragCoord.z;
  float depth = coord.z/100.0;

  gl_FragColor = vec4(depth, depth, depth, 1.0);
}
