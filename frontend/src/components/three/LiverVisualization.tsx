import { Suspense, useRef, useMemo, useEffect, Component } from 'react'
import type { ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, ContactShadows, useGLTF, Environment } from '@react-three/drei'
import * as THREE from 'three'
import type { RiskLevel } from '../../types'

// ─────────────────────────────────────────────────────────────────────────────
// Seeded RNG — deterministic capsule texture on every render
// ─────────────────────────────────────────────────────────────────────────────
function seededRng(seed: number) {
  let s = seed
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff }
}

// ─────────────────────────────────────────────────────────────────────────────
// Glisson's capsule bump map  (lobule micro-bumps + fibrous striations)
// ─────────────────────────────────────────────────────────────────────────────
function createCapsuleBumpMap(): THREE.Texture {
  const S = 1024
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')!
  const rng = seededRng(0x7E5514)
  ctx.fillStyle = 'rgb(128,128,128)'; ctx.fillRect(0, 0, S, S)
  for (let i = 0; i < 5000; i++) {
    const x = rng()*S, y = rng()*S, r = 4+rng()*11
    const up = rng()>0.38, a = 0.06+rng()*0.09
    const g = ctx.createRadialGradient(x,y,0,x,y,r)
    g.addColorStop(0, up?`rgba(162,162,162,${a})`:`rgba(94,94,94,${a})`)
    g.addColorStop(1,'rgba(128,128,128,0)')
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle=g; ctx.fill()
  }
  for (let i = 0; i < 420; i++) {
    const x=rng()*S,y=rng()*S,len=22+rng()*55,ang=rng()*Math.PI
    const v=rng()>0.5?148:110
    ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+Math.cos(ang)*len,y+Math.sin(ang)*len)
    ctx.strokeStyle=`rgba(${v},${v},${v},${0.04+rng()*0.05})`; ctx.lineWidth=0.4+rng(); ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3,2)
  return tex
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-risk config  (white material — vertex colours drive all pigmentation)
// ─────────────────────────────────────────────────────────────────────────────
interface Cfg { emissive:string; emInt:number; clearcoat:number; sheen:number; sheenColor:string }

const CONFIGS: Record<RiskLevel, Cfg> = {
  low:      { emissive:'#180402', emInt:0.05, clearcoat:0.78, sheen:0.24, sheenColor:'#CC4020' },
  moderate: { emissive:'#280602', emInt:0.14, clearcoat:0.86, sheen:0.34, sheenColor:'#D83010' },
  high:     { emissive:'#400404', emInt:0.23, clearcoat:0.94, sheen:0.50, sheenColor:'#E82010' },
}

