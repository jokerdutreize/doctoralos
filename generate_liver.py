#!/usr/bin/env python3
"""
generate_liver.py
=================
Procedurally generates a realistic 3D human liver mesh and exports it as
healthy_liver.glb → frontend/public/models/

Usage:
    python generate_liver.py

Requirements:  pip install -r requirements_liver.txt
"""

import os
import sys
import numpy as np
import trimesh
import trimesh.smoothing
from trimesh.visual.material import PBRMaterial

# ─────────────────────────────────────────────────────────────────────────────
# Utility
# ─────────────────────────────────────────────────────────────────────────────

def ss(v: np.ndarray, lo: float, hi: float) -> np.ndarray:
    """Smooth-step function, vectorised."""
    t = np.clip((v - lo) / (hi - lo), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def create_tube(start, end, radius: float, sections: int = 12) -> trimesh.Trimesh:
    """Cylinder between two 3-D points."""
    s, e = np.asarray(start, float), np.asarray(end, float)
    vec   = e - s
    h     = float(np.linalg.norm(vec))
    cyl   = trimesh.creation.cylinder(radius=radius, height=h, sections=sections)
    # Default cylinder axis = Z; rotate to vec direction
    z     = np.array([0.0, 0.0, 1.0])
    d     = vec / h
    cross = np.cross(z, d)
    cn    = float(np.linalg.norm(cross))
    if cn > 1e-6:
        axis  = cross / cn
        angle = float(np.arccos(np.clip(np.dot(z, d), -1, 1)))
        R4    = trimesh.transformations.rotation_matrix(angle, axis)
        cyl.apply_transform(R4)
    cyl.vertices += (s + e) / 2.0
    return cyl


def apply_pbr(mesh: trimesh.Trimesh, name: str,
              base_color, roughness=0.50, metallic=0.0,
              emissive=None) -> trimesh.Trimesh:
    """Assign a PBR material to a trimesh mesh."""
    em = np.array(emissive if emissive is not None else [0.0, 0.0, 0.0])
    mat = PBRMaterial(
        name=name,
        baseColorFactor=np.array([*base_color, 1.0]),
        metallicFactor=float(metallic),
        roughnessFactor=float(roughness),
        emissiveFactor=em,
    )
    mesh.visual = trimesh.visual.TextureVisuals(material=mat)
    return mesh


# ─────────────────────────────────────────────────────────────────────────────
# Main liver body
# ─────────────────────────────────────────────────────────────────────────────

def build_liver_mesh() -> trimesh.Trimesh:
    """
    Deforms a high-resolution icosphere (subdivisions=5 → ~41 k vertices) using
    anatomically-motivated displacement fields to produce a realistic liver shape.

    Coordinate system (matches the React Three Fiber scene):
        +X = patient's right (viewer's left)   — dominant right lobe
        +Y = superior (towards head)
        +Z = anterior (towards viewer)
    """
    print("  Generating icosphere (subdivisions=5) …")
    sphere = trimesh.creation.icosphere(subdivisions=5)

    v  = sphere.vertices.copy()
    x0 = v[:, 0]
    y0 = v[:, 1]
    z0 = v[:, 2]

    # ── Base ellipsoid  ─────────────────────────────────────────────────────
    # Right lobe ×1.72, left lobe ×0.88 — immediately establishes asymmetry
    nx = np.where(x0 >= 0, x0 * 1.72, x0 * 0.88)
    ny = y0 * 0.60
    nz = z0 * 0.86

    # ── 1. Diaphragmatic dome (right-posterior peak) ─────────────────────────
    rb        = np.maximum(0.0, nx / 1.72)
    pb        = np.maximum(0.0, -nz / 0.86) * 0.62
    dome      = y0 * (0.26 + rb * 0.32 + pb * rb * 0.22)
    ny       += np.where(y0 > 0, dome, 0.0)
    left_drop = y0 * np.minimum(1.0, np.maximum(0.0, -x0 - 0.14) / 0.86) * 0.18
    ny       -= np.where(y0 > 0, left_drop, 0.0)

    # ── 2. Posterior face flattening (diaphragm contact) ─────────────────────
    t_post = ss(-z0, 0.20, 0.94)
    nz     = np.where(z0 < -0.20, nz * (1.0 - t_post * 0.72), nz)

    # ── 3. Left lobe taper ────────────────────────────────────────────────────
    t_left = np.minimum(1.0, np.maximum(0.0, (-x0 - 0.50) / 0.50))
    ny     = np.where(x0 < -0.50, ny * (1.0 - t_left * 0.48), ny)
    nz     = np.where(x0 < -0.50, nz * (1.0 - t_left * 0.38), nz)
    ny    += np.where((x0 < -0.50) & (t_left > 0.60), t_left * 0.044, 0.0)

    # ── 4. Visceral (inferior) surface ────────────────────────────────────────
    ny = np.where(y0 < -0.14, ny * 0.42, ny)          # very flat inferior face

    # Porta hepatis H-groove
    ph      = (nx - 0.22) ** 2 * 3.8 + nz ** 2 * 10.5
    ph_add  = np.exp(-ph * 3.0) * 0.080 * np.minimum(1.0, np.maximum(0.0, (-y0 - 0.26) / 0.52))
    ny     += np.where((y0 < -0.26) & (ph < 0.52), ph_add, 0.0)

    # Gallbladder fossa — oval depression on right inferior surface
    gf      = ((nx - 0.62) / 0.19) ** 2 + ((nz - 0.22) / 0.15) ** 2
    gf_add  = np.exp(-gf * 2.2) * 0.048 * np.minimum(1.0, np.maximum(0.0, (-y0 - 0.18) / 0.38))
    ny     += np.where((y0 < -0.18) & (gf < 1.0) & (nx > 0.35), gf_add, 0.0)

    # Gastric impression — left inferior
    gi      = ((nx + 0.42) / 0.32) ** 2 + (nz / 0.22) ** 2
    gi_add  = np.exp(-gi * 1.9) * 0.036 * np.minimum(1.0, np.maximum(0.0, (-y0 - 0.18) / 0.44))
    ny     += np.where((y0 < -0.18) & (gi < 1.0) & (nx < 0.05), gi_add, 0.0)

    # ── 5. Anterior knife-edge inferior border ────────────────────────────────
    tZ  = np.minimum(1.0, np.maximum(0.0, (z0 - 0.26) / 0.74))
    tY  = ss(-y0, 0.0, 1.0)
    ny += np.where((z0 > 0.26) & (y0 < 0.10), tZ * tZ * tY * 0.44, 0.0)

    # ── 6. Falciform ligament groove ──────────────────────────────────────────
    fX      = nx + 0.06
    fg      = np.exp(-(fX / 0.11) ** 2)
    fal_add = fg * 0.082 * np.minimum(1.0, np.maximum(0.0, (ny - 0.04) / 0.38))
    ny     -= np.where((np.abs(fX) < 0.18) & (ny > 0.04) & (nz > -0.22), fal_add, 0.0)

    # ── 7. Right/left hepatic vein boundary grooves (superior face) ──────────
    yS  = np.minimum(1.0, np.maximum(0.0, (y0 - 0.06) / 0.50))
    hv1 = np.exp(-((z0 - 0.08) / 0.056) ** 2) * np.minimum(1.0, np.maximum(0.0, (nx - 0.18) / 0.90)) * yS * 0.022
    hv2 = np.exp(-((x0 + 0.27) / 0.048) ** 2) * np.minimum(1.0, np.maximum(0.0, (-nx - 0.08) / 0.80)) * yS * 0.016
    ny -= np.where(y0 > 0.06, hv1 + hv2, 0.0)

    # ── 8. Glisson's capsule micro-undulation ─────────────────────────────────
    cap = (np.sin(x0 * 9.1  + z0 * 3.8)  * np.cos(y0 * 7.4)              * 0.0112
         + np.sin(y0 * 11.8 + x0 * 5.3)  * np.cos(z0 * 9.5)              * 0.0064
         + np.sin(z0 * 7.1  + y0 * 6.0)  * np.cos(x0 * 11.2 + z0 * 2.1) * 0.0042)
    nx += cap
    ny += cap * 0.22
    nz += cap

    sphere.vertices = np.stack([nx, ny, nz], axis=1)

    # ── Post-process ──────────────────────────────────────────────────────────
    print("  Taubin smoothing (25 iterations) …")
    trimesh.smoothing.filter_taubin(sphere, lamb=0.5, nu=-0.53, iterations=25)

    print(f"  Liver: {len(sphere.vertices):,} vertices, {len(sphere.faces):,} faces")
    return sphere


# ─────────────────────────────────────────────────────────────────────────────
# Gallbladder
# ─────────────────────────────────────────────────────────────────────────────

def build_gallbladder() -> trimesh.Trimesh:
    """Pyriform (pear-shaped) gallbladder seated in the gallbladder fossa."""
    gb = trimesh.creation.icosphere(subdivisions=4)
    # Scale to pyriform shape: elongated along Y, narrow Z
    gb.vertices *= np.array([0.17, 0.26, 0.14])
    # Position: 30 % embedded in fossa, fundus protrudes below
    gb.vertices += np.array([0.62, -0.30, 0.24])
    return gb


def build_cystic_duct() -> trimesh.Trimesh:
    return create_tube([0.58, -0.24, 0.27], [0.45, -0.32, 0.22], radius=0.022, sections=10)


# ─────────────────────────────────────────────────────────────────────────────
# Hepatic hilum vascular structures
# ─────────────────────────────────────────────────────────────────────────────

def build_portal_vein():
    """Portal vein with left and right branches (Y-shaped)."""
    trunk = create_tube([0.22, -0.88, 0.14], [0.22, -0.36, 0.14], radius=0.058, sections=16)
    left  = create_tube([0.22, -0.36, 0.14], [-0.08, -0.32, 0.10], radius=0.032, sections=12)
    right = create_tube([0.22, -0.36, 0.14], [ 0.55, -0.32, 0.18], radius=0.038, sections=12)
    return trimesh.util.concatenate([trunk, left, right])


def build_hepatic_artery():
    """Hepatic artery proper with left and right branches."""
    trunk = create_tube([0.06, -0.82, 0.20], [0.06, -0.34, 0.20], radius=0.022, sections=12)
    left  = create_tube([0.06, -0.34, 0.20], [-0.12, -0.30, 0.16], radius=0.013, sections=10)
    right = create_tube([0.06, -0.34, 0.20], [ 0.26, -0.30, 0.22], radius=0.015, sections=10)
    return trimesh.util.concatenate([trunk, left, right])


def build_bile_duct() -> trimesh.Trimesh:
    """Common hepatic bile duct."""
    return create_tube([0.38, -0.80, 0.11], [0.38, -0.34, 0.11], radius=0.015, sections=10)


def build_ivc() -> trimesh.Trimesh:
    """Inferior vena cava running in the posterior-superior groove."""
    return create_tube([0.32, 1.10, -0.66], [0.38, 0.18, -0.70], radius=0.090, sections=16)


# ─────────────────────────────────────────────────────────────────────────────
# Ligamentum teres (round ligament)
# ─────────────────────────────────────────────────────────────────────────────

def build_ligamentum_teres() -> trimesh.Trimesh:
    return create_tube([-0.06, -0.46, 1.10], [-0.06, -0.22, 0.76], radius=0.012, sections=8)


# ─────────────────────────────────────────────────────────────────────────────
# Assembly
# ─────────────────────────────────────────────────────────────────────────────

def main() -> str:
    print("=" * 60)
    print("  Liver Generator — Procedural Medical 3D Mesh")
    print("=" * 60)

    # ── Build geometry ──────────────────────────────────────────────────────
    print("\n[1/4] Building liver body …")
    liver = build_liver_mesh()
    liver = apply_pbr(liver, "LiverCapsule",
                      base_color=[0.68, 0.19, 0.10],
                      roughness=0.50, metallic=0.0,
                      emissive=[0.022, 0.005, 0.003])

    print("\n[2/4] Building gallbladder …")
    gallbladder  = build_gallbladder()
    gallbladder  = apply_pbr(gallbladder, "Gallbladder",
                             base_color=[0.35, 0.52, 0.12], roughness=0.38)
    cystic_duct  = build_cystic_duct()
    cystic_duct  = apply_pbr(cystic_duct, "CysticDuct",
                             base_color=[0.30, 0.46, 0.10], roughness=0.42)

    print("\n[3/4] Building vascular structures …")
    portal_vein  = build_portal_vein()
    portal_vein  = apply_pbr(portal_vein, "PortalVein",
                             base_color=[0.24, 0.04, 0.04], roughness=0.56)

    hepatic_art  = build_hepatic_artery()
    hepatic_art  = apply_pbr(hepatic_art, "HepaticArtery",
                             base_color=[0.80, 0.05, 0.05], roughness=0.36)

    bile_duct    = build_bile_duct()
    bile_duct    = apply_pbr(bile_duct, "BileDuct",
                             base_color=[0.42, 0.48, 0.10], roughness=0.46)

    ivc          = build_ivc()
    ivc          = apply_pbr(ivc, "IVC",
                             base_color=[0.14, 0.03, 0.03], roughness=0.64)

    lig_teres    = build_ligamentum_teres()
    lig_teres    = apply_pbr(lig_teres, "LigamentumTeres",
                             base_color=[0.75, 0.68, 0.42], roughness=0.80)

    # ── Export ──────────────────────────────────────────────────────────────
    print("\n[4/4] Assembling scene and exporting …")
    scene = trimesh.Scene()
    scene.add_geometry(liver,       node_name="liver")
    scene.add_geometry(gallbladder, node_name="gallbladder")
    scene.add_geometry(cystic_duct, node_name="cystic_duct")
    scene.add_geometry(portal_vein, node_name="portal_vein")
    scene.add_geometry(hepatic_art, node_name="hepatic_artery")
    scene.add_geometry(bile_duct,   node_name="bile_duct")
    scene.add_geometry(ivc,         node_name="ivc")
    scene.add_geometry(lig_teres,   node_name="ligamentum_teres")

    script_dir  = os.path.dirname(os.path.abspath(__file__))
    output_dir  = os.path.join(script_dir, "frontend", "public", "models")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "healthy_liver.glb")

    scene.export(output_path)

    v_total = (len(liver.vertices) + len(gallbladder.vertices)
               + len(portal_vein.vertices) + len(hepatic_art.vertices))
    f_total = (len(liver.faces) + len(gallbladder.faces)
               + len(portal_vein.faces) + len(hepatic_art.faces))

    print(f"\n  ✓ Exported  →  {output_path}")
    print(f"  Geometry:  ~{v_total:,} vertices, ~{f_total:,} faces")
    print("\n  Load in React Three Fiber:")
    print("    const { scene } = useGLTF('/models/healthy_liver.glb')")
    print("    <primitive object={scene} />")
    return output_path


if __name__ == "__main__":
    main()
