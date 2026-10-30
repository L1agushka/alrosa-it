/**
 * Physically-based map generation for the Liquid Glass material.
 *
 * The glass is modelled as a slab whose rim (the "bezel") rises from the
 * element's border to a flat plateau following a convex squircle profile -
 * the same soft flat-to-curve transition Apple uses. For every distance
 * from the border we refract a straight-down view ray through that surface
 * with Snell's law (n = ior) and measure how far sideways it lands on the
 * content under the glass. That 1D curve is then swept around the element's
 * rounded-rect outline: direction = inward normal, length = refracted offset.
 */

export type SurfaceProfile = "squircle" | "circle" | "lip"

export type GlassShape = {
  width: number
  height: number
  radius: number
}

export type OpticsOptions = {
  /** Width of the curved rim in px. The plateau inside it is flat (no bend). */
  bezel: number
  /** Finite, non-negative height at the plateau in px. Taller glass = stronger bend. */
  thickness: number
  /** Finite positive index of refraction. Glass ≈ 1.5, water ≈ 1.33. */
  ior: number
  profile: SurfaceProfile
}

const SAMPLES = 256

function profileHeight(profile: SurfaceProfile, t: number): number {
  // t: 0 at the outer edge, 1 where the bezel meets the flat plateau.
  t = Math.min(1, Math.max(0, t))
  const convexSquircle = Math.pow(1 - Math.pow(1 - t, 4), 1 / 4)
  switch (profile) {
    case "circle":
      return Math.sqrt(1 - (1 - t) * (1 - t))
    case "lip": {
      // Raised lip with a shallow dip towards the plateau (concave inner part).
      const s = t * t * t * (t * (t * 6 - 15) + 10)
      return convexSquircle * (1 - s) + (1 - convexSquircle * 0.35) * s
    }
    default:
      return convexSquircle
  }
}

/**
 * Lateral displacement (px, positive = sample further inward) for `SAMPLES`
 * distances across the bezel.
 */
export function refractionProfile({ bezel, thickness, ior, profile }: OpticsOptions): Float32Array {
  if (!Number.isFinite(bezel) || bezel <= 0 || !Number.isFinite(thickness) || thickness < 0 || !Number.isFinite(ior) || ior <= 0) {
    throw new RangeError("Glass optics require a finite positive bezel and ior, and a finite non-negative thickness")
  }
  const out = new Float32Array(SAMPLES)
  const eta = 1 / ior
  const h = 1e-3
  for (let i = 0; i < SAMPLES; i++) {
    const t = (i + 0.5) / SAMPLES
    const z = profileHeight(profile, t) * thickness
    // dz/dd in px/px
    const slope = ((profileHeight(profile, t + h) - profileHeight(profile, t - h)) / (2 * h)) * (thickness / bezel)
    // Surface normal in (inward, up) space: (-slope, 1) normalised.
    const inv = 1 / Math.hypot(slope, 1)
    const nx = -slope * inv
    const nz = inv
    // Incident ray points straight down: I = (0, -1). cos(theta_i) = n·(-I) = nz.
    const cosi = nz
    const k = 1 - eta * eta * (1 - cosi * cosi)
    if (k < 0) {
      out[i] = 0
      continue
    }
    const f = eta * cosi - Math.sqrt(k)
    const tx = f * nx // eta * Ix (= 0) + f * nx
    const tz = -eta + f * nz
    // Travel down through the glass (height z) to the content plane.
    out[i] = (tx / -tz) * z
  }
  return out
}

type Field = {
  /** Inside distance to the border (px). Negative outside. */
  dist: number
  nx: number
  ny: number
}

function roundedRectField(px: number, py: number, w: number, h: number, r: number, f: Field) {
  const hw = w / 2
  const hh = h / 2
  const dx = px - hw
  const dy = py - hh
  const sx = dx < 0 ? -1 : 1
  const sy = dy < 0 ? -1 : 1
  const qx = Math.abs(dx) - (hw - r)
  const qy = Math.abs(dy) - (hh - r)
  if (qx > 0 && qy > 0) {
    const len = Math.hypot(qx, qy)
    f.dist = r - len
    f.nx = (sx * qx) / len
    f.ny = (sy * qy) / len
  } else if (qx > qy) {
    f.dist = r - qx
    f.nx = sx
    f.ny = 0
  } else {
    f.dist = r - qy
    f.nx = 0
    f.ny = sy
  }
}

export function clampShape(shape: GlassShape): GlassShape {
  const width = Math.max(1, Math.round(shape.width))
  const height = Math.max(1, Math.round(shape.height))
  return { width, height, radius: Math.min(shape.radius, width / 2, height / 2) }
}

export type DisplacementMap = {
  /** RGBA pixels: R = x, G = y, 128 = no displacement. */
  data: Uint8ClampedArray
  width: number
  height: number
  /** Value for feDisplacementMap's `scale` attribute. */
  scale: number
}

