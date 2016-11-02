var canvas = document.getElementById('canvas');
var video = document.getElementById('video');
var gl = canvas.getContext('webgl');
canvas.width = innerWidth;
canvas.height = innerHeight;

let srcvertexShader = `
  attribute vec2 coordinates;
  attribute vec2 velocity;
  uniform float time;

  uniform sampler2D cameraImage;

  varying lowp vec2 coords;

  vec2 computePixel(){
    vec3 color;
    vec2 midcoords = (coordinates+1.0)/2.0;
    vec2 vertical = vec2(0.0,0.01);
    vec2 horisontal = vec2(0.01,0.0);

    vec3 mid = texture2D(cameraImage , midcoords).xyz;
    vec3 left = texture2D(cameraImage , midcoords - horisontal ).xyz;
    vec3 right = texture2D(cameraImage , midcoords + horisontal ).xyz;
    vec3 up = texture2D(cameraImage , midcoords - vertical ).xyz;
    vec3 down = texture2D(cameraImage , midcoords + vertical ).xyz;
    
    color = (left + right + up + down) / 3.0;
    return color.xy;
  }

  void main(){
    vec2 pixel = computePixel();
    vec2 speed = -1.0 * pixel * pixel * pixel;
    vec2 moved =  coordinates + velocity * speed * mod (time + velocity.x, 0.2);
    // vec2 moved =  coordinates + velocity * speed * time ;

    if (moved.x > -1.0 && moved.x < 1.0 && moved.y > -1.0 && moved.y < 1.0){
      coords = moved;
    }
    else{
      coords = vec2(0.0,0.0);
    }
    gl_Position = vec4(moved,1.0,1.0);
    gl_PointSize = 1.0;
  }
`
let srcfragShader = `
 uniform sampler2D cameraImage;
  varying lowp vec2 coords;
  
  void main(void) {

      gl_FragColor = texture2D(cameraImage, (coords + 1.0)/2.0);
      gl_FragColor = vec4(0.856,0.898,0.881,1.0);
   
  }
`

let coord;
let velocity;
let initTime;
let currentTime;
let cameraTexture;
let time = 0;

let particles =[];
particles.buffer = gl.createBuffer();
particles.velocitybuffer = gl.createBuffer();

class Particle{
  constructor(){
    this.x = Math.random()*2-1;
    this.y = Math.random()*2-1;
    this.angle = Math.random()*2*Math.PI;
    // this.angle = -1;
    this.vx = Math.cos(this.angle);
    this.vy = Math.sin(this.angle);
  }
};


gl.viewport( 0, 0, canvas.width, canvas.height );
gl.clearColor(0.0, 0.0, 0.0, 1.0);

window.addEventListener("load",function init(){
  navigator.mediaDevices.getUserMedia({video: {width: {exact: 320}, height: {exact: 240}},audio:false})
    .then(stream=>{
      video.src = URL.createObjectURL(stream);
      video.addEventListener("canplaythrough",()=>Promise.resolve());
    })
    .then(compileShaders)
    .then(program=>{
      coord = gl.getAttribLocation(program, "coordinates");
      gl.enableVertexAttribArray(coord);

      velocity = gl.getAttribLocation(program, "velocity");
      gl.enableVertexAttribArray(velocity);

      initTime = gl.getUniformLocation(program, "time");
      gl.uniform1f(initTime,time);

      spawn();
      requestAnimationFrame(draw);
    });
});

  


function initTextures() {
  cameraTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, cameraTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}


function compileShaders(){
  let fragShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragShader, srcfragShader);
  gl.compileShader(fragShader);

  let vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, srcvertexShader);
  gl.compileShader(vertexShader);

  let program = gl.createProgram();
  gl.attachShader(program, fragShader);
  gl.attachShader(program, vertexShader);
  gl.linkProgram(program);
  gl.useProgram(program);

  initTextures();

  return Promise.resolve(program);
}





function spawn(){
  for (let a = 0;a<100000;a++){
    particles[a] = new Particle();
  }

  let vrtxdata = [];
  let veldata = [];
  for (let a=0;a<particles.length;a++){
    vrtxdata[a*2]=particles[a].x;
    vrtxdata[a*2+1]=particles[a].y;
    veldata[a*2] = particles[a].vx;
    veldata[a*2+1] = particles[a].vy;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER,particles.buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vrtxdata),gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER,particles.velocitybuffer);
  let f32 = new Float32Array(veldata);
  gl.bufferData(gl.ARRAY_BUFFER,f32,gl.STATIC_DRAW);
}

function draw(){
  requestAnimationFrame(draw);
  // for (let a=0;a<particles.length;a++){
  //   if (particles[a].x<-1||particles[a].x>1 || particles[a].y<-1 || particles[a].y>1){
  //     particles[a]= new Particle();
  //   }
  // }

  if (video.readyState != 4)return;

  gl.clear(gl.COLOR_BUFFER_BIT);

  time +=0.001;
  gl.uniform1f(initTime,time);

  gl.bindTexture(gl.TEXTURE_2D, cameraTexture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, video);

  
  gl.bindBuffer(gl.ARRAY_BUFFER,particles.buffer);
  gl.vertexAttribPointer(coord, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER,particles.velocitybuffer);
  gl.vertexAttribPointer(velocity, 2 , gl.FLOAT, false, 0, 0);

  gl.drawArrays(gl.POINTS, 0, particles.length);
};

