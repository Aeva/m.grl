
uniform float mgrl_buffer_width;
uniform float mgrl_buffer_height;

uniform sampler2D main_texture;
uniform sampler2D pips[9];
uniform bool enable[9];

include("normalize_screen_coord.glsl");

void main(void) {
  vec2 screen_coord = normalize_screen_coord(gl_FragCoord.xy);
  int x = int(clamp(floor(screen_coord.x*3.0), 0.0, 2.0));
  int y = 2 - int(clamp(floor(screen_coord.y*3.0), 0.0, 2.0));
  int p = (x*3) + y;
  
  float third = 1.0/3.0;
  vec2 pip_offset = vec2(float(x), float(y))*third;
  vec2 pip_coord = (screen_coord - pip_offset) / third;

  float alpha = 0.0;
  vec4 pip_color = vec4(0.0);  
  vec4 main_color = texture2D(main_texture, screen_coord);

  for (int i=0; i<9; i+=1) {
    if (i == p) {
      pip_color = texture2D(pips[i], pip_coord);
      if (enable[i]) {
        alpha = 1.0;
      }
      break;
    }
  }
  gl_FragColor = mix(main_color, pip_color, alpha);
}
