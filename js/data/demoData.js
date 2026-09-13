/**
 * DEVFLOW — Demo Data & Schemas
 * Clean data layer designed for seamless future Supabase database integration.
 */

export const initialWorkspace = {
  id: 'ws-demo-01',
  name: 'DevFlow Engineering',
  role: 'Staff Platform Engineer',
  projectType: 'Fullstack Cloud Platform',
  created_at: '2026-09-01T00:00:00.000Z'
};

export const initialProjects = [
  {
    id: 'proj-1',
    name: 'LifeQuest',
    description: 'Developer productivity and gamified habit mastery platform with cloud sync.',
    status: 'Active',
    category: 'Productivity',
    badgeColor: '#3b82f6',
    tasksCount: 4,
    completedTasksCount: 3,
    created_at: '2026-09-01T10:00:00.000Z'
  },
  {
    id: 'proj-2',
    name: 'Exoplanet Explorer',
    description: 'Astronomy discovery platform analyzing photometric light curves and Kepler spectra.',
    status: 'Active',
    category: 'Science & AI',
    badgeColor: '#8b5cf6',
    tasksCount: 3,
    completedTasksCount: 2,
    created_at: '2026-09-04T14:30:00.000Z'
  },
  {
    id: 'proj-3',
    name: 'FloodLens',
    description: 'Geospatial flood monitoring and disaster risk prediction visualizer.',
    status: 'In Planning',
    category: 'Geospatial',
    badgeColor: '#10b981',
    tasksCount: 2,
    completedTasksCount: 1,
    created_at: '2026-09-08T09:15:00.000Z'
  }
];

export const initialTasks = [
  {
    id: 'task-1',
    title: 'Build responsive landing page',
    projectId: 'proj-1',
    projectName: 'LifeQuest',
    priority: 'High',
    status: 'Completed',
    dueDate: '2026-09-15',
    created_at: '2026-09-02T11:00:00.000Z'
  },
  {
    id: 'task-2',
    title: 'Connect database and auth schema',
    projectId: 'proj-1',
    projectName: 'LifeQuest',
    priority: 'High',
    status: 'Completed',
    dueDate: '2026-09-18',
    created_at: '2026-09-03T15:20:00.000Z'
  },
  {
    id: 'task-3',
    title: 'Deploy application to Edge clusters',
    projectId: 'proj-2',
    projectName: 'Exoplanet Explorer',
    priority: 'Medium',
    status: 'In Progress',
    dueDate: '2026-09-22',
    created_at: '2026-09-05T08:45:00.000Z'
  },
  {
    id: 'task-4',
    title: 'Improve authentication and RBAC security',
    projectId: 'proj-1',
    projectName: 'LifeQuest',
    priority: 'High',
    status: 'Todo',
    dueDate: '2026-09-25',
    created_at: '2026-09-06T12:00:00.000Z'
  },
  {
    id: 'task-5',
    title: 'Implement planetary transit transit algorithm',
    projectId: 'proj-2',
    projectName: 'Exoplanet Explorer',
    priority: 'Medium',
    status: 'Todo',
    dueDate: '2026-09-28',
    created_at: '2026-09-07T16:10:00.000Z'
  },
  {
    id: 'task-6',
    title: 'Design geospatial terrain shader layer',
    projectId: 'proj-3',
    projectName: 'FloodLens',
    priority: 'Low',
    status: 'In Progress',
    dueDate: '2026-10-02',
    created_at: '2026-09-09T09:30:00.000Z'
  },
  {
    id: 'task-7',
    title: 'Optimize WASM build bundle size',
    projectId: 'proj-2',
    projectName: 'Exoplanet Explorer',
    priority: 'High',
    status: 'Completed',
    dueDate: '2026-09-12',
    created_at: '2026-09-04T13:00:00.000Z'
  },
  {
    id: 'task-8',
    title: 'Setup telemetry alerts for rainfall surges',
    projectId: 'proj-3',
    projectName: 'FloodLens',
    priority: 'Medium',
    status: 'Todo',
    dueDate: '2026-10-05',
    created_at: '2026-09-10T14:00:00.000Z'
  }
];

