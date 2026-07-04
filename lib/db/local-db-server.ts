import fs from 'fs';
import path from 'path';

const DB_FILE_PATH = path.join(process.cwd(), 'db.json');
const STORAGE_DIR = path.join(process.cwd(), 'public', 'courses');

export interface Filter {
  type: 'eq' | 'neq' | 'in';
  column: string;
  value: any;
}

export interface SerializedQuery {
  table: string;
  filters: Filter[];
  order: { column: string; ascending: boolean } | null;
  single: boolean;
  maybeSingle: boolean;
  limit: number | null;
}

// Default initial state matching the old Supabase tables
const DEFAULT_DB = {
  courses: [
    {
      id: 'course-1',
      slug: 'intro-to-ai-agents',
      title: 'AI 에이전트 입문',
      description: 'AI 에이전트의 기본 개념과 동작 원리를 배우고, 간단한 에이전트를 구성해 봅니다.',
      thumbnail: 'icon:book',
      published: true,
      disabled: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'course-2',
      slug: 'advanced-prompt-engineering',
      title: '고급 프롬프트 엔지니어링',
      description: 'LLM의 성능을 극대화하기 위한 체계적인 프롬프트 작성 기법을 학습합니다.',
      thumbnail: 'icon:zap',
      published: true,
      disabled: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  course_cards: [
    {
      id: 'card-1-1',
      course_id: 'course-1',
      title: '에이전트 개요',
      filename: '01-intro.mdx',
      content: '# AI 에이전트 개요\n\nAI 에이전트는 자율적으로 목표를 설정하고 도구를 사용하며 문제를 해결하는 시스템입니다.',
      order_index: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'card-1-2',
      course_id: 'course-1',
      title: '역사 및 동향',
      filename: '02-history.mdx',
      content: '# AI 에이전트의 역사\n\n최근 LLM(대규모 언어 모델)의 발전으로 자연어 지시를 이해하는 에이전트의 개발이 비약적으로 성장했습니다.',
      order_index: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'card-1-3',
      course_id: 'course-1',
      title: '기본 아키텍처',
      filename: '03-architecture.mdx',
      content: '# 에이전트 아키텍처\n\n핵심 구성 요소로는 **메모리(Memory)**, **계획(Planning)**, **도구(Tools)**가 있습니다.',
      order_index: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'card-1-4',
      course_id: 'course-1',
      title: '실습: 나만의 에이전트',
      filename: '04-hands-on.mdx',
      content: '# 실습하기\n\n로컬 AI Worker 또는 외부 API를 연동하여 자율 에이전트 실습을 시작해보세요.',
      order_index: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'card-2-1',
      course_id: 'course-2',
      title: '프롬프트의 4대 원칙',
      filename: '01-principles.mdx',
      content: '# 프롬프트 설계의 4대 요소\n\n1. 지시(Instruction)\n2. 컨텍스트(Context)\n3. 입력 데이터(Input Data)\n4. 출력 형식(Output Indicator)',
      order_index: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'card-2-2',
      course_id: 'course-2',
      title: 'Few-Shot & CoT',
      filename: '02-few-shot.mdx',
      content: '# Few-Shot 및 Chain-of-Thought\n\n몇 가지 예시(Few-Shot)와 단계별 추론 과정(CoT)을 유도하면 복잡한 작업에서도 뛰어난 성능을 보입니다.',
      order_index: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  course_wiki: [
    {
      id: 'wiki-1',
      course_id: 'course-1',
      content: 'AI 에이전트에 대한 기본 백과사전 콘텐츠입니다.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'wiki-2',
      course_id: 'course-2',
      content: '프롬프트 엔지니어링 용어 정리 및 설계 가이드북입니다.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  course_packages: [
    {
      id: 'package-1',
      slug: 'tutor-starter-pack',
      title: 'AI 에이전트 & 프롬프트 스타터 팩',
      description: '초보자를 위해 AI 에이전트의 원리와 프롬프트 엔지니어링 기술을 함께 묶어놓은 입문 패키지입니다.',
      thumbnail: 'icon:package',
      published: true,
      version: '1.0.0',
      changelog: '최초 릴리즈',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  course_package_items: [
    {
      id: 'pkg-item-1',
      package_id: 'package-1',
      course_id: 'course-1',
      order_index: 0,
      created_at: new Date().toISOString()
    },
    {
      id: 'pkg-item-2',
      package_id: 'package-1',
      course_id: 'course-2',
      order_index: 1,
      created_at: new Date().toISOString()
    }
  ],
  user_package_subscriptions: [
    {
      id: 'sub-1',
      user_id: 'local-user-id',
      package_id: 'package-1',
      created_at: new Date().toISOString()
    }
  ],
  user_progress: [
    {
      id: 'progress-1',
      user_id: 'local-user-id',
      course_id: 'course-1',
      last_card: 0,
      max_card: 0,
      completed: false,
      updated_at: new Date().toISOString()
    }
  ],
  user_external_agents: [
    {
      id: 'agent-1',
      user_id: 'local-user-id',
      name: '기본 에이전트',
      endpoint: 'http://localhost:8000',
      api_key: '',
      web_ui_url: '',
      status: 'online',
      selected_model: 'deepseek-v4-flash',
      is_ai_tutor: true,
      is_tutor_configured: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  user_external_agent_messages: [],
  macros: []
};

// Ensure db.json exists with defaults
function ensureDB() {
  if (!fs.existsSync(DB_FILE_PATH)) {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
  }
}

// Read database
export function readDB(): any {
  ensureDB();
  const data = fs.readFileSync(DB_FILE_PATH, 'utf-8');
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to parse db.json, returning empty structure', e);
    return DEFAULT_DB;
  }
}

// Write database
export function writeDB(dbData: any) {
  ensureDB();
  fs.writeFileSync(DB_FILE_PATH, JSON.stringify(dbData, null, 2), 'utf-8');
}

// Mock uuid generator
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Execute serialized query
export function executeLocalQuery(query: SerializedQuery, action: string, data?: any) {
  // Handle storage mock actions
  if (action === 'storage_upload') {
    try {
      const { bucket, path: filePath, fileData } = data; // fileData is base64
      const targetPath = path.join(STORAGE_DIR, bucket === 'courses' ? '' : bucket, filePath);
      
      // Ensure target directory exists
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      
      const buffer = Buffer.from(fileData, 'base64');
      fs.writeFileSync(targetPath, buffer);
      
      return { data: { path: filePath }, error: null };
    } catch (e: any) {
      console.error('Failed to upload file to mock storage:', e);
      return { data: null, error: { message: e.message } };
    }
  }

  if (action === 'storage_download') {
    try {
      const { bucket, path: filePath } = data;
      const targetPath = path.join(STORAGE_DIR, bucket === 'courses' ? '' : bucket, filePath);
      
      if (!fs.existsSync(targetPath)) {
        return { data: null, error: { message: `File not found: ${filePath}`, code: '404' } };
      }
      
      const fileBuffer = fs.readFileSync(targetPath);
      const base64Data = fileBuffer.toString('base64');
      
      return { data: { base64: base64Data }, error: null };
    } catch (e: any) {
      console.error('Failed to download file from mock storage:', e);
      return { data: null, error: { message: e.message } };
    }
  }

  const db = readDB();
  const table = query.table;
  
  if (!db[table]) {
    db[table] = [];
  }

  let items = [...db[table]];

  // 1. Filter items for non-insert actions
  if (action !== 'insert') {
    if (query.filters && query.filters.length > 0) {
      items = items.filter((item) => {
        return query.filters.every((f) => {
          const val = item[f.column];
          if (f.type === 'eq') {
            return val === f.value;
          } else if (f.type === 'neq') {
            return val !== f.value;
          } else if (f.type === 'in') {
            return Array.isArray(f.value) && f.value.includes(val);
          }
          return true;
        });
      });
    }
  }

  // 2. Perform DB operations
  if (action === 'select') {
    // Sort
    if (query.order) {
      const col = query.order.column;
      const asc = query.order.ascending;
      items.sort((a, b) => {
        if (a[col] < b[col]) return asc ? -1 : 1;
        if (a[col] > b[col]) return asc ? 1 : -1;
        return 0;
      });
    }

    // Limit
    if (query.limit !== null) {
      items = items.slice(0, query.limit);
    }

    // Mock Auto Join Resolver for Select query
    if (items.length > 0) {
      if (table === 'user_progress') {
        const courses = db.courses || [];
        const packageItems = db.course_package_items || [];
        items = items.map((item) => {
          const course = courses.find((c: any) => c.id === item.course_id);
          const mappedPackageItems = packageItems.filter((pi: any) => pi.course_id === item.course_id);
          return {
            ...item,
            course: course ? {
              ...course,
              course_package_items: mappedPackageItems
            } : null
          };
        });
      }

      if (table === 'course_packages') {
        const packageItems = db.course_package_items || [];
        const courses = db.courses || [];
        items = items.map((pkg) => {
          const matchedItems = packageItems
            .filter((pi: any) => pi.package_id === pkg.id)
            .map((pi: any) => {
              const course = courses.find((c: any) => c.id === pi.course_id);
              return {
                ...pi,
                course: course || null
              };
            });
          return {
            ...pkg,
            items: matchedItems
          };
        });
      }

      if (table === 'user_package_subscriptions') {
        const packages = db.course_packages || [];
        const packageItems = db.course_package_items || [];
        const courses = db.courses || [];
        
        items = items.map((sub) => {
          const pkg = packages.find((p: any) => p.id === sub.package_id);
          let pkgWithItems = null;
          if (pkg) {
            const matchedItems = packageItems
              .filter((pi: any) => pi.package_id === pkg.id)
              .map((pi: any) => {
                const course = courses.find((c: any) => c.id === pi.course_id);
                return {
                  ...pi,
                  course: course || null
                };
              });
            pkgWithItems = {
              ...pkg,
              items: matchedItems
            };
          }
          return {
            ...sub,
            package: pkgWithItems
          };
        });
      }
    }

    // single / maybeSingle format
    if (query.single) {
      if (items.length === 0) {
        return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
      }
      return { data: items[0], error: null };
    }

    if (query.maybeSingle) {
      return { data: items.length > 0 ? items[0] : null, error: null };
    }

    return { data: items, error: null };

  } else if (action === 'insert') {
    const insertData = Array.isArray(data) ? data : [data];
    const createdItems: any[] = [];
    
    for (const d of insertData) {
      const newItem = {
        id: d.id || uuidv4(),
        ...d,
        created_at: d.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // If table is packages/courses/etc, check duplicate slug
      if (d.slug) {
        const duplicate = db[table].find((x: any) => x.slug === d.slug);
        if (duplicate) {
          return { data: null, error: { message: `Duplicate key violation: slug ${d.slug} already exists`, code: '23505' } };
        }
      }

      db[table].push(newItem);
      createdItems.push(newItem);
    }

    writeDB(db);
    return { data: Array.isArray(data) ? createdItems : createdItems[0], error: null };

  } else if (action === 'update') {
    // Update all matching records
    const updatedIds = items.map((x) => x.id);
    db[table] = db[table].map((item: any) => {
      if (updatedIds.includes(item.id)) {
        return {
          ...item,
          ...data,
          updated_at: new Date().toISOString()
        };
      }
      return item;
    });

    writeDB(db);
    
    // Fetch updated ones
    const updatedItems = db[table].filter((x: any) => updatedIds.includes(x.id));
    if (query.single || query.maybeSingle) {
      return { data: updatedItems.length > 0 ? updatedItems[0] : null, error: null };
    }
    return { data: updatedItems, error: null };

  } else if (action === 'delete') {
    const deletedIds = items.map((x) => x.id);
    db[table] = db[table].filter((item: any) => !deletedIds.includes(item.id));
    
    writeDB(db);
    return { data: items, error: null };
  }

  return { data: null, error: { message: 'Unsupported action' } };
}