// ─────────────────────────────────────────────────────────────────────────────
// Error boundary  (silently falls back to procedural if GLB is missing)
// ─────────────────────────────────────────────────────────────────────────────
class ModelErrorBoundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}> {
  state = { failed:false }
  static getDerivedStateFromError() { return { failed:true } }
  componentDidCatch(err:Error) { console.warn('[Liver] GLB unavailable →', err.message) }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

function ss(v:number,lo:number,hi:number):number {
  const t = Math.max(0,Math.min(1,(v-lo)/(hi-lo))); return t*t*(3-2*t)
}

// ─────────────────────────────────────────────────────────────────────────────
// Couinaud 8-segment colours  — living-liver vascular reddish-brown
// ─────────────────────────────────────────────────────────────────────────────
const SEG:[number,number,number][] = [
  [0.36,0.09,0.05],  // I   caudate — buried, darkest
  [0.50,0.14,0.08],  // II  L lat sup
  [0.55,0.16,0.09],  // III L lat inf
  [0.60,0.18,0.10],  // IV  L medial / quadrate
  [0.63,0.19,0.10],  // V   R ant inf
  [0.46,0.12,0.07],  // VI  R post inf — deeper, darker
  [0.52,0.15,0.08],  // VII R post sup
  [0.70,0.21,0.12],  // VIII R ant sup — brightest, most anterior
]

function segmentRGB(x:number,y:number,z:number):[number,number,number] {
  const rW=ss(x,-0.04,0.14), lW=ss(-x,0.16,0.34), sW=ss(y,-0.12,0.04)
  const aW=ss(z,-0.06,0.16), cW=ss(-z,0.44,0.62)*ss(1-Math.abs(x),0.36,0.62)*ss(y+0.5,0,0.28)
  const left=1-rW
  const W=[left*lW*sW, left*lW*(1-sW), left*(1-lW), rW*(1-sW)*aW, rW*(1-sW)*(1-aW), rW*sW*(1-aW), rW*sW*aW]
  const tot=W.reduce((a,b)=>a+b,0)||1
  let r=0,g=0,b=0
  W.forEach((w,i)=>{r+=(w/tot)*SEG[i+1][0];g+=(w/tot)*SEG[i+1][1];b+=(w/tot)*SEG[i+1][2]})
  const cf=cW*0.65
  return [r*(1-cf)+SEG[0][0]*cf, g*(1-cf)+SEG[0][1]*cf, b*(1-cf)+SEG[0][2]*cf]
}

// ─────────────────────────────────────────────────────────────────────────────
// Liver geometry
//
// Rebuilt from the sphere outward using anatomically-motivated deformation.
// Key improvements over the previous version:
//
//   • Right lobe ×1.72, left lobe ×0.88 — pronounced asymmetry
//   • Posterior face pulled inward 70 % — creates flat diaphragmatic contact
//   • Inferior flattening ×0.42 — very flat visceral surface
//   • Anterior knife-edge: inferior face raised 0.42 units at the front —
//     the liver's characteristic sharp inferior border
//   • Gallbladder fossa: anatomical depression for gallbladder seating
//   • Dome boost up to 0.80 total at right-posterior peak
// ─────────────────────────────────────────────────────────────────────────────
function buildLiverGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, 160, 120)
  const pos = geo.attributes.position as THREE.BufferAttribute
  const vc  = new Float32Array(pos.count*3)

  for (let i = 0; i < pos.count; i++) {
    const x0=pos.getX(i), y0=pos.getY(i), z0=pos.getZ(i)

    // ── Base ellipsoid —————————————————————————————————————————————
    const nx = x0>=0 ? x0*1.72 : x0*0.88
    let ny    = y0*0.60
    let nz    = z0*0.86

    // ── 1. Diaphragmatic dome (right-posterior peak) ——————————————
    if (y0>0) {
      const rb=Math.max(0,nx/1.72), pb=Math.max(0,-nz/0.86)*0.62
      ny += y0*(0.26+rb*0.32+pb*rb*0.22)
      if (x0<-0.14) ny -= y0*Math.min(1,(-x0-0.14)/0.86)*0.18
    }

    // ── 2. Posterior face flattening (diaphragm contact) ——————————
    // Compresses the back of the liver inward: flat posterior, not round
    if (z0<-0.20) {
      const t=ss(-z0,0.20,0.94)
      nz = nz*(1-t*0.70)
    }

    // ── 3. Left lobe taper ————————————————————————————————————————
    if (x0<-0.50) {
      const t=Math.min(1,(-x0-0.50)/0.50)
      ny*=1-t*0.45; nz*=1-t*0.36
      if (t>0.60) ny+=t*0.044
    }

    // ── 4. Visceral (inferior) surface ————————————————————————————
    if (y0<-0.14) {
      ny*=0.42  // very flat — the visceral face is nearly horizontal

      // Porta hepatis H-groove (offset right of midline)
      const ph=(nx-0.22)*(nx-0.22)*3.8+nz*nz*10.5
      if (ph<0.52&&y0<-0.26) ny+=Math.exp(-ph*3.0)*0.080*Math.min(1,(-y0-0.26)/0.52)

      // Gallbladder fossa — oval depression, right inferior face
      const gf=((nx-0.62)/0.19)*((nx-0.62)/0.19)+((nz-0.22)/0.15)*((nz-0.22)/0.15)
      if (gf<1&&nx>0.35&&y0<-0.18) ny+=Math.exp(-gf*2.2)*0.048*Math.min(1,(-y0-0.18)/0.38)

      // Gastric impression — left inferior
      const gi=((nx+0.42)/0.32)*((nx+0.42)/0.32)+(nz/0.22)*(nz/0.22)
      if (gi<1&&nx<0.05&&y0<-0.18) ny+=Math.exp(-gi*1.9)*0.036*Math.min(1,(-y0-0.18)/0.44)

      // Hepatic flexure impression — right inferior
      const ci=((nx-0.68)/0.24)*((nx-0.68)/0.24)+((nz+0.16)/0.18)*((nz+0.16)/0.18)
      if (ci<1&&y0<-0.22) ny+=Math.exp(-ci*2.1)*0.026*Math.min(1,(-y0-0.22)/0.38)
    }

    // ── 5. Anterior knife-edge inferior border ————————————————————
    // Adds positive ny in the anterior-inferior zone so the bottom of the
    // liver converges upward toward the front — the characteristic thin edge
    if (z0>0.26&&y0<0.10) {
      const tZ=Math.min(1,(z0-0.26)/0.74)
      const tY=ss(-y0,0,1.0)
      ny+=tZ*tZ*tY*0.42
    }

    // ── 6. Falciform ligament groove ——————————————————————————————
    const fX=nx+0.06
    if (Math.abs(fX)<0.18&&ny>0.04&&nz>-0.22) {
      const fg=Math.exp(-(fX/0.11)*(fX/0.11))
      ny-=fg*0.082*Math.min(1,(ny-0.04)/0.38)
    }

    // ── 7. Hepatic vein boundary grooves (superior face) ——————————
    if (y0>0.06) {
      const yS=Math.min(1,(y0-0.06)/0.50)
      ny-=Math.exp(-((z0-0.08)/0.056)*((z0-0.08)/0.056))*Math.min(1,(nx-0.18)/0.90)*yS*0.022
      ny-=Math.exp(-((x0+0.27)/0.048)*((x0+0.27)/0.048))*Math.min(1,(-nx-0.08)/0.80)*yS*0.016
    }

    // ── 8. IVC posterior narrowing ————————————————————————————————
    if (z0<-0.56) nz*=1-Math.min(1,(-z0-0.56)/0.44)*0.06

    // ── 9. Glisson's capsule micro-undulation ————————————————————
    const cap =
      Math.sin(x0*9.1+z0*3.8)*Math.cos(y0*7.4)            *0.0112+
      Math.sin(y0*11.8+x0*5.3)*Math.cos(z0*9.5)           *0.0064+
      Math.sin(z0*7.1+y0*6.0)*Math.cos(x0*11.2+z0*2.1)    *0.0042

    pos.setXYZ(i, nx+cap, ny+cap*0.22, nz+cap)

    // ── Segment colour + lobule mottling —————————————————————————
    const [sr,sg,sb]=segmentRGB(x0,y0,z0)
    const m=Math.sin(nx*20+nz*8.4)*Math.cos(ny*20+nx*9.1)*Math.sin(nz*20+ny*11.0)
    vc[i*3]  =Math.max(0,Math.min(1,sr+m*0.016))
    vc[i*3+1]=Math.max(0,Math.min(1,sg+m*0.011))
    vc[i*3+2]=Math.max(0,Math.min(1,sb+m*0.006))
  }

  geo.setAttribute('color',new THREE.BufferAttribute(vc,3))
  geo.computeVertexNormals()
  return geo
}

