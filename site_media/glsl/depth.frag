
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float depth_falloff;

varying vec4 coord;
varying float depth;
varying float origin;


void main(void) {
  //float depth = gl_FragCoord.z;

  float blur = 0.0;
  float high_edge = origin + depth;
  float low_edge = origin - depth;

  
  if (coord.z > high_edge) {
    blur = distance(coord.z, high_edge)/depth_falloff;
  }
  else if (coord.z < low_edge) {
    blur = distance(coord.z, low_edge)/depth_falloff;
  }

  gl_FragColor = vec4(blur, blur, blur, 1.0);
}
