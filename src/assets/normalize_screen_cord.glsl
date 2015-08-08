//
//  This function takes a value like gl_FragCoord.xy, wherein the
//  coordinate is expressed in screen coordinates, and returns an
//  equivalent coordinate that is normalized to a value in the range
//  of 0.0 to 1.0.
//
vec2 normalize_screen_cord(vec2 coord) {
  return vec2(coord.x/mgrl_buffer_width, coord.y/mgrl_buffer_height);
};

