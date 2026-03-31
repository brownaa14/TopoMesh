// lib/stl.ts

import { Mesh } from './mesh'

export function meshToSTL(mesh: Mesh): ArrayBuffer {
    const triangleCount = mesh.indices.length / 3
    const bufferSize = 80 + 4 + triangleCount * 50

    // Use ArrayBuffer directly instead of Node.js Buffer
    const arrayBuffer = new ArrayBuffer(bufferSize)
    const view = new DataView(arrayBuffer)

    // Write 80-byte header
    const header = 'Terrain Tool STL export'.padEnd(80, ' ')
    for (let i = 0; i < 80; i++) {
        view.setUint8(i, header.charCodeAt(i))
    }

    // Write triangle count
    view.setUint32(80, triangleCount, true)

    let offset = 84

    for (let i = 0; i < mesh.indices.length; i += 3) {
        const i0 = mesh.indices[i] * 3
        const i1 = mesh.indices[i + 1] * 3
        const i2 = mesh.indices[i + 2] * 3

        const ax = mesh.vertices[i0], ay = mesh.vertices[i0 + 1], az = mesh.vertices[i0 + 2]
        const bx = mesh.vertices[i1], by = mesh.vertices[i1 + 1], bz = mesh.vertices[i1 + 2]
        const cx = mesh.vertices[i2], cy = mesh.vertices[i2 + 1], cz = mesh.vertices[i2 + 2]

        const ex = bx - ax, ey = by - ay, ez = bz - az
        const fx = cx - ax, fy = cy - ay, fz = cz - az
        const nx = ey * fz - ez * fy
        const ny = ez * fx - ex * fz
        const nz = ex * fy - ey * fx
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1

        // Write normal
        view.setFloat32(offset, nx / len, true); offset += 4
        view.setFloat32(offset, ny / len, true); offset += 4
        view.setFloat32(offset, nz / len, true); offset += 4

        // Write three vertices
        for (const [x, y, z] of [[ax, ay, az], [bx, by, bz], [cx, cy, cz]]) {
            view.setFloat32(offset, x, true); offset += 4
            view.setFloat32(offset, y, true); offset += 4
            view.setFloat32(offset, z, true); offset += 4
        }

        // Write attribute
        view.setUint16(offset, 0, true); offset += 2
    }

    return arrayBuffer
}