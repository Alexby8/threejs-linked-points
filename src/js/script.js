import '../css/style.css'
import * as THREE from 'three'
import * as dat from 'lil-gui'

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    maxY = camera.position.z * camera.getFilmHeight() / camera.getFocalLength()
    maxX = maxY * camera.aspect
})

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 1000)
scene.add(camera)
camera.position.z = 100
camera.lookAt(scene.position)

// Make canvas viewport equal window sizes
let maxY = camera.position.z * camera.getFilmHeight() / camera.getFocalLength()
let maxX = maxY * camera.aspect

/**
 * Particles
 */
const group = new THREE.Group()
scene.add( group )
const particlesData = []
const maxParticleCount = 1000
let particleCount = 200
const segments = maxParticleCount * maxParticleCount
const positions = new Float32Array( segments * 3 )
const colors = new Float32Array( segments * 3 )

const effectController = {
    minDistance: 12,
    limitConnections: true,
    maxConnections: 5,
    particleCount: particleCount,
}

// Material
const pMaterial = new THREE.PointsMaterial({
    color: 0xFFFFFF,
    size: 3,
    blending: THREE.AdditiveBlending,
    transparent: true,
    sizeAttenuation: false
})

// Geometry
const particles = new THREE.BufferGeometry()
const particlePositions = new Float32Array( maxParticleCount * 3 )

for (let i = 0; i < maxParticleCount; i ++) {
    particlePositions[i * 3 + 0] = Math.random() * maxX - maxX / 2
    particlePositions[i * 3 + 1] = Math.random() * maxY - maxY / 2
    particlePositions[i * 3 + 2] = 0

    particlesData.push({
        velocity: new THREE.Vector3(- 1 + Math.random() * 2, - 1 + Math.random() * 2, - 1 + Math.random() * 2),
        numConnections: 0
    })
}

particles.setDrawRange(0, particleCount)
particles.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3).setUsage(THREE.DynamicDrawUsage))

const pointCloud = new THREE.Points(particles, pMaterial)
group.add(pointCloud)

/**
 * Lines
 */
// Geometry
const geometry = new THREE.BufferGeometry()
geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ).setUsage( THREE.DynamicDrawUsage ) )
geometry.setAttribute( 'color', new THREE.BufferAttribute( colors, 3 ).setUsage( THREE.DynamicDrawUsage ) )
geometry.computeBoundingSphere()
geometry.setDrawRange( 0, 0 )

// Material
const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true
})

const linesMesh = new THREE.LineSegments(geometry, material)
group.add(linesMesh)

// Add new particle
document.addEventListener('click', (e) => {
    const x = e.clientX
    const y = e.clientY

    const pointX = x / sizes.width * maxX - maxX / 2
    const pointY = y / sizes.height * maxY - maxY / 2

    particlePositions[particleCount * 3 + 0] = pointX
    particlePositions[particleCount * 3 + 1] = - pointY

    particleCount++
    particles.setDrawRange( 0, particleCount )
    pointCloud.geometry.attributes.position.needsUpdate = true
})

/**
 * Debug
 */
const gui = new dat.GUI()
gui.add(effectController, "minDistance", 1, 50, 0.1)
gui.add(effectController, "maxConnections", 0, 30, 1)
gui.add(effectController, "particleCount", 0, maxParticleCount - 100, 1).onChange(function (value){
    particleCount = parseInt( value )
    particles.setDrawRange( 0, particleCount )
})

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.outputEncoding = THREE.sRGBEncoding

/**
 * Animate
 */
const tick = () =>
{
    // Animate
    let vertexpos = 0
    let colorpos = 0
    let numConnected = 0

    for (let i = 0; i < particleCount; i ++)
        particlesData[ i ].numConnections = 0

    for (let i = 0; i < particleCount; i ++) {
        const particleData = particlesData[ i ]

        particlePositions[i * 3 + 0] += particleData.velocity.x / 20
        particlePositions[i * 3 + 1] += particleData.velocity.y / 20

        if (particlePositions[i * 3 + 0] < - maxX / 2 || particlePositions[i * 3] > maxX / 2)
            particleData.velocity.x = - particleData.velocity.x

        if (particlePositions[i * 3 + 1] < - maxY / 2 || particlePositions[i * 3 + 1] > maxY / 2)
            particleData.velocity.y = - particleData.velocity.y

        if ( effectController.limitConnections && particleData.numConnections >= effectController.maxConnections )
            continue

        for (let j = i + 1; j < particleCount; j ++) {

            const particleDataB = particlesData[j]
            if (effectController.limitConnections && particleDataB.numConnections >= effectController.maxConnections)
                continue

            const dx = particlePositions[i * 3 + 0] - particlePositions[j * 3 + 0]
            const dy = particlePositions[i * 3 + 1] - particlePositions[j * 3 + 1]
            const dz = particlePositions[i * 3 + 2] - particlePositions[j * 3 + 2]
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

            if (dist < effectController.minDistance) {

                particleData.numConnections ++
                particleDataB.numConnections ++

                const alpha = 1.0 - dist / effectController.minDistance

                positions[vertexpos ++] = particlePositions[i * 3 + 0]
                positions[vertexpos ++] = particlePositions[i * 3 + 1]
                positions[vertexpos ++] = particlePositions[i * 3 + 2]

                positions[vertexpos ++] = particlePositions[j * 3 + 0]
                positions[vertexpos ++] = particlePositions[j * 3 + 1]
                positions[vertexpos ++] = particlePositions[j * 3 + 2]

                colors[colorpos ++] = alpha
                colors[colorpos ++] = alpha
                colors[colorpos ++] = alpha

                colors[colorpos ++] = alpha
                colors[colorpos ++] = alpha
                colors[colorpos ++] = alpha

                numConnected++
            }
        }

    }

    linesMesh.geometry.setDrawRange( 0, numConnected * 2 )
    linesMesh.geometry.attributes.position.needsUpdate = true
    linesMesh.geometry.attributes.color.needsUpdate = true

    pointCloud.geometry.attributes.position.needsUpdate = true

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
