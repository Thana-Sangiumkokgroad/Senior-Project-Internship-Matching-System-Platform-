// Shared constants for matching system (used by both InterestForm and CompanyDashboard)

export const POSITION_TYPES = [
  // Web Development
  { value: 'frontend-dev',      label: 'Frontend Developer' },
  { value: 'backend-dev',       label: 'Backend Developer' },
  { value: 'fullstack-dev',     label: 'Full Stack Developer' },
  { value: 'web-performance',   label: 'Web Performance Engineer' },
  // Mobile
  { value: 'mobile-dev',        label: 'Mobile Developer (iOS / Android)' },
  { value: 'flutter-dev',       label: 'Flutter Developer' },
  { value: 'react-native-dev',  label: 'React Native Developer' },
  // Data & AI
  { value: 'data-science',      label: 'Data Scientist / ML Engineer' },
  { value: 'data-engineer',     label: 'Data Engineer' },
  { value: 'data-analyst',      label: 'Data Analyst / BI' },
  { value: 'ai-engineer',       label: 'AI / LLM Engineer' },
  { value: 'computer-vision',   label: 'Computer Vision Engineer' },
  // Infrastructure & DevOps
  { value: 'devops',            label: 'DevOps / Cloud Engineer' },
  { value: 'sre',               label: 'Site Reliability Engineer (SRE)' },
  { value: 'embedded',          label: 'Embedded / Firmware Engineer' },
  // Design
  { value: 'uiux',              label: 'UI/UX Designer' },
  { value: 'product-designer',  label: 'Product Designer' },
  { value: 'graphic-design',    label: 'Graphic / Motion Designer' },
  // Quality & Security
  { value: 'qa',                label: 'QA / Test Engineer' },
  { value: 'cybersecurity',     label: 'Cybersecurity Analyst' },
  { value: 'pentest',           label: 'Penetration Tester' },
  // Product & Management
  { value: 'product-manager',   label: 'Product Manager / Owner' },
  { value: 'project-manager',   label: 'IT Project Manager' },
  { value: 'business-analyst',  label: 'Business / Systems Analyst' },
  // Other Tech
  { value: 'blockchain',        label: 'Blockchain Developer' },
  { value: 'game-dev',          label: 'Game Developer' },
  { value: 'ar-vr',             label: 'AR / VR Developer' },
  { value: 'tech-support',      label: 'Technical Support / IT Admin' },
];

// Used for partial position matching (same group = 18 pts instead of 30)
export const POSITION_GROUPS = {
  'frontend-dev': 'web-dev',
  'backend-dev': 'web-dev',
  'fullstack-dev': 'web-dev',
  'web-performance': 'web-dev',
  'mobile-dev': 'mobile',
  'flutter-dev': 'mobile',
  'react-native-dev': 'mobile',
  'data-science': 'data',
  'data-engineer': 'data',
  'data-analyst': 'data',
  'ai-engineer': 'data',
  'computer-vision': 'data',
  'devops': 'devops',
  'sre': 'devops',
  'embedded': 'devops',
  'uiux': 'design',
  'product-designer': 'design',
  'graphic-design': 'design',
  'qa': 'qa',
  'cybersecurity': 'security',
  'pentest': 'security',
  'product-manager': 'product',
  'project-manager': 'product',
  'business-analyst': 'product',
  'blockchain': 'other',
  'game-dev': 'other',
  'ar-vr': 'other',
  'tech-support': 'other',
};

export const PROGRAMMING_LANGUAGES = [
  // High-demand
  'Python', 'JavaScript', 'TypeScript', 'Java', 'C', 'C++', 'C#', 'Go',
  // Web / Scripting
  'PHP', 'Ruby', 'Perl', 'Bash / Shell',
  // Mobile
  'Swift', 'Kotlin', 'Dart', 'Objective-C',
  // Systems
  'Rust', 'Zig', 'Assembly',
  // Data / Scientific
  'R', 'Scala', 'Julia', 'MATLAB',
  // Other
  'Haskell', 'Elixir', 'Clojure', 'Lua', 'Groovy', 'F#', 'COBOL', 'Fortran',
  // Query / Markup (treated as skills)
  'SQL', 'HTML', 'CSS',
];

export const FRAMEWORKS_AND_TOOLS = [
  // Frontend Frameworks
  'React', 'Vue.js', 'Angular', 'Next.js', 'Nuxt.js', 'Svelte', 'SvelteKit',
  'Astro', 'Remix', 'Gatsby', 'Tailwind CSS', 'Bootstrap', 'SASS / SCSS',
  // Backend Frameworks
  'Node.js', 'Express.js', 'NestJS', 'Fastify',
  'Django', 'Flask', 'FastAPI', 'Tornado',
  'Spring Boot', 'Quarkus', 'Micronaut',
  'Laravel', 'Symfony', 'CodeIgniter',
  'Ruby on Rails', 'Sinatra',
  'ASP.NET Core', 'Blazor',
  'Gin', 'Echo', 'Fiber',
  // Mobile
  'React Native', 'Flutter', 'Expo', 'SwiftUI', 'Jetpack Compose',
  // Data / AI / ML
  'TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn',
  'Pandas', 'NumPy', 'SciPy', 'Matplotlib', 'Seaborn',
  'Apache Spark', 'Hadoop', 'Kafka', 'Airflow',
  'LangChain', 'HuggingFace', 'OpenCV',
  'Jupyter', 'dbt',
  // Databases
  'PostgreSQL', 'MySQL', 'MariaDB', 'SQLite',
  'MongoDB', 'Cassandra', 'DynamoDB', 'CouchDB',
  'Redis', 'Elasticsearch', 'InfluxDB',
  'Firebase', 'Supabase', 'PlanetScale',
  // Cloud / DevOps
  'AWS', 'GCP', 'Azure', 'DigitalOcean', 'Heroku', 'Vercel', 'Netlify',
  'Docker', 'Kubernetes', 'Podman',
  'Terraform', 'Ansible', 'Pulumi',
  'GitHub Actions', 'GitLab CI', 'Jenkins', 'CircleCI',
  // API & Protocols
  'REST API', 'GraphQL', 'gRPC', 'WebSocket', 'tRPC',
  // Testing
  'Jest', 'Vitest', 'Cypress', 'Playwright', 'Selenium', 'JUnit', 'Pytest',
  // Tools & Platforms
  'Git', 'Linux', 'Nginx', 'RabbitMQ', 'Stripe API',
  // Blockchain
  'Solidity', 'Hardhat', 'Web3.js', 'Ethers.js',
  // Game
  'Unity', 'Unreal Engine', 'Godot',
];

// Combined list for the "Required Skills" checkboxes in the internship post form
export const ALL_SKILLS = [...PROGRAMMING_LANGUAGES, ...FRAMEWORKS_AND_TOOLS];

export const INDUSTRIES = [
  'FinTech',
  'E-commerce',
  'Healthcare',
  'Education',
  'Gaming',
  'Media & Entertainment',
  'Logistics & Supply Chain',
  'Manufacturing',
  'Consulting / IT Services',
  'Government & Public Sector',
  'Retail',
  'Real Estate',
  'Telecom',
  'Cybersecurity',
  'AI & Robotics',
];

export const WORK_MODES = [
  { value: 'on-site', label: 'On-site' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'flexible', label: 'Flexible (Any)' },
];
