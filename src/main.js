import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
var counter = 0;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add axes helper for debugging
const axesHelper = new THREE.AxesHelper( 5 );
scene.add( axesHelper );

// Add control for debugging
const controls = new OrbitControls( camera, renderer.domElement );
camera.position.z = 30;
controls.update();

const tubeCurve = new THREE.CatmullRomCurve3( [
	new THREE.Vector3( -10, 0, 10 ),
	new THREE.Vector3( -5, 5, 5 ),
	new THREE.Vector3( 0, 0, 0 ),
	new THREE.Vector3( 5, -5, 5 ),
	new THREE.Vector3( 10, 0, 10 )
] );
const geometry = new THREE.TubeGeometry( tubeCurve, 60, 0.2, 5, false );
const material = new THREE.MeshBasicMaterial( { color: 0xff0000 } );
const mesh = new THREE.Mesh( geometry, material );
scene.add( mesh );

if (WebGL.isWebGLAvailable()) {
    // Initiate function or other initializations here
    animate();
} else {
    const warning = WebGL.getWebGLErrorMessage();
    document.getElementById('container').appendChild(warning);
}

function animate() {
    requestAnimationFrame(animate);
    // Rotate the cube
    // cube.rotation.x += 0.01;
    // cube.rotation.y += 0.01;
    let lookingAt = tubeCurve.getPointAt(counter);
    camera.lookAt(lookingAt.x, lookingAt.y, lookingAt.z)
    // console.log("counter", counter);
    // console.log("tubeCurve.getPointAt", tubeCurve.getPoint(counter));
    renderer.render(scene, camera);
    counter += 0.001;
    if (counter > 1) {
        counter -= 1
    }
}