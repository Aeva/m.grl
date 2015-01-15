
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float mgrl_buffer_width;
uniform float mgrl_buffer_height;
uniform sampler2D depth_pass;
uniform sampler2D color_pass;


void main(void) {
  vec2 pick = vec2(gl_FragCoord.x / mgrl_buffer_width, gl_FragCoord.y / mgrl_buffer_height);
    
  gl_FragColor = texture2D(depth_pass, pick) + texture2D(color_pass, pick);
}