// ─────────────────────────────────────────────────────────────────────────────
// Procedural liver scene
// ─────────────────────────────────────────────────────────────────────────────
function ProceduralLiver({ riskLevel }:{ riskLevel:RiskLevel }) {
  const groupRef = useRef<THREE.Group|null>(null)
  const geometry = useMemo(()=>buildLiverGeometry(),[])
  const bumpMap  = useMemo(()=>createCapsuleBumpMap(),[])
  const cfg      = CONFIGS[riskLevel]

  useEffect(()=>()=>{ geometry.dispose(); bumpMap.dispose() },[geometry,bumpMap])

  useFrame(({clock})=>{
    if (!groupRef.current) return
    const t=clock.elapsedTime
    // Breathing only — no continuous rotation; three-quarter view is held by camera
    groupRef.current.scale.setScalar(1+Math.sin(t*0.82)*0.008)
    groupRef.current.rotation.y=Math.sin(t*0.055)*0.12
    groupRef.current.rotation.x=Math.sin(t*0.20)*0.018
  })

  return (
    <group ref={groupRef} position={[0.16, 0, 0]}>

      {/* ── Main liver body ─────────────────────────────────────────── */}
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#FFFFFF" vertexColors
          bumpMap={bumpMap} bumpScale={0.010}
          emissive={cfg.emissive} emissiveIntensity={cfg.emInt}
          roughness={0.52} metalness={0}
          clearcoat={cfg.clearcoat} clearcoatRoughness={0.11}
          sheen={cfg.sheen} sheenRoughness={0.44} sheenColor={cfg.sheenColor}
        />
      </mesh>

      {/* ── Gallbladder — seated in the gallbladder fossa ────────────── */}
      {/* Positioned so the neck/fundus junction is at the liver surface level */}
      {/* (~30 % of the body is embedded; the fundus protrudes freely below) */}
      <mesh castShadow position={[0.62,-0.30,0.24]} scale={[0.17,0.26,0.14]}>
        <sphereGeometry args={[1,32,32]}/>
        <meshPhysicalMaterial color="#5A8020" emissive="#0A1400" emissiveIntensity={0.04}
          roughness={0.38} metalness={0} clearcoat={0.70} clearcoatRoughness={0.14}/>
      </mesh>
      {/* Cystic duct — tapers from gallbladder neck toward common bile duct */}
      <mesh castShadow position={[0.52,-0.26,0.27]} rotation={[0.80,0.24,-0.38]}>
        <cylinderGeometry args={[0.022,0.038,0.16,10]}/>
        <meshPhysicalMaterial color="#4A6A18" roughness={0.52} metalness={0} clearcoat={0.26}/>
      </mesh>

      {/* ── Hepatic hilum — all three structures embedded into the porta ── */}
      {/* Vessels use flared bases (wider top) so they look rooted in the liver */}

      {/* Portal vein — largest, dark maroon, enters from below */}
      <mesh castShadow position={[0.22,-0.40,0.14]} rotation={[1.48,0,0.22]}>
        <cylinderGeometry args={[0.040,0.072,0.54,16]}/>
        <meshPhysicalMaterial color="#3C0A0A" roughness={0.58} metalness={0} clearcoat={0.22}/>
      </mesh>
      {/* Left branch of portal vein */}
      <mesh castShadow position={[0.08,-0.36,0.10]} rotation={[1.55,-0.25,0.10]}>
        <cylinderGeometry args={[0.022,0.036,0.28,12]}/>
        <meshPhysicalMaterial color="#3C0A0A" roughness={0.58} metalness={0} clearcoat={0.20}/>
      </mesh>
      {/* Right branch of portal vein */}
      <mesh castShadow position={[0.44,-0.36,0.16]} rotation={[1.55,0.30,0.30]}>
        <cylinderGeometry args={[0.028,0.044,0.30,12]}/>
        <meshPhysicalMaterial color="#3C0A0A" roughness={0.58} metalness={0} clearcoat={0.20}/>
      </mesh>

      {/* Hepatic artery proper — bright arterial red */}
      <mesh castShadow position={[0.06,-0.38,0.20]} rotation={[1.50,0,-0.10]}>
        <cylinderGeometry args={[0.018,0.032,0.42,14]}/>
        <meshPhysicalMaterial color="#CC0808" roughness={0.36} metalness={0} clearcoat={0.38}/>
      </mesh>
      {/* Left hepatic artery branch */}
      <mesh castShadow position={[-0.05,-0.34,0.17]} rotation={[1.56,-0.18,0.0]}>
        <cylinderGeometry args={[0.011,0.018,0.22,10]}/>
        <meshPhysicalMaterial color="#CC0808" roughness={0.36} metalness={0} clearcoat={0.36}/>
      </mesh>
      {/* Right hepatic artery branch */}
      <mesh castShadow position={[0.24,-0.34,0.22]} rotation={[1.56,0.20,0.0]}>
        <cylinderGeometry args={[0.013,0.021,0.24,10]}/>
        <meshPhysicalMaterial color="#CC0808" roughness={0.36} metalness={0} clearcoat={0.36}/>
      </mesh>

      {/* Common hepatic duct — yellow-green */}
      <mesh castShadow position={[0.38,-0.38,0.11]} rotation={[1.47,0,0.30]}>
        <cylinderGeometry args={[0.013,0.022,0.38,12]}/>
        <meshPhysicalMaterial color="#6A7818" roughness={0.46} metalness={0} clearcoat={0.42}/>
      </mesh>

      {/* ── Ligamentum teres (round ligament) ─────────────────────────── */}
      {/* Runs along the inferior falciform sulcus toward the umbilicus */}
      <mesh position={[-0.06,-0.44,0.82]} rotation={[0.28,0.04,0.04]}>
        <cylinderGeometry args={[0.010,0.016,0.28,8]}/>
        <meshPhysicalMaterial color="#C0A870" roughness={0.80} metalness={0} clearcoat={0.05}/>
      </mesh>

      {/* ── Inferior vena cava (IVC) ──────────────────────────────────── */}
      {/* Runs in a deep groove on the posterior-superior surface */}
      <mesh position={[0.35,0.62,-0.68]} rotation={[0.10,0.08,0]}>
        <cylinderGeometry args={[0.085,0.094,0.58,16]}/>
        <meshPhysicalMaterial color="#220606" roughness={0.64} metalness={0} clearcoat={0.16}/>
      </mesh>

    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// GLTF liver — used automatically when /public/models/liver.glb is present
// ─────────────────────────────────────────────────────────────────────────────
function GLTFLiver({ riskLevel }:{ riskLevel:RiskLevel }) {
  const { scene }=useGLTF('/models/liver.glb')
  const ref=useRef<THREE.Group|null>(null)
  const cfg=CONFIGS[riskLevel]
  const cloned=useMemo(()=>scene.clone(true),[scene])

  useMemo(()=>{
    const box=new THREE.Box3().setFromObject(cloned)
    cloned.position.sub(box.getCenter(new THREE.Vector3()))
    const sz=box.getSize(new THREE.Vector3())
    const mx=Math.max(sz.x,sz.y,sz.z)
    if (mx>0) cloned.scale.multiplyScalar(2.6/mx)
  },[cloned])

  useEffect(()=>{
    const mat=new THREE.MeshPhysicalMaterial({
      color:new THREE.Color('#BF3A22'),
      emissive:new THREE.Color(cfg.emissive), emissiveIntensity:cfg.emInt,
      roughness:0.52, metalness:0,
      clearcoat:cfg.clearcoat, clearcoatRoughness:0.11,
      sheen:cfg.sheen, sheenRoughness:0.44, sheenColor:new THREE.Color(cfg.sheenColor),
    })
    cloned.traverse(c=>{ if (c instanceof THREE.Mesh){ c.material=mat; c.castShadow=true } })
    return ()=>mat.dispose()
  },[cloned,cfg])

  useFrame(({clock})=>{
    if (!ref.current) return
    const t=clock.elapsedTime
    ref.current.scale.setScalar(1+Math.sin(t*0.82)*0.008)
    ref.current.rotation.y=Math.sin(t*0.055)*0.12
  })
  return <group ref={ref}><primitive object={cloned}/></group>
}

// ─────────────────────────────────────────────────────────────────────────────
// Scene — GLTF when available, procedural fallback otherwise
// ─────────────────────────────────────────────────────────────────────────────
function LiverScene({ riskLevel }:{ riskLevel:RiskLevel }) {
  const fb=<ProceduralLiver riskLevel={riskLevel}/>
  return (
    <ModelErrorBoundary fallback={fb}>
      <Suspense fallback={fb}><GLTFLiver riskLevel={riskLevel}/></Suspense>
    </ModelErrorBoundary>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas wrapper
// ─────────────────────────────────────────────────────────────────────────────
interface Props { riskLevel:RiskLevel; height?:number }

export default function LiverVisualization({ riskLevel, height=340 }:Props) {
  return (
    <div style={{ height, width:'100%', borderRadius:'10px', overflow:'hidden', cursor:'grab' }}>
      <Canvas
        camera={{ position:[2.0,1.8,6.2], fov:38 }}
        shadows
        gl={{ antialias:true, alpha:true }}
      >
        <Suspense fallback={null}>
          {/* Surgical OR overhead lighting */}
          <ambientLight intensity={0.22} color="#FFF8F0"/>
          <directionalLight position={[1.5,9,5]}   intensity={1.55} color="#FFFAF5" castShadow/>
          <directionalLight position={[-2,6,3]}    intensity={0.44} color="#FFE8D8"/>
          <directionalLight position={[1,1,8]}     intensity={0.30} color="#FFF0E8"/>
          <pointLight position={[0,-3,2.5]}   intensity={0.26} color="#FF7040"/>
          <pointLight position={[-3,2,-4]}    intensity={0.14} color="#8090FF"/>
          <pointLight position={[0.2,0,0.6]}  intensity={0.20} color="#FF2200" distance={3.5} decay={2}/>

          <Environment preset="studio"/>
          <LiverScene riskLevel={riskLevel}/>

          <ContactShadows position={[0,-1.10,0]} opacity={0.20} scale={8} blur={3} far={2.5}/>

          {/* Three-quarter anterior-superior view; user can orbit freely */}
          <OrbitControls
            target={[0.16,0.10,0]}
            enableZoom
            enablePan={false}
            minDistance={3}
            maxDistance={14}
            minPolarAngle={Math.PI/5}
            maxPolarAngle={Math.PI/1.6}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
