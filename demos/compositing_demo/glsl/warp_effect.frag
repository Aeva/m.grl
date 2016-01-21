
precision mediump float;

uniform float mgrl_frame_start;
uniform float mgrl_buffer_width;
uniform float mgrl_buffer_height;
uniform sampler2D splat_texture;


vec2 pick(vec2 coord) {
  return vec2(coord.x/mgrl_buffer_width, coord.y/mgrl_buffer_height);
}


void main(void) {
  vec2 tcoords = pick(gl_FragCoord.xy);
  float foo = sin((gl_FragCoord.x+(mgrl_frame_start*200.0))/100.0) * tcoords.x * 0.25;
  tcoords.y += foo;
  vec4 diffuse = texture2D(splat_texture, tcoords);
  diffuse = mix(vec4(1.0, 0.1, 0.5, 1.0), diffuse, 0.75);
  gl_FragColor = diffuse;
}
