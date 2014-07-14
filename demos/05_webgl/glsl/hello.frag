
uniform lowp float width;
uniform lowp float height;
uniform lowp float time;


highp float rand(highp vec2 co){
  return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453);
}


void main(void) {
  lowp float period = 32.0;

  // distance from the center of the screen
  lowp float dist = distance(gl_FragCoord.xy, vec2(width/10.0, height/2.0));

  lowp float cutx = gl_FragCoord.x/period;
  lowp float cuty = gl_FragCoord.y/period;
  lowp float x = (floor(cutx) + fract(cuty))*period / width;
  lowp float y = (floor(cuty) + fract(cutx))*period / height;

  lowp float cycle = mod(time, 10.0);


  highp float random = rand(vec2(gl_FragCoord.x/width/cycle, gl_FragCoord.y/height*cycle));
  lowp float probability = dist/128.0;
  if (random*probability > .7) {
    discard;
  }
  
  if (dist > 300.0 && random*probability > 0.5) {
    discard;
  }
  if (dist > 350.0 && random*probability > 0.4) {
    discard;
  }
  if (dist > 400.0 && random*probability > 0.3) {
    discard;
  }
  if (dist > 450.0 && random*probability > 0.2) {
    discard;
  }
  if (dist > 500.0 && random*probability > 0.1) {
    discard;
  }
  
  if (mod(gl_FragCoord.x, 16.0) < 2.0) {
    gl_FragColor = vec4(0, 0, 0, 1.0);
  }
  else if (mod(gl_FragCoord.y, 12.0) < 1.0) {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
  }
  else {
    gl_FragColor = vec4(x, y, 0.0, 1.0);
  }
}
