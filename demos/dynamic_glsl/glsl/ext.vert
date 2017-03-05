
uniform float mgrl_frame_start;

vec3 wave_at_point(float x, float y) {
  float z = sin(x + mgrl_frame_start) * sin(y + mgrl_frame_start) * 0.2;
  return vec3(x, y, z);
}


plugin void waves (inout vec3 position, inout vec3 normal, inout vec2 tcoords) {
  vec3 a = wave_at_point(position.x,       position.y);
  vec3 b = wave_at_point(position.x + 0.1, position.y);
  vec3 c = wave_at_point(position.x,       position.y + 0.1);
  vec3 norm_a = cross(b-a, c-a);
  b = wave_at_point(position.x - 0.1, position.y);
  c = wave_at_point(position.x,       position.y - 0.1);
  vec3 norm_b = cross(b-a, c-a);

  normal = normalize((norm_a + norm_b)/2.0);
  position.z = a.z;
}
