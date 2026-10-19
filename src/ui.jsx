import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Html, Stars } from '@react-three/drei';
import {
  Activity, AlertCircle, Bot, Box, Cable, CheckCircle2, ChevronDown, CircleHelp,
  Clock, Coffee, Cpu, Database, Eye, Gauge, Globe, Layers, MessageSquare, Play,
  PlusCircle, RefreshCw, Send, Server, Settings, ShieldCheck, Sparkles, Terminal,
  Users, Workflow, XCircle, Zap
} from 'lucide-react';

const API = '/api';

// Definition of 4 Office Agents
const AGENT_CONFIGS = [
  {
    id: 'hermes',
    name: 'Hermes Core',
    role: 'Chief Orchestrator',
    color: '#2ee6a6',
    suitColor: '#0e2b3d',
    accentColor: '#30e8bd',
    desc: 'Perencanaan, reasoning, dekomposisi tugas, dan komando mesh',
    idlePos: [-2.2, 0, 1.8],
    stationPos: [-4.6, 0, -1.8],
    stationRot: Math.PI
  },
  {
    id: 'router',
    name: '9Router Gateway',
    role: 'Gateway Specialist',
    color: '#9b72ff',
    suitColor: '#251745',
    accentColor: '#b48eff',
    desc: 'Routing model OpenAI-compatible /v1, kuota, dan monitoring latensi',
    idlePos: [-0.8, 0, 1.4],
    stationPos: [-1.5, 0, -2.3],
    stationRot: Math.PI
  },
  {
    id: 'tools',
    name: 'Tool Runner',
    role: 'Systems Engineer',
    color: '#48c9f5',
    suitColor: '#103247',
    accentColor: '#67d7fb',
    desc: 'Inspeksi runtime OS, sandboxing plugin, eksekusi tool & diagnostik',
    idlePos: [0.8, 0, 1.4],
    stationPos: [1.8, 0, -2.3],
    stationRot: Math.PI
  },
  {
    id: 'memory',
    name: 'Memory Store',
    role: 'Data Archivist',
    color: '#f6b44c',
    suitColor: '#3d2c14',
    accentColor: '#ffc66e',
    desc: 'Context memory banking, cache persistensi, dan pengindeksan data',
    idlePos: [2.2, 0, 1.8],
    stationPos: [4.6, 0, -1.8],
    stationRot: Math.PI
  }
];

const PRESETS = {
  hermes: [
    { title: 'Riset & Rencana Arsitektur', input: 'Riset kebutuhan penskalaan multi-agent dan susun rencana arsitektur sistem.' },
    { title: 'Dekomposisi Tugas Otomatis', input: 'Pecah tugas besar menjadi sub-tasks independen untuk dieksekusi.' },
    { title: 'Evaluasi Eksekusi Mesh', input: 'Audit waktu respon dan validasi koordinasi antar seluruh agen.' }
  ],
  router: [
    { title: 'Uji Latensi Rute Model', input: 'Kirim ping ke 9Router dan ukur roundtrip latency endpoint /models.' },
    { title: 'Validasi Model Custom', input: 'Periksa ketersediaan model-custom dan verifikasi rute API OpenAI.' },
    { title: 'Health Check Gateway', input: 'Verifikasi status HTTP upstream dan cek responsivitas router.' }
  ],
  tools: [
    { title: 'Inspeksi Memori & Runtime', input: 'Periksa alokasi heap Node.js, RSS, dan uptime container runtime.' },
    { title: 'Audit Lingkungan Sandbox', input: 'Cek integritas proses runtime dan ketersediaan tool execution.' },
    { title: 'Diagnostik Sistem', input: 'Jalankan pemeriksaan kesehatan internal dan evaluasi beban kerja.' }
  ],
  memory: [
    { title: 'Simpan Konteks Sesi', input: 'Simpan snapshot state sesi dan indeks identitas agen ke memory bank.' },
    { title: 'Cek Status Indeks Bank', input: 'Periksa total memori tersimpan dan validasi integritas key-value.' },
    { title: 'Sinkronisasi Memori', input: 'Jalankan konsolidasi memori faktual dan bersihkan buffer sementara.' }
  ]
};

