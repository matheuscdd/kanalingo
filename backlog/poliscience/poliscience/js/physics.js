// Inicialização do plugin Havok (Physics V2 do Babylon).
// HavokPhysics é um global fornecido por HavokPhysics_umd.js (CDN).

import { PHYSICS } from "./config.js";

const HAVOK_CDN_DIR = "https://cdn.babylonjs.com/havok/";

/**
 * Carrega o WASM do Havok e habilita a física na cena.
 * @param {BABYLON.Scene} scene
 * @returns {Promise<BABYLON.HavokPlugin>}
 */
export async function initPhysics(scene) {
  if (typeof HavokPhysics !== "function") {
    throw new Error(
      "HavokPhysics não encontrado. Verifique o <script> do CDN em index.html."
    );
  }

  const havokInstance = await HavokPhysics({
    // Garante que o .wasm seja buscado no CDN mesmo se o script for servido de outro lugar.
    locateFile: (file) => HAVOK_CDN_DIR + file,
  });

  const plugin = new BABYLON.HavokPlugin(true, havokInstance);
  scene.enablePhysics(new BABYLON.Vector3(0, PHYSICS.gravity, 0), plugin);

  return plugin;
}

/**
 * Cria um corpo estático (massa 0) em formato de caixa para o mesh.
 * @param {BABYLON.Mesh} mesh
 * @param {{ restitution?: number, friction?: number }} [opts]
 * @returns {BABYLON.PhysicsAggregate}
 */
export function makeStaticBox(mesh, opts = {}) {
  return new BABYLON.PhysicsAggregate(
    mesh,
    BABYLON.PhysicsShapeType.BOX,
    {
      mass: 0,
      restitution: opts.restitution ?? 0.2,
      friction: opts.friction ?? 0.8,
    },
    mesh.getScene()
  );
}
