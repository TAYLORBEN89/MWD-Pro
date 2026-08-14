import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Compass,
  Gauge,
  Layers,
  Navigation,
  Radio,
  Wrench,
  AlertTriangle,
  Crosshair,
  LineChart,
  CheckCircle2,
  Box,
} from 'lucide-react';

export type SimLabItem = {
  id: string;
  title: string;
  subtitle: string;
  /** Free sample sims shown without purchase */
  isFree: boolean;
  /** Curriculum section that hosts this sim */
  sectionId: string;
  icon: LucideIcon;
};

const LAB_COVER_VERSION = 'v4';

export function getSimLabCover(id: string): string {
  return `/labs/${id}.jpg?${LAB_COVER_VERSION}`;
}

/** Catalog of interactive labs (drives Sim Lab tab + free funnel). */
export const simLabCatalog: SimLabItem[] = [
  {
    id: 'toolface',
    title: 'Toolface Dial',
    subtitle: 'Orient gravity vs magnetic toolface',
    isFree: true,
    sectionId: 'section-4',
    icon: Compass,
  },
  {
    id: 'trajectory',
    title: 'Wellbore Trajectory',
    subtitle: 'Profile, plan, and 3D survey path',
    isFree: true,
    sectionId: 'section-4',
    icon: Navigation,
  },
  {
    id: 'vibration',
    title: 'Vibration Monitor',
    subtitle: 'Bit bounce, whirl, and stick-slip',
    isFree: true,
    sectionId: 'section-2',
    icon: Activity,
  },
  {
    id: 'architecture',
    title: 'Tool Architecture',
    subtitle: 'Explore MWD string components',
    isFree: false,
    sectionId: 'section-3',
    icon: Box,
  },
  {
    id: 'magnetic',
    title: 'Magnetic Interference',
    subtitle: 'See distortion on survey vectors',
    isFree: false,
    sectionId: 'section-5',
    icon: Gauge,
  },
  {
    id: 'formation',
    title: 'Formation Log',
    subtitle: 'Gamma ray lithology while drilling',
    isFree: false,
    sectionId: 'section-6',
    icon: Layers,
  },
  {
    id: 'mudpulse',
    title: 'Mud Pulse Telemetry',
    subtitle: 'Encode and decode pressure pulses',
    isFree: false,
    sectionId: 'section-7',
    icon: Radio,
  },
  {
    id: 'workflow',
    title: 'Rig Workflow',
    subtitle: 'Field tech procedures end-to-end',
    isFree: false,
    sectionId: 'section-8',
    icon: Wrench,
  },
  {
    id: 'failure',
    title: 'Failure Diagnosis',
    subtitle: 'Troubleshoot real-world failure modes',
    isFree: false,
    sectionId: 'section-9',
    icon: AlertTriangle,
  },
  {
    id: 'steering',
    title: '3D Steering Simulator',
    subtitle: 'Slide vs rotate directional control',
    isFree: false,
    sectionId: 'section-10',
    icon: Crosshair,
  },
  {
    id: 'geosteering',
    title: 'Geosteering Interpretation',
    subtitle: 'Stay in-zone with GR correlation',
    isFree: false,
    sectionId: 'section-12',
    icon: LineChart,
  },
  {
    id: 'advanced-logs',
    title: 'Advanced LWD Logs',
    subtitle: 'Resistivity, density, neutron',
    isFree: false,
    sectionId: 'section-13',
    icon: Layers,
  },
  {
    id: 'survey-qc',
    title: 'Survey Quality Control',
    subtitle: 'Validate Gtot, Btot, and dip',
    isFree: false,
    sectionId: 'section-14',
    icon: CheckCircle2,
  },
];