// 3D Office Worker Component (Humanoid with walk, type, idle animations)
function OfficeWorker({
  id, name, role, color, suitColor, accentColor,
  status, currentTask, selected, onClick,
  idlePos, stationPos, stationRot
}) {
  const groupRef = useRef();
  const leftArmRef = useRef();
  const rightArmRef = useRef();
  const leftLegRef = useRef();
  const rightLegRef = useRef();
  const headRef = useRef();

  const pos = useRef([...idlePos]);
  const busy = status === 'working';
  const [displayState, setDisplayState] = useState('idle');

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    const target = busy ? stationPos : idlePos;
    const dx = target[0] - pos.current[0];
    const dz = target[2] - pos.current[2];
    const dist = Math.hypot(dx, dz);

    const isWalking = dist > 0.12;

    if (isWalking) {
      if (displayState !== 'walking') setDisplayState('walking');
      const step = Math.min(2.8 * delta, dist);
      pos.current[0] += (dx / dist) * step;
      pos.current[2] += (dz / dist) * step;

      // Face direction of walking
      const targetAngle = Math.atan2(dx, dz);
      let diff = targetAngle - groupRef.current.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      groupRef.current.rotation.y += diff * Math.min(1, delta * 12);

      // Walking bob & limb swing
      const walkCycle = t * 10;
      groupRef.current.position.set(pos.current[0], Math.abs(Math.sin(walkCycle)) * 0.08, pos.current[2]);

      if (leftLegRef.current && rightLegRef.current) {
        leftLegRef.current.rotation.x = Math.sin(walkCycle) * 0.65;
        rightLegRef.current.rotation.x = -Math.sin(walkCycle) * 0.65;
      }
      if (leftArmRef.current && rightArmRef.current) {
        leftArmRef.current.rotation.x = -Math.sin(walkCycle) * 0.55;
        rightArmRef.current.rotation.x = Math.sin(walkCycle) * 0.55;
        leftArmRef.current.rotation.z = 0.08;
        rightArmRef.current.rotation.z = -0.08;
      }
      if (headRef.current) {
        headRef.current.rotation.x = 0;
        headRef.current.rotation.y = 0;
      }
    } else {
      // Reached destination
      pos.current[0] = target[0];
      pos.current[2] = target[2];

      if (busy) {
        if (displayState !== 'working') setDisplayState('working');
        // Smoothly rotate to face desk
        let diff = stationRot - groupRef.current.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        groupRef.current.rotation.y += diff * Math.min(1, delta * 8);

        // Sitting height at office desk chair
        groupRef.current.position.set(pos.current[0], 0.16, pos.current[2]);

        // Sitting legs bent 90 degrees
        if (leftLegRef.current && rightLegRef.current) {
          leftLegRef.current.rotation.x = -1.35;
          rightLegRef.current.rotation.x = -1.35;
        }
        // Typing arms on desk keyboard
        const typeSpeed = t * 15;
        if (leftArmRef.current && rightArmRef.current) {
          leftArmRef.current.rotation.x = -0.9 + Math.sin(typeSpeed) * 0.16;
          rightArmRef.current.rotation.x = -0.9 + Math.cos(typeSpeed + 1.2) * 0.16;
          leftArmRef.current.rotation.z = 0.22;
          rightArmRef.current.rotation.z = -0.22;
        }
        // Head slight focused bob looking at monitor
        if (headRef.current) {
          headRef.current.rotation.x = 0.22 + Math.sin(t * 2.5) * 0.05;
          headRef.current.rotation.y = Math.sin(t * 1.5) * 0.06;
        }
      } else {
        if (displayState !== 'idle') setDisplayState('idle');
        // Standing relaxed at break room / lounge
        groupRef.current.position.set(pos.current[0], Math.sin(t * 1.6) * 0.015, pos.current[2]);

        // Legs straight
        if (leftLegRef.current && rightLegRef.current) {
          leftLegRef.current.rotation.x = 0;
          rightLegRef.current.rotation.x = 0;
        }
        // Arms relaxed at side with subtle breathing
        if (leftArmRef.current && rightArmRef.current) {
          leftArmRef.current.rotation.x = Math.sin(t * 1.6) * 0.06;
          rightArmRef.current.rotation.x = -Math.sin(t * 1.6) * 0.06;
          leftArmRef.current.rotation.z = 0.12;
          rightArmRef.current.rotation.z = -0.12;
        }
        // Head casual glance around room
        if (headRef.current) {
          headRef.current.rotation.x = 0;
          headRef.current.rotation.y = Math.sin(t * 0.7) * 0.35;
        }
      }
    }
  });

  return (
    <group ref={groupRef} position={pos.current} onClick={onClick}>
      {/* Ground selection / aura ring */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[selected ? 0.65 : 0.45, 32]} />
        <meshBasicMaterial color={selected ? '#30e8ff' : color} transparent opacity={selected ? 0.35 : (busy ? 0.2 : 0.08)} />
      </mesh>

      {/* Torso & Office Suit */}
      <mesh position={[0, 0.66, 0]} castShadow>
        <boxGeometry args={[0.34, 0.44, 0.22]} />
        <meshStandardMaterial color={suitColor} roughness={0.5} metalness={0.2} />
      </mesh>
      {/* Tie / ID lanyard */}
      <mesh position={[0, 0.66, 0.115]}>
        <planeGeometry args={[0.07, 0.32]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>
      {/* Belt */}
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[0.35, 0.05, 0.23]} />
        <meshStandardMaterial color="#080f14" />
      </mesh>

      {/* Head Group with Visor & Tech Headset */}
      <group ref={headRef} position={[0, 0.98, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.16, 24, 24]} />
          <meshStandardMaterial color="#d4e8f2" roughness={0.3} emissive={color} emissiveIntensity={busy ? 0.3 : 0.08} />
        </mesh>
        {/* Visor Glasses */}
        <mesh position={[0, 0.02, 0.14]}>
          <boxGeometry args={[0.22, 0.07, 0.05]} />
          <meshStandardMaterial color="#06121a" roughness={0.1} />
        </mesh>
        {/* Visor HUD Glow */}
        <mesh position={[0, 0.02, 0.166]}>
          <planeGeometry args={[0.20, 0.04]} />
          <meshBasicMaterial color={busy ? '#38f6b0' : color} />
        </mesh>
        {/* Headset arc */}
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.04, 16]} />
          <meshStandardMaterial color="#1a2e3b" />
        </mesh>
        {/* Headset earpieces */}
        <mesh position={[-0.17, 0, 0]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color={accentColor} />
        </mesh>
        <mesh position={[0.17, 0, 0]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color={accentColor} />
        </mesh>
      </group>

      {/* Left Arm */}
      <group ref={leftArmRef} position={[-0.23, 0.82, 0]}>
        <mesh position={[0, -0.16, 0]} castShadow>
          <capsuleGeometry args={[0.055, 0.32, 4, 8]} />
          <meshStandardMaterial color={suitColor} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.34, 0]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color="#c2dfed" />
        </mesh>
      </group>

      {/* Right Arm */}
      <group ref={rightArmRef} position={[0.23, 0.82, 0]}>
        <mesh position={[0, -0.16, 0]} castShadow>
          <capsuleGeometry args={[0.055, 0.32, 4, 8]} />
          <meshStandardMaterial color={suitColor} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.34, 0]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color="#c2dfed" />
        </mesh>
      </group>

      {/* Left Leg */}
      <group ref={leftLegRef} position={[-0.10, 0.42, 0]}>
        <mesh position={[0, -0.19, 0]} castShadow>
          <capsuleGeometry args={[0.06, 0.34, 4, 8]} />
          <meshStandardMaterial color="#0c1b26" />
        </mesh>
        {/* Shoe */}
        <mesh position={[0, -0.40, 0.03]}>
          <boxGeometry args={[0.09, 0.06, 0.17]} />
          <meshStandardMaterial color="#050a0f" />
        </mesh>
      </group>

      {/* Right Leg */}
      <group ref={rightLegRef} position={[0.10, 0.42, 0]}>
        <mesh position={[0, -0.19, 0]} castShadow>
          <capsuleGeometry args={[0.06, 0.34, 4, 8]} />
          <meshStandardMaterial color="#0c1b26" />
        </mesh>
        {/* Shoe */}
        <mesh position={[0, -0.40, 0.03]}>
          <boxGeometry args={[0.09, 0.06, 0.17]} />
          <meshStandardMaterial color="#050a0f" />
        </mesh>
      </group>

      {/* Interactive 3D Tag floating above head */}
      <Html position={[0, 1.48, 0]} center distanceFactor={11} occlude={false}>
        <button
          className={`agent-tag ${selected ? 'chosen' : ''} ${busy ? 'working-pulse' : ''}`}
          onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
          <div className="agent-tag-header">
            <b>{name}</b>
            <i style={{ background: busy ? '#2de6a1' : (displayState === 'walking' ? '#38bdf8' : '#8795a8') }} />
          </div>
          <span className="agent-tag-role">{role}</span>
          <div className="agent-tag-badge">
            {displayState === 'walking' ? '🚶 MENUJU TUGAS...' : (busy ? '⚡ BEKERJA' : '☕ STANDBY')}
          </div>
          {currentTask && <span className="agent-tag-task">{currentTask}</span>}
        </button>
      </Html>
    </group>
  );
}

