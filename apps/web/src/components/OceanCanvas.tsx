import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface OceanCanvasProps {
  className?: string
}

export default function OceanCanvas({ className }: OceanCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const w = mount.clientWidth || window.innerWidth
    const h = mount.clientHeight || window.innerHeight

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 1000)
    camera.position.set(0, 6, 14)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)

    // Ocean plane
    const segments = 80
    const geometry = new THREE.PlaneGeometry(50, 50, segments, segments)
    geometry.rotateX(-Math.PI / 2)

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#001d32'),
      transparent: true,
      opacity: 0.75,
      metalness: 0.3,
      roughness: 0.6,
      wireframe: false,
    })

    const ocean = new THREE.Mesh(geometry, material)
    scene.add(ocean)

    // Wireframe overlay for depth
    const wireMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#0077b6'),
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    })
    const wireOcean = new THREE.Mesh(geometry, wireMat)
    scene.add(wireOcean)

    // Lights
    const ambient = new THREE.AmbientLight(0x003355, 1.2)
    scene.add(ambient)

    const dirLight = new THREE.DirectionalLight(0x0099cc, 2.5)
    dirLight.position.set(8, 12, 6)
    scene.add(dirLight)

    const rimLight = new THREE.PointLight(0x00acc1, 4, 30)
    rimLight.position.set(-5, 4, -8)
    scene.add(rimLight)

    const warmLight = new THREE.PointLight(0xffca4d, 1.5, 25)
    warmLight.position.set(10, 2, 5)
    scene.add(warmLight)

    // Floating particles
    const particleCount = 120
    const particleGeo = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 45
      positions[i * 3 + 1] = Math.random() * 3 + 0.5
      positions[i * 3 + 2] = (Math.random() - 0.5) * 45
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const particleMat = new THREE.PointsMaterial({
      color: 0x95ccff,
      size: 0.08,
      transparent: true,
      opacity: 0.6,
    })
    const particles = new THREE.Points(particleGeo, particleMat)
    scene.add(particles)

    const clock = new THREE.Clock()
    const posAttr = geometry.attributes.position as THREE.BufferAttribute
    let animId: number

    function animate() {
      animId = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()

      // Wave vertices
      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i)
        const z = posAttr.getZ(i)
        const y =
          Math.sin(x * 0.25 + t * 0.7) * 0.45 +
          Math.sin(z * 0.3 + t * 0.5) * 0.35 +
          Math.sin((x + z) * 0.15 + t * 1.1) * 0.2 +
          Math.cos(x * 0.1 - z * 0.2 + t * 0.4) * 0.15
        posAttr.setY(i, y)
      }
      posAttr.needsUpdate = true
      geometry.computeVertexNormals()

      // Drift lights
      rimLight.position.x = Math.sin(t * 0.4) * 8
      rimLight.position.z = Math.cos(t * 0.3) * 8
      warmLight.position.x = Math.cos(t * 0.25) * 10

      // Drift particles
      const pPos = particleGeo.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < particleCount; i++) {
        const py = pPos.getY(i)
        pPos.setY(i, py + Math.sin(t + i) * 0.002)
      }
      pPos.needsUpdate = true

      renderer.render(scene, camera)
    }

    animate()

    const handleResize = () => {
      if (!mount) return
      const nw = mount.clientWidth
      const nh = mount.clientHeight
      camera.aspect = nw / nh
      camera.updateProjectionMatrix()
      renderer.setSize(nw, nh)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
      geometry.dispose()
      material.dispose()
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [])

  return <div ref={mountRef} className={className} />
}