export function buildDisplacementMap(shape: GlassShape, optics: OpticsOptions): DisplacementMap {
  const { width, height, radius } = clampShape(shape)
  const bezel = Math.max(1, Math.min(optics.bezel, width / 2, height / 2))
  const profile = refractionProfile({ ...optics, bezel })
  let max = 0
  for (let i = 0; i < profile.length; i++) max = Math.max(max, Math.abs(profile[i]))
  max = max || 1

  const data = new Uint8ClampedArray(width * height * 4)
  const f: Field = { dist: 0, nx: 0, ny: 0 }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4
      roundedRectField(x + 0.5, y + 0.5, width, height, radius, f)
      let vx = 0
      let vy = 0
      if (f.dist >= 0 && f.dist < bezel) {
        const s = profile[Math.min(SAMPLES - 1, Math.floor((f.dist / bezel) * SAMPLES))] / max
        // Inward = -normal. Positive value means "sample from further inside".
        vx = -f.nx * s
        vy = -f.ny * s
      }
      data[o] = 128 + vx * 127
      data[o + 1] = 128 + vy * 127
      data[o + 2] = 128
      data[o + 3] = 255
    }
  }
  // feDisplacementMap: P'(x) = P(x + scale * (C - 0.5)), C in [0, 1].
  return { data, width, height, scale: max * 2 }
}

export type SpecularOptions = {
  /** Light direction in degrees (0 = from the right, -90 = from the top). */
  angle: number
  /** Width of the bright rim line in px. */
  rimWidth: number
  /** Width of the soft glow that fades inward from the rim, in px. */
  glowWidth: number
}

/** Alpha mask (white) of the specular rim highlight, at device-pixel resolution. */
export function buildSpecularMap(shape: GlassShape, opts: SpecularOptions, dpr = 1): ImageData {
  const { width, height, radius } = clampShape(shape)
  const W = Math.round(width * dpr)
  const H = Math.round(height * dpr)
  const img = new ImageData(W, H)
  const d = img.data
  const cutoff = Math.max(opts.rimWidth * 6, opts.glowWidth * 3.5)
  const lx = Math.cos((opts.angle * Math.PI) / 180)
  const ly = Math.sin((opts.angle * Math.PI) / 180)
  const f: Field = { dist: 0, nx: 0, ny: 0 }
  // Pixels in this inner box are provably further than `cutoff` from the
  // border, so the (expensive) per-pixel work can skip straight past them.
  const R = Math.max(cutoff, radius) * dpr
  const skipY0 = cutoff * dpr
  const skipY1 = H - cutoff * dpr
  for (let y = 0; y < H; y++) {
    const rowSkip = y > skipY0 && y < skipY1
    for (let x = 0; x < W; x++) {
      if (rowSkip && x > R && x < W - R) {
        x = Math.floor(W - R)
        continue
      }
      roundedRectField((x + 0.5) / dpr, (y + 0.5) / dpr, width, height, radius, f)
      // Outside the shape, or deep inside where the glow has faded to nothing.
      if (f.dist < 0 || f.dist > cutoff) continue
      // Highlight is strongest where the rim faces the light, and on the
      // opposite side (light that crossed the glass and exits there).
      const facing = f.nx * lx + f.ny * ly
      const lit = Math.pow(Math.abs(facing), 1.6)
      // Lit side full strength; the opposite rim catches the light that
      // crossed the glass, a little weaker.
      const directional = facing < 0 ? lit : lit * 0.7
      const ambient = 0.3
      const line = Math.exp(-Math.pow(f.dist / opts.rimWidth, 2))
      const inner = Math.exp(-Math.pow((f.dist - opts.rimWidth * 2.2) / opts.rimWidth, 2)) * 0.35
      const glow = Math.exp(-f.dist / opts.glowWidth) * (0.06 + 0.3 * directional)
      // Anti-alias the outer edge.
      const aa = Math.min(1, f.dist * dpr + 0.5)
      const a = ((line + inner) * (ambient + directional * 0.7) + glow) * aa
      const o = (y * W + x) * 4
      d[o] = d[o + 1] = d[o + 2] = 255
      d[o + 3] = Math.min(255, a * 255)
    }
  }
  return img
}

export function imageDataToUrl(data: ImageData | DisplacementMap): string {
  const canvas = document.createElement("canvas")
  canvas.width = data.width
  canvas.height = data.height
  const ctx = canvas.getContext("2d")!
  const img = data instanceof ImageData ? data : new ImageData(data.data as unknown as Uint8ClampedArray<ArrayBuffer>, data.width, data.height)
  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL("image/png")
}

/**
 * Alpha mask that is opaque on the flat plateau and fades out across the
 * bezel. Used for the tint layer: real Liquid Glass keeps the rim clear and
 * bright (it shows the refracted backdrop), while the centre carries the tint.
 */
export function buildInteriorMask(shape: GlassShape, bezel: number, dpr = 1): ImageData {
  const { width, height, radius } = clampShape(shape)
  bezel = Math.max(1, Math.min(bezel, width / 2, height / 2))
  const W = Math.round(width * dpr)
  const H = Math.round(height * dpr)
  const img = new ImageData(W, H)
  const d = img.data
  const f: Field = { dist: 0, nx: 0, ny: 0 }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      roundedRectField((x + 0.5) / dpr, (y + 0.5) / dpr, width, height, radius, f)
      const t = Math.min(1, Math.max(0, f.dist / bezel))
      const s = t * t * (3 - 2 * t)
      const o = (y * W + x) * 4
      d[o] = d[o + 1] = d[o + 2] = 255
      d[o + 3] = (0.25 + 0.75 * s) * 255
    }
  }
  return img
}