// 3D Ergonomic Office Swivel Chair
function OfficeChair({ position, rotation = [0, 0, 0], color = '#122535' }) {
  return (
    <group position={position} rotation={rotation}>
      {/* 5-wheel star base */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.04, 5]} />
        <meshStandardMaterial color="#09121a" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Piston */}
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.32, 12]} />
        <meshStandardMaterial color="#6a879e" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Seat cushion */}
      <mesh position={[0, 0.39, 0]} castShadow>
        <boxGeometry args={[0.48, 0.08, 0.46]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* Backrest */}
      <mesh position={[0, 0.72, -0.21]} rotation={[-0.1, 0, 0]} castShadow>
        <boxGeometry args={[0.44, 0.58, 0.06]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* Armrests */}
      <mesh position={[-0.26, 0.54, -0.05]}>
        <boxGeometry args={[0.05, 0.22, 0.30]} />
        <meshStandardMaterial color="#0a151f" />
      </mesh>
      <mesh position={[0.26, 0.54, -0.05]}>
        <boxGeometry args={[0.05, 0.22, 0.30]} />
        <meshStandardMaterial color="#0a151f" />
      </mesh>
    </group>
  );
}

// 3D Specialized Workstation Desk
function WorkstationDesk({ position, stationColor, busy, title, type = 'desk' }) {
  return (
    <group position={position}>
      {/* Main modern desk surface */}
      <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.75, 0.08, 0.95]} />
        <meshStandardMaterial color="#0c1d2c" metalness={0.4} roughness={0.5} />
      </mesh>

      {/* Desk metal legs */}
      <mesh position={[-0.78, 0.24, -0.38]}><boxGeometry args={[0.06, 0.48, 0.06]} /><meshStandardMaterial color="#233a4e" metalness={0.8} /></mesh>
      <mesh position={[0.78, 0.24, -0.38]}><boxGeometry args={[0.06, 0.48, 0.06]} /><meshStandardMaterial color="#233a4e" metalness={0.8} /></mesh>
      <mesh position={[-0.78, 0.24, 0.38]}><boxGeometry args={[0.06, 0.48, 0.06]} /><meshStandardMaterial color="#233a4e" metalness={0.8} /></mesh>
      <mesh position={[0.78, 0.24, 0.38]}><boxGeometry args={[0.06, 0.48, 0.06]} /><meshStandardMaterial color="#233a4e" metalness={0.8} /></mesh>

      {/* Desk mat & Keyboard */}
      <mesh position={[0, 0.525, 0.1]}>
        <planeGeometry args={[0.72, 0.36]} />
        <meshStandardMaterial color="#08141f" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.535, 0.12]}>
        <boxGeometry args={[0.42, 0.015, 0.14]} />
        <meshStandardMaterial color="#1b3042" />
      </mesh>
      <mesh position={[0.26, 0.535, 0.12]}>
        <boxGeometry args={[0.07, 0.015, 0.11]} />
        <meshStandardMaterial color="#1b3042" />
      </mesh>

      {/* Dual Curved / Ultrawide Monitors */}
      <mesh position={[0, 0.82, -0.22]} rotation={[-0.08, 0, 0]} castShadow>
        <boxGeometry args={[0.88, 0.44, 0.05]} />
        <meshStandardMaterial color="#050d14" metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.82, -0.19]} rotation={[-0.08, 0, 0]}>
        <planeGeometry args={[0.82, 0.38]} />
        <meshBasicMaterial color={busy ? stationColor : '#102738'} />
      </mesh>

      {/* Monitor stand */}
      <mesh position={[0, 0.58, -0.24]}>
        <cylinderGeometry args={[0.03, 0.03, 0.18, 12]} />
        <meshStandardMaterial color="#354f66" metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.525, -0.24]}>
        <boxGeometry args={[0.22, 0.015, 0.18]} />
        <meshStandardMaterial color="#354f66" metalness={0.8} />
      </mesh>

      {/* Coffee mug */}
      <mesh position={[-0.6, 0.56, 0.1]}>
        <cylinderGeometry args={[0.045, 0.04, 0.09, 16]} />
        <meshStandardMaterial color="#dfebf5" />
      </mesh>

      {/* Station specialized elements */}
      {type === 'router' && (
        // Server rack cabinet behind desk
        <group position={[0, 0, -1.1]}>
          <mesh position={[0, 1.1, 0]} castShadow>
            <boxGeometry args={[0.95, 2.2, 0.65]} />
            <meshStandardMaterial color="#09131d" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* LED blinkers */}
          {[-0.6, -0.2, 0.2, 0.6].map((y, i) => (
            <mesh key={i} position={[0, 1.1 + y, 0.33]}>
              <boxGeometry args={[0.82, 0.12, 0.02]} />
              <meshBasicMaterial color={busy ? (i % 2 === 0 ? '#38ef7d' : '#9b72ff') : '#153147'} />
            </mesh>
          ))}
        </group>
      )}

      {type === 'tools' && (
        // Engineering test bench & oscilloscope
        <group position={[0, 0, -1.0]}>
          <mesh position={[0, 0.85, 0]} castShadow>
            <boxGeometry args={[0.85, 1.7, 0.5]} />
            <meshStandardMaterial color="#0c1f2e" metalness={0.5} />
          </mesh>
          <mesh position={[0, 1.2, 0.26]}>
            <planeGeometry args={[0.65, 0.35]} />
            <meshBasicMaterial color={busy ? '#48c9f5' : '#14384d'} />
          </mesh>
        </group>
      )}

      {type === 'memory' && (
        // Data storage vault towers
        <group position={[0, 0, -1.0]}>
          <mesh position={[0, 0.95, 0]} castShadow>
            <boxGeometry args={[0.9, 1.9, 0.55]} />
            <meshStandardMaterial color="#1a150c" metalness={0.6} />
          </mesh>
          {/* Glowing memory core tubes */}
          <mesh position={[-0.22, 1.1, 0.29]}>
            <cylinderGeometry args={[0.07, 0.07, 0.6, 16]} />
            <meshBasicMaterial color={busy ? '#ffb74d' : '#4a3615'} />
          </mesh>
          <mesh position={[0.22, 1.1, 0.29]}>
            <cylinderGeometry args={[0.07, 0.07, 0.6, 16]} />
            <meshBasicMaterial color={busy ? '#ffb74d' : '#4a3615'} />
          </mesh>
        </group>
      )}

      {/* Desk name placard */}
      <mesh position={[0, 0.54, 0.42]}>
        <boxGeometry args={[0.42, 0.06, 0.02]} />
        <meshBasicMaterial color="#081622" />
      </mesh>
      <mesh position={[0, 0.54, 0.435]}>
        <planeGeometry args={[0.38, 0.04]} />
        <meshBasicMaterial color={stationColor} />
      </mesh>
    </group>
  );
}

