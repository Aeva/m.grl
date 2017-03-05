
uniform float mgrl_frame_start;

float wave_at_point(float x, float y) {
  return sin(x + mgrl_frame_start) * sin(y + mgrl_frame_start) * 0.2;
}


plugin void waves (inout vec3 position, inout vec3 normal, inout vec2 tcoords) {
  position.z = wave_at_point(position.x, position.y);
}
