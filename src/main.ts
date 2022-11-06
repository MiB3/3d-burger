import './style.css'
import * as THREE from 'three'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { Clock } from 'three'
import { GUI } from 'dat.gui'

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
composer.addPass(bloomPass)

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

let burgerMesh: THREE.Mesh

new GLTFLoader().load("burger-milan-export.glb", (gltf) => {
  const burger = gltf.scene.children.find((mesh) => mesh.name === "Burger")

  if (burger instanceof THREE.Mesh) {
    const geometry = burger.geometry.clone()

    geometry.rotateX(0)
    geometry.rotateY(-0.5)
    geometry.rotateZ(0.4)

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
  composer.render()
}

function addGui() {
  // Add controls
  var gui = new GUI({ width: 350 } );

  let bgMeshMaterials:any = {'Default texture': textureMaterial, 'White': whiteMaterial, '> Upload own texture': undefined}
  const bgMeshMaterialsKeys = () => {
    return Object.keys(bgMeshMaterials)
  }
  let bgMeshMaterialsData = {
    bgMeshMaterials: bgMeshMaterialsKeys()[0]
  }

  function updateDropdown(target: any, list:any, toSelect:any){
    let innerHTMLStr = "";
    for(var i=0; i<list.length; i++){
        var str = "<option value='" + list[i] + "'>" + list[i] + "</option>";
        innerHTMLStr += str;
    }

    if (innerHTMLStr != "") {
      target.domElement.children[0].innerHTML = innerHTMLStr;
    }

    // set the new value
    target.setValue(toSelect)
    target.domElement.children[0].selectedIndex = list.indexOf(toSelect)
  }

  // upload custom backgroudn texture
  const bgMeshMaterialTextureInput = document.createElement('input');
  bgMeshMaterialTextureInput.type = 'file';
  document.querySelector('body')?.appendChild(bgMeshMaterialTextureInput)
  bgMeshMaterialTextureInput.onchange = (e) => {
    // getting a hold of the file reference
    const inputElement = e.target as HTMLInputElement
    const file = inputElement.files?.item(0);

    if (!file) {
      return
    }

    const fileUrl = URL.createObjectURL(file);
    const bgTexture = new THREE.TextureLoader().load(fileUrl)
    const textureMaterial = new THREE.MeshBasicMaterial({map: bgTexture})

    const textureName = 'Upload ' + (bgMeshMaterialsKeys().length - 2)
    bgMeshMaterials[textureName] = textureMaterial
    updateDropdown(bgMeshMaterialGUIController, bgMeshMaterialsKeys(), textureName)
  }

  gui.add(transmissionMaterial, 'clearcoat', 0, 1, 0.01);
  gui.add(transmissionMaterial, 'clearcoatRoughness', 0, 1, 0.01);
  gui.add(transmissionMaterial, 'envMapIntensity', 0, 1, 0.01);
  gui.add(transmissionMaterial, 'metalness', 0, 1, 0.01);
  gui.add(transmissionMaterial, 'roughness', 0, 1, 0.01);
  gui.add(transmissionMaterial, 'thickness', 0, 10, 0.1);
  gui.add(transmissionMaterial, 'transmission', 0, 1, 0.01);
  // @ts-ignore
  let bgMeshMaterialGUIController = gui.add(bgMeshMaterialsData, 'bgMeshMaterials', bgMeshMaterialsKeys()).onChange((value: string) => {
    if (value === '> Upload own texture') {
      bgMeshMaterialTextureInput.click();
    } else {
      bgMesh.material = bgMeshMaterials[value]
    }
  }).listen()
  bgMeshMaterialGUIController.domElement.addEventListener('click', (_e) => {
    // fix for ios Safari not allowing .click() via JS if not in a click context
    if (bgMeshMaterialGUIController.getValue() === '> Upload own texture') {
      bgMeshMaterialTextureInput.click();
    }
  })
  gui.add({bloomPass: true}, 'bloomPass').onChange((value:boolean) => {
    if (value) {
      composer.addPass(bloomPass)
    } else {
      composer.removePass(bloomPass)
    }
  })
}

const clock = new Clock()

type Position = {x: number, y: number}
var mouseDownPosition : Position | null;
var mouseMovePosition: Position | null;
var mousDownTime = 0;
var rotationSpeedY = 0;
const raycaster = new THREE.Raycaster();

function mouseStartEventHandler(clientX: number, clientY: number) {
  const currentPosition = {x: clientX, y: clientY}

  var rect = renderer.domElement.getBoundingClientRect();
  var mouse = new THREE.Vector2()
  mouse.x = ( ( clientX - rect.left ) / rect.width ) * 2 - 1;
  mouse.y = - ( ( clientY - rect.top ) / rect.height ) * 2 + 1;

  raycaster.setFromCamera( mouse, camera );
  const intersects = raycaster.intersectObjects( [burgerMesh] );
  if (intersects.length == 0) {
    return
  }

  mousDownTime = clock.getElapsedTime()
  mouseDownPosition = currentPosition
  mouseMovePosition = null
  rotationSpeedY = 0
}

function mouseMoveEventHandler(clientX: number, clientY: number, speedUpFactor = 1) {
  if (!mouseDownPosition) {
    return
  }

  const currentPosition = {x: clientX, y: clientY}
  const referencePosition = mouseMovePosition ? mouseMovePosition : mouseDownPosition

  const dragLength = Math.sqrt(Math.pow(currentPosition.x - referencePosition.x, 2) + Math.pow(currentPosition.y - referencePosition.y, 2))
  const dragTime = clock.getElapsedTime() - mousDownTime
  if (dragTime === 0) {
    return
  }

  const dragDirection = Math.sign(currentPosition.x - referencePosition.x)
  const damping = 30000 / speedUpFactor
  rotationSpeedY += dragDirection * dragLength / dragTime / damping

  mouseMovePosition = currentPosition
}

function addMouseControls() {
  canvas?.addEventListener('mousedown', (e) => {
    mouseStartEventHandler(e.clientX, e.clientY)
  })

  canvas?.addEventListener('touchstart', (e) => {
    e.preventDefault()

    const firstTouch = e.touches.item(0)
    if (firstTouch) {
      mouseStartEventHandler(firstTouch.clientX, firstTouch.clientY)
    }
  })

  canvas?.addEventListener('mousemove', (e) => {
    mouseMoveEventHandler(e.clientX, e.clientY)
  })

  canvas?.addEventListener('touchmove', (e) => {
    const firstTouch = e.touches.item(0)
    if (firstTouch) {
      mouseMoveEventHandler(firstTouch.clientX, firstTouch.clientY, 2)
    }
  })

  canvas?.addEventListener('mouseup', (_e) => {
    mouseMovePosition = null
    mouseDownPosition = null
  })

  canvas?.addEventListener('touchend', (_e) => {
    mouseMovePosition = null
    mouseDownPosition = null
  })

  canvas?.addEventListener('touchcancel', (_e) => {
    mouseMovePosition = null
    mouseDownPosition = null
  })
}

function animate() {
  requestAnimationFrame(animate)

  if (burgerMesh) {
    const now = clock.getElapsedTime()
    burgerMesh.rotation.y += rotationSpeedY
    burgerMesh.rotation.z = -0.2 - (1 +  Math.sin(now / 1.5)) / 20
    burgerMesh.position.y = (1 + Math.sin(now / 1.5)) / 10
  }

  render()
}

addGui()
addMouseControls()
animate()