// 3D Office Break Room / Lounge in the Center
function OfficeLounge({ position }) {
  return (
    <group position={position}>
      {/* Break room rug */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.0, 32]} />
        <meshStandardMaterial color="#0a2133" roughness={0.9} />
      </mesh>

      {/* Round coffee table */}
      <mesh position={[0, 0.32, 0]} castShadow>
        <cylinderGeometry args={[0.65, 0.65, 0.05, 32]} />
        <meshStandardMaterial color="#132c3f" metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.32, 16]} />
        <meshStandardMaterial color="#365066" metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.03, 24]} />
        <meshStandardMaterial color="#365066" metalness={0.8} />
      </mesh>

      {/* Water cooler dispenser */}
      <group position={[1.8, 0, 1.2]}>
        <mesh position={[0, 0.55, 0]} castShadow>
          <boxGeometry args={[0.35, 1.1, 0.35]} />
          <meshStandardMaterial color="#e2effa" roughness={0.3} />
        </mesh>
        {/* Blue water bottle inverted on top */}
        <mesh position={[0, 1.35, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.48, 16]} />
          <meshStandardMaterial color="#22a8ff" transparent opacity={0.65} roughness={0.1} />
        </mesh>
      </group>

      {/* Potted Office Plants */}
      <group position={[-1.8, 0, 1.2]}>
        <mesh position={[0, 0.28, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.16, 0.56, 16]} />
          <meshStandardMaterial color="#1f374a" />
        </mesh>
        {/* Plant foliage */}
        <mesh position={[0, 0.72, 0]}>
          <sphereGeometry args={[0.32, 16, 16]} />
          <meshStandardMaterial color="#1f7a55" roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

// Complete 3D Office Scene
function OfficeRoom({ selected, setSelected, liveAgents }) {
  const mergedAgents = AGENT_CONFIGS.map(base => {
    const live = liveAgents?.find(a => a.id === base.id);
    return {
      ...base,
      status: live?.status || 'idle',
      currentTask: live?.currentTask || ''
    };
  });

  return (
    <Canvas shadows camera={{ position: [9, 8.5, 11], fov: 40 }} dpr={[1, 1.7]}>
      <color attach="background" args={['#06101a']} />
      <fog attach="fog" args={['#06101a', 16, 36]} />

      {/* Lighting */}
      <ambientLight intensity={1.35} />
      <directionalLight position={[5, 11, 6]} intensity={2.4} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-4, 4.5, -2]} color="#2ee6a6" intensity={6} distance={10} />
      <pointLight position={[-1.5, 4.5, -2.5]} color="#9b72ff" intensity={6} distance={10} />
      <pointLight position={[1.8, 4.5, -2.5]} color="#48c9f5" intensity={6} distance={10} />
      <pointLight position={[4.6, 4.5, -2]} color="#f6b44c" intensity={6} distance={10} />
      <pointLight position={[0, 3.5, 1.5]} color="#ffffff" intensity={3} distance={8} />

      <Stars radius={50} depth={20} count={300} factor={2} saturation={0} fade speed={0.2} />

      {/* Office Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[20, 16]} />
        <meshStandardMaterial color="#081724" metalness={0.2} roughness={0.7} />
      </mesh>
      <Grid position={[0, 0, 0]} args={[20, 16]} cellSize={0.5} cellThickness={0.6} sectionSize={2} sectionThickness={1.0} cellColor="#132c3f" sectionColor="#185675" fadeDistance={22} infiniteGrid={false} />

      {/* Office Back Wall & Partitions */}
      <mesh position={[0, 2.2, -6.5]} receiveShadow>
        <boxGeometry args={[18, 4.5, 0.2]} />
        <meshStandardMaterial color="#091c2b" roughness={0.8} />
      </mesh>
      {/* Wall accent header */}
      <mesh position={[0, 4.2, -6.38]}>
        <boxGeometry args={[18, 0.18, 0.05]} />
        <meshBasicMaterial color="#218ab5" />
      </mesh>

      {/* Office Central Break Room */}
      <OfficeLounge position={[0, 0, 1.8]} />

      {/* 4 Specialized Workstations with Desks and Ergonomic Chairs */}
      {/* 1. Hermes Command Desk */}
      <WorkstationDesk
        position={[-4.6, 0, -2.6]}
        stationColor="#2ee6a6"
        busy={mergedAgents.find(a => a.id === 'hermes')?.status === 'working'}
        title="Hermes Command"
        type="desk"
      />
      <OfficeChair position={[-4.6, 0, -1.8]} rotation={[0, 0, 0]} color="#0e3430" />

      {/* 2. 9Router Gateway Terminal */}
      <WorkstationDesk
        position={[-1.5, 0, -3.2]}
        stationColor="#9b72ff"
        busy={mergedAgents.find(a => a.id === 'router')?.status === 'working'}
        title="9Router Rack"
        type="router"
      />
      <OfficeChair position={[-1.5, 0, -2.3]} rotation={[0, 0, 0]} color="#261b42" />

      {/* 3. Tool Runner Engineering Bench */}
      <WorkstationDesk
        position={[1.8, 0, -3.2]}
        stationColor="#48c9f5"
        busy={mergedAgents.find(a => a.id === 'tools')?.status === 'working'}
        title="Tool Runner"
        type="tools"
      />
      <OfficeChair position={[1.8, 0, -2.3]} rotation={[0, 0, 0]} color="#113144" />

      {/* 4. Memory Store Data Vault */}
      <WorkstationDesk
        position={[4.6, 0, -2.6]}
        stationColor="#f6b44c"
        busy={mergedAgents.find(a => a.id === 'memory')?.status === 'working'}
        title="Memory Vault"
        type="memory"
      />
      <OfficeChair position={[4.6, 0, -1.8]} rotation={[0, 0, 0]} color="#382914" />

      {/* 4 Dynamic Humanoid Workers */}
      {mergedAgents.map(a => (
        <OfficeWorker
          key={a.id}
          {...a}
          selected={selected === a.id}
          onClick={() => setSelected(a.id)}
        />
      ))}

      <OrbitControls makeDefault minDistance={6} maxDistance={22} maxPolarAngle={Math.PI / 2.05} target={[0, 0.6, -0.6]} />
    </Canvas>
  );
}