export const featuresDetailsData = {
  'ship': {
    id: 'ship',
    title: 'Ship Faster',
    kicker: '01 / Continuous Velocity',
    tagline: 'Reduce friction between local code and planetary production deployment.',
    description: 'DevFlow orchestrates low-latency incremental builds with edge caching, automated parallel test suites, and sub-second container warmups so your engineers never wait on CI/CD pipelines.',
    benefits: [
      'Sub-second incremental build graphs with zero redundant compilation.',
      'Instant edge preview environments generated automatically for every pull request.',
      'Canary rollouts with automated latency-sensitive health rollbacks.'
    ],
    metric: '42% faster release cycles',
    metricContext: 'Observed across 1,200+ high-velocity enterprise engineering squads.',
    demoType: 'build',
    demoCode: '$ devflow deploy --canary\n✓ Bundling 142 modules in 38ms\n✓ Edge health check verified (35 regions)\n→ Deployed to https://prod.devflow.cloud in 0.84s'
  },
  'collaborate': {
    id: 'collaborate',
    title: 'Collaborate Seamlessly',
    kicker: '02 / Distributed Teamwork',
    tagline: 'Work together in shared, ephemeral cloud workspaces with multiplayer sync.',
    description: 'Eliminate "it works on my machine" forever. DevFlow connects developers with shared container state, multiplexed terminal pairing, and real-time live code review sessions.',
    benefits: [
      'Multiplayer cloud sandboxes with synchronized editor and terminal states.',
      'Centralized environment variable encryption with RBAC permission boundaries.',
      'One-click sandbox sharing with cross-functional design and QA partners.'
    ],
    metric: '99.4% merge success rate',
    metricContext: 'Drastically cutting merge conflict resolution and review wait times.',
    demoType: 'collaborate',
    demoCode: '// Multiplayer Session Active\n→ alex@devflow joined channel #exoplanet-core\n→ Terminal sandbox synced [2 peers connected]\n✓ Live preview: port 3000 bridged'
  },
  'track': {
    id: 'track',
    title: 'Track Work',
    kicker: '03 / Traceability & Insights',
    tagline: 'Connect every line of code to user stories, tasks, and sprint velocity.',
    description: 'DevFlow automatically correlates Git commits, CI runs, and developer tasks into an interactive dashboard, providing unprecedented clarity on sprint progress and bottlenecks.',
    benefits: [
      'Automated issue-to-commit linking without manual ticket updating.',
      'Live sprint burndown and real-time task status synchronization.',
      'Automated pull request risk scoring based on modified architecture paths.'
    ],
    metric: 'Real-time task synchronization',
    metricContext: 'Automatic status updates driven by Git webhooks and terminal actions.',
    demoType: 'track',
    demoCode: 'TASK-104: Build responsive landing page\n[Status: In Progress → Completed]\nLinked commit: 9b2d8f1 "feat: add interactive demo dashboard"\nImpact: 4 components, 0 breaking changes'
  },
  'analyze': {
    id: 'analyze',
    title: 'Analyze & Optimize',
    kicker: '04 / Deep Telemetry',
    tagline: 'Understand team productivity, compiler hotspots, and runtime bottlenecks.',
    description: 'Empower your engineering leaders with actionable telemetry. DevFlow detects memory leaks, cold boot latencies, and redundant dependencies with built-in AI profiling.',
    benefits: [
      'AI-assisted flamegraph analysis identifying slow database queries and render loops.',
      'Cold-start latency optimization with predictive container pre-warming.',
      'Repository hygiene analysis monitoring dependency vulnerabilities and technical debt.'
    ],
    metric: '3.2x latency bottleneck reduction',
    metricContext: 'Automated profiler recommendations implemented in under 5 minutes.',
    demoType: 'analyze',
    demoCode: '⚡ Profiler Report:\n• Server Cold Start: 42ms (Top 1% percentile)\n• Database Query P99: 8.4ms\n• Memory Leak Risk: 0% detected\n→ Recommendation: Enable Brotli edge compression'
  }
};

export const docsGuideData = {
  title: 'DevFlow Documentation & Architecture',
  version: 'v2.4.0 (Edge Edition)',
  sections: [
    {
      heading: 'Quickstart CLI',
      code: 'npm install -g @devflow/cli\ndevflow init my-workspace\ndevflow dev --cloud-sync',
      notes: 'Instantly links your local directory to the DevFlow distributed cloud engine.'
    },
    {
      heading: 'Supabase & Database Architecture',
      code: `// SQL Schema Definition
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  priority TEXT DEFAULT 'Medium',
  status TEXT DEFAULT 'Todo',
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`,
      notes: 'Prepared for clean row-level security and real-time subscriptions with Supabase.'
    },
    {
      heading: 'Edge Runtime Deployment',
      code: `export default {
  port: 3000,
  regions: ['iad1', 'fra1', 'sin1', 'syd1'],
  scaling: { min: 1, max: 20, targetCpu: 70 }
};`,
      notes: 'Global edge clustering with zero cold starts and sub-second canary routing.'
    }
  ]
};
