var canvas = document.getElementById('canvas');
var canvas2 = document.getElementById('hidden');
var video = document.getElementById('video');
var gl = canvas.getContext('webgl', {premultipliedalpha: false});
var hidden = canvas2.getContext('2d');
hidden.width = 320;
hidden.height = 240;

var smaller = innerWidth>innerHeight? innerHeight : innerWidth;
canvas.width = innerHeight*(320/(240));
canvas.height = innerHeight;

let srcvertexShader = `
  attribute vec2 coordinates;
  attribute lowp vec3 color;
  attribute float life;
  varying vec3 color2;
  void main(){
    color2 = color;
    gl_Position = vec4(coordinates,1.0,1.0);
    gl_PointSize = 1.0 + 5.0 * life + 3.0/(3.0 + length(color));
  }
`
let srcfragShader = `
  varying lowp vec3 color2;
  void main(void) {
      gl_FragColor = vec4(color2,1.0);
  }
`

let particles;
let coord,buffer;
let color,life;


window.addEventListener("load",function init(){
  navigator.mediaDevices.getUserMedia({video: {width: {exact: 320}, height: {exact: 240}},audio:false})
    .then(stream=>{
      video.src = URL.createObjectURL(stream);
      video.addEventListener("loadeddata",setupWebGl);
    })
});

function setupWebGl(){

  gl.viewport( 0, 0, canvas.width, canvas.height);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  let program = compileShaders();
        
  coord = gl.getAttribLocation(program, "coordinates");
  gl.enableVertexAttribArray(coord);

  color = gl.getAttribLocation(program, "color");
  gl.enableVertexAttribArray(color);

  life = gl.getAttribLocation(program, "life");
  gl.enableVertexAttribArray(life);

  spawn();
  requestAnimationFrame(draw);
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

  return program;
}



function randomCoordinate(){
  return Math.random()*2-1;
}

function spawn(){

  hidden.drawImage(video,0,0,hidden.width,hidden.height);

  const data = hidden.getImageData(0,0,hidden.width,hidden.height).data;

  particles = new Float32Array(psize*8);

  for (let a = 0;a<psize*8;a+=8){
    particles[a] = randomCoordinate();
    particles[a+1] = randomCoordinate();
    particles[a+2] = 0;
    particles[a+3] = 0;
    particles[a+4] = data[calc(particles[a],particles[a+1])]/255;
    particles[a+5] = data[calc(particles[a],particles[a+1])+1]/255;
    particles[a+6] = data[calc(particles[a],particles[a+1])+2]/255;
    particles[a+7] = Math.random();
  }
  buffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,particles,gl.DYNAMIC_DRAW);
}
function calc(x,y){ 
  // if(x <= -1 || x >= 1 || y<=-1 || y>=1)return 0;
  return 4*(Math.floor((1-y)/2*hidden.height)*hidden.width + Math.floor((1-x)/2*hidden.width));
}
function getAvarage(data,c){

  return (data[c] + data[c+1] + data[c+2])/3;
}


const psize = 100000;
const mapStrength = 0.001;
const resolution = 0.01;
function updateParticles(){
  hidden.drawImage(video,0,0,hidden.width,hidden.height);

  const data = hidden.getImageData(0,0,hidden.width,hidden.height).data;
  // console.log(data.length);
  
  for (var a=0;a<psize*8;a+=8){

    particles[a] += particles[a+2];
    particles[a+1] += particles[a+3];

    if(particles[a] <= -1+resolution || particles[a] >= 1-resolution || particles[a+1]<=-1+resolution || particles[a+1]>=1-resolution || particles[a+7] < 0.01){
      particles[a] = randomCoordinate();
      particles[a+1] = randomCoordinate();
      particles[a+2] = 0;
      particles[a+3] = 0;
      particles[a+4] = data[calc(particles[a],particles[a+1])]/255;
      particles[a+5] = data[calc(particles[a],particles[a+1])+1]/255;
      particles[a+6] = data[calc(particles[a],particles[a+1])+2]/255;
      particles[a+7] = Math.random();
    }
    particles[a+2] += mapStrength*getAvarage(data,calc(particles[a]+resolution,particles[a+1]))/255 - mapStrength*getAvarage(data,calc(particles[a],particles[a+1]))/255;
    particles[a+3] += mapStrength*getAvarage(data,calc(particles[a],particles[a+1]+resolution))/255 - mapStrength*getAvarage(data,calc(particles[a],particles[a+1]))/255;
    particles[a+7] *= 0.99;
/*    if (isNaN(particles[a+1]) || isNaN(particles[a+3]) || isNaN(particles[a+2]) || isNaN(particles[a]) || data[calc(particles[a],particles[a+1])+3]!=255) {
      console.log("a:",a,'x:',particles[a],'y:',particles[a+1]);
      debugger;
    }*/

    // particles[a+2] *= 0.99;
    // particles[a+3] *= 0.99;
  }
}

function draw(){
  if (video.readyState != 4)return;

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT) 
  updateParticles();
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,particles,gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(coord, 2, gl.FLOAT, false, 32, 0);
  gl.vertexAttribPointer(color, 3, gl.FLOAT, false, 32, 16);
  gl.vertexAttribPointer(life, 1, gl.FLOAT, false, 32, 28);
  gl.drawArrays(gl.POINTS, 0, psize);

  requestAnimationFrame(draw);
};