function stateLabel(state) {
  return state === 'online' ? 'Online' : state === 'error' ? 'Error' : state === 'unconfigured' ? 'Belum diatur' : state === 'unknown' ? 'Belum diperiksa' : state || 'Tidak diketahui';
}

export default function App() {
  const [page, setPage] = useState('Overview');
  const [selected, setSelected] = useState('hermes');
  const [status, setStatus] = useState(null);
  const [agents, setAgents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState(null);
  const [models, setModels] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Task creation state
  const [taskAgentId, setTaskAgentId] = useState('hermes');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskInput, setTaskInput] = useState('');
  const [submittingTask, setSubmittingTask] = useState(false);
  const [activeFilterAgent, setActiveFilterAgent] = useState('all');

  // AI Chat state
  const [chatMessages, setChatMessages] = useState([
    { sender: 'hermes', text: 'Hermes Core online. Semua agen siap di kantor virtual. Berikan instruksi atau pekerjaan.', time: new Date().toLocaleTimeString('id-ID') }
  ]);
  const [chatInput, setChatInput] = useState('');

  async function refresh() {
    setLoading(true); setError('');
    try {
      const [s, a, t, l, m] = await Promise.allSettled([
        fetch(`${API}/status`).then(r => r.json()),
        fetch(`${API}/agents`).then(r => r.json()),
        fetch(`${API}/tasks`).then(r => r.json()),
        fetch(`${API}/logs`).then(async r => ({ ok: r.ok, data: await r.json() })),
        fetch(`${API}/models`).then(async r => ({ ok: r.ok, data: await r.json() }))
      ]);

      if (s.status === 'fulfilled') setStatus(s.value);
      if (a.status === 'fulfilled' && a.value.ok) setAgents(a.value.agents);
      if (t.status === 'fulfilled' && t.value.ok) setTasks(t.value.tasks);
      if (l.status === 'fulfilled' && l.value.ok) setLogs(l.value.data);
      else setLogs({ error: l.status === 'fulfilled' ? (l.value.data?.error || 'Log belum tersedia') : 'API tidak dapat diakses' });
      if (m.status === 'fulfilled' && m.value.ok) setModels(m.value.data);
      else setModels(null);
    } catch {
      setError('API proxy tidak dapat diakses. Periksa service api.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2500);
    return () => clearInterval(interval);
  }, []);

  async function handleAssignTask(targetAgentId, title, input) {
    const aid = targetAgentId || taskAgentId;
    const t = title || taskTitle;
    const inp = input || taskInput || t;
    if (!t && !inp) return;

    setSubmittingTask(true);
    try {
      const res = await fetch(`${API}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: aid,
          title: t,
          input: inp
        })
      });
      if (res.ok) {
        setTaskTitle('');
        setTaskInput('');
        refresh();
      }
    } catch {
      setError('Gagal mengirim tugas ke agen.');
    } finally {
      setSubmittingTask(false);
    }
  }

  async function handleDispatchAll() {
    setSubmittingTask(true);
    try {
      for (const cfg of AGENT_CONFIGS) {
        const preset = PRESETS[cfg.id]?.[0];
        if (preset) {
          await fetch(`${API}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentId: cfg.id,
              title: preset.title,
              input: preset.input
            })
          });
        }
      }
      refresh();
    } catch {
      setError('Gagal menugaskan seluruh agen.');
    } finally {
      setSubmittingTask(false);
    }
  }

  async function handleChatSubmit(e) {
    e?.preventDefault();
    if (!chatInput.trim() || submittingTask) return;
    const prompt = chatInput.trim();
    setChatInput('');
    const userTime = new Date().toLocaleTimeString('id-ID');
    setChatMessages(prev => [...prev, { sender: 'user', text: prompt, time: userTime }]);

    setSubmittingTask(true);
    try {
      const res = await fetch(`${API}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'hermes',
          title: prompt.slice(0, 50),
          input: prompt
        })
      });
      if (res.ok) {
        const data = await res.json();
        const taskId = data.task?.id;
        const checkDone = setInterval(async () => {
          try {
            const tr = await fetch(`${API}/tasks?agentId=hermes`).then(r => r.json());
            const doneTask = tr.tasks?.find(t => t.id === taskId);
            if (doneTask && doneTask.status !== 'working') {
              clearInterval(checkDone);
              setChatMessages(prev => [
                ...prev,
                {
                  sender: 'hermes',
                  text: doneTask.output || 'Tugas selesai.',
                  time: new Date().toLocaleTimeString('id-ID'),
                  status: doneTask.status
                }
              ]);
              refresh();
            }
          } catch {
            clearInterval(checkDone);
          }
        }, 1200);
      }
    } catch {
      setChatMessages(prev => [...prev, { sender: 'hermes', text: 'Gagal mengeksekusi tugas. Cek koneksi API.', time: new Date().toLocaleTimeString('id-ID'), status: 'failed' }]);
    } finally {
      setSubmittingTask(false);
      refresh();
    }
  }

  const nav = [
    { name: 'Overview', icon: Layers },
    { name: 'AI Chat', icon: MessageSquare },
    { name: 'Agents', icon: Bot },
    { name: 'Tools', icon: Workflow },
    { name: 'Models (9Router)', icon: Globe },
    { name: 'Monitoring', icon: Gauge },
    { name: 'Logs', icon: Terminal },
    { name: 'Settings', icon: Settings }
  ];

  const agentList = useMemo(() => {
    return AGENT_CONFIGS.map(base => {
      const live = agents?.find(a => a.id === base.id);
      return {
        ...base,
        status: live?.status || 'idle',
        currentTask: live?.currentTask || null,
        taskStats: live?.taskStats || { total: 0, completed: 0, working: 0, failed: 0 }
      };
    });
  }, [agents]);

  const filteredTasks = useMemo(() => {
    if (activeFilterAgent === 'all') return tasks;
    return tasks.filter(t => t.agentId === activeFilterAgent);
  }, [tasks, activeFilterAgent]);

  const logRows = useMemo(() => {
    const raw = logs?.data;
    const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.logs) ? raw.logs : (Array.isArray(raw?.data) ? raw.data : []));
    return list.slice(0, 16).map((x, i) =>
      typeof x === 'string'
        ? { id: i, message: x, time: '', level: 'INFO' }
        : { id: x.id || i, message: x.message || x.msg || JSON.stringify(x), time: x.timestamp || x.time || '', level: x.level || x.severity || 'INFO', agentId: x.agentId }
    );
  }, [logs]);

  const modelList = models?.data || [];
  const workingCount = agentList.filter(a => a.status === 'working').length;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon"><Bot size={25} /></div>
          <div><strong>HERMES <span>AI AGENT</span></strong><small>3D Virtual Office Command Center</small></div>
        </div>
        <div className="top-right">
          <span className={`live-dot ${status?.sources?.router?.state === 'online' ? '' : 'muted'}`} />
          <span>{status?.sources?.router?.state === 'online' ? 'Router reachable' : 'Live Virtual Office'}</span>
          <button className="icon-btn" onClick={refresh} title="Refresh Data">
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
          <div className="avatar">A</div>
          <span>admin</span>
        </div>
      </header>

      <aside className="sidebar">
        <div className="workspace">
          <div className="workspace-mark"><Workflow size={18} /></div>
          <div><b>Virtual Office</b><small>Autonomous Team</small></div>
          <ChevronDown size={14} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        {nav.map(({ name, icon: Icon }) => (
          <button key={name} className={`nav-item ${page === name ? 'active' : ''}`} onClick={() => setPage(name)}>
            <Icon size={17} />
            <span>{name}</span>
          </button>
        ))}
        <div className="sidebar-bottom">
          <div className="connection-card">
            <span className="pulse" />
            <div><b>Office Mesh</b><small>{workingCount > 0 ? `${workingCount} Agen Aktif Bekerja` : 'Seluruh Agen Standby'}</small></div>
          </div>
          <small className="version">HERMES 3D OFFICE · 1.1.0</small>
        </div>
      </aside>

      <main className="main">
        <div className="page-head">
          <div>
            <div className="eyebrow">WORKSPACE / {page.toUpperCase()}</div>
            <h1>{page === 'Overview' ? 'Virtual Office Command Center' : page}</h1>
            <p>Karakter agen dinamis seperti di kantor · berjalan ke workstation masing-masing saat diberi tugas</p>
          </div>
          <div className="head-actions">
            <span className="pill">
              <span className="tiny-dot" /> {workingCount} dari {agentList.length} agen di meja kerja
            </span>
            <button className="ghost-btn" onClick={handleDispatchAll} disabled={submittingTask} title="Tugaskan semua agen bekerja bersamaan">
              <Sparkles size={14} /> Tugaskan Semua Agen
            </button>
            <button className="primary-btn" onClick={refresh}>
              <RefreshCw size={15} /> Sync
            </button>
          </div>
        </div>

        {error && <div className="notice error"><CircleHelp size={17} /><span>{error}</span></div>}

        {page === 'Overview' && (
          <>
            {/* 3D Dynamic Virtual Office */}
            <section className="scene-card">
              <div className="scene-head">
                <div>
                  <h2><span className="cyan-square" /> 3D Virtual Office & Workstations</h2>
                  <p>Beri tugas dan amati agen berjalan dari ruang istirahat ke meja kerjanya untuk mengetik & memproses tugas.</p>
                </div>
                <div className="scene-controls">
                  <span className="scene-badge"><span className="tiny-dot" /> DYNAMIC WORKERS</span>
                  <button className="ghost-btn" onClick={() => setSelected('hermes')}>Fokus Hermes</button>
                  <button className="ghost-btn" onClick={() => setSelected('router')}>Fokus Router</button>
                </div>
              </div>
              <div className="scene">
                <OfficeRoom
                  selected={selected}
                  setSelected={(id) => { setSelected(id); setTaskAgentId(id); }}
                  liveAgents={agentList}
                />
                <div className="scene-legend">
                  <span><i className="legend-green" /> Hermes Desk</span>
                  <span><i className="legend-purple" /> 9Router Terminal</span>
                  <span><i className="legend-blue" /> Tools Bench</span>
                  <span><i className="legend-amber" /> Memory Vault</span>
                </div>
                <div className="scene-coord">HERMES OFFICE 3D <b>●</b></div>
              </div>
              <div className="scene-foot">
                <span><Cable size={14} /> Agen aktif: <b style={{ color: agentList.find(a => a.id === selected)?.color }}>{agentList.find(a => a.id === selected)?.name}</b></span>
                <span>Role: {agentList.find(a => a.id === selected)?.role}</span>
                <span className="muted-text">Status Kerja: {agentList.find(a => a.id === selected)?.status.toUpperCase()}</span>
              </div>
            </section>

            {/* Task Dispatcher Card */}
            <section className="panel task-dispatcher-card">
              <div className="panel-head">
                <div>
                  <h3><PlusCircle size={16} /> Berikan Pekerjaan ke Agen</h3>
                  <p>Pilih agen dan delegasikan pekerjaan. Agen akan otomatis bangkit dan berjalan ke workstationnya</p>
                </div>
                <span className="count-tag">Target: {agentList.find(a => a.id === taskAgentId)?.name}</span>
              </div>

              <div className="dispatcher-body">
                <div className="agent-select-row">
                  {agentList.map(a => (
                    <button
                      key={a.id}
                      className={`agent-pick-btn ${taskAgentId === a.id ? 'active' : ''}`}
                      onClick={() => setTaskAgentId(a.id)}
                      style={{ '--agent-color': a.color }}
                    >
                      <span className="dot" style={{ background: a.color }} />
                      <b>{a.name}</b>
                      <small>{a.status === 'working' ? '⚡ DI MEJA KERJA' : '☕ DI LOUNGE'}</small>
                    </button>
                  ))}
                </div>

                <div className="preset-row">
                  <span className="preset-label">Tugas Cepat:</span>
                  {(PRESETS[taskAgentId] || []).map((p, idx) => (
                    <button
                      key={idx}
                      className="preset-chip"
                      onClick={() => { setTaskTitle(p.title); setTaskInput(p.input); }}
                    >
                      {p.title}
                    </button>
                  ))}
                </div>

                <form className="task-form" onSubmit={(e) => { e.preventDefault(); handleAssignTask(); }}>
                  <div className="input-group">
                    <input
                      type="text"
                      className="task-text-input"
                      placeholder="Judul pekerjaan / ringkasan instruksi..."
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <textarea
                      className="task-textarea"
                      placeholder="Detail pekerjaan, parameter, atau prompt eksekusi (opsional)..."
                      rows={2}
                      value={taskInput}
                      onChange={(e) => setTaskInput(e.target.value)}
                    />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="primary-btn" disabled={submittingTask || (!taskTitle && !taskInput)}>
                      <Play size={14} className={submittingTask ? 'spin' : ''} />
                      {submittingTask ? 'Mengirim Tugas...' : `Kirim & Gerakkan ${agentList.find(a => a.id === taskAgentId)?.name}`}
                    </button>
                  </div>
                </form>
              </div>
            </section>

            {/* Metrics Grid */}
            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-top"><span>Router API</span><Globe size={17} /></div>
                <strong className={status?.sources?.router?.state === 'online' ? 'green-text' : 'amber-text'}>
                  {stateLabel(status?.sources?.router?.state)}
                </strong>
                <small>{status?.sources?.router?.detail || 'Pemeriksaan status router'}</small>
              </div>
              <div className="stat-card">
                <div className="stat-top"><span>Agen Sedang Bekerja</span><Bot size={17} /></div>
                <strong className="green-text">
                  {workingCount} / {agentList.length}
                </strong>
                <small>Agen aktif di workstation masing-masing</small>
              </div>
              <div className="stat-card">
                <div className="stat-top"><span>Total Tugas Selesai</span><CheckCircle2 size={17} /></div>
                <strong>{tasks.filter(t => t.status === 'completed').length}</strong>
                <small>Dari {tasks.length} tugas yang didaftarkan</small>
              </div>
              <div className="stat-card">
                <div className="stat-top"><span>Model Aktif</span><Zap size={17} /></div>
                <strong className="model-name">{status?.model || 'model-custom'}</strong>
                <small>Model inference terkonfigurasi</small>
              </div>
            </section>

            {/* Lower Grid: Agent Registry & Live Activities */}
            <section className="lower-grid">
              {/* Agent Registry Panel */}
              <div className="panel">
                <div className="panel-head">
                  <div>
                    <h3><Activity size={16} /> Status Agen di Kantor</h3>
                    <p>Posisi dan status kerja tiap anggota tim</p>
                  </div>
                  <span className="count-tag">{agentList.length} agen</span>
                </div>
                <div className="agent-list">
                  {agentList.map(a => (
                    <div key={a.id} className={`agent-row ${selected === a.id ? 'selected' : ''}`}>
                      <div className="agent-avatar" style={{ color: a.color, borderColor: a.color + '66' }}>
                        <Bot size={18} />
                      </div>
                      <div className="agent-copy" onClick={() => setSelected(a.id)}>
                        <b>{a.name}</b>
                        <small>{a.currentTask ? `Sedang: ${a.currentTask}` : (a.status === 'working' ? 'Memproses tugas...' : 'Standby di break room')}</small>
                        <div className="agent-mini-stats">
                          <span>Selesai: {a.taskStats.completed}</span>
                          {a.taskStats.working > 0 && <span className="working-stat">● Di Meja Kerja</span>}
                        </div>
                      </div>
                      <div className="agent-row-actions">
                        <button
                          className="ghost-btn action-assign"
                          onClick={() => { setTaskAgentId(a.id); setSelected(a.id); }}
                          title="Tugaskan agen ini"
                        >
                          Beri Tugas
                        </button>
                        <span className={`status-chip ${a.status === 'working' ? 'ok pulse-chip' : ''}`}>
                          {a.status === 'working' ? 'BEKERJA' : 'STANDBY'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Activities Feed Panel */}
              <div className="panel">
                <div className="panel-head">
                  <div>
                    <h3><Terminal size={16} /> Aktivitas Yang Dilakukan Agen</h3>
                    <p>Pantau proses, langkah eksekusi, dan hasil output masing-masing agen</p>
                  </div>
                  <div className="activity-filter-tags">
                    <button
                      className={`filter-tag ${activeFilterAgent === 'all' ? 'active' : ''}`}
                      onClick={() => setActiveFilterAgent('all')}
                    >
                      Semua
                    </button>
                    {agentList.map(a => (
                      <button
                        key={a.id}
                        className={`filter-tag ${activeFilterAgent === a.id ? 'active' : ''}`}
                        onClick={() => setActiveFilterAgent(a.id)}
                      >
                        {a.name.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="activities-feed">
                  {filteredTasks.length ? (
                    filteredTasks.slice(0, 10).map(t => {
                      const agent = agentList.find(a => a.id === t.agentId);
                      return (
                        <div key={t.id} className={`activity-card ${t.status}`}>
                          <div className="activity-card-top">
                            <div className="activity-agent-tag" style={{ color: agent?.color }}>
                              <span className="dot" style={{ background: agent?.color }} />
                              <b>{agent?.name || t.agentId}</b>
                            </div>
                            <span className="activity-time">
                              <Clock size={11} /> {t.startedAt ? new Date(t.startedAt).toLocaleTimeString('id-ID') : '—'}
                            </span>
                            <span className={`status-chip ${t.status === 'working' ? 'ok' : (t.status === 'completed' ? 'success' : 'failed')}`}>
                              {t.status.toUpperCase()}
                            </span>
                          </div>

                          <div className="activity-title">
                            <strong>{t.title}</strong>
                            {t.input && t.input !== t.title && <p className="activity-input">{t.input}</p>}
                          </div>

                          {t.status === 'working' && (
                            <div className="activity-progress-wrap">
                              <div className="activity-progress-bar" style={{ width: `${t.progress}%`, background: agent?.color }} />
                              <small>Sedang mengerjakan di meja kerja... ({t.progress}%)</small>
                            </div>
                          )}

                          {t.output && (
                            <div className="activity-output">
                              <div className="output-label">Hasil Eksekusi:</div>
                              <pre>{t.output}</pre>
                            </div>
                          )}

                          {t.logs && t.logs.length > 0 && (
                            <details className="activity-details">
                              <summary>{t.logs.length} catatan log eksekusi</summary>
                              <div className="task-log-list">
                                {t.logs.map((log, lidx) => (
                                  <div key={lidx} className="task-log-entry">{log}</div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="empty-state">
                      <Terminal size={22} />
                      <b>Belum ada aktivitas untuk agen ini</b>
                      <span>Gunakan form di atas untuk menugaskan pekerjaan pertama ke agen.</span>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </>
        )}

        {/* AGENTS SUBPAGE */}
        {page === 'Agents' && (
          <section className="panel subpage">
            <div className="panel-head">
              <div>
                <h3>Manajemen & Delegasi Seluruh Agen</h3>
                <p>Kendalikan dan delegasikan pekerjaan khusus untuk tiap spesialisasi agen</p>
              </div>
            </div>

            <div className="agents-grid-cards">
              {agentList.map(a => (
                <div key={a.id} className="agent-detail-card" style={{ borderColor: a.color + '44' }}>
                  <div className="agent-card-header">
                    <div className="agent-avatar" style={{ color: a.color, borderColor: a.color }}>
                      <Bot size={22} />
                    </div>
                    <div>
                      <h4 style={{ color: a.color }}>{a.name}</h4>
                      <span className="agent-role-pill">{a.role}</span>
                    </div>
                    <span className={`status-chip ${a.status === 'working' ? 'ok' : ''}`}>
                      {a.status === 'working' ? 'BEKERJA' : 'STANDBY'}
                    </span>
                  </div>

                  <p className="agent-card-desc">{a.desc}</p>

                  <div className="agent-card-metrics">
                    <div><span>Total Tugas</span><b>{a.taskStats.total}</b></div>
                    <div><span>Selesai</span><b>{a.taskStats.completed}</b></div>
                    <div><span>Status</span><b style={{ color: a.status === 'working' ? '#2de6a1' : '#8da4b5' }}>{a.status === 'working' ? 'Di Meja' : 'Lounge'}</b></div>
                  </div>

                  {a.currentTask && (
                    <div className="current-task-banner">
                      <span className="dot pulse" /> Sedang: <b>{a.currentTask}</b>
                    </div>
                  )}

                  <div className="agent-card-action">
                    <h5>Tugaskan Pekerjaan Cepat:</h5>
                    <div className="preset-buttons">
                      {(PRESETS[a.id] || []).map((p, idx) => (
                        <button
                          key={idx}
                          className="ghost-btn-sm"
                          disabled={submittingTask}
                          onClick={() => handleAssignTask(a.id, p.title, p.input)}
                        >
                          <Play size={10} /> {p.title}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* AI CHAT SUBPAGE */}
        {page === 'AI Chat' && (
          <section className="panel subpage chat-section">
            <div className="panel-head">
              <div>
                <h3><MessageSquare size={16} /> Konsol Interaktif Hermes Core</h3>
                <p>Kirimkan instruksi atau pekerjaan langsung ke Orchestrator via obrolan</p>
              </div>
            </div>

            <div className="chat-thread">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`chat-bubble ${msg.sender}`}>
                  <div className="bubble-header">
                    <b>{msg.sender === 'user' ? 'Admin' : 'Hermes Core'}</b>
                    <small>{msg.time}</small>
                  </div>
                  <div className="bubble-text">{msg.text}</div>
                </div>
              ))}
              {submittingTask && (
                <div className="chat-bubble hermes working">
                  <div className="bubble-header"><b>Hermes Core</b><small>berjalan ke meja kerja...</small></div>
                  <div className="bubble-text spin-pulse">Mengeksekusi instruksi dan mengoordinasikan mesh...</div>
                </div>
              )}
            </div>

            <form className="chat-input-row" onSubmit={handleChatSubmit}>
              <input
                type="text"
                className="chat-input"
                placeholder="Tuliskan tugas atau instruksi untuk Hermes..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={submittingTask}
              />
              <button type="submit" className="primary-btn" disabled={submittingTask || !chatInput.trim()}>
                <Send size={15} /> Kirim
              </button>
            </form>
          </section>
        )}

        {/* MODELS SUBPAGE */}
        {page === 'Models (9Router)' && (
          <section className="panel subpage">
            <div className="panel-head">
              <div>
                <h3><Database size={16} /> Model Discovery via 9Router</h3>
                <p>Model OpenAI-compatible yang dapat digunakan oleh seluruh agen</p>
              </div>
              <span className="count-tag">{modelList.length} returned</span>
            </div>
            {modelList.length ? (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Model ID</th><th>Provider Owner</th><th>Source</th></tr></thead>
                  <tbody>
                    {modelList.map(m => (
                      <tr key={m.id}>
                        <td><code>{m.id}</code></td>
                        <td>{m.owned_by || '—'}</td>
                        <td><span className="table-live"><i />GET /v1/models</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <Globe size={24} />
                <b>Model list belum tersedia</b>
                <span>Periksa konfigurasi ROUTER_BASE_URL dan ROUTER_API_KEY.</span>
              </div>
            )}
          </section>
        )}

        {/* LOGS SUBPAGE */}
        {page === 'Logs' && (
          <section className="panel subpage">
            <div className="panel-head">
              <div>
                <h3><Terminal size={16} /> Log Aktivitas Sistem & Agen</h3>
                <p>Log aktivitas real-time dari seluruh operasi multi-agen</p>
              </div>
              <button className="ghost-btn" onClick={refresh}><RefreshCw size={13} /> Refresh</button>
            </div>
            {logRows.length ? (
              <div className="logs full-logs">
                {logRows.map(l => (
                  <div className="log-row" key={l.id}>
                    <span className="log-time">{l.time ? String(l.time).slice(-8) : '—'}</span>
                    <span className={`log-level ${l.level.toLowerCase()}`}>{l.level}</span>
                    <span className="log-message">{l.message}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state"><Terminal size={22} /><b>Belum ada log yang tersedia</b></div>
            )}
          </section>
        )}

        {/* OTHER SUBPAGES */}
        {!['Overview', 'Agents', 'AI Chat', 'Models (9Router)', 'Logs'].includes(page) && (
          <section className="panel subpage">
            <div className="panel-head">
              <div>
                <h3>{page}</h3>
                <p>Status modul sistem</p>
              </div>
            </div>
            <div className="empty-state">
              <Settings size={24} />
              <b>Modul {page} aktif</b>
              <span>Konfigurasi dan metrics terhubung ke virtual office mesh.</span>
            </div>
          </section>
        )}

        <footer>
          <span>Hermes Agent 3D · Virtual Office Command Center</span>
          <span><ShieldCheck size={13} /> Multi-Agent Mesh Aktif & Terkoordinasi</span>
          <span>Update terakhir: {status?.generatedAt ? new Date(status.generatedAt).toLocaleTimeString('id-ID') : '—'}</span>
        </footer>
      </main>
    </div>
  );
}
