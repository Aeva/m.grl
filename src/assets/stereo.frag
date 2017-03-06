
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec4 mgrl_clear_color;
uniform float mgrl_buffer_width;
uniform float mgrl_buffer_height;

uniform sampler2D left_eye_texture;
uniform sampler2D right_eye_texture;

uniform bool stereo_split;
uniform vec3 left_color;
uniform vec3 right_color;

vec4 sample_or_clear(sampler2D sampler, vec2 coord) {
  vec4 color = texture2D(sampler, coord);
  if (color.a == 0.0) {
    color = mgrl_clear_color;
  }
  return color;
}

void main(void) {
  vec2 coord = gl_FragCoord.xy / vec2(mgrl_buffer_width, mgrl_buffer_height);
  vec4 color;

  if (stereo_split) {
    // FIXME: apply distortion effect needed for VR glasses
    if (coord.x < 0.5) {
      color = texture2D(left_eye_texture, vec2(coord.x*2.0, coord.y));
    }
    else {
      color = texture2D(right_eye_texture, vec2((coord.x - 0.5)*2.0, coord.y));
    }
  }

  else {
    vec3 left = sample_or_clear(left_eye_texture, coord).rgb * left_color;
    vec3 right = sample_or_clear(right_eye_texture, coord).rgb * right_color;
    color = vec4((left+right), 1.0);
  }
  
  gl_FragColor = color;
}
