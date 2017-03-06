
const float two_pies = 6.283185307179586;
const float two_nega_pies = 0.15915494309189535;

// The p_sin functions apply a modulus before taking the sine of the
// result.  This is to avoid a loss of precision that occurs with the
// builtin sin function on some platforms.

float p_sin(float value) {
  return sin(fract(value * two_nega_pies) * two_pies);
}

vec2 p_sin(vec2 value) {
  return sin(fract(value * two_nega_pies) * two_pies);
}

vec3 p_sin(vec3 value) {
  return sin(fract(value * two_nega_pies) * two_pies);
}
