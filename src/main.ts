import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { Clock } from 'three'
import { GUI } from 'dat.gui'


// https://tympanus.net/codrops/2021/10/27/creating-the-effect-of-transparent-glass-and-plastic-in-three-js/
// https://codesandbox.io/s/qxjoj
// https://glitch.com/edit/#!/joyous-enthusiastic-vase

const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.01,
  100
)
camera.position.set(0, 0, 5)

const bgElement = document.querySelector('#bg')
const canvas = bgElement instanceof HTMLCanvasElement ? bgElement : undefined

const renderer = new THREE.WebGLRenderer({
  canvas: canvas
})

renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setClearColor(0x1f1e1c, 0)

const renderPass = new RenderPass(scene, camera)
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.5,
  0.33,
  0.85
)
const composer = new EffectComposer(renderer)
composer.addPass(renderPass)
// composer.addPass(bloomPass)

new OrbitControls(camera, renderer.domElement)
// const controls = new OrbitControls(camera, renderer.domElement)
// controls.addEventListener('change', render)

const icosahedronGeometry = new THREE.IcosahedronGeometry(1, 0)

const normalMaterial = new THREE.MeshNormalMaterial()
const metalMaterial = new THREE.MeshPhysicalMaterial({
  metalness: 0,
  roughness: 0
})
const whiteMaterial = new THREE.MeshBasicMaterial()

const hdrEquirect = new RGBELoader().load(
  'empty_warehouse_01_1k.hdr',
  () => {
    hdrEquirect.mapping = THREE.EquirectangularReflectionMapping
  }
)

const transmissionMaterialConfig = {
  clearcoat: 0,
  clearcoatRoughness: 0,
  envMap: hdrEquirect,
  envMapIntensity: 0.4,
  metalness: 0,
  roughness: 0.2,
  thickness: 1,
  transmission: 1,
}
const transmissionMaterial = new THREE.MeshPhysicalMaterial(transmissionMaterialConfig)

const bgTexture = new THREE.TextureLoader().load('texture.jpg')
const textureMaterial = new THREE.MeshBasicMaterial({
  map: bgTexture
})

const bgGeometry = new THREE.PlaneGeometry(5, 5)

const bgMesh = new THREE.Mesh(bgGeometry, textureMaterial)
bgMesh.position.set(0, 0, -1)
scene.add(bgMesh)

const icosahedronMesh = new THREE.Mesh(icosahedronGeometry, transmissionMaterial)
// scene.add(icosahedronMesh)

new GLTFLoader().load("26x4-dragon.glb", (gltf) => {
  const dragon = gltf.scene.children.find((mesh) => mesh.name === "Dragon")

  if (dragon instanceof THREE.Mesh) {
    const dragonGeometry = dragon.geometry.clone()

    dragonGeometry.rotateX(Math.PI / 2)
    dragonGeometry.translate(0, -4, 0)

    const dragonMesh = new THREE.Mesh(dragonGeometry, transmissionMaterial)
    dragonMesh.scale.set(0.25, 0.25, 0.25)
    // scene.add(dragonMesh)

  } else {
    console.log("Dragon is not a mesh")
  }

  gltf.scene.children.forEach((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose()
      child.material.dispose()
    }
  })
})

let burgerMesh: THREE.Mesh

new GLTFLoader().load("burger-milan-export.glb", (gltf) => {
  const burger = gltf.scene.children.find((mesh) => mesh.name === "Burger")

  if (burger instanceof THREE.Mesh) {
    const geometry = burger.geometry.clone()

    geometry.rotateX(0)
    geometry.rotateY(-0.5)
    geometry.rotateZ(0.4)
    // geometry.translate(0, -4, 0)

    burgerMesh = new THREE.Mesh(geometry, transmissionMaterial)
    burgerMesh.scale.set(2, 2, 2)
    scene.add(burgerMesh)

  } else {
    console.log("Burger is not a mesh")
  }

  gltf.scene.children.forEach((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose()
      child.material.dispose()
    }
  })
})

const light = new THREE.DirectionalLight(0xfff0dd, 1)
light.position.set(0, 5, 10)
scene.add(light)

function render() {
  // renderer.render(scene, camera)
  composer.render()
}

// render()

// Add controls
var gui = new GUI();

// const envMaps = {'envMap': hdrEquirect, 'none': null}
// const envMapsKeys = ['envMap', 'none']
// const data = {
//   envMaps: envMapsKeys[0]
// }

const bgMeshMaterials = {'texture': textureMaterial, 'white': whiteMaterial}
const bgMeshMaterialsKeys = ['texture', 'white']
const bgMeshMaterialsData = {
  bgMeshMaterials: bgMeshMaterialsKeys[0]
}

gui.add(transmissionMaterial, 'clearcoat', 0, 1, 0.01);
gui.add(transmissionMaterial, 'clearcoatRoughness', 0, 1, 0.01);
// gui.add(data, 'envMaps', envMapsKeys).onChange((value) => transmissionMaterial.envMap = envMaps[value]);
gui.add(transmissionMaterial, 'envMapIntensity', 0, 1, 0.01);
gui.add(transmissionMaterial, 'metalness', 0, 1, 0.01);
gui.add(transmissionMaterial, 'roughness', 0, 1, 0.01);
gui.add(transmissionMaterial, 'thickness', 0, 10, 0.1);
gui.add(transmissionMaterial, 'transmission', 0, 1, 0.01);
// @ts-ignore
gui.add(bgMeshMaterialsData, 'bgMeshMaterials', bgMeshMaterialsKeys).onChange((value:string) => bgMesh.material = bgMeshMaterials[value])


const clock = new Clock()

function animate() {
  requestAnimationFrame(animate)

  if (burgerMesh) {
    // const now = Date.now()
    const now = clock.getElapsedTime()
    const slowdown = 1 // 0.002
    const rotationSpeedY = 50
    // burgerMesh.rotation.x = Math.cos(now / 4 * slowdown) / 8
    burgerMesh.rotation.y = 2 * Math.PI * (now % rotationSpeedY) / rotationSpeedY
    burgerMesh.rotation.z = -0.2 - (1 +  Math.sin(now / 1.5 * slowdown)) / 20
    burgerMesh.position.y = (1 + Math.sin(now / 1.5 * slowdown)) / 10


    // burgerMesh.rotation.x += 0.01
  }

  render()
}

animate()