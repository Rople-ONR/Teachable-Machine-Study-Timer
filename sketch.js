let classifier;
let video;
let app;

function preload() {
  classifier = ml5.imageClassifier("http://127.0.0.1:5500/model/");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("Outfit, Noto Sans KR, sans-serif");

  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  app = new StudyApp();
  classifier.classifyStart(video, gotResult);
}

function draw() {
  app.draw(video);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function gotResult(results) {
  app.updateClassification(results, millis());
}
