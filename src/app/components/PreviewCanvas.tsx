'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { BBox, TerrainParams } from '@/types/terrain'

type PreviewCanvasProps = {
    bbox: BBox | null
    params: TerrainParams
}

// Generates a fake height grid using sine waves
// Returns a 2D array of height values between 0 and 1
function generateFakeGrid(width: number, height: number): number[][] {
    const grid: number[][] = []
    for (let y = 0; y < height; y++) {
        const row: number[] = []
        for (let x = 0; x < width; x++) {
            // Combine multiple sine waves for a natural-looking terrain
            const nx = x / width
            const ny = y / height
            const h =
                0.5 * Math.sin(nx * Math.PI * 2) * Math.cos(ny * Math.PI * 2) +
                0.25 * Math.sin(nx * Math.PI * 5) * Math.sin(ny * Math.PI * 3) +
                0.15 * Math.cos(nx * Math.PI * 8 + ny * Math.PI * 4)
            // Normalise to 0-1 range
            row.push((h + 1) / 2)
        }
        grid.push(row)
    }
    return grid
}

// Converts a height grid into a Three.js BufferGeometry
// This is the core of how elevation data becomes a 3D mesh
function buildGeometry(
    grid: number[][],
    zScale: number,
    baseThickness: number
): THREE.BufferGeometry {
    const rows = grid.length
    const cols = grid[0].length

    const vertices: number[] = []
    const indices: number[] = []
    const normals: number[] = []

    // Build a vertex for each grid point
    // x and z are horizontal position, y is height (Three.js uses Y-up)
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = (col / (cols - 1)) - 0.5  // centre around 0
            const z = (row / (rows - 1)) - 0.5  // centre around 0
            const y = grid[row][col] * zScale * 0.3 + baseThickness * 0.01

            vertices.push(x, y, z)
            // Placeholder normals — Three.js will compute these properly
            normals.push(0, 1, 0)
        }
    }

    // Build two triangles for each square of four vertices
    // A square at (col, row) has corners at indices:
    //   topLeft, topRight, bottomLeft, bottomRight
    for (let row = 0; row < rows - 1; row++) {
        for (let col = 0; col < cols - 1; col++) {
            const topLeft = row * cols + col
            const topRight = topLeft + 1
            const bottomLeft = (row + 1) * cols + col
            const bottomRight = bottomLeft + 1

            // Triangle 1: topLeft, bottomLeft, topRight
            indices.push(topLeft, bottomLeft, topRight)
            // Triangle 2: topRight, bottomLeft, bottomRight
            indices.push(topRight, bottomLeft, bottomRight)
        }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    geometry.setIndex(indices)
    // Recompute normals properly based on actual vertex positions
    geometry.computeVertexNormals()

    return geometry
}

export default function PreviewCanvas({ bbox, params }: PreviewCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
    const sceneRef = useRef<THREE.Scene | null>(null)
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
    const meshRef = useRef<THREE.Mesh | null>(null)
    const controlsRef = useRef<OrbitControls | null>(null)
    const animFrameRef = useRef<number>(0)

    // Initialise the Three.js scene once on mount
    useEffect(() => {
        if (!canvasRef.current) return

        // Scene
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0xf5f5f4)
        sceneRef.current = scene

        // Camera — positioned above and in front of the terrain
        const camera = new THREE.PerspectiveCamera(45, canvasRef.current.clientWidth / canvasRef.current.clientHeight, 0.01, 100)
        camera.position.set(0, 0.8, 1.2)
        camera.lookAt(0, 0, 0)
        cameraRef.current = camera

        // Renderer
        const renderer = new THREE.WebGLRenderer({
            canvas: canvasRef.current,
            antialias: true
        })
        renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight)
        renderer.setPixelRatio(window.devicePixelRatio)
        rendererRef.current = renderer

        // Lights
        const ambient = new THREE.AmbientLight(0xffffff, 0.6)
        scene.add(ambient)

        const directional = new THREE.DirectionalLight(0xffffff, 1.2)
        directional.position.set(1, 2, 1)
        scene.add(directional)

        // OrbitControls — lets the user rotate and zoom with mouse
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true  // smooth inertia on mouse release
        controls.dampingFactor = 0.05
        controlsRef.current = controls

        // Initial terrain mesh with fake data
        const grid = generateFakeGrid(40, 40)
        const geometry = buildGeometry(grid, params.zScale, params.baseThickness)
        const material = new THREE.MeshPhongMaterial({
            color: 0x4a7c59,
            shininess: 20,
            side: THREE.DoubleSide
        })
        const mesh = new THREE.Mesh(geometry, material)
        scene.add(mesh)
        meshRef.current = mesh

        // Animation loop — runs every frame to re-render
        // This is necessary for OrbitControls to feel smooth
        function animate() {
            animFrameRef.current = requestAnimationFrame(animate)
            controls.update()
            renderer.render(scene, camera)
        }
        animate()

        // Cleanup on unmount
        return () => {
            cancelAnimationFrame(animFrameRef.current)
            controls.dispose()
            renderer.dispose()
            geometry.dispose()
            material.dispose()
        }
    }, [])  // empty array — only runs once

    // Re-build the mesh whenever params change
    useEffect(() => {
        if (!sceneRef.current || !meshRef.current) return

        const grid = generateFakeGrid(40, 40)
        const newGeometry = buildGeometry(grid, params.zScale, params.baseThickness)

        // Dispose the old geometry to free GPU memory
        meshRef.current.geometry.dispose()
        meshRef.current.geometry = newGeometry

    }, [params.zScale, params.baseThickness])

    return (
        <div className="w-full h-48 border-b border-gray-100 relative bg-stone-100">
            <canvas
                ref={canvasRef}
                className="w-full h-full"
            />
            {/* Empty state overlay — shown when no bbox selected */}
            {!bbox && (
                <div className="absolute inset-0 flex items-center justify-center bg-stone-100">
                    <p className="text-xs text-gray-400">Draw a region to preview terrain</p>
                </div>
            )}
            {/* Scale bar */}
            {bbox && (
                <div className="absolute bottom-2 left-3 flex flex-col gap-1">
                    <div className="w-12 h-0.5 bg-gray-400" />
                    <span className="text-xs text-gray-400">{params.printWidth} mm</span>
                </div>
            )}
        </div>
    )
